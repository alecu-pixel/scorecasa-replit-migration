import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzePropertySchema, type PropertyAnalysisResult, type SchoolData, type SchoolInfo, type CrimeData, type ComprehensiveAffordabilityData, type FloodRiskData, type EnvironmentalRiskData, type SeismicRiskData } from "@shared/schema";
import { getCensusData, getCensusGrowthData } from "./services/census";
import { calculateWalkability } from "./services/walkability";
import { calculateInvestmentScore } from "./services/scoring";
import { fetchPropertyListings } from "./services/property";
import { fetchSchoolData } from "./services/school";
import { fetchSchoolDiggerData, getStateFromAddress } from "./services/schooldigger";
import { fetchMarketData } from "./services/marketData";
import { fetchStateCrimeData, extractStateFromAddress } from "./services/fbiCrime";
import { fetchEnrichedCrimeData, convertToLegacyCrimeData, type EnrichedCrimeData } from "./services/unifiedCrime";
import { exploreCensusData } from "./services/censusExploration";
import { generateInvestmentAnalysis } from "./services/investmentAnalysis";
import { fetchComprehensiveAffordabilityData } from "./services/unifiedAffordability";
import { fetchFloodRiskData } from "./services/floodRisk";
import { lookupCensusTract } from "./services/censusTract";
import { lookupOpportunityZone } from "./services/opportunityZone";
import { getJobsProximity } from "./services/jobsProximity";
import { fetchEnvironmentalRisk } from "./services/epaEnvironmental";
import { fetchSeismicRisk } from "./services/seismicRisk";
import { queryFHFAAppreciation } from "./services/dataPipeline/fhfaDownloader";
import { queryRedfinMarketHeat } from "./services/dataPipeline/redfinDownloader";
import { queryIRSMigration } from "./services/dataPipeline/irsMigrationDownloader";
import { isAuthenticated } from "./replitAuth";
import { isAdmin } from "./adminMiddleware";
import { storage } from "./storage";
import { getUncachableStripeClient, getStripeWebhookSecret } from "./stripeClient";
import { z } from "zod";
import { sendContactFormEmail, sendPurchaseConfirmationEmail } from "./services/email";
import { insertContactSubmissionSchema } from "@shared/schema";

/**
 * Get county FIPS code from address using Nominatim geocoding
 */
