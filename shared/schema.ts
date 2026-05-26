import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  real,
  boolean,
  date,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"),
  stripeCustomerId: varchar("stripe_customer_id"),
  creditBalance: integer("credit_balance").default(0).notNull(),
  isAdmin: integer("is_admin").default(0).notNull(),
  isEarlyBird: integer("is_early_bird").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Credit purchases table - tracks when users buy credits
export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  credits: integer("credits").notNull(),
  amountPaid: integer("amount_paid").notNull(), // in cents
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique(), // unique to prevent duplicate processing
  status: varchar("status").notNull().default('completed'), // completed, pending, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCreditPurchaseSchema = createInsertSchema(creditPurchases).omit({
  id: true,
  createdAt: true,
});

export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;
export type CreditPurchase = typeof creditPurchases.$inferSelect;

// Analysis history table - tracks all property analyses
export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  address: varchar("address").notNull(),
  addressNormalized: varchar("address_normalized"), // Lowercase, trimmed for cache matching (nullable for legacy)
  zipCode: varchar("zip_code"),
  score: integer("score"),
  creditsUsed: integer("credits_used").default(1).notNull(),
  resultData: jsonb("result_data"), // Full PropertyAnalysisResult JSON for reuse
  fromCache: boolean("from_cache").default(false).notNull(), // Was this result served from cache?
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  addressCacheIdx: index("analyses_address_cache_idx").on(table.addressNormalized, table.createdAt),
  userHistoryIdx: index("analyses_user_history_idx").on(table.userId, table.createdAt),
}));

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

// Contact submissions table - tracks all contact form messages
export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  subject: varchar("subject").notNull(),
  message: varchar("message", { length: 5000 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
});

export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;

// =============================================================================
// DATA PIPELINE CACHE TABLES
// These tables store downloaded government data for faster access and enriched analysis
// =============================================================================

// FRED Mortgage Rates - Weekly 30-year fixed mortgage rate observations
export const fredMortgageRates = pgTable("fred_mortgage_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  observationDate: date("observation_date").notNull(),
  rate: real("rate").notNull(),
  seriesId: varchar("series_id").default('MORTGAGE30US').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fred_observation_date").on(table.observationDate),
]);

export const insertFredMortgageRateSchema = createInsertSchema(fredMortgageRates).omit({
  id: true,
  createdAt: true,
});

export type InsertFredMortgageRate = z.infer<typeof insertFredMortgageRateSchema>;
export type FredMortgageRate = typeof fredMortgageRates.$inferSelect;

// HUD Fair Market Rent - Annual FMR by county/ZIP and bedroom count
export const hudFairMarketRent = pgTable("hud_fair_market_rent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fiscalYear: integer("fiscal_year").notNull(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  countyCode: varchar("county_code", { length: 5 }),
  countyName: varchar("county_name"),
  zipCode: varchar("zip_code", { length: 10 }),
  areaName: varchar("area_name"),
  efficiency: integer("efficiency"),
  oneBedroom: integer("one_bedroom"),
  twoBedroom: integer("two_bedroom"),
  threeBedroom: integer("three_bedroom"),
  fourBedroom: integer("four_bedroom"),
  smallAreaFmr: boolean("small_area_fmr").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_hud_fmr_state").on(table.stateCode),
  index("idx_hud_fmr_zip").on(table.zipCode),
  index("idx_hud_fmr_year").on(table.fiscalYear),
]);

export const insertHudFairMarketRentSchema = createInsertSchema(hudFairMarketRent).omit({
  id: true,
  createdAt: true,
});

export type InsertHudFairMarketRent = z.infer<typeof insertHudFairMarketRentSchema>;
export type HudFairMarketRent = typeof hudFairMarketRent.$inferSelect;

// BLS Employment Data - Monthly state-level unemployment and labor force data
export const blsEmploymentData = pgTable("bls_employment_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  unemploymentRate: real("unemployment_rate"),
  laborForce: integer("labor_force"),
  employed: integer("employed"),
  unemployed: integer("unemployed"),
  laborForceParticipation: real("labor_force_participation"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bls_state").on(table.stateCode),
  index("idx_bls_year_month").on(table.year, table.month),
]);

export const insertBlsEmploymentDataSchema = createInsertSchema(blsEmploymentData).omit({
  id: true,
  createdAt: true,
});

export type InsertBlsEmploymentData = z.infer<typeof insertBlsEmploymentDataSchema>;
export type BlsEmploymentData = typeof blsEmploymentData.$inferSelect;

// Census Building Permits - Monthly state/metro permit data
export const censusBuildingPermits = pgTable("census_building_permits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateFips: varchar("state_fips", { length: 2 }),
  countyFips: varchar("county_fips", { length: 5 }),
  metroCode: varchar("metro_code", { length: 10 }),
  areaName: varchar("area_name"),
  year: integer("year").notNull(),
  month: integer("month"),
  totalUnits: integer("total_units"),
  singleFamilyUnits: integer("single_family_units"),
  multiFamilyUnits: integer("multi_family_units"),
  totalBuildings: integer("total_buildings"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_permits_state").on(table.stateCode),
  index("idx_permits_year_month").on(table.year, table.month),
]);

