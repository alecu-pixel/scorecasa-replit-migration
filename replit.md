# ScoreCasa

## Overview
ScoreCasa is a SaaS platform designed to provide data-driven real estate investment analysis for US properties. It offers a comprehensive property scoring system (1-10) based on real-time data from various public APIs. The platform aims to assist first-time homebuyers and US newcomers in understanding unfamiliar neighborhoods through objective, government-verified data, enabling confident real estate decisions. Key capabilities include analysis across Market Strength, Demographic Trends, School Quality, Safety Score, Walkability, and Rental Potential. The platform operates on a credit-based model where users purchase on-demand, non-expiring search credits.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, Vite, Wouter for routing, TanStack Query for server state management, and Tailwind CSS with shadcn/ui components. It features a modern data dashboard aesthetic with Inter and JetBrains Mono typography and responsive grid-based layouts. Key pages include a Landing Page, a public Demo Page, an authenticated Dashboard for property search and analysis, a Pricing Page, and an Admin Panel.

### Backend
The backend utilizes Node.js and Express.js in TypeScript, implementing a RESTful API design. It uses Zod for validation and orchestrates parallel API calls. Data integration and analysis are handled by six independent service modules. Drizzle ORM is configured for PostgreSQL (Neon serverless).

### System Design Choices
- **Comprehensive Data Integration:** Combines data from Census Bureau, OpenStreetMap, and real estate market APIs.
- **Weighted Investment Scoring:** A 1-10 score derived from six key metrics with detailed breakdowns.
- **AI-Powered Investment Analysis:** Uses Perplexity API for investment outlooks and pros/cons.
- **Robust Walkability Analysis:** Utilizes OpenStreetMap data for amenity-based walkability scores.
- **Real-time Market Data:** Integrates various APIs for property listings, market statistics, and mortgage rates.
- **School Data Integration:** Uses SchoolDigger Pro API with fallback to Urban Institute Education Data API.
- **Credit-Based SaaS Model:** Users purchase credits for property analyses.
- **Comprehensive Affordability Analysis:** Provides Investment Grade, Market Timing Signal, Buy vs Rent Analysis, Overvaluation Check, and detailed cost analysis.
- **Enhanced Safety Score & Crime Map:** Unifies crime data from multiple sources to create a composite safety score and an interactive Leaflet map.
- **Data Pipeline System:** Automated caching of government and Zillow data to reduce API dependency and enable historical trend analysis, with an Admin Dashboard for management.
- **Market Forecasting:** Integrates 1-year home value and rent forecasts from Zillow Research Data.
- **Market Velocity Metrics:** Incorporates days to pending, days to close, and sale-to-list ratios.
- **User Search History & Caching:** All user property searches are saved, and results are cached monthly for efficiency.
- **Investment Calculators:** Five interactive calculators (Cash Flow, Cap Rate, Cash-on-Cash Return, Maximum Offer Price, Stress Test) auto-populated from property analysis data.
- **Comparable Sales Analysis:** Displays nearby property listings as comps with price-per-sqft calculations.
- **Free Investor Toolkit:** A public page with seven standalone calculators (DTI, Home Affordability, Capital Gains Tax, 1031 Exchange, Rehab Cost Estimator, ARV, Investment Stress Test).
- **Investor vs. Homebuyer Scoring Mode Toggle:** Allows client-side re-weighting of sub-scores based on user type.
- **Environmental Risk Assessment:** Replaced EPA EJScreen (blocked) with Open-Meteo Air Quality API (CAMS Global). Provides live US AQI, PM2.5 (μg/m³ vs NAAQS 12 standard), ozone, and NO2 concentrations. Free, no API key required.
- **Seismic Hazard Risk:** Utilizes USGS Design Maps API for Peak Ground Acceleration.
- **Jobs Proximity (LEHD/LODES):** 8th scoring dimension (8% weight) using Census LEHD LODES 2021 WAC files. Per-state lazy caching in `jobs_data` DB table. Returns tract-level job counts by NAICS sector. First request for a new state triggers background download; subsequent requests return cached data.
- **Flood Risk Assessment:** Integrates FEMA National Flood Hazard Layer for flood zone classification, risk scoring, and estimated insurance costs, with an interactive map overlay. Includes NFIP historical claims panel (totalClaimsPaid, totalPayoutUsd, mostRecentClaimYear, claimActivity badge) sourced from OpenFEMA per census tract.
- **Opportunity Zone Detection:** Automatically detects whether a property is in a federally designated Qualified Opportunity Zone (OZ 1.0, 2018 designations). 8,765 QOZ census tracts cached from HUD Open Data (data.gov). Displays an amber/gold star badge in the address header. Census tract lookup uses Census Bureau geocoder (geocoder.census.gov). Data refreshes annually; OZ 2.0 redesignations expected late 2026.
- **Data Confidence & Trust System:** Provides transparent data quality indicators, confidence badges, forecast ranges, source agreement checks, and disclaimers.
- **Algorithmic Transparency:** Expandable reasoning sections explain score contributions and calculations.
- **Side-by-Side Property Comparison:** Users can compare selected properties from their search history in a structured table.

## External Dependencies