async function getCountyFIPS(address: string): Promise<string | null> {
  console.log('Looking up FIPS code for:', address);
  
  try {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;
    const response = await fetch(geocodeUrl, {
      headers: { 'User-Agent': 'PropertyInvestmentAnalyzer/1.0' }
    });

    if (!response.ok) {
      console.log('Nominatim geocode failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0 || !data[0].address) {
      console.log('No geocode results found');
      return null;
    }

    const addressData = data[0].address;
    console.log('Geocoded address data:', JSON.stringify(addressData, null, 2));
    
    // Extract state and county from geocoded address
    const state = addressData.state;
    const county = addressData.county;

    if (!state || !county) {
      console.log('Missing state or county in geocode response:', { state, county });
      return null;
    }

    console.log(`State: ${state}, County: ${county}`);

    // Get state FIPS code
    const stateFIPSMap: { [key: string]: string } = {
      'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05', 'California': '06',
      'Colorado': '08', 'Connecticut': '09', 'Delaware': '10', 'Florida': '12', 'Georgia': '13',
      'Hawaii': '15', 'Idaho': '16', 'Illinois': '17', 'Indiana': '18', 'Iowa': '19',
      'Kansas': '20', 'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
      'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28', 'Missouri': '29',
      'Montana': '30', 'Nebraska': '31', 'Nevada': '32', 'New Hampshire': '33', 'New Jersey': '34',
      'New Mexico': '35', 'New York': '36', 'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39',
      'Oklahoma': '40', 'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
      'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49', 'Vermont': '50',
      'Virginia': '51', 'Washington': '53', 'West Virginia': '54', 'Wisconsin': '55', 'Wyoming': '56',
      'District of Columbia': '11'
    };

    const stateFIPS = stateFIPSMap[state];
    if (!stateFIPS) {
      console.log('State not found in FIPS map:', state);
      return null;
    }

    console.log('State FIPS:', stateFIPS);

    // Use Census Geocoder API to get full county FIPS
    const censusBenchmark = 'Public_AR_Current';
    const houseNumber = addressData.house_number || '';
    const road = addressData.road || addressData.street || '';
    const street = houseNumber ? `${houseNumber} ${road}` : road;
    const city = addressData.city || addressData.town || addressData.village || '';
    const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/address?street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&benchmark=${censusBenchmark}&vintage=Current_Current&format=json`;
    
    console.log('Calling Census Geocoder...');
    const censusResponse = await fetch(censusUrl);
    if (!censusResponse.ok) {
      console.log('Census geocoder failed:', censusResponse.status);
      return null;
    }

    const censusData = await censusResponse.json();
    console.log('Census geocoder response:', JSON.stringify(censusData, null, 2));
    
    if (censusData?.result?.addressMatches?.[0]?.geographies?.['Counties']?.[0]?.GEOID) {
      const fips = censusData.result.addressMatches[0].geographies['Counties'][0].GEOID;
      console.log('Found FIPS code:', fips);
      return fips;
    }

    console.log('No FIPS code in census response');
    return null;
  } catch (error) {
    console.error('FIPS lookup error:', error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/auth/user - Get current user data
  app.get("/api/auth/user", async (req, res) => {
    // Disable caching for this endpoint to ensure fresh credit balance
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    if (!req.isAuthenticated()) {
      return res.json(null);
    }

    const user = req.user as any;
    const userId = user.claims?.sub;
    
    if (!userId) {
      return res.json(null);
    }

    const dbUser = await storage.getUserById(userId);
    if (!dbUser) {
      console.log('[Auth] User not found in database:', userId);
      return res.json(null);
    }

    console.log('[Auth] Returning user data with creditBalance:', dbUser.creditBalance);

    const userData = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      creditBalance: dbUser.creditBalance ?? 0,
      isAdmin: dbUser.isAdmin ?? 0,
    };
    
    console.log('[Auth] Full response being sent:', JSON.stringify(userData));
    return res.json(userData);
  });

  // GET /api/early-bird/stats - Get early bird program stats (public)
  app.get("/api/early-bird/stats", async (req, res) => {
    try {
      const stats = await storage.getEarlyBirdStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Early bird stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/contact - Submit contact form (public endpoint)
  app.post("/api/contact", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      
      // Send email via Resend
      await sendContactFormEmail({
        name: validatedData.name,
        email: validatedData.email,
        subject: validatedData.subject,
        message: validatedData.message,
      });
      
      // Store submission in database
      await storage.recordContactSubmission(validatedData);
      
      console.log(`✅ Contact form submitted by ${validatedData.email} - Subject: ${validatedData.subject}`);
      
      res.json({ 
        success: true,
        message: "Message received! We'll get back to you as soon as possible."
      });
    } catch (error: any) {
      console.error('❌ Contact form submission error:', error);
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid form data",
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to send message. Please try again later."
      });
    }
  });

  app.post("/api/webhooks/revenuecat", async (req, res) => {
    try {
      const event = req.body?.event;
      if (!event) {
        return res.status(400).json({ error: "Missing event data" });
      }

      const eventType = event.type;
      if (!["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE", "RENEWAL"].includes(eventType)) {
        return res.status(200).json({ received: true });
      }

      const appUserId = event.app_user_id;
      const productId = event.product_id;

      if (!appUserId || !productId) {
        return res.status(400).json({ error: "Missing app_user_id or product_id" });
      }

      const creditMap: Record<string, number> = {
        "credits_starter": 5,
        "credits_advanced": 12,
      };

      const priceMap: Record<string, number> = {
        "credits_starter": 999,
        "credits_advanced": 1999,
      };

      const credits = creditMap[productId] || 0;
      const amountPaid = priceMap[productId] || 0;

      if (credits === 0) {
        console.log(`[RevenueCat Webhook] Unknown product: ${productId}`);
        return res.status(200).json({ received: true });
      }

      const user = await storage.getUserById(appUserId);
      if (!user) {
        console.log(`[RevenueCat Webhook] User not found: ${appUserId}`);
        return res.status(200).json({ received: true });
      }

      await storage.addCredits(appUserId, credits);
      await storage.recordCreditPurchase({
        userId: appUserId,
        credits,
        amountPaid,
        status: "completed",
      });

      console.log(`[RevenueCat Webhook] Credited ${credits} to user ${appUserId} for ${productId}`);
      res.status(200).json({ received: true, credits_added: credits });
    } catch (error: any) {
      console.error("[RevenueCat Webhook] Error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.post("/api/credits/reconcile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub;
      const { productId } = req.body;

      if (!userId || !productId) {
        return res.status(400).json({ error: "Missing userId or productId" });
      }

      const creditMap: Record<string, number> = {
        "credits_starter": 5,
        "credits_advanced": 12,
      };

      const priceMap: Record<string, number> = {
        "credits_starter": 999,
        "credits_advanced": 1999,
      };

      const credits = creditMap[productId];
      const amountPaid = priceMap[productId];

      if (!credits) {
        return res.status(400).json({ error: "Unknown product" });
      }

      await storage.addCredits(userId, credits);
      await storage.recordCreditPurchase({
        userId,
        credits,
        amountPaid,
        status: "completed",
      });

      const updatedUser = await storage.getUserById(userId);
      res.json({
        success: true,
        credits,
        newBalance: updatedUser?.creditBalance ?? 0,
      });
    } catch (error: any) {
      console.error("[Credits Reconcile] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/credits/purchase", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub;
      const { package: packageType } = req.body;

      if (!packageType || !['starter', 'advanced'].includes(packageType)) {
        return res.status(400).json({ error: "Invalid package type" });
      }

      const dbUser = await storage.getUserById(userId);
      if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Define credit packages
      const credits = packageType === 'starter' ? 5 : 12;
      const amountPaid = packageType === 'starter' ? 1000 : 2000; // cents

      // Add credits to user balance
      await storage.addCredits(userId, credits);

      // Record the purchase
      await storage.recordCreditPurchase({
        userId,
        credits,
        amountPaid,
        status: 'completed'
      });

      // Get updated user
      const updatedUser = await storage.getUserById(userId);

      res.json({ 
        success: true, 
        credits,
        newBalance: updatedUser?.creditBalance ?? 0,
        message: `Successfully added ${credits} search credits to your account!`
      });
    } catch (error: any) {
      console.error('Mock purchase error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/stripe/create-checkout-session - Create Stripe checkout session for one-time credit purchase
  app.post("/api/stripe/create-checkout-session", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub;
      const { package: packageType } = req.body;

      if (!packageType || !['starter', 'advanced'].includes(packageType)) {
        return res.status(400).json({ error: "Invalid package type" });
      }

      const dbUser = await storage.getUserById(userId);
      if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const stripe = await getUncachableStripeClient();

      // Create or retrieve Stripe customer
      let customerId = dbUser.stripeCustomerId;
      
      // If we have a stored customer ID, verify it exists in Stripe
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (error: any) {
          // Customer doesn't exist in Stripe - clear it and create a new one
          if (error.code === 'resource_missing') {
            console.log(`Stored customer ${customerId} not found in Stripe. Creating new customer.`);
            customerId = null;
          } else {
            throw error;
          }
        }
      }

      // Create new customer if needed
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: dbUser.email || undefined,
          metadata: { userId }
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customerId);
        console.log(`Created new Stripe customer: ${customerId} for user ${userId}`);
      }

      // Define credit packages
      const packageData = packageType === 'starter'
        ? { amount: 1000, credits: 5, name: 'Starter Package - 5 Credits' }
        : { amount: 2000, credits: 12, name: 'Advanced Package - 12 Credits' };

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: packageData.amount,
            product_data: {
              name: packageData.name,
              description: `${packageData.credits} property analysis credits - never expire`,
            }
          },
          quantity: 1,
        }],
        success_url: `${req.protocol}://${req.hostname}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.hostname}/pricing`,
        metadata: {
          userId,
          packageType,
          credits: packageData.credits.toString()
        }
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/stripe/webhook - Handle Stripe webhooks for one-time credit purchases
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      console.error('Missing Stripe signature');
      return res.status(400).send('Missing Stripe signature');
    }

    let event: any;
    const stripe = await getUncachableStripeClient();

    try {
      const webhookSecret = await getStripeWebhookSecret();
      const rawBody = (req as any).rawBody as Buffer;
      
      if (!rawBody) {
        console.error('Missing raw body for webhook verification');
        return res.status(400).send('Missing raw body');
      }

      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = session.metadata?.userId;
          const packageType = session.metadata?.packageType;
          const credits = parseInt(session.metadata?.credits || '0');
          const paymentIntentId = session.payment_intent as string;
          const paymentStatus = session.payment_status;

          console.log('Checkout completed:', { 
            userId, 
            packageType, 
            credits, 
            paymentIntentId, 
            paymentStatus 
          });

          // Validate payment status
          if (paymentStatus !== 'paid') {
            console.log(`⚠️ Skipping webhook - payment status is ${paymentStatus}, not 'paid'`);
            return res.json({ received: true });
          }

          // Validate metadata
          if (!userId || !credits || credits <= 0 || !paymentIntentId) {
            console.error('Invalid webhook metadata:', { userId, credits, paymentIntentId });
            return res.json({ received: true });
          }

          // Process purchase with idempotency protection
          const result = await storage.purchaseCreditsFromStripe(
            userId,
            credits,
            session.amount_total || 0,
            paymentIntentId
          );

          if (result.success) {
            console.log(`✅ Successfully added ${credits} credits to user ${userId}`);

            // Send purchase confirmation email (fire-and-forget)
            storage.getUser(userId).then((user) => {
              if (user?.email) {
                const packageName = credits === 5 ? 'Starter Package — 5 Credits' : 'Advanced Package — 12 Credits';
                sendPurchaseConfirmationEmail({
                  email: user.email,
                  firstName: user.firstName || null,
                  credits,
                  amountPaid: session.amount_total || 0,
                  packageName,
                }).catch((err) => console.error('Purchase confirmation email error:', err));
              }
            }).catch((err) => console.error('Failed to fetch user for purchase email:', err));
          } else {
            console.log(`⚠️ Duplicate webhook event for payment intent ${paymentIntentId} - credits already added`);
          }
          break;
        }

        case 'checkout.session.expired': {
          const session = event.data.object;
          console.log('Checkout session expired:', session.id);
          break;
        }

        default:
          console.log('Unhandled webhook event type:', event.type);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/analyze - Analyze a property (protected)
  app.post("/api/analyze", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub;

      // Check user credit balance
      const dbUser = await storage.getUserById(userId);
      if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (dbUser.creditBalance <= 0) {
        return res.status(403).json({ 
          error: "Insufficient credits. Please purchase more credits to analyze properties." 
        });
      }

      const { address } = analyzePropertySchema.parse(req.body);
      
      // Extract ZIP code from address (match the last 5-digit number)
      const zipMatches = Array.from(address.matchAll(/\b(\d{5})\b/g));
      if (zipMatches.length === 0) {
        return res.status(400).json({ 
          error: "Please include a 5-digit ZIP code in the address" 
        });
      }
      const zipCode = zipMatches[zipMatches.length - 1][1];
      
      // Normalize address for cache matching (lowercase, trimmed)
      const addressNormalized = address.toLowerCase().trim();

      // Check for cached analysis from this month (any user)
      const cachedAnalysis = await storage.findCachedAnalysisThisMonth(addressNormalized);
      
      if (cachedAnalysis && cachedAnalysis.resultData) {
        console.log(`[Cache Hit] Returning cached analysis for: ${address} (originally by user ${cachedAnalysis.userId})`);
        
        // Deduct credit even for cached results
        const deducted = await storage.deductCredit(userId);
        if (!deducted) {
          return res.status(403).json({ 
            error: "Failed to deduct credit. Please try again." 
          });
        }
        
        // Record this search in user's history (marked as from cache)
        await storage.recordAnalysisWithResult({
          userId,
          address,
          addressNormalized,
          zipCode,
          score: cachedAnalysis.score,
          creditsUsed: 1,
          resultData: cachedAnalysis.resultData,
          fromCache: true
        });
        
        return res.json(cachedAnalysis.resultData);
      }

      console.log('Starting analysis for:', address);

      // Call real APIs in parallel (including unified crime data)
      const results = await Promise.allSettled([
        getCensusData(zipCode),
        getCensusGrowthData(zipCode),
        calculateWalkability(address),
        fetchPropertyListings(zipCode),
        fetchMarketData(zipCode),
        getCountyFIPS(address),
        fetchEnrichedCrimeData(zipCode, address)
      ]);

      const [censusResult, growthResult, walkabilityResult, propertyResult, marketDataResult, fipsResult, crimeResult] = results;

      // Check if we have minimum required data
      if (censusResult.status === 'rejected') {
        return res.status(500).json({
          error: "Unable to retrieve Census data for this ZIP code",
          details: censusResult.reason.message
        });
      }

      // Combine data with defaults for failed requests
      const demographics = censusResult.value;
      const growth = growthResult.status === 'fulfilled' 
        ? growthResult.value 
        : { populationGrowth5yr: 0, incomeGrowth5yr: 0, housingGrowth5yr: 0 };
      
      const walkability = walkabilityResult.status === 'fulfilled'
        ? walkabilityResult.value
        : { walkScore: 0, transitScore: 0, bikeScore: 0, amenityCount: 0, amenities: [], lat: null, lon: null };

      const propertyListings = propertyResult.status === 'fulfilled'
        ? propertyResult.value
        : null;

      const marketData = marketDataResult.status === 'fulfilled'
        ? marketDataResult.value
        : null;

      const fipsCode = fipsResult.status === 'fulfilled' ? fipsResult.value : null;

      // Resolve coordinates: walkability first, then Census, Nominatim, ZIP centroid
      let resolvedLat: number | null = walkability.lat;
      let resolvedLon: number | null = walkability.lon;
      let coordSource = 'walkability';
      
      if (resolvedLat === null || resolvedLon === null) {
        console.log('[Coords] Walkability coords not available, attempting fallback geocode');
        
        try {
          const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
          console.log('[Coords] Trying Census Bureau geocoder');
          const censusResponse = await fetch(censusUrl);
          if (censusResponse.ok) {
            const censusData = await censusResponse.json();
            if (censusData?.result?.addressMatches?.length > 0) {
              const match = censusData.result.addressMatches[0];
              resolvedLat = match.coordinates.y;
              resolvedLon = match.coordinates.x;
              coordSource = 'census';
              console.log(`[Coords] Census geocode successful: ${resolvedLat}, ${resolvedLon}`);
            } else {
              console.log('[Coords] Census geocode returned no matches');
            }
          }
        } catch (censusError) {
          console.log('[Coords] Census geocode failed:', (censusError as Error).message);
        }
        
        if (resolvedLat === null || resolvedLon === null) {
          try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            console.log('[Coords] Trying Nominatim geocoder');
            const geoResponse = await fetch(nominatimUrl, {
              headers: { 'User-Agent': 'ScoreCasa/1.0' }
            });
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              if (geoData && geoData.length > 0) {
                resolvedLat = parseFloat(geoData[0].lat);
                resolvedLon = parseFloat(geoData[0].lon);
                coordSource = 'nominatim';
                console.log(`[Coords] Nominatim geocode successful: ${resolvedLat}, ${resolvedLon}`);
              } else {
                console.log('[Coords] Nominatim geocode returned no results');
              }
            }
          } catch (geoError) {
            console.log('[Coords] Nominatim geocode failed:', (geoError as Error).message);
          }
        }
        
        if (resolvedLat === null || resolvedLon === null) {
          try {
            console.log(`[Coords] Trying ZIP code centroid for: ${zipCode}`);
            const zipUrl = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zipCode}&country=US&limit=1`;
            const zipResponse = await fetch(zipUrl, {
              headers: { 'User-Agent': 'ScoreCasa/1.0' }
            });
            if (zipResponse.ok) {
              const zipData = await zipResponse.json();
              if (zipData && zipData.length > 0) {
                resolvedLat = parseFloat(zipData[0].lat);
                resolvedLon = parseFloat(zipData[0].lon);
                coordSource = 'zip_centroid';
                console.log(`[Coords] ZIP centroid geocode successful: ${resolvedLat}, ${resolvedLon}`);
              } else {
                console.log('[Coords] ZIP centroid geocode returned no results');
              }
            }
          } catch (zipError) {
            console.log('[Coords] ZIP centroid geocode failed:', (zipError as Error).message);
          }
        }
      }
      
      console.log(`[Coords] Resolved: lat=${resolvedLat}, lon=${resolvedLon}, source=${coordSource}`);
      
      const resolvedCoordinates = resolvedLat !== null && resolvedLon !== null
        ? { lat: resolvedLat, lon: resolvedLon, source: coordSource }
        : null;

      // Get enriched crime data from unified service
      let enrichedCrimeData: EnrichedCrimeData | null = crimeResult.status === 'fulfilled' && crimeResult.value
        ? crimeResult.value
        : null;
      
      // Attach lat/lng to crime data for map display
      if (enrichedCrimeData && resolvedLat !== null && resolvedLon !== null) {
        enrichedCrimeData = {
          ...enrichedCrimeData,
          lat: resolvedLat,
          lng: resolvedLon
        };
      }

      // Convert to legacy format for backward compatibility
      const crimeData: CrimeData | null = enrichedCrimeData
        ? convertToLegacyCrimeData(enrichedCrimeData)
        : null;

      if (enrichedCrimeData) {
        console.log(`Unified Crime data: ${enrichedCrimeData.summary.headline} - Composite Score: ${enrichedCrimeData.compositeSafetyScore}, Sources: ZIP=${enrichedCrimeData.dataSources.zipCode}, State=${enrichedCrimeData.dataSources.state}`);
      }

      // Fetch school data using resolved coordinates
      let schools: SchoolData | null = null;
      const schoolLat = resolvedLat;
      const schoolLon = resolvedLon;
      
      console.log(`[Schools] Using coords for school lookup: lat=${schoolLat}, lon=${schoolLon}`);
      
      if (schoolLat !== null && schoolLon !== null) {
        // Try SchoolDigger first (provides better ratings data)
        const state = getStateFromAddress(address);
        console.log(`[Schools] Extracted state: ${state || 'NULL'}`);
        
        if (state) {
          console.log(`[Schools] Calling SchoolDigger API for ${state} at (${schoolLat}, ${schoolLon})`);
          try {
            const schoolDiggerData = await fetchSchoolDiggerData(
              schoolLat,
              schoolLon,
              state,
              10 // 10 mile radius
            );
            
            console.log(`[Schools] SchoolDigger response: ${schoolDiggerData ? `${schoolDiggerData.schools.length} schools` : 'NULL'}`);
            
            if (schoolDiggerData && schoolDiggerData.schools.length > 0) {
              // Convert SchoolDigger Pro data to SchoolData format
              schools = {
                schools: schoolDiggerData.schools.map(s => ({
                  school_id: s.schoolId,
                  name: s.name,
                  address: s.address,
                  latitude: s.latitude,
                  longitude: s.longitude,
                  distance_miles: s.distanceMiles,
                  charter: s.isCharter,
                  magnet: s.isMagnet,
                  grades: s.grades,
                  enrollment: s.enrollment,
                  free_reduced_lunch_pct: s.freeLunchPercent,
                  poverty_pct: 0, // Not available from SchoolDigger
                  reading_proficiency: 0, // Test scores available separately
                  math_proficiency: 0, // Test scores available separately
                  overall_score: s.overallScore,
                  star_rating: s.starRating,
                  state_rank: s.stateRank,
                  state_rank_of: s.stateRankOf,
                  state_percentile: s.statePercentile,
                  student_teacher_ratio: s.studentTeacherRatio,
                  school_level: s.schoolLevel,
                  district_name: s.districtName,
                  // Pro tier fields
                  graduation_rate: s.graduationRate ?? undefined,
                  chronic_absenteeism_rate: s.chronicAbsenteeismRate ?? undefined,
                  spending_per_pupil: s.spendingPerPupil ?? undefined,
                  is_title_i: s.isTitleI,
                  is_virtual: s.isVirtual,
                  county: s.county,
                  phone: s.phone,
                  url: s.url
                })),
                average_score: schoolDiggerData.averageRating * 2, // Convert 5-star to 10-point
                top_school_score: schoolDiggerData.topRating * 2,
                schools_within_5_miles: schoolDiggerData.schoolsWithin5Miles,
                data_source: 'schooldigger',
                average_star_rating: schoolDiggerData.averageRating,
                top_star_rating: schoolDiggerData.topRating,
                average_state_percentile: schoolDiggerData.averageRankPercentile,
                // Pro tier aggregates
                average_graduation_rate: schoolDiggerData.averageGraduationRate ?? undefined,
                average_spending_per_pupil: schoolDiggerData.averageSpendingPerPupil ?? undefined,
                average_absenteeism_rate: schoolDiggerData.averageAbsenteeismRate ?? undefined
              };
              console.log(`SchoolDigger Pro returned ${schools.schools.length} schools, avg rating: ${schoolDiggerData.averageRating}`);
            }
          } catch (error: any) {
            console.log(`[Schools] SchoolDigger fetch failed: ${error.message}`);
          }
        } else {
          console.log(`[Schools] State extraction failed - cannot use SchoolDigger`);
        }
        
        // Fall back to Urban Institute if SchoolDigger didn't return data
        if (!schools && fipsCode) {
          console.log(`[Schools] Falling back to Urban Institute`);
          try {
            const urbanData = await fetchSchoolData(fipsCode, schoolLat, schoolLon);
            if (urbanData && urbanData.schools.length > 0) {
              schools = {
                ...urbanData,
                data_source: 'urban_institute'
              };
            }
          } catch (error: any) {
            console.log(`[Schools] Urban Institute fetch failed: ${error.message}`);
          }
        }
      } else {
        // No coordinates available - still try Urban Institute with FIPS only (no distance calculations)
        console.log(`[Schools] No coordinates available - trying Urban Institute with FIPS only`);
        if (fipsCode) {
          try {
            const urbanData = await fetchSchoolData(fipsCode, null, null);
            if (urbanData && urbanData.schools.length > 0) {
              schools = {
                ...urbanData,
                data_source: 'urban_institute'
              };
              console.log(`[Schools] Urban Institute (FIPS only) returned ${schools.schools.length} schools`);
            }
          } catch (error: any) {
            console.log(`[Schools] Urban Institute (FIPS only) failed: ${error.message}`);
          }
        }
      }
      
      console.log(`[Schools] Result: source=${schools?.data_source || 'none'}, count=${schools?.schools?.length || 0}`);

      // Look up census tract GEOID (used for NFIP claims and Opportunity Zone)
      let censusTract: string | null = null;
      if (resolvedLat !== null && resolvedLon !== null) {
        try {
          censusTract = await lookupCensusTract(resolvedLat, resolvedLon);
          console.log(`[CensusTract] Tract GEOID: ${censusTract || 'not found'}`);
        } catch (ctError: any) {
          console.warn('[CensusTract] Lookup failed:', ctError.message);
        }
      }

      // Fetch flood risk data using resolved coordinates + census tract (for NFIP claims)
      let floodRiskData: FloodRiskData | null = null;
      
      if (resolvedLat !== null && resolvedLon !== null) {
        try {
          const estimatedValue = propertyListings?.median_price || demographics?.medianHomeValue || 350000;
          floodRiskData = await fetchFloodRiskData(resolvedLat, resolvedLon, estimatedValue, censusTract);
          console.log(`[Flood Risk] Zone: ${floodRiskData.floodZone}, Risk: ${floodRiskData.riskLevel}, Score: ${floodRiskData.floodScore}, NFIP claims: ${floodRiskData.nfipClaims?.totalClaimsPaid ?? 'n/a'}`);
        } catch (floodError: any) {
          console.error('[Flood Risk] Error:', floodError.message);
        }
      } else {
        console.log('[Flood Risk] No coordinates available for flood risk lookup');
      }

      // Fetch EPA Environmental Risk, USGS Seismic, FHFA, Redfin, IRS migration, and OZ in parallel
      let environmentalRiskData: EnvironmentalRiskData | null = null;
      let seismicRiskData: SeismicRiskData | null = null;
      let fhfaAppreciationData = null;
      let redfinMarketHeatData = null;
      let irsMigrationData = null;
      let opportunityZoneData = null;
      let jobsProximityData = null;

      const stateForPipeline = extractStateFromAddress(address) || '';
      
      const [epaResult, usgsResult, fhfaResult, redfinResult, irsResult, ozResult, jobsResult] = await Promise.allSettled([
        resolvedLat !== null && resolvedLon !== null
          ? fetchEnvironmentalRisk(resolvedLat, resolvedLon)
          : Promise.resolve(null),
        resolvedLat !== null && resolvedLon !== null
          ? fetchSeismicRisk(resolvedLat, resolvedLon)
          : Promise.resolve(null),
        stateForPipeline ? queryFHFAAppreciation(stateForPipeline) : Promise.resolve(null),
        stateForPipeline ? queryRedfinMarketHeat(stateForPipeline) : Promise.resolve(null),
        fipsCode ? queryIRSMigration(fipsCode) : Promise.resolve(null),
        censusTract ? lookupOpportunityZone(censusTract) : Promise.resolve(null),
        censusTract ? getJobsProximity(censusTract) : Promise.resolve(null),
      ]);

      if (epaResult.status === 'fulfilled') environmentalRiskData = epaResult.value;
      if (usgsResult.status === 'fulfilled') seismicRiskData = usgsResult.value;
      if (fhfaResult.status === 'fulfilled') fhfaAppreciationData = fhfaResult.value;
      if (redfinResult.status === 'fulfilled') redfinMarketHeatData = redfinResult.value;
      if (irsResult.status === 'fulfilled') irsMigrationData = irsResult.value;
      if (ozResult.status === 'fulfilled') opportunityZoneData = ozResult.value;
      if (jobsResult.status === 'fulfilled') jobsProximityData = jobsResult.value;
      console.log(`[OZ] Is Opportunity Zone: ${opportunityZoneData?.isOpportunityZone ?? 'n/a'} (tract: ${censusTract || 'unknown'})`);
      console.log(`[LODES] Jobs in tract: ${jobsProximityData?.totalJobs?.toLocaleString() ?? 'pending/unavailable'}`);

      console.log(`[EPA] Risk: ${environmentalRiskData?.riskLevel || 'unavailable'}`);
      console.log(`[USGS] Seismic PGA: ${seismicRiskData?.pga || 'unavailable'}%g`);
      console.log(`[FHFA] State ${stateForPipeline}: 5yr appreciation ${fhfaAppreciationData?.appreciation5yr ?? 'unavailable'}%`);
      console.log(`[Redfin] Market heat: ${redfinMarketHeatData?.marketHeat || 'unavailable'}`);
      console.log(`[IRS Migration] County ${fipsCode}: net ${irsMigrationData?.netMigration ?? 'unavailable'}`);

      // Calculate investment score including market data, school quality, and crime data
      const { finalScore, scoreBreakdown } = calculateInvestmentScore({
        demographics: { ...demographics, ...growth },
        walkability,
        propertyListings,
        marketData,
        schools,
        crimeData,
        fhfaData: fhfaAppreciationData,
        redfinData: redfinMarketHeatData,
        irsMigrationData,
        jobsProximityData,
      });

      // Generate AI-powered investment analysis
      const investmentAnalysis = await generateInvestmentAnalysis({
        address,
        zipCode,
        finalScore,
        scoreBreakdown,
        demographics: { ...demographics, ...growth },
        walkability,
        propertyListings,
        marketData,
        schools
      });

      // Fetch comprehensive affordability data (Tier 1 + Tier 2 metrics)
      let affordabilityData: ComprehensiveAffordabilityData | null = null;
      try {
        const stateCode = extractStateFromAddress(address) || 'TX';
        const medianHomeValue = demographics.medianHomeValue || marketData?.medianHomeValue || 350000;
        const medianIncome = demographics.medianIncome || 65000;
        const medianRent = demographics.medianRent || marketData?.medianRent || 1500;
        const populationGrowth = growth.populationGrowth5yr || 0;
        
        console.log(`[Affordability] Fetching for ZIP ${zipCode}, State ${stateCode}`);
        affordabilityData = await fetchComprehensiveAffordabilityData(
          zipCode,
          stateCode,
          medianHomeValue,
          medianIncome,
          medianRent,
          populationGrowth
        );
        console.log(`[Affordability] Successfully fetched. Investment Grade: ${affordabilityData.investmentGrade.grade}`);
      } catch (affordabilityError: any) {
        console.error('[Affordability] Error fetching data:', affordabilityError.message);
      }

      // Calculate estimated property price with priority:
      // 1. Address-matched listing (searched property found in listings)
      // 2. Median listing price in ZIP (representative, not a random comparable)
      // 3. Census median home value
      // 4. Hardcoded default
      let estimatedPropertyPrice: { price: number; source: 'listing' | 'median' | 'census' | 'default'; sourceDescription: string };

      // Attempt to match the searched address against available listings
      const normalizeAddr = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      const searchedNorm = normalizeAddr(address);
      const matchedListing = propertyListings?.listings?.find(l => {
        const listingNorm = normalizeAddr(l.address || '');
        // Match if the searched address tokens appear in the listing address
        const searchTokens = searchedNorm.split(' ').filter(t => t.length > 1);
        return searchTokens.length > 0 && searchTokens.every(t => listingNorm.includes(t));
      });

      if (matchedListing && matchedListing.price > 0) {
        estimatedPropertyPrice = {
          price: matchedListing.price,
          source: 'listing',
          sourceDescription: 'Listing price for this specific property from active MLS data'
        };
      } else if (propertyListings?.median_price && propertyListings.median_price > 0) {
        estimatedPropertyPrice = {
          price: propertyListings.median_price,
          source: 'median',
          sourceDescription: `Median listing price from ${propertyListings.total_count} comparable listings in ZIP ${zipCode}. Adjust to the actual listing price for the most accurate estimate.`
        };
      } else if (demographics?.medianHomeValue && demographics.medianHomeValue > 0) {
        estimatedPropertyPrice = {
          price: demographics.medianHomeValue,
          source: 'census',
          sourceDescription: 'Median home value from US Census data. Adjust to the actual listing price for the most accurate estimate.'
        };
      } else {
        estimatedPropertyPrice = {
          price: 350000,
          source: 'default',
          sourceDescription: 'Default estimate (no market data available). Please enter the actual listing price.'
        };
      }

      const result: PropertyAnalysisResult = {
        address,
        zipCode,
        fipsCode,
        censusTract,
        opportunityZone: opportunityZoneData,
        score: finalScore,
        scoreBreakdown,
        demographics: { ...demographics, ...growth },
        walkability,
        propertyListings,
        marketData,
        schools,
        crimeData,
        enrichedCrimeData,
        investmentAnalysis,
        estimatedPropertyPrice,
        affordabilityData,
        floodRisk: floodRiskData,
        environmentalRisk: environmentalRiskData,
        seismicRisk: seismicRiskData,
        fhfaAppreciation: fhfaAppreciationData,
        redfinMarketHeat: redfinMarketHeatData,
        irsMigration: irsMigrationData,
        jobsProximity: jobsProximityData,
        resolvedCoordinates,
        apiStatus: {
          census: censusResult.status === 'fulfilled' ? 'success' : 'error',
          growth: growthResult.status === 'fulfilled' ? 'success' : 'error',
          walkability: walkabilityResult.status === 'fulfilled' ? 'success' : 'error',
          propertyListings: propertyResult.status === 'fulfilled' ? 'success' : 'error',
          marketData: marketDataResult.status === 'fulfilled' ? 'success' : 'error',
          schools: schools ? 'success' : 'error',
          crimeData: enrichedCrimeData ? 'success' : 'error',
          affordability: affordabilityData ? 'success' : 'error',
          floodRisk: floodRiskData ? 'success' : 'error',
          environmentalRisk: environmentalRiskData ? 'success' : 'error',
          seismicRisk: seismicRiskData ? 'success' : 'error',
          jobsProximity: jobsProximityData ? 'success' : 'error',
        }
      };

      // Deduct one credit
      const deducted = await storage.deductCredit(userId);
      if (!deducted) {
        return res.status(403).json({ 
          error: "Failed to deduct credit. Please try again." 
        });
      }

      // Save the analysis with full result data for caching
      await storage.recordAnalysisWithResult({
        userId,
        address,
        addressNormalized,
        zipCode,
        score: Math.round(finalScore),
        creditsUsed: 1,
        resultData: result,
        fromCache: false
      });

      res.json(result);
    } catch (error: any) {
      console.error('Analysis error:', error);
      res.status(500).json({ 
        error: "Failed to analyze property",
        details: error.message 
      });
    }
  });

  // GET /api/credit-purchases - Get user's credit purchase history
  app.get("/api/credit-purchases", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const purchases = await storage.getCreditPurchases(userId);
      res.json(purchases);
    } catch (error: any) {
      console.error('Credit purchases error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/search-history - Get user's search history
  app.get("/api/search-history", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const analyses = await storage.getUserAnalyses(userId);
      
      // Return analyses with summary info (full resultData available for detail view)
      const history = analyses.map(analysis => ({
        id: analysis.id,
        address: analysis.address,
        zipCode: analysis.zipCode,
        score: analysis.score,
        fromCache: analysis.fromCache,
        createdAt: analysis.createdAt,
        hasFullResult: !!analysis.resultData
      }));
      
      res.json(history);
    } catch (error: any) {
      console.error('Search history error:', error);
      res.status(500).json({ 
        error: "Failed to fetch search history",
        details: error.message 
      });
    }
  });
  
  // GET /api/search-history/:id - Get full analysis result by ID
  app.get("/api/search-history/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Get user's analyses and find the specific one
      const analyses = await storage.getUserAnalyses(userId);
      const analysis = analyses.find(a => a.id === id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      if (!analysis.resultData) {
        return res.status(404).json({ error: "Full analysis data not available for this search" });
      }
      
      res.json({
        id: analysis.id,
        address: analysis.address,
        zipCode: analysis.zipCode,
        score: analysis.score,
        fromCache: analysis.fromCache,
        createdAt: analysis.createdAt,
        result: analysis.resultData
      });
    } catch (error: any) {
      console.error('Search history detail error:', error);
      res.status(500).json({ 
        error: "Failed to fetch analysis details",
        details: error.message 
      });
    }
  });

  // GET /api/explore-census/:zipCode - Explore additional Census data
  app.get("/api/explore-census/:zipCode", async (req, res) => {
    try {
      const { zipCode } = req.params;
      
      if (!zipCode || !/^\d{5}$/.test(zipCode)) {
        return res.status(400).json({ 
          error: "Invalid ZIP code - must be 5 digits" 
        });
      }

      console.log(`Exploring Census datasets for ZIP: ${zipCode}`);
      
      const results = await exploreCensusData(zipCode);
      
      // Calculate summary statistics
      const summary = {
        totalDatasets: results.length,
        available: results.filter(r => r.available).length,
        unavailable: results.filter(r => !r.available).length,
        apiKeyUsed: !!process.env.CENSUS_API_KEY
      };
      
      res.json({
        zipCode,
        summary,
        datasets: results
      });
    } catch (error: any) {
      console.error('Census exploration error:', error);
      res.status(500).json({ 
        error: "Failed to explore Census data",
        details: error.message 
      });
    }
  });

  // Admin routes
  
  // GET /api/admin/users - Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      console.error('Admin get users error:', error);
      res.status(500).json({ 
        error: "Failed to fetch users",
        details: error.message 
      });
    }
  });

  // POST /api/admin/users/:id/credits - Add or remove credits (admin only)
  app.post("/api/admin/users/:id/credits", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        credits: z.number().int(),
        reason: z.string().optional()
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: validationResult.error.issues.map(i => i.message).join(', ')
        });
      }
      
      const { credits, reason } = validationResult.data;
      
      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.addCredits(id, credits);
      
      console.log(`Admin credit adjustment: ${credits} credits ${credits > 0 ? 'added to' : 'removed from'} user ${user.email}. Reason: ${reason || 'N/A'}`);
      
      const updatedUser = await storage.getUserById(id);
      res.json(updatedUser);
    } catch (error: any) {
      console.error('Admin credit adjustment error:', error);
      
      // Return 400 for business logic errors (like insufficient credits)
      if (error.message?.includes('Cannot deduct') || error.message?.includes('only has')) {
        return res.status(400).json({ 
          error: error.message
        });
      }
      
      res.status(500).json({ 
        error: "Failed to adjust credits",
        details: error.message 
      });
    }
  });

  // GET /api/admin/analyses - Get all analyses (admin only)
  app.get("/api/admin/analyses", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const allAnalyses = await storage.getAllAnalyses(limit);
      res.json(allAnalyses);
    } catch (error: any) {
      console.error('Admin get analyses error:', error);
      res.status(500).json({ 
        error: "Failed to fetch analyses",
        details: error.message 
      });
    }
  });

  // GET /api/mortgage/rates - Get current mortgage rates
  app.get("/api/mortgage/rates", async (req, res) => {
    try {
      const { fetchMortgageRates } = await import("./services/mortgage");
      const rates = await fetchMortgageRates();
      res.json(rates);
    } catch (error: any) {
      console.error('Mortgage rates error:', error);
      res.status(500).json({ 
        error: "Failed to fetch mortgage rates",
        details: error.message 
      });
    }
  });

  // POST /api/mortgage/calculate - Calculate mortgage payment
  app.post("/api/mortgage/calculate", async (req, res) => {
    try {
      const schema = z.object({
        homePrice: z.number().positive(),
        downPaymentPercent: z.number().min(0).max(100),
        interestRate: z.number().min(0).max(30),
        loanTermYears: z.number().int().positive(),
        propertyTaxRate: z.number().min(0).max(10).optional(),
        homeInsuranceYearly: z.number().min(0).optional(),
        includePmi: z.boolean().optional()
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: validationResult.error.issues.map(i => i.message).join(', ')
        });
      }
      
      const { calculateMortgage } = await import("./services/mortgage");
      const calculation = calculateMortgage(
        validationResult.data.homePrice,
        validationResult.data.downPaymentPercent,
        validationResult.data.interestRate,
        validationResult.data.loanTermYears,
        validationResult.data.propertyTaxRate,
        validationResult.data.homeInsuranceYearly,
        validationResult.data.includePmi
      );
      
      res.json(calculation);
    } catch (error: any) {
      console.error('Mortgage calculation error:', error);
      res.status(500).json({ 
        error: "Failed to calculate mortgage",
        details: error.message 
      });
    }
  });

  // =============================================================================
  // DATA PIPELINE ADMIN ROUTES
  // =============================================================================

  // GET /api/admin/data-pipeline/status - Get status of all data sources
  app.get("/api/admin/data-pipeline/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { getPipelineStatus } = await import("./services/dataPipeline");
      const status = await getPipelineStatus();
      res.json(status);
    } catch (error: any) {
      console.error('Data pipeline status error:', error);
      res.status(500).json({ 
        error: "Failed to get pipeline status",
        details: error.message 
      });
    }
  });

  // POST /api/admin/data-pipeline/download-all - Trigger download of all data sources
  app.post("/api/admin/data-pipeline/download-all", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { runAllDownloads } = await import("./services/dataPipeline");
      const results = await runAllDownloads();
      res.json({ success: true, results });
    } catch (error: any) {
      console.error('Data pipeline download-all error:', error);
      res.status(500).json({ 
        error: "Failed to run downloads",
        details: error.message 
      });
    }
  });

  // POST /api/admin/data-pipeline/download/:source - Trigger download of specific data source
  app.post("/api/admin/data-pipeline/download/:source", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { source } = req.params;
      const validSources = ['fred_mortgage_rates', 'hud_fair_market_rent', 'bls_employment_data', 'census_building_permits', 'fbi_crime_stats', 'zillow_home_value_forecast', 'zillow_rent_forecast', 'zillow_market_metrics', 'fhfa_hpi_data', 'redfin_market_data', 'irs_migration_data', 'opportunity_zones', 'jobs_data'];
      
      if (!validSources.includes(source)) {
        return res.status(400).json({ 
          error: "Invalid data source",
          validSources 
        });
      }
      
      const { runScheduledDownload } = await import("./services/dataPipeline");
      const result = await runScheduledDownload(source);
      res.json(result);
    } catch (error: any) {
      console.error('Data pipeline download error:', error);
      res.status(500).json({ 
        error: "Failed to run download",
        details: error.message 
      });
    }
  });

  // GET /api/admin/data-pipeline/mortgage-rates - Get cached mortgage rate data
  app.get("/api/admin/data-pipeline/mortgage-rates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 60;
      const { getMortgageRatesFromCache } = await import("./services/dataPipeline");
      const rates = await getMortgageRatesFromCache(limit);
      res.json(rates);
    } catch (error: any) {
      console.error('Get mortgage rates error:', error);
      res.status(500).json({ 
        error: "Failed to get mortgage rates",
        details: error.message 
      });
    }
  });

  // GET /api/data-pipeline/trends/:stateCode - Get trend data for a state (public endpoint for reports)
  app.get("/api/data-pipeline/trends/:stateCode", async (req, res) => {
    try {
      const { stateCode } = req.params;
      const { 
        getEmploymentTrend, 
        getPermitsTrend, 
        getCrimeTrend,
        getMortgageRatesFromCache 
      } = await import("./services/dataPipeline");
      
      const [employment, permits, crime, mortgageRates] = await Promise.all([
        getEmploymentTrend(stateCode, 12),
        getPermitsTrend(stateCode),
        getCrimeTrend(stateCode),
        getMortgageRatesFromCache(52),
      ]);
      
      res.json({
        stateCode: stateCode.toUpperCase(),
        employment,
        permits,
        crime,
        mortgageRates,
      });
    } catch (error: any) {
      console.error('Get trends error:', error);
      res.status(500).json({ 
        error: "Failed to get trend data",
        details: error.message 
      });
    }
  });

  // GET /api/data-pipeline/forecast/:zipCode - Get forecast data for a ZIP code
  app.get("/api/data-pipeline/forecast/:zipCode", async (req, res) => {
    try {
      const { zipCode } = req.params;
      const stateCode = req.query.state as string;
      const metro = req.query.metro as string;
      
      const { 
        getHomeValueForecastByZip,
        getHomeValueForecastByState,
        getRentForecast,
        getMarketMetricsByState,
        getZillowDataStatus
      } = await import("./services/dataPipeline");
      
      let homeValueForecast = await getHomeValueForecastByZip(zipCode);
      
      if (!homeValueForecast && stateCode) {
        homeValueForecast = await getHomeValueForecastByState(stateCode);
      }
      
      const [rentForecast, marketVelocity, dataStatus] = await Promise.all([
        getRentForecast(),
        stateCode ? getMarketMetricsByState(stateCode) : null,
        getZillowDataStatus(),
      ]);
      
      res.json({
        zipCode,
        homeValueForecast,
        rentForecast,
        marketVelocity,
        dataStatus,
        dataSources: {
          homeValueForecast: homeValueForecast ? 'zillow_csv' : 'unavailable',
          rentForecast: rentForecast ? 'zillow_csv' : 'unavailable',
          marketVelocity: marketVelocity ? 'zillow_csv' : 'unavailable',
        },
      });
    } catch (error: any) {
      console.error('Get forecast error:', error);
      res.status(500).json({ 
        error: "Failed to get forecast data",
        details: error.message 
      });
    }
  });

  // GET /api/admin/data-pipeline/zillow-status - Get Zillow data status
  app.get("/api/admin/data-pipeline/zillow-status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { getZillowDataStatus } = await import("./services/dataPipeline");
      const status = await getZillowDataStatus();
      res.json(status);
    } catch (error: any) {
      console.error('Get Zillow status error:', error);
      res.status(500).json({ 
        error: "Failed to get Zillow status",
        details: error.message 
      });
    }
  });

  // GET /api/admin/data-pipeline/rentcast-quota - Get RentCast API quota status
  app.get("/api/admin/data-pipeline/rentcast-quota", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { getRentCastQuotaStatus, getRentCastCacheStats } = await import("./services/dataPipeline");
      const [quota, cache] = await Promise.all([
        getRentCastQuotaStatus(),
        getRentCastCacheStats(),
      ]);
      res.json({ quota, cache });
    } catch (error: any) {
      console.error('Get RentCast quota error:', error);
      res.status(500).json({ 
        error: "Failed to get RentCast quota",
        details: error.message 
      });
    }
  });

  // POST /api/rentcast/property - Get property data from RentCast (with caching)
  app.post("/api/rentcast/property", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }
      
      const { getRentCastPropertyData } = await import("./services/dataPipeline");
      const result = await getRentCastPropertyData(address);
      
      res.json(result);
    } catch (error: any) {
      console.error('RentCast property error:', error);
      res.status(500).json({ 
        error: "Failed to get property data",
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