export const insertCensusBuildingPermitsSchema = createInsertSchema(censusBuildingPermits).omit({
  id: true,
  createdAt: true,
});

export type InsertCensusBuildingPermits = z.infer<typeof insertCensusBuildingPermitsSchema>;
export type CensusBuildingPermitsRecord = typeof censusBuildingPermits.$inferSelect;

// FBI Crime Statistics - Annual state-level crime data
export const fbiCrimeStats = pgTable("fbi_crime_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateFips: varchar("state_fips", { length: 2 }),
  year: integer("year").notNull(),
  population: integer("population"),
  violentCrimeTotal: integer("violent_crime_total"),
  violentCrimeRate: real("violent_crime_rate"),
  propertyCrimeTotal: integer("property_crime_total"),
  propertyCrimeRate: real("property_crime_rate"),
  murderTotal: integer("murder_total"),
  murderRate: real("murder_rate"),
  robberyTotal: integer("robbery_total"),
  robberyRate: real("robbery_rate"),
  assaultTotal: integer("assault_total"),
  assaultRate: real("assault_rate"),
  burglaryTotal: integer("burglary_total"),
  burglaryRate: real("burglary_rate"),
  larcenyTotal: integer("larceny_total"),
  larcenyRate: real("larceny_rate"),
  motorVehicleTheftTotal: integer("motor_vehicle_theft_total"),
  motorVehicleTheftRate: real("motor_vehicle_theft_rate"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fbi_state").on(table.stateCode),
  index("idx_fbi_year").on(table.year),
]);

export const insertFbiCrimeStatsSchema = createInsertSchema(fbiCrimeStats).omit({
  id: true,
  createdAt: true,
});

export type InsertFbiCrimeStats = z.infer<typeof insertFbiCrimeStatsSchema>;
export type FbiCrimeStatsRecord = typeof fbiCrimeStats.$inferSelect;

