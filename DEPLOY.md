# Putting scorecasa.com back online

Hosting: **Render** (runs the app, ~$7/month) + **Neon** (Postgres database, free tier).
Total: about $7/month plus the domain renewal.

## 0. Renew the domain (do this first)
Log in to the registrar where scorecasa.com is registered and renew it. Turn on auto-renew.
If you're not sure where it's registered, look it up at https://lookup.icann.org/en/lookup → "Registrar".

## 1. Database (Neon)
1. Create a free account at https://neon.tech and a project named `scorecasa` (region: US East).
2. Copy the connection string (starts with `postgresql://…neon.tech/…?sslmode=require`).
3. Create the tables, from this folder on your PC:
   ```
   set DATABASE_URL=<paste the Neon URL>
   npm run db:push
   ```
   **Have your old Replit database?** Replit's database was also Neon. If you still have its URL
   (Replit → Secrets → `DATABASE_URL`), skip the steps above and just use that URL: users, credits
   and history come with it. Old users log in with "Forgot password" using the same email.

## 2. App (Render)
1. Create an account at https://render.com and connect GitHub.
2. New → **Blueprint** → pick the `scorecasa-replit-migration` repo. Render reads `render.yaml`.
3. Fill in the environment variables it asks for (database URL from step 1, API keys from Replit/Polsia secrets).
4. Deploy. You get a test address like `https://scorecasa.onrender.com`. Check it works.

## 3. Point the domain at Render
1. Render → the scorecasa service → Settings → Custom Domains → add `scorecasa.com` and `www.scorecasa.com`.
2. At your registrar's DNS settings, add the records Render shows (usually):
   - `A` record, host `@` → `216.24.57.1`
   - `CNAME` record, host `www` → `scorecasa.onrender.com`
   Remove any old A/CNAME records that pointed at Replit or Polsia.
3. Wait for Render to show "Verified" and issue the HTTPS certificate (minutes to a few hours).

## 4. Payments and email
- **Stripe** → Developers → Webhooks: set the endpoint to `https://scorecasa.com/api/stripe/webhook`
  (event `checkout.session.completed`) and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
- **Resend**: make sure the `scorecasa.com` domain is still verified (DNS records may need re-adding
  if you change DNS provider), otherwise password-reset and welcome emails won't send.

## 5. Final check
Sign up, log in, log out, "Forgot password" email arrives, run one property report,
buy credits in Stripe test mode, send the contact form.
