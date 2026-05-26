import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { storage } from "./storage";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("[Mobile Auth] FATAL: SESSION_SECRET or JWT_SECRET environment variable must be set for JWT authentication.");
}
const JWT_EXPIRY = "30d";

export function generateToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function registerMobileAuthRoutes(app: import("express").Express) {
  app.post("/api/auth/mobile/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);

      const existing = await storage.getUserByEmail(email);
      const hashedPassword = await bcrypt.hash(password, 12);

      if (existing) {
        if (existing.password) {
          return res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
        }

        await storage.setUserPassword(existing.id, hashedPassword);
        const updatedUser = await storage.getUserById(existing.id);
        const user = updatedUser || existing;

        const token = generateToken(user.id);
        return res.status(200).json({
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            creditBalance: user.creditBalance ?? 0,
            isAdmin: user.isAdmin ?? 0,
          },
          accountLinked: true,
        });
      }

      const result = await storage.upsertUserWithEarlyBirdCheck({
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      const token = generateToken(result.user.id);

      res.status(201).json({
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          creditBalance: result.user.creditBalance ?? 0,
          isAdmin: result.user.isAdmin ?? 0,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("[Mobile Auth] Register error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/mobile/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          creditBalance: user.creditBalance ?? 0,
          isAdmin: user.isAdmin ?? 0,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("[Mobile Auth] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/mobile/me", isMobileAuthenticated, async (req, res) => {
    const userId = (req as any).mobileUserId;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      creditBalance: user.creditBalance ?? 0,
      isAdmin: user.isAdmin ?? 0,
    });
  });
}

export const isMobileAuthenticated: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  (req as any).mobileUserId = payload.sub;
  next();
};
