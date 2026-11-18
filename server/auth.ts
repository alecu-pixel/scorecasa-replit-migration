// Email + password sign-in for the web app (replaces Replit login).
// Sessions live in the Postgres "sessions" table. The logged-in user is stored
// as { claims: { sub: <userId> } } so existing route code keeps working.
import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./services/email";
import { verifyToken } from "./mobileAuth";

const isProd = process.env.NODE_ENV === "production";
const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSession() {
  const PgStore = connectPg(session);
  return session({
    secret: SECRET!,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: SESSION_TTL / 1000,
      tableName: "sessions",
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: SESSION_TTL,
    },
  });
}

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });
const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// A reset link is only valid for the password the account had when it was issued,
// so it stops working once used.
function passwordFingerprint(hash: string | null | undefined) {
  return crypto.createHash("sha256").update(hash || "none").digest("hex").slice(0, 16);
}

function makeResetToken(userId: string, currentHash: string | null | undefined) {
  return jwt.sign({ sub: userId, purpose: "reset", fp: passwordFingerprint(currentHash) }, SECRET!, {
    expiresIn: "1h",
  });
}

function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
    creditBalance: u.creditBalance ?? 0,
    isAdmin: u.isAdmin ?? 0,
  };
}

function logIn(req: any, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err: any) => {
      if (err) return reject(err);
      req.login({ claims: { sub: userId } }, (e: any) => (e ? reject(e) : resolve()));
    });
  });
}

function zodMessage(error: any) {
  return error?.errors?.[0]?.message || "Please check the form and try again.";
}

// Very small in-memory limiter for login / reset attempts.
const attempts = new Map<string, { count: number; reset: number }>();
const rateLimit: RequestHandler = (req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return next();
  }
  entry.count++;
  if (entry.count > 20) {
    return res.status(429).json({ message: "Too many attempts. Please wait a few minutes and try again." });
  }
  next();
};

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Old links pointed at /api/login (Replit). Send them to the new page.
  app.get("/api/login", (_req, res) => res.redirect("/login"));

  app.post("/api/auth/register", rateLimit, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({
          message: existing.password
            ? "An account with this email already exists. Please log in."
            : "You already have a ScoreCasa account from before. Use “Forgot password” to set a password and keep your credits.",
          code: existing.password ? "exists" : "needs_reset",
        });
      }

      const hashed = await bcrypt.hash(password, 12);
      const result = await storage.upsertUserWithEarlyBirdCheck({
        id: crypto.randomUUID(),
        email,
        password: hashed,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      await logIn(req, result.user.id);

      if (result.wasNewUser) {
        sendWelcomeEmail({
          email,
          firstName: firstName || null,
          isEarlyBird: result.receivedEarlyBirdCredits,
          creditsGranted: result.receivedEarlyBirdCredits ? 2 : 0,
        }).catch((err) => console.error("Welcome email error:", err));
      }

      res.status(201).json(publicUser(result.user));
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: zodMessage(error) });
      console.error("[Auth] Register error:", error);
      res.status(500).json({ message: "Sign-up failed. Please try again." });
    }
  });

  app.post("/api/auth/login", rateLimit, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (user && !user.password) {
        return res.status(401).json({
          message: "This account was created with our old sign-in. Use “Forgot password” to set a password.",
          code: "needs_reset",
        });
      }
      if (!user || !(await bcrypt.compare(password, user.password!))) {
        return res.status(401).json({ message: "Wrong email or password." });
      }
      await logIn(req, user.id);
      res.json(publicUser(user));
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: zodMessage(error) });
      console.error("[Auth] Login error:", error);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  app.post("/api/auth/forgot-password", rateLimit, async (req, res) => {
    try {
      const { email } = forgotSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (user?.email) {
        const token = makeResetToken(user.id, user.password);
        const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
        await sendPasswordResetEmail({
          email: user.email,
          firstName: user.firstName,
          resetUrl: `${base}/reset-password?token=${encodeURIComponent(token)}`,
        });
      }
      // Same answer either way, so the form can't be used to check who has an account.
      res.json({ message: "If that email has an account, a reset link is on its way." });
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: zodMessage(error) });
      console.error("[Auth] Forgot password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/reset-password", rateLimit, async (req, res) => {
    try {
      const { token, password } = resetSchema.parse(req.body);
      let payload: any;
      try {
        payload = jwt.verify(token, SECRET!);
      } catch {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }
      if (payload?.purpose !== "reset") {
        return res.status(400).json({ message: "Invalid reset link." });
      }
      const user = await storage.getUserById(payload.sub);
      if (!user || payload.fp !== passwordFingerprint(user.password)) {
        return res.status(400).json({ message: "This reset link was already used. Please request a new one." });
      }
      await storage.setUserPassword(user.id, await bcrypt.hash(password, 12));
      await logIn(req, user.id);
      res.json(publicUser(user));
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ message: zodMessage(error) });
      console.error("[Auth] Reset password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  const logout: RequestHandler = (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        if (req.method === "GET") res.redirect("/");
        else res.json({ ok: true });
      });
    });
  };
  app.get("/api/logout", logout);
  app.post("/api/auth/logout", logout);
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Mobile app sends a Bearer JWT.
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) {
      (req as any).user = { claims: { sub: payload.sub } };
      (req as any).isAuthenticated = () => true;
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
