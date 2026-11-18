# ScoreCasa revival plan (Nov 2026)

## Where things stand
- Code: React + Vite front end, Express API, Postgres (Drizzle). Builds fine locally.
- Sign-in used **Replit's own login** (OpenID via replit.com). It cannot work on any other host, so it has to be replaced.
- Secrets (database URL, Stripe, RapidAPI, Census, SchoolDigger, RentCast, Resend, Perplexity…) lived in Replit / Polsia and are **not in the repo**.
- Domain scorecasa.com expires 2026-11-19. Must be renewed by the owner at the registrar.

## Steps
1. **Sign-in** — replace Replit login with email + password (sessions in Postgres), plus "forgot password" by email.
   Old Replit accounts have no password: they use "forgot password" with the same email to set one, and keep their credits.
2. **Look & feel** — move away from the dark neon "AI startup" style to a light, warm, trustworthy real-estate look
   (cream background, deep green + terracotta accents, serif headlines). Applied through the shared theme so every page updates.
3. **Copy** — rewrite the landing page and remove "AI-powered / intelligence / algorithm" wording across the site.
   Lead with plain benefits: "Know the neighborhood before you buy", public data sources, one clear score.
4. **Hosting** — Render (web service) + Neon (Postgres, free tier). Config in `render.yaml`, env vars listed in `.env.example`.
5. **Domain** — point scorecasa.com at Render (A record + `www` CNAME), Render issues HTTPS automatically.
6. **Go-live checks** — sign-up, login, a property search, Stripe checkout in test mode, contact form email.

## Needs the owner
- Renew scorecasa.com (today).
- Render + Neon accounts (free to create, Render web service ≈ $7/month to stay awake).
- The API keys from Replit/Polsia secrets (or new ones).
- Stripe: update the webhook URL to `https://scorecasa.com/api/stripe/webhook`.
