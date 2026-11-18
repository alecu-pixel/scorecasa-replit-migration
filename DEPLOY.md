# Putting scorecasa.com back online

Hosting: **Render** runs the app (~$7/month). **Supabase** holds the database (free plan, same account as Expira).
The old Polsia database was checked on 2026-11-18: it was empty (no users), so we start fresh.

## 0. Renew the domain (first!)
Renew scorecasa.com at your registrar and turn on auto-renew.
Not sure where it's registered? https://lookup.icann.org/en/lookup → "Registrar".

## 1. Keys
| Key | Where it comes from | Notes |
|---|---|---|
| RAPIDAPI_KEY | Polsia → Website → ⋯ → Secrets → Reveal | |
| RENTCAST_API_KEY | Polsia (same place) | |
| STRIPE_SECRET_KEY | Polsia | `sk_live_…` = real payments, `sk_test_…` = test mode |
| VITE_STRIPE_PUBLIC_KEY | Polsia | must be the same mode (live/test) as the secret key |
| STRIPE_WEBHOOK_SECRET | Polsia | stays valid if you **edit** the existing Stripe webhook (step 5) instead of creating a new one |
| SESSION_SECRET | Polsia | any long random text works |
| PERPLEXITY_API_KEY | — | **not used.** Without it the app writes the outlook itself from the report numbers. |
| RESEND, CENSUS, SCHOOLDIGGER, FRED, BLS, HUD, FBI | Replit → Secrets (never moved to Polsia) | optional; Resend is needed for password-reset emails |

Paste them into `.env.local` (for testing on your PC) and later into Render (step 3).

## 2. Database (Supabase)
1. https://supabase.com/dashboard → your organization (the one with Expira) → **New project**.
2. Name `scorecasa`. Click **Generate a password** and save it in your password manager.
   Region: **East US (North Virginia)**. Plan: Free.
3. If the form shows **"Enable Data API"** (under Security / Advanced), **untick it**. ScoreCasa talks to the
   database directly and doesn't need it, and leaving it off means the tables can't be reached from the
   public Supabase API.
4. Create the project and wait ~2 minutes.
5. Click **Connect** (top of the project page) → **Connection string** → choose **Session pooler**.
   Copy the URI and replace `[YOUR-PASSWORD]` with the password from step 2.
   (Use Session pooler, not "Direct connection": Render can't reach the direct one.)
6. Put that URI in `.env.local` as `DATABASE_URL=…`, then Claude creates the tables (`npm run db:push`)
   and tests the app against it.

## 3. App (Render)
1. Create an account at https://render.com and connect GitHub.
2. New → **Blueprint** → pick the `scorecasa-replit-migration` repo. Render reads `render.yaml`.
3. Paste the values from step 1 and the Supabase URI into the environment variables. Leave Perplexity empty.
4. Deploy. You get a test address like `https://scorecasa.onrender.com`. Check it works.

## 4. Point the domain at Render
1. Render → the scorecasa service → Settings → Custom Domains → add `scorecasa.com` and `www.scorecasa.com`.
2. At your registrar's DNS, add what Render shows (usually `A @ → 216.24.57.1` and `CNAME www → scorecasa.onrender.com`).
   Remove old A/CNAME records that point at Replit or Polsia.
3. Wait for "Verified" and the HTTPS certificate.

## 5. Stripe and email
- **Stripe** → Developers → Webhooks → open the existing ScoreCasa endpoint → **Edit** the URL to
  `https://scorecasa.com/api/stripe/webhook` (event `checkout.session.completed`). Editing keeps the same signing secret.
- **Resend**: check the `scorecasa.com` domain is still verified, or reset and welcome emails won't send.

## 6. Final check
Sign up, log in, log out, "Forgot password" email, one property report, a Stripe test purchase, the contact form.
