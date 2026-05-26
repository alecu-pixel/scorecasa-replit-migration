# Scorecasa Mobile App (iOS & Android)

## What & Why
Build a native mobile app for Scorecasa using Expo (React Native) targeting iOS and Android. The app connects to the existing Express backend and PostgreSQL database, so all property analyses, search history, and credits are shared across web and mobile. Because the web app uses browser-based OAuth (Replit Auth), mobile-specific email/password auth endpoints must be added to the backend to support native login while sharing the same user records.

## Done looks like
- Users can register and log in with email/password on mobile and see the same account data as on the web
- Property address search triggers a full investment analysis with all score components displayed in a mobile-optimized layout
- Users can toggle between Homebuyer Mode and Investor Mode
- Search history is accessible and previous analyses can be reopened
- Investor Toolkit calculators (Mortgage, ARV, Rehab Estimator, Capital Gains, 1031 Exchange) are accessible from a dedicated tab
- Credit balance is visible; users can purchase credits via RevenueCat in-app purchases
- The app handles safe areas correctly on both iOS (Dynamic Island, notch) and Android (status bar)

## Out of scope
- PDF report export (mobile-only limitation, can be added later)
- Property comparison (side-by-side) tool
- Admin dashboard
- Maps/crime map visualization (can be added later with react-native-maps)
- Web version changes beyond the new auth endpoints

## Tasks

1. **Backend: email/password auth endpoints** — Add `/api/auth/mobile/register` and `/api/auth/mobile/login` endpoints to the Express backend that create/authenticate users using bcrypt-hashed passwords stored in the users table. Issue a signed JWT (or session token) the mobile app can store securely with expo-secure-store. Also add a password field to the users schema and a `/api/auth/mobile/me` endpoint to validate tokens.

2. **Expo project scaffold** — Create a new Expo (SDK 53+) project in a `mobile/` directory with Expo Router, React Query, expo-secure-store, and react-native-keyboard-controller. Set `EXPO_PUBLIC_DOMAIN` to point to the Express backend. Configure the `Start Frontend` and `Start Backend` workflows. Create an `ErrorBoundary` component and root layout with theme/auth context providers.

3. **Auth screens** — Build Login and Register screens with email/password forms, proper keyboard handling (`KeyboardAwareScrollViewCompat`), and secure token persistence via expo-secure-store. On successful auth, redirect to the main tab navigator. Include a "Log out" action in the Profile tab.

4. **Property Search & Analysis screen** — Build the main search screen with an address text input and a Homebuyer/Investor mode toggle. On submit, call `/api/analyze` (deducting a credit) and display the full result: overall score, all sub-scores (Market Strength, Safety, Demographics, Walkability, Rental Potential, Appreciation Forecast), plus the AI short/long-term outlook text. Use scrollable cards adapted for mobile touch.

5. **Search History screen** — Fetch and display the user's past analyses from `/api/analyses/history`. Each row shows address, score badge, mode, and date. Tapping a row reopens the full analysis result without spending a credit.

6. **Investor Toolkit screen** — Port the five calculators (Mortgage, ARV, Rehab Estimator, Capital Gains Tax, 1031 Exchange) to React Native forms. Each calculator lives in a tab or scrollable section within a dedicated Toolkit tab.

7. **Profile & Credits screen** — Show user info (name, email), current credit balance, and a purchase option via RevenueCat. Display credit purchase history. Include the logout button.

8. **Polish & navigation** — Wire all screens into a bottom tab navigator (Search, History, Toolkit, Profile) using NativeTabs with liquid glass fallback. Add app icon, splash screen, safe area handling for all devices, loading skeletons, and empty states.

## Relevant files
- `server/routes.ts`
- `shared/schema.ts`
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/InvestorToolkit.tsx`
- `client/src/components/toolkit/`
