import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all DTI calculations for a specific borrower profile
export const getByBorrowerProfile = query({
  args: { borrowerProfileId: v.id("borrowerProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dtiCalculations")
      .withIndex("by_borrower_timestamp", (q) =>
        q.eq("borrowerProfileId", args.borrowerProfileId)
      )
      .order("desc")
      .collect();
  },
});

// Get a specific DTI calculation by ID
export const getById = query({
  args: { id: v.id("dtiCalculations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get the most recent DTI calculation for a borrower
export const getMostRecentForBorrower = query({
  args: { borrowerProfileId: v.id("borrowerProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dtiCalculations")
      .withIndex("by_borrower_timestamp", (q) =>
        q.eq("borrowerProfileId", args.borrowerProfileId)
      )
      .order("desc")
      .first();
  },
});

// Get DTI calculations within a date range
export const getByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("dtiCalculations")
      .withIndex("by_timestamp")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      );
    
    // Optionally filter by borrower
    if (args.borrowerProfileId) {
      query = query.filter((q) =>
        q.eq(q.field("borrowerProfileId"), args.borrowerProfileId)
      );
    }
    
    return await query.order("desc").collect();
  },
});

// Create a new DTI calculation record
export const create = mutation({
  args: {
    borrowerProfileId: v.id("borrowerProfiles"),
    request: v.object({
      annualIncome: v.number(),
      monthlyDebts: v.number(),
      loanType: v.string(),
      fico: v.number(),
      ltv: v.number(),
      factors: v.object({}),
      proposedPITI: v.optional(v.number()),
      propertyTaxRate: v.optional(v.number()),
      annualInsurance: v.optional(v.number()),
      downPaymentPercent: v.optional(v.number()),
      pmiRate: v.optional(v.number()),
      interestRate: v.optional(v.number()),
      termYears: v.optional(v.number()),
    }),
    response: v.object({
      allowed: v.object({
        frontEnd: v.number(),
        backEnd: v.number(),
      }),
      actual: v.object({
        frontEnd: v.number(),
        backEnd: v.number(),
      }),
      maxPITI: v.number(),
      strongFactorCount: v.number(),
      flags: v.array(v.string()),
      enhancedFactors: v.object({}),
      calculationDetails: v.object({
        monthlyIncome: v.number(),
        maxHousingPayment: v.number(),
        availableAfterDebts: v.number(),
        factorAdjustments: v.array(v.string()),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const calculationId = await ctx.db.insert("dtiCalculations", {
      ...args,
      timestamp: Date.now(),
      schemaVersion: 1,
    });
    return calculationId;
  },
});

// Delete a DTI calculation (typically for cleanup or user request)
export const remove = mutation({
  args: { id: v.id("dtiCalculations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Delete all DTI calculations for a specific borrower profile
export const removeAllForBorrower = mutation({
  args: { borrowerProfileId: v.id("borrowerProfiles") },
  handler: async (ctx, args) => {
    const calculations = await ctx.db
      .query("dtiCalculations")
      .withIndex("by_borrower_timestamp", (q) =>
        q.eq("borrowerProfileId", args.borrowerProfileId)
      )
      .collect();
    
    // Delete each calculation
    for (const calc of calculations) {
      await ctx.db.delete(calc._id);
    }
    
    return { deleted: calculations.length };
  },
});

// Get DTI calculations with specific flags
export const getByFlags = query({
  args: {
    flags: v.array(v.string()),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
  },
  handler: async (ctx, args) => {
    let calculations = await ctx.db
      .query("dtiCalculations")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
    
    // Filter by borrower if specified
    if (args.borrowerProfileId) {
      calculations = calculations.filter(
        (calc) => calc.borrowerProfileId === args.borrowerProfileId
      );
    }
    
    // Filter by flags - calculation must have at least one of the specified flags
    return calculations.filter((calc) =>
      args.flags.some((flag) => calc.response.flags.includes(flag))
    );
  },
});

// Get statistics for DTI calculations
export const getStatistics = query({
  args: {
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
    days: v.optional(v.number()), // Look back this many days
  },
  handler: async (ctx, args) => {
    const cutoffDate = args.days 
      ? Date.now() - (args.days * 24 * 60 * 60 * 1000)
      : 0;
    
    let calculations = await ctx.db
      .query("dtiCalculations")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), cutoffDate))
      .collect();
    
    // Filter by borrower if specified
    if (args.borrowerProfileId) {
      calculations = calculations.filter(
        (calc) => calc.borrowerProfileId === args.borrowerProfileId
      );
    }
    
    if (calculations.length === 0) {
      return {
        count: 0,
        averageFrontEndDTI: 0,
        averageBackEndDTI: 0,
        averageMaxPITI: 0,
        commonFlags: [],
      };
    }
    
    // Calculate statistics
    const stats = calculations.reduce(
      (acc, calc) => {
        acc.totalFrontEnd += calc.response.actual.frontEnd;
        acc.totalBackEnd += calc.response.actual.backEnd;
        acc.totalMaxPITI += calc.response.maxPITI;
        
        // Count flags
        calc.response.flags.forEach((flag) => {
          acc.flagCounts[flag] = (acc.flagCounts[flag] || 0) + 1;
        });
        
        return acc;
      },
      {
        totalFrontEnd: 0,
        totalBackEnd: 0,
        totalMaxPITI: 0,
        flagCounts: {} as Record<string, number>,
      }
    );
    
    // Sort flags by frequency
    const commonFlags = Object.entries(stats.flagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([flag, count]) => ({ flag, count }));
    
    return {
      count: calculations.length,
      averageFrontEndDTI: stats.totalFrontEnd / calculations.length,
      averageBackEndDTI: stats.totalBackEnd / calculations.length,
      averageMaxPITI: stats.totalMaxPITI / calculations.length,
      commonFlags,
    };
  },
});