import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all borrower profiles (most recent first)
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("borrowerProfiles")
      .withIndex("by_updated")
      .order("desc")
      .collect();
  },
});

// Get a specific borrower profile by ID
export const getById = query({
  args: { id: v.id("borrowerProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get borrower profiles by credit score range
export const getByCreditScoreRange = query({
  args: {
    minScore: v.number(),
    maxScore: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("borrowerProfiles")
      .withIndex("by_credit_score")
      .filter((q) =>
        q.and(
          q.gte(q.field("creditScore"), args.minScore),
          q.lte(q.field("creditScore"), args.maxScore)
        )
      )
      .collect();
  },
});

// Create a new borrower profile
export const create = mutation({
  args: {
    annualIncome: v.number(),
    monthlyDebts: v.number(),
    creditScore: v.number(),
    zipCode: v.string(),
    state: v.string(),
    debtItems: v.object({
      carLoan: v.number(),
      studentLoan: v.number(),
      creditCard: v.number(),
      personalLoan: v.number(),
      otherDebt: v.number(),
    }),
    compensatingFactors: v.object({
      cashReserves: v.string(),
      residualIncome: v.string(),
      housingPaymentIncrease: v.string(),
      employmentHistory: v.string(),
      creditUtilization: v.string(),
      downPayment: v.string(),
      energyEfficient: v.optional(v.string()),
      overtimeIncome: v.optional(v.string()),
      minimumDebtPayments: v.optional(v.string()),
      paymentShock: v.optional(v.string()),
      liquidAssets: v.optional(v.string()),
      additionalIncome: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const profileId = await ctx.db.insert("borrowerProfiles", {
      ...args,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    return profileId;
  },
});

// Update an existing borrower profile
export const update = mutation({
  args: {
    id: v.id("borrowerProfiles"),
    annualIncome: v.optional(v.number()),
    monthlyDebts: v.optional(v.number()),
    creditScore: v.optional(v.number()),
    zipCode: v.optional(v.string()),
    state: v.optional(v.string()),
    debtItems: v.optional(v.object({
      carLoan: v.number(),
      studentLoan: v.number(),
      creditCard: v.number(),
      personalLoan: v.number(),
      otherDebt: v.number(),
    })),
    compensatingFactors: v.optional(v.object({
      cashReserves: v.string(),
      residualIncome: v.string(),
      housingPaymentIncrease: v.string(),
      employmentHistory: v.string(),
      creditUtilization: v.string(),
      downPayment: v.string(),
      energyEfficient: v.optional(v.string()),
      overtimeIncome: v.optional(v.string()),
      minimumDebtPayments: v.optional(v.string()),
      paymentShock: v.optional(v.string()),
      liquidAssets: v.optional(v.string()),
      additionalIncome: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a borrower profile (hard delete)
export const remove = mutation({
  args: { id: v.id("borrowerProfiles") },
  handler: async (ctx, args) => {
    // First, check if there are any associated DTI calculations
    const calculations = await ctx.db
      .query("dtiCalculations")
      .withIndex("by_borrower_timestamp", (q) => 
        q.eq("borrowerProfileId", args.id)
      )
      .first();
    
    if (calculations) {
      throw new Error("Cannot delete borrower profile with existing DTI calculations. Consider archiving instead.");
    }
    
    await ctx.db.delete(args.id);
  },
});

// Get the most recent borrower profile (useful for resuming sessions)
export const getMostRecent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("borrowerProfiles")
      .withIndex("by_updated")
      .order("desc")
      .first();
  },
});

// Create or update a borrower profile based on unique criteria
export const upsert = mutation({
  args: {
    // Use credit score + zip code as a pseudo-unique identifier
    creditScore: v.number(),
    zipCode: v.string(),
    // All the profile data
    annualIncome: v.number(),
    monthlyDebts: v.number(),
    state: v.string(),
    debtItems: v.object({
      carLoan: v.number(),
      studentLoan: v.number(),
      creditCard: v.number(),
      personalLoan: v.number(),
      otherDebt: v.number(),
    }),
    compensatingFactors: v.object({
      cashReserves: v.string(),
      residualIncome: v.string(),
      housingPaymentIncrease: v.string(),
      employmentHistory: v.string(),
      creditUtilization: v.string(),
      downPayment: v.string(),
      energyEfficient: v.optional(v.string()),
      overtimeIncome: v.optional(v.string()),
      minimumDebtPayments: v.optional(v.string()),
      paymentShock: v.optional(v.string()),
      liquidAssets: v.optional(v.string()),
      additionalIncome: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { creditScore, zipCode, ...profileData } = args;
    
    // Try to find an existing profile with same credit score and zip code
    const existing = await ctx.db
      .query("borrowerProfiles")
      .filter((q) =>
        q.and(
          q.eq(q.field("creditScore"), creditScore),
          q.eq(q.field("zipCode"), zipCode)
        )
      )
      .first();
    
    const now = Date.now();
    
    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, {
        ...profileData,
        creditScore,
        zipCode,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new profile
      return await ctx.db.insert("borrowerProfiles", {
        creditScore,
        zipCode,
        ...profileData,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
    }
  },
});