// Data Pipeline Status - Tracks last update timestamps for each data source
export const dataPipelineStatus = pgTable("data_pipeline_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataSource: varchar("data_source").notNull().unique(),
  lastDownloadAt: timestamp("last_download_at"),
  lastSuccessAt: timestamp("last_success_at"),
  recordCount: integer("record_count").default(0),
  status: varchar("status").default('pending'),
  errorMessage: varchar("error_message"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDataPipelineStatusSchema = createInsertSchema(dataPipelineStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDataPipelineStatus = z.infer<typeof insertDataPipelineStatusSchema>;
export type DataPipelineStatus = typeof dataPipelineStatus.$inferSelect;

// Zillow Home Value Forecast - Monthly forecasts by ZIP/Metro
export const zillowHomeValueForecast = pgTable("zillow_home_value_forecast", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regionId: varchar("region_id").notNull(),
  regionName: varchar("region_name"),
  regionType: varchar("region_type").notNull(), // 'zip', 'metro', 'state', 'country'
  stateCode: varchar("state_code", { length: 2 }),
  baseDate: date("base_date").notNull(),
  currentValue: real("current_value"),
  forecastMonthChange: real("forecast_month_change"),
  forecastQuarterChange: real("forecast_quarter_change"),
  forecastYearChange: real("forecast_year_change"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_zillow_hvf_region").on(table.regionId),
  index("idx_zillow_hvf_region_type").on(table.regionType),
  index("idx_zillow_hvf_state").on(table.stateCode),
  index("idx_zillow_hvf_date").on(table.baseDate),
]);

export const insertZillowHomeValueForecastSchema = createInsertSchema(zillowHomeValueForecast).omit({
  id: true,
  createdAt: true,
});

export type InsertZillowHomeValueForecast = z.infer<typeof insertZillowHomeValueForecastSchema>;
export type ZillowHomeValueForecast = typeof zillowHomeValueForecast.$inferSelect;

// Zillow Rent Forecast - Monthly rent forecasts by Metro
export const zillowRentForecast = pgTable("zillow_rent_forecast", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regionId: varchar("region_id").notNull(),
  regionName: varchar("region_name"),
  regionType: varchar("region_type").notNull(),
  stateCode: varchar("state_code", { length: 2 }),
  baseDate: date("base_date").notNull(),
  currentRent: real("current_rent"),
  forecastMonthChange: real("forecast_month_change"),
  forecastQuarterChange: real("forecast_quarter_change"),
  forecastYearChange: real("forecast_year_change"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_zillow_rf_region").on(table.regionId),
  index("idx_zillow_rf_region_type").on(table.regionType),
  index("idx_zillow_rf_date").on(table.baseDate),
]);

export const insertZillowRentForecastSchema = createInsertSchema(zillowRentForecast).omit({
  id: true,
  createdAt: true,
});

export type InsertZillowRentForecast = z.infer<typeof insertZillowRentForecastSchema>;
export type ZillowRentForecast = typeof zillowRentForecast.$inferSelect;

// Zillow Market Metrics - Days to Pending, Sale-to-List, Inventory
export const zillowMarketMetrics = pgTable("zillow_market_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regionId: varchar("region_id").notNull(),
  regionName: varchar("region_name"),
  regionType: varchar("region_type").notNull(),
  stateCode: varchar("state_code", { length: 2 }),
  metricDate: date("metric_date").notNull(),
  daysToPending: real("days_to_pending"),
  saleToListRatio: real("sale_to_list_ratio"),
  inventoryForSale: integer("inventory_for_sale"),
  newListings: integer("new_listings"),
  medianListPrice: real("median_list_price"),
  percentSoldAboveList: real("percent_sold_above_list"),
  percentSoldBelowList: real("percent_sold_below_list"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_zillow_mm_region").on(table.regionId),
  index("idx_zillow_mm_region_type").on(table.regionType),
  index("idx_zillow_mm_date").on(table.metricDate),
]);

export const insertZillowMarketMetricsSchema = createInsertSchema(zillowMarketMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertZillowMarketMetrics = z.infer<typeof insertZillowMarketMetricsSchema>;
export type ZillowMarketMetrics = typeof zillowMarketMetrics.$inferSelect;

// RentCast API Response Cache - Caches property-level data to maximize free tier
export const rentcastCache = pgTable("rentcast_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: varchar("address").notNull(),
  zipCode: varchar("zip_code", { length: 10 }),
  lat: real("lat"),
  lng: real("lng"),
  propertyType: varchar("property_type"),
  bedrooms: integer("bedrooms"),
  bathrooms: real("bathrooms"),
  squareFootage: integer("square_footage"),
  yearBuilt: integer("year_built"),
  rentEstimate: real("rent_estimate"),
  rentRangeLow: real("rent_range_low"),
  rentRangeHigh: real("rent_range_high"),
  priceEstimate: real("price_estimate"),
  priceRangeLow: real("price_range_low"),
  priceRangeHigh: real("price_range_high"),
  daysOnMarket: integer("days_on_market"),
  lastSaleDate: date("last_sale_date"),
  lastSalePrice: real("last_sale_price"),
  responseJson: jsonb("response_json"),
  cachedAt: timestamp("cached_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("idx_rentcast_address").on(table.address),
  index("idx_rentcast_zip").on(table.zipCode),
  index("idx_rentcast_expires").on(table.expiresAt),
]);

export const insertRentcastCacheSchema = createInsertSchema(rentcastCache).omit({
  id: true,
  cachedAt: true,
});

export type InsertRentcastCache = z.infer<typeof insertRentcastCacheSchema>;
export type RentcastCache = typeof rentcastCache.$inferSelect;

// RentCast API Quota Tracking - Tracks usage against free tier limit
export const rentcastQuota = pgTable("rentcast_quota", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  monthYear: varchar("month_year", { length: 7 }).notNull().unique(), // e.g., '2025-01'
  callsUsed: integer("calls_used").default(0).notNull(),
  callsLimit: integer("calls_limit").default(50).notNull(),
  lastCallAt: timestamp("last_call_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRentcastQuotaSchema = createInsertSchema(rentcastQuota).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRentcastQuota = z.infer<typeof insertRentcastQuotaSchema>;
export type RentcastQuota = typeof rentcastQuota.$inferSelect;

// FHFA House Price Index - State-level quarterly HPI going back to 1975
export const fhfaHpiData = pgTable("fhfa_hpi_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(), // 1-4
  indexValue: real("index_value").notNull(), // HPI index value (base 100 = 1980 Q1)
  indexSa: real("index_sa"), // Seasonally adjusted
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fhfa_state").on(table.stateCode),
  index("idx_fhfa_year_quarter").on(table.year, table.quarter),
]);

export const insertFhfaHpiDataSchema = createInsertSchema(fhfaHpiData).omit({
  id: true,
  createdAt: true,
});

export type InsertFhfaHpiData = z.infer<typeof insertFhfaHpiDataSchema>;
export type FhfaHpiDataRecord = typeof fhfaHpiData.$inferSelect;

// Redfin Market Data - City-level market heat metrics (% above list, % price drops)
export const redfinMarketData = pgTable("redfin_market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regionName: varchar("region_name").notNull(),
  stateCode: varchar("state_code", { length: 2 }),
  periodEnd: date("period_end").notNull(),
  medianSalePrice: real("median_sale_price"),
  medianSaleToList: real("median_sale_to_list"), // e.g., 0.99 = 99% of list
  pctHomesAboveList: real("pct_homes_above_list"), // 0-1 fraction
  pctHomesWithDrops: real("pct_homes_with_drops"), // 0-1 fraction
  homesSold: integer("homes_sold"),
  medianDaysOnMarket: integer("median_days_on_market"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_redfin_region").on(table.regionName),
  index("idx_redfin_state").on(table.stateCode),
  index("idx_redfin_period").on(table.periodEnd),
]);

export const insertRedfinMarketDataSchema = createInsertSchema(redfinMarketData).omit({
  id: true,
  createdAt: true,
});

export type InsertRedfinMarketData = z.infer<typeof insertRedfinMarketDataSchema>;
export type RedfinMarketDataRecord = typeof redfinMarketData.$inferSelect;

// IRS Migration Data - County-level net migration flows (annual)
export const irsMigrationData = pgTable("irs_migration_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countyFips: varchar("county_fips", { length: 5 }).notNull(),
  stateFips: varchar("state_fips", { length: 2 }).notNull(),
  stateCode: varchar("state_code", { length: 2 }),
  countyName: varchar("county_name"),
  taxYear: integer("tax_year").notNull(),
  grossInflow: integer("gross_inflow").default(0), // returns/households moving in
  grossOutflow: integer("gross_outflow").default(0), // returns/households moving out
  netMigration: integer("net_migration").default(0), // inflow - outflow
  inflowAgi: real("inflow_agi"), // Adjusted gross income of inbound movers ($000s)
  outflowAgi: real("outflow_agi"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_irs_county_fips").on(table.countyFips),
  index("idx_irs_state_fips").on(table.stateFips),
  index("idx_irs_tax_year").on(table.taxYear),
]);

export const insertIrsMigrationDataSchema = createInsertSchema(irsMigrationData).omit({
  id: true,
  createdAt: true,
});

export type InsertIrsMigrationData = z.infer<typeof insertIrsMigrationDataSchema>;
export type IrsMigrationDataRecord = typeof irsMigrationData.$inferSelect;

// Opportunity Zones — IRS/Treasury QOZ census tract list (8,764 designated tracts)
export const opportunityZones = pgTable("opportunity_zones", {
  censusTract: varchar("census_tract", { length: 11 }).primaryKey(), // 11-digit FIPS GEOID
  stateCode: varchar("state_code", { length: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type OpportunityZoneRecord = typeof opportunityZones.$inferSelect;

// LEHD/LODES Jobs Data Cache — Census Bureau workplace area characteristics
export const jobsData = pgTable("jobs_data", {
  censusTract: varchar("census_tract", { length: 11 }).primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  totalJobs: integer("total_jobs").notNull(),
  dataYear: integer("data_year").notNull(),
  sectorsJson: text("sectors_json"), // JSON of top sector breakdown
  createdAt: timestamp("created_at").defaultNow(),
});

export type JobsDataRecord = typeof jobsData.$inferSelect;

// =============================================================================
// END DATA PIPELINE CACHE TABLES
// =============================================================================

// DISABLED: Subscriptions table - keeping for future Stripe re-activation
// export const subscriptions = pgTable("subscriptions", {
//   id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
//   userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
//   plan: varchar("plan", { enum: ['starter', 'advanced'] }).notNull(),
//   status: varchar("status").notNull(),
//   stripeCustomerId: varchar("stripe_customer_id"),
//   stripeSubscriptionId: varchar("stripe_subscription_id"),
//   searchesUsed: integer("searches_used").default(0),
//   searchesLimit: integer("searches_limit").notNull(),
//   createdAt: timestamp("created_at").defaultNow(),
//   updatedAt: timestamp("updated_at").defaultNow(),
// });
//
// export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });
//
// export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
// export type Subscription = typeof subscriptions.$inferSelect;

// Property Analysis Request Schema
export const analyzePropertySchema = z.object({
  address: z.string().min(1, "Address is required"),
});

export type AnalyzePropertyRequest = z.infer<typeof analyzePropertySchema>;

// Property Analysis Response Types
export interface CensusData {
  medianIncome: number;
  population: number;
  employmentRate: number;
  collegeDegreePct: number;
  housingUnits: number;
  zipName: string;
  
  // Crime proxy metrics (Priority 1)
  povertyRate: number;
  vacancyRate: number;
  abandonmentRate: number;
  
  // Rental & investment metrics (Priority 1)
  medianRent: number;
  ownerOccupiedPct: number;
  renterOccupiedPct: number;
  
  // Housing characteristics (Priority 2)
  medianYearBuilt: number;
  medianHomeValue: number;
  highValueHomeCount: number;
  highValueHomePer1000: number;
  
  // Economic indicators (Priority 2)
  professionalEmploymentPct: number;
}

export interface GrowthData {
  populationGrowth5yr: number;
  incomeGrowth5yr: number;
  housingGrowth5yr: number;
}

export interface Amenity {
  name: string;
  type: string;
  category: string;
  distance: number;
}

export interface WalkabilityData {
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  amenityCount: number;
  amenities: Amenity[];
  lat: number | null;
  lon: number | null;
}

export interface ScoreReasoning {
  factor: string;
  value: string;
  benchmark: string;
  impact: string;
  explanation: string;
}

export interface ScoreBreakdown {
  label: string;
  score: number;
  weight: number;
  reasoning?: ScoreReasoning[];
}

export interface PropertyListing {
  property_id: string;
  listing_id: string;
  address: string;
  city: string;
  state_code: string;
  postal_code: string;
  price: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  prop_type: string;
  photo_url: string | null;
  lat: number | null;
  lon: number | null;
  daysOnZillow: number | null;
}

export interface PropertyListingsData {
  listings: PropertyListing[];
  total_count: number;
  median_price: number | null;
  avg_price: number | null;
  avg_days_on_market: number | null;
}

export interface SchoolInfo {
  school_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_miles?: number;
  charter: boolean;
  magnet: boolean;
  grades: string;
  enrollment: number;
  free_reduced_lunch_pct: number;
  poverty_pct: number;
  reading_proficiency: number;
  math_proficiency: number;
  overall_score: number;
  // SchoolDigger fields (when available)
  star_rating?: number;
  state_rank?: number;
  state_rank_of?: number;
  state_percentile?: number;
  student_teacher_ratio?: number;
  school_level?: string;
  district_name?: string;
  // SchoolDigger Pro fields
  graduation_rate?: number;
  chronic_absenteeism_rate?: number;
  spending_per_pupil?: number;
  is_title_i?: boolean;
  is_virtual?: boolean;
  county?: string;
  phone?: string;
  url?: string;
}

export interface SchoolData {
  schools: SchoolInfo[];
  average_score: number;
  top_school_score: number;
  schools_within_5_miles: number;
  // SchoolDigger summary (when available)
  data_source?: 'schooldigger' | 'urban_institute';
  average_star_rating?: number;
  top_star_rating?: number;
  average_state_percentile?: number;
  // SchoolDigger Pro summary
  average_graduation_rate?: number;
  average_spending_per_pupil?: number;
  average_absenteeism_rate?: number;
}

export interface MarketData {
  zipCode: string;
  medianHomeValue: number | null;
  medianRent: number | null;
  homeownershipRate: number | null;
  totalHousingUnits: number | null;
  occupiedUnits: number | null;
  vacantUnits: number | null;
  vacancyRate: number | null;
}

export interface CrimeData {
  stateAbbr: string;
  stateName: string;
  year: number;
  population: number;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  violentCrimeTotal: number;
  propertyCrimeTotal: number;
  murderRate: number;
  robberyRate: number;
  assaultRate: number;
  burglaryRate: number;
  larcenyRate: number;
  motorVehicleTheftRate: number;
  nationalViolentCrimeRate: number;
  nationalPropertyCrimeRate: number;
  violentCrimeVsNational: number;
  propertyCrimeVsNational: number;
  safetyScore: number;
}

export interface CrimeTypeBreakdown {
  type: string;
  label: string;
  nationalRate: number;
  description: string;
}

export interface NearbyZipCrimeData {
  zipCode: string;
  state: string;
  overallGrade: string;
  violentCrimeGrade: string;
  propertyCrimeGrade: string;
  overallScore: number;
  gradeColor: string;
  lat?: number;
  lng?: number;
}

export interface EnrichedCrimeData {
  zipCode: string;
  stateAbbr: string;
  stateName: string;
  lat?: number;
  lng?: number;
  
  zipLevelData: {
    available: boolean;
    overallGrade: string;
    overallScore: number;
    violentCrimeGrade: string;
    violentCrimeScore: number;
    propertyCrimeGrade: string;
    propertyCrimeScore: number;
    gradeLabel: string;
    gradeColor: string;
    dataYear: number;
  } | null;
  
  nearbyZips: NearbyZipCrimeData[];
  
  stateLevelData: {
    available: boolean;
    violentCrimeRate: number;
    propertyCrimeRate: number;
    violentCrimeVsNational: number;
    propertyCrimeVsNational: number;
    violentCrimeComparison: string;
    propertyCrimeComparison: string;
    murderRate: number;
    robberyRate: number;
    assaultRate: number;
    burglaryRate: number;
    larcenyRate: number;
    motorVehicleTheftRate: number;
    dataYear: number;
  } | null;
  
  nationalBenchmarks: {
    available: boolean;
    violentVictimizationRate: number;
    propertyVictimizationRate: number;
    crimeTypeBreakdowns: CrimeTypeBreakdown[];
    dataYear: number;
  } | null;
  
  compositeSafetyScore: number;
  safetyLabel: string;
  safetyColor: string;
  
  dataSources: {
    zipCode: 'rapidapi' | 'fallback' | 'unavailable';
    state: 'fbi' | 'cached' | 'unavailable';
    national: 'nibrs' | 'cached';
  };
  
  summary: {
    headline: string;
    description: string;
    keyInsights: string[];
  };
}

export interface MortgageRates {
  thirtyYearFixed: number;
  fifteenYearFixed: number;
  fiveYearArm: number;
  jumbo: number;
  fha: number;
  va: number;
  lastUpdated: string;
  source: string;
}

export interface MortgageCalculationRequest {
  homePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxRate?: number;
  homeInsuranceYearly?: number;
  includePmi?: boolean;
}

export interface MortgageCalculationResult {
  monthlyPayment: number;
  principalAndInterest: number;
  propertyTax: number;
  homeInsurance: number;
  pmi: number;
  totalInterest: number;
  totalPayment: number;
  loanAmount: number;
  downPaymentAmount: number;
}

export interface InvestmentPhase {
  title: string;
  description: string;
}

export interface InvestmentAnalysis {
  phases: InvestmentPhase[];
  pros: string[];
  cons: string[];
}

export interface EstimatedPrice {
  price: number;
  source: 'listing' | 'median' | 'census' | 'default';
  sourceDescription: string;
}

export interface RateDataPoint {
  date: string;
  rate: number;
}

export interface MortgageTrendData {
  currentRate: number;
  previousWeekRate: number;
  previousMonthRate: number;
  previousYearRate: number;
  weekOverWeekChange: number;
  monthOverMonthChange: number;
  yearOverYearChange: number;
  trendDirection: 'rising' | 'falling' | 'stable';
  trendStrength: 'strong' | 'moderate' | 'slight';
  historicalAverage: number;
  vsHistoricalAverage: number;
  rateOutlook: string;
  lastUpdated: string;
  dataSource: string;
  historicalRates: RateDataPoint[];
}

export interface OvervaluationData {
  valueToIncomeRatio: number;
  nationalAverageRatio: number;
  historicalAverageRatio: number;
  overvaluationPercent: number;
  overvaluationLabel: 'severely_overvalued' | 'overvalued' | 'fairly_valued' | 'undervalued' | 'severely_undervalued';
  overvaluationColor: string;
  riskLevel: 'high' | 'medium' | 'low';
  insight: string;
}

export interface BuyVsRentData {
  monthlyMortgagePayment: number;
  monthlyRent: number;
  buyVsRentRatio: number;
  buyVsRentDifferential: number;
  recommendation: 'buy' | 'rent' | 'neutral';
  recommendationStrength: 'strong' | 'moderate' | 'slight';
  breakEvenYears: number;
  insight: string;
}

export interface PropertyTaxData {
  estimatedAnnualTax: number;
  estimatedMonthlyTax: number;
  effectiveTaxRate: number;
  stateTaxRateAverage: number;
  vsStateAverage: string;
  taxBurdenLevel: 'high' | 'moderate' | 'low';
  insight: string;
}

export interface AffordabilityScoreData {
  score: number;
  label: string;
  color: string;
  monthlyPaymentToIncome: number;
  salaryNeededToAfford: number;
  affordabilityGap: number;
  isAffordableForMedianIncome: boolean;
  insight: string;
}

export interface FairMarketRentData {
  zipCode: string;
  countyName: string;
  stateCode: string;
  fiscalYear: number;
  efficiency: number;
  oneBedroom: number;
  twoBedroom: number;
  threeBedroom: number;
  fourBedroom: number;
  smallAreaFMR: boolean;
  metroPrimaryEstimate: boolean;
  source: 'hud_api' | 'fallback_estimate';
}

export interface FMRComparison {
  fmr: FairMarketRentData;
  marketRent: number;
  fmrVsMarket: number;
  section8Viable: boolean;
  section8Insight: string;
  rentalStrategyRecommendation: string;
}

export interface BuildingPermitsData {
  stateCode: string;
  stateName: string;
  year: number;
  month: number;
  totalUnits: number;
  singleFamilyUnits: number;
  multiFamilyUnits: number;
  yearOverYearChange: number;
  permitTrend: 'increasing' | 'decreasing' | 'stable';
  supplyOutlook: 'expanding' | 'contracting' | 'stable';
  constructionActivityLevel: 'high' | 'moderate' | 'low';
  insight: string;
  source: 'census_api' | 'fallback_estimate';
}

export interface EmploymentData {
  stateCode: string;
  stateName: string;
  unemploymentRate: number;
  laborForceParticipation: number;
  employmentGrowthYoY: number;
  nationalUnemploymentRate: number;
  vsNationalUnemployment: number;
  jobMarketStrength: 'strong' | 'moderate' | 'weak';
  jobMarketScore: number;
  topIndustries: string[];
  economicOutlook: string;
  insight: string;
  lastUpdated: string;
  source: 'bls_api' | 'fallback_estimate';
}

export interface ComprehensiveAffordabilityData {
  mortgageTrends: MortgageTrendData;
  overvaluation: OvervaluationData;
  buyVsRent: BuyVsRentData;
  propertyTax: PropertyTaxData;
  affordabilityScore: AffordabilityScoreData;
  fairMarketRent: FMRComparison;
  buildingPermits: BuildingPermitsData;
  employment: EmploymentData;
  marketTimingSignal: {
    signal: 'buy' | 'wait' | 'caution';
    confidence: number;
    factors: string[];
    reasoning?: ScoreReasoning[];
    buyScore?: number;
    maxScore?: number;
  };
  investmentGrade: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
    summary: string;
  };
  dataCompleteness: {
    tier1Complete: boolean;
    tier2Complete: boolean;
    dataSources: string[];
  };
}

// =============================================================================
// ZILLOW & RENTCAST DATA INTERFACES
// =============================================================================

export interface HomeValueForecastData {
  regionId: string;
  regionName: string;
  regionType: 'zip' | 'metro' | 'state' | 'country';
  stateCode: string;
  baseDate: string;
  currentValue: number;
  forecastMonthChange: number;
  forecastQuarterChange: number;
  forecastYearChange: number;
  forecastDirection: 'rising' | 'falling' | 'stable';
  forecastStrength: 'strong' | 'moderate' | 'slight';
  insight: string;
  source: 'zillow_csv' | 'fallback_estimate';
}

export interface RentForecastData {
  regionId: string;
  regionName: string;
  regionType: string;
  stateCode: string;
  baseDate: string;
  currentRent: number;
  forecastMonthChange: number;
  forecastQuarterChange: number;
  forecastYearChange: number;
  forecastDirection: 'rising' | 'falling' | 'stable';
  forecastStrength: 'strong' | 'moderate' | 'slight';
  insight: string;
  source: 'zillow_csv' | 'fallback_estimate';
}

export interface MarketVelocityData {
  regionId: string;
  regionName: string;
  metricDate: string;
  daysToPending: number;
  saleToListRatio: number;
  inventoryForSale: number;
  newListings: number;
  medianListPrice: number;
  percentSoldAboveList: number;
  percentSoldBelowList: number;
  marketHeat: 'hot' | 'warm' | 'balanced' | 'cool' | 'cold';
  buyerCompetition: 'high' | 'moderate' | 'low';
  insight: string;
  source: 'zillow_csv' | 'fallback_estimate';
}

export interface RentCastPropertyData {
  address: string;
  zipCode: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  rentEstimate: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  priceEstimate: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  daysOnMarket: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  source: 'rentcast_api' | 'cache';
  cachedAt: string | null;
}

export interface EnrichedForecastData {
  homeValueForecast: HomeValueForecastData | null;
  rentForecast: RentForecastData | null;
  marketVelocity: MarketVelocityData | null;
  rentCastData: RentCastPropertyData | null;
  dataSources: {
    homeValueForecast: 'zillow_csv' | 'unavailable';
    rentForecast: 'zillow_csv' | 'unavailable';
    marketVelocity: 'zillow_csv' | 'unavailable';
    rentCast: 'api' | 'cache' | 'quota_exhausted' | 'unavailable';
  };
  quotaStatus: {
    rentCastCallsUsed: number;
    rentCastCallsLimit: number;
    rentCastQuotaRemaining: number;
  };
}

// =============================================================================
// END ZILLOW & RENTCAST DATA INTERFACES
// =============================================================================

// Simplified forecast display for UI (demo/report)
export interface ForecastDisplayData {
  homeValueForecast: {
    currentValue: number;
    forecastedValue: number;
    forecastGrowth: number;
    forecastDate: string;
    regionName: string;
    regionType: string;
    dataSource: string;
  };
  rentForecast: {
    currentRent: number;
    forecastedRent: number;
    forecastGrowth: number;
    forecastDate: string;
    regionName: string;
    regionType: string;
    dataSource: string;
  };
  marketVelocity: {
    daysToPending: number;
    daysToClose: number;
    saleToListRatio: number;
    inventoryLevel: 'low' | 'moderate' | 'high';
    marketSpeed: 'fast' | 'moderate' | 'slow';
    dataSource: string;
  };
  rentalEstimate: {
    estimatedRent: number;
    rentRangeLow: number;
    rentRangeHigh: number;
    comparableCount: number;
    dataSource: string;
  };
}

// Air Quality & Environmental Risk Data (Open-Meteo AQ + AirToxScreen context)
export interface EnvironmentalRiskData {
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  riskLabel: string;
  riskScore: number; // 0-100, lower is better (less pollution)
  pm25Percentile: number; // PM2.5 national percentile approximation
  ozonePercentile: number; // Ozone national percentile approximation
  dieselPmPercentile: number; // Traffic/diesel pollution proxy (NO2-based)
  superfundProximity: boolean;
  superfundProxPercentile: number;
  wastewater: boolean;
  airQualityIndex: number; // US AQI (0-500 scale, EPA standard)
  usAqi?: number; // Raw US AQI from monitoring station
  pm25Concentration?: number; // PM2.5 in μg/m³ (actual measurement)
  ozoneConcentration?: number; // Surface ozone in μg/m³
  no2Concentration?: number; // NO2 in μg/m³
  keyRisks: string[];
  insight: string;
  dataSource: string;
  lat: number;
  lon: number;
}

// LEHD/LODES Jobs Proximity Data (Census Bureau employment statistics)
export interface JobsProximityData {
  censusTract: string;
  totalJobs: number;
  jobDensity: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  jobDensityLabel: string;
  topSectors: { name: string; jobs: number }[];
  insight: string;
  dataSource: string;
  dataYear: number;
}

// USGS Seismic Hazard Data
export interface SeismicRiskData {
  riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  riskLabel: string;
  pga: number; // Peak Ground Acceleration (%g) — 2% probability in 50 years
  insight: string;
  affectedRegion: string; // e.g., "Pacific Northwest", "Central US"
  dataSource: string;
  lat: number;
  lon: number;
}

// FHFA House Price Index Appreciation Data
export interface FHFAAppreciationData {
  stateCode: string;
  stateName: string;
  appreciation1yr: number | null; // % change YoY (latest quarter)
  appreciation5yr: number | null; // % change over 5 years
  appreciation10yr: number | null; // % change over 10 years
  appreciation20yr: number | null; // % change over 20 years
  us1yr: number | null; // US national benchmarks
  us5yr: number | null;
  us10yr: number | null;
  latestYear: number;
  latestQuarter: number;
  insight: string;
  dataSource: string;
}

// Redfin Market Heat Data
export interface RedfinMarketHeatData {
  regionName: string;
  stateCode: string;
  periodEnd: string;
  pctHomesAboveList: number | null; // 0-100 %
  pctHomesWithDrops: number | null; // 0-100 %
  medianSaleToList: number | null; // e.g., 0.99 = 99%
  medianDaysOnMarket: number | null;
  marketHeat: 'hot' | 'warm' | 'balanced' | 'cool' | 'cold';
  heatLabel: string;
  heatColor: string;
  insight: string;
  dataSource: string;
}

// IRS Net Migration Data (county-level)
export interface IRSNetMigrationData {
  countyFips: string;
  countyName: string;
  stateCode: string;
  taxYear: number;
  netMigration: number; // positive = inbound, negative = outbound
  grossInflow: number;
  grossOutflow: number;
  migrationSignal: 'strong_inbound' | 'moderate_inbound' | 'neutral' | 'moderate_outbound' | 'strong_outbound';
  migrationLabel: string;
  insight: string;
  dataSource: string;
}

export interface NfipClaimsData {
  totalClaimsPaid: number;
  totalPayoutUsd: number;
  mostRecentClaimYear: number | null;
  claimActivity: 'none' | 'low' | 'moderate' | 'high';
  claimActivityLabel: string;
  insight: string;
  censusTract: string;
}

export interface OpportunityZoneData {
  isOpportunityZone: boolean;
  censusTract: string;
  designation: string | null;
  benefitsExpireYear: number | null;
  insight: string;
}

export interface FloodRiskData {
  floodZone: string;
  floodZoneSubType: string | null;
  riskLevel: 'extreme' | 'high' | 'moderate' | 'low' | 'minimal';
  riskLabel: string;
  description: string;
  color: string;
  insuranceRequired: boolean;
  isSpecialFloodHazardArea: boolean;
  baseFloodElevation: number | null;
  floodScore: number;
  estimatedInsurance: {
    annual: number;
    monthly: number;
    note: string;
  };
  nfipClaims?: NfipClaimsData | null;
  dataSource: string;
  lat: number;
  lon: number;
}

export interface PropertyAnalysisResult {
  address: string;
  zipCode: string;
  fipsCode: string | null;
  censusTract?: string | null;
  opportunityZone?: OpportunityZoneData | null;
  score: number;
  scoreBreakdown: ScoreBreakdown[];
  demographics: CensusData & GrowthData;
  walkability: WalkabilityData;
  propertyListings: PropertyListingsData | null;
  marketData: MarketData | null;
  schools: SchoolData | null;
  crimeData: CrimeData | null;
  enrichedCrimeData: EnrichedCrimeData | null;
  investmentAnalysis: InvestmentAnalysis;
  estimatedPropertyPrice: EstimatedPrice;
  affordabilityData: ComprehensiveAffordabilityData | null;
  forecastData?: ForecastDisplayData | null;
  floodRisk: FloodRiskData | null;
  environmentalRisk?: EnvironmentalRiskData | null;
  seismicRisk?: SeismicRiskData | null;
  fhfaAppreciation?: FHFAAppreciationData | null;
  redfinMarketHeat?: RedfinMarketHeatData | null;
  irsMigration?: IRSNetMigrationData | null;
  jobsProximity?: JobsProximityData | null;
  resolvedCoordinates?: { lat: number; lon: number; source: string } | null;
  apiStatus: {
    census: 'success' | 'error';
    growth: 'success' | 'error';
    walkability: 'success' | 'error';
    propertyListings: 'success' | 'error';
    marketData: 'success' | 'error';
    schools: 'success' | 'error';
    crimeData: 'success' | 'error';
    affordability: 'success' | 'error';
    floodRisk: 'success' | 'error';
    environmentalRisk?: 'success' | 'error';
    seismicRisk?: 'success' | 'error';
    jobsProximity?: 'success' | 'error';
  };
}
