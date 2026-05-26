import {
  users,
  creditPurchases,
  analyses,
  contactSubmissions,
  type User,
  type UpsertUser,
  type CreditPurchase,
  type InsertCreditPurchase,
  type Analysis,
  type InsertAnalysis,
  type ContactSubmission,
  type InsertContactSubmission,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, isNotNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  upsertUserWithEarlyBirdCheck(user: UpsertUser): Promise<{ user: User; wasNewUser: boolean; receivedEarlyBirdCredits: boolean }>;
  setUserPassword(userId: string, hashedPassword: string): Promise<void>;
  updateUserStripeCustomerId(userId: string, customerId: string): Promise<void>;
  getCreditBalance(userId: string): Promise<number>;
  addCredits(userId: string, credits: number): Promise<void>;
  deductCredit(userId: string): Promise<boolean>;
  recordCreditPurchase(purchase: InsertCreditPurchase): Promise<CreditPurchase>;
  getCreditPurchases(userId: string): Promise<CreditPurchase[]>;
  getCreditPurchaseByPaymentIntent(paymentIntentId: string): Promise<CreditPurchase | undefined>;
  purchaseCreditsFromStripe(userId: string, credits: number, amountPaid: number, paymentIntentId: string): Promise<{ success: boolean; purchase?: CreditPurchase }>;
  getAllUsers(): Promise<User[]>;
  getTotalUserCount(): Promise<number>;
  getEarlyBirdStats(): Promise<{ totalUsers: number; earlyBirdCount: number; spotsRemaining: number }>;
  recordAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAllAnalyses(limit?: number): Promise<(Analysis & { userEmail: string | null })[]>;
  getUserAnalyses(userId: string): Promise<Analysis[]>;
  findCachedAnalysisThisMonth(addressNormalized: string): Promise<Analysis | null>;
  recordAnalysisWithResult(analysisData: InsertAnalysis & { resultData: unknown; addressNormalized: string; fromCache?: boolean }): Promise<Analysis>;
  recordContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getAllContactSubmissions(limit?: number): Promise<ContactSubmission[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async setUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCreditBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.creditBalance ?? 0;
  }

  async addCredits(userId: string, credits: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const newBalance = (user.creditBalance ?? 0) + credits;
    
    // Prevent negative balances
    if (newBalance < 0) {
      throw new Error(`Cannot deduct ${Math.abs(credits)} credits. User only has ${user.creditBalance} credits.`);
    }

    await db
      .update(users)
      .set({
        creditBalance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async deductCredit(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || user.creditBalance <= 0) {
      return false;
    }

    await db
      .update(users)
      .set({
        creditBalance: user.creditBalance - 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return true;
  }

  async recordCreditPurchase(purchaseData: InsertCreditPurchase): Promise<CreditPurchase> {
    const [purchase] = await db
      .insert(creditPurchases)
      .values(purchaseData)
      .returning();
    return purchase;
  }

  async getCreditPurchases(userId: string): Promise<CreditPurchase[]> {
    return await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, userId))
      .orderBy(creditPurchases.createdAt);
  }

  async getCreditPurchaseByPaymentIntent(paymentIntentId: string): Promise<CreditPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.stripePaymentIntentId, paymentIntentId));
    return purchase;
  }

  async purchaseCreditsFromStripe(
    userId: string,
    credits: number,
    amountPaid: number,
    paymentIntentId: string
  ): Promise<{ success: boolean; purchase?: CreditPurchase }> {
    // Use a transaction to ensure atomicity
    try {
      const result = await db.transaction(async (tx) => {
        // Check if purchase already exists (idempotency check)
        const [existingPurchase] = await tx
          .select()
          .from(creditPurchases)
          .where(eq(creditPurchases.stripePaymentIntentId, paymentIntentId));

        if (existingPurchase) {
          console.log(`⚠️ Purchase with payment intent ${paymentIntentId} already processed. Skipping.`);
          return { success: false, purchase: existingPurchase };
        }

        // Verify user exists
        const [user] = await tx.select().from(users).where(eq(users.id, userId));
        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        // Insert purchase record first (this will fail if duplicate due to unique constraint)
        const [purchase] = await tx
          .insert(creditPurchases)
          .values({
            userId,
            credits,
            amountPaid,
            stripePaymentIntentId: paymentIntentId,
            status: 'completed'
          })
          .returning();

        // Add credits to user balance using atomic SQL increment
        // This prevents lost updates when multiple concurrent purchases occur
        await tx
          .update(users)
          .set({
            creditBalance: sql`${users.creditBalance} + ${credits}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        return { success: true, purchase };
      });

      return result;
    } catch (error: any) {
      // Handle unique constraint violation gracefully
      if (error.code === '23505') { // PostgreSQL unique violation error code
        console.log(`⚠️ Duplicate payment intent ${paymentIntentId} detected. Skipping.`);
        const existingPurchase = await this.getCreditPurchaseByPaymentIntent(paymentIntentId);
        return { success: false, purchase: existingPurchase };
      }
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getTotalUserCount(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async getEarlyBirdStats(): Promise<{ totalUsers: number; earlyBirdCount: number; spotsRemaining: number }> {
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const earlyBirdCount = allUsers.filter(u => u.isEarlyBird === 1).length;
    const EARLY_BIRD_LIMIT = 200;
    // Baseline offset: accounts for the owner's account in production
    // Real early bird counting starts from user #2
    const BASELINE_USER_OFFSET = 1;
    const adjustedUserCount = Math.max(0, totalUsers - BASELINE_USER_OFFSET);
    const spotsRemaining = Math.max(0, EARLY_BIRD_LIMIT - adjustedUserCount);
    
    return {
      totalUsers,
      earlyBirdCount,
      spotsRemaining
    };
  }

  async upsertUserWithEarlyBirdCheck(userData: UpsertUser): Promise<{ user: User; wasNewUser: boolean; receivedEarlyBirdCredits: boolean }> {
    const EARLY_BIRD_LIMIT = 200;
    const EARLY_BIRD_CREDITS = 2;
    // Baseline offset: accounts for the owner's account in production
    // Real early bird counting starts from user #2
    const BASELINE_USER_OFFSET = 1;

    // Check if user already exists
    const existingUser = await this.getUser(userData.id!);
    const wasNewUser = !existingUser;
    let receivedEarlyBirdCredits = false;

    if (wasNewUser) {
      // Count total users to check if we're still within early bird limit
      const totalUsers = await this.getTotalUserCount();
      const adjustedUserCount = Math.max(0, totalUsers - BASELINE_USER_OFFSET);
      
      if (adjustedUserCount < EARLY_BIRD_LIMIT) {
        // Grant early bird credits
        userData.creditBalance = EARLY_BIRD_CREDITS;
        userData.isEarlyBird = 1;
        receivedEarlyBirdCredits = true;
      }
    }

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();

    return { user, wasNewUser, receivedEarlyBirdCredits };
  }

  async recordAnalysis(analysisData: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values(analysisData)
      .returning();
    return analysis;
  }

  async getAllAnalyses(limit: number = 100): Promise<(Analysis & { userEmail: string | null })[]> {
    const results = await db
      .select({
        id: analyses.id,
        userId: analyses.userId,
        address: analyses.address,
        addressNormalized: analyses.addressNormalized,
        zipCode: analyses.zipCode,
        score: analyses.score,
        creditsUsed: analyses.creditsUsed,
        resultData: analyses.resultData,
        fromCache: analyses.fromCache,
        createdAt: analyses.createdAt,
        userEmail: users.email,
      })
      .from(analyses)
      .leftJoin(users, eq(analyses.userId, users.id))
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
    
    return results;
  }
  
  // Find a cached analysis for the same address within the current month (any user)
  async findCachedAnalysisThisMonth(addressNormalized: string): Promise<Analysis | null> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const results = await db
      .select()
      .from(analyses)
      .where(
        and(
          eq(analyses.addressNormalized, addressNormalized),
          gte(analyses.createdAt, startOfMonth),
          isNotNull(analyses.resultData) // Must have stored result data
        )
      )
      .orderBy(desc(analyses.createdAt))
      .limit(1);
    
    return results[0] || null;
  }
  
  // Save analysis with full result data
  async recordAnalysisWithResult(
    analysisData: InsertAnalysis & { resultData: unknown; addressNormalized: string; fromCache?: boolean }
  ): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values({
        ...analysisData,
        fromCache: analysisData.fromCache ?? false,
      })
      .returning();
    return analysis;
  }

  async getUserAnalyses(userId: string): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  }

  async recordContactSubmission(submissionData: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db
      .insert(contactSubmissions)
      .values(submissionData)
      .returning();
    return submission;
  }

  async getAllContactSubmissions(limit: number = 100): Promise<ContactSubmission[]> {
    return await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