### Public APIs (No Authentication Required)
- **US Census Bureau API:** Demographic and economic data.
- **OpenStreetMap Nominatim & Overpass API:** Geocoding and points of interest.
- **FRED API:** Mortgage rate trends.
- **HUD FMR API:** Fair Market Rent data.
- **Census Building Permits API:** New construction activity.
- **BLS Employment API:** Employment data.
- **Zillow Research Data (CSV):** Publicly available home value and rent forecasts, market velocity metrics.
- **FEMA NFHL REST/WMS API:** Flood zone classification and map overlay.
- **FHFA House Price Index (CSV):** Free quarterly CSV. State-level HPI from 1975+. Cached in `fhfa_hpi_data` table.
- **Redfin Data Center (TSV/GZ):** Free monthly gzip TSV. City-level market competition metrics (23,020+ cities). Streamed line-by-line to avoid memory overflow (940 MB compressed). Cached in `redfin_market_data` table.
- **IRS SOI Migration Data (CSV):** Free annual county migration CSV. Cached in `irs_migration_data` table.
- **Wikipedia API (FBI UCR Crime Data):** Free, no auth. Fetches state-level FBI UCR violent crime rates (2018-2024) for all 51 states from Wikipedia's UCR tables. Property crime estimated from 2022 baseline + national YoY trend adjustments. Replaces defunct FBI CDE API. Source: `server/services/dataPipeline/wikipediaCrimeDownloader.ts`.
- **EPA EJScreen REST API:** Free, no key. Environmental justice indicators at lat/lng. Real-time per analysis.
- **USGS Design Maps API:** Free, no key. Seismic PGA values at lat/lng (ASCE 7-22). Real-time per analysis.
- **Census Bureau Geocoder API:** Free, no key. Converts lat/lng → 11-digit FIPS census tract GEOID (geocoder.census.gov). Used for NFIP claims and OZ lookups. Real-time per analysis.
- **OpenFEMA NFIP Redacted Claims API:** Free, no key. Historical NFIP flood insurance claims per census tract (fema.gov/api/open/v2/nfipClaims). Real-time per analysis.
- **HUD Opportunity Zones (data.gov CSV):** Free, no key. 8,765 QOZ census tract GEOIDs from HUD Open Data portal via ArcGIS Hub CSV download. Annual refresh. Cached in `opportunity_zones` table.

### Premium APIs (Require API Keys)
- **FBI Crime Data API (via data.gov):** State-level crime statistics. NOTE: CDE endpoint (`api.usa.gov/crime/fbi/cde`) is non-functional server-side (returns 401 even with valid keys). Wikipedia-based downloader is the active data source for FBI UCR data.
- **Crime Data by ZipCode API (via RapidAPI):** ZIP-level crime grades.
- **Perplexity API:** AI-powered investment analysis.
- **US Housing Market Data API (via RapidAPI):** Live property listings.
- **Real Estate Market Data by Zip Code API (via RapidAPI):** Market statistics.
- **US Realtor API (via RapidAPI):** Current mortgage rates.
- **RentCast API:** Property-specific rental estimates and comparables.

### Frontend Libraries
- **@radix-ui/*:** Headless UI primitives.
- **@tanstack/react-query:** Asynchronous state management.
- **lucide-react:** Icon system.
- **react-hook-form + @hookform/resolvers:** Form validation.
- **class-variance-authority + clsx:** Component variant styling.
- **date-fns:** Date formatting.
- **zod:** Runtime type validation.
- **drizzle-zod:** Schema to Zod converter.

### Email Integration
- **Resend API:** For transactional emails.

### Database Configuration
- **PostgreSQL (Neon serverless) with Drizzle ORM.**
- **Core Tables:** `users`, `creditPurchases`, `analyses`, `contact_submissions`, `sessions`.
- **Data Pipeline Tables:** `fred_mortgage_rates`, `hud_fair_market_rent`, `bls_employment_data`, `census_building_permits`, `fbi_crime_stats`, `data_pipeline_status`.

### Mobile App (Expo/React Native)
- **Expo SDK 52** with Expo Router for file-based routing
- **React Native** with react-native-web for cross-platform support
- **expo-secure-store** for secure JWT token storage on mobile
- **@tanstack/react-query** for server state management
- **@expo-google-fonts/inter** for consistent typography
- Located in `mobile/` directory with its own app structure
- Connects to the same Express backend via JWT-based auth
- Separate workflow: "Start Mobile" runs Expo dev server on port 8081

### Mobile Auth Architecture
- Backend supports both Replit OAuth (web) and email/password (mobile) auth
- Mobile auth endpoints: `/api/auth/mobile/register`, `/api/auth/mobile/login`, `/api/auth/mobile/me`
- Uses bcrypt-hashed passwords and JWT tokens (30-day expiry)
- The existing `isAuthenticated` middleware accepts both session cookies (web) and Bearer JWT tokens (mobile)
- Mobile users share the same `users` table, so credits and analyses are synced across web and mobile

### Mobile In-App Purchases
- **RevenueCat** integration for in-app credit purchases on mobile
- Seed script: `scripts/seedRevenueCat.ts` (creates project, products, entitlements, offerings in RevenueCat)
- Client lib: `mobile/lib/revenuecat.tsx` (SubscriptionProvider, useSubscription hook, initializeRevenueCat)
- RevenueCat connector authenticated via Replit integration
- Products: `credits_starter` (5 credits, $9.99), `credits_advanced` (12 credits, $19.99)
- Entitlement: `search_credits`
- Environment variables: `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, `REVENUECAT_PROJECT_ID`

### Mobile Account Linking
- Web users (Replit OAuth) can register on mobile with the same email to claim their account
- Register endpoint detects existing users without passwords and sets the password, linking the account
- Shared user ID ensures credits, analyses, and history sync across web and mobile

### Payment Processing
- **Stripe:** For credit package purchases (web).