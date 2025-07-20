import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query(async ({ db }) => {
  return await db.query("scenarios")
    .withIndex("by_updated")
    .filter((q) => q.neq(q.field("isArchived"), true))
    .order("desc")
    .collect();
});

export const saveScenario = mutation({
  args: {
    housePrice: v.number(),
    downPayment: v.number(),
    interestRate: v.number(),
    loanTerm: v.number(),
    zipCode: v.string(),
    creditScore: v.string(),
    monthlyPayment: v.number(),
    principalInterest: v.number(),
    propertyTax: v.number(),
    insurance: v.number(),
    pmi: v.number(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // DTI fields
    dtiSnapshot: v.optional(v.object({
      allowed: v.object({frontEnd: v.number(), backEnd: v.number()}),
      actual: v.object({frontEnd: v.number(), backEnd: v.number()}),
      maxPITI: v.number(),
      flags: v.array(v.string()),
      strongFactorCount: v.number(),
    })),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
    annualIncome: v.optional(v.number()),
    monthlyDebts: v.optional(v.number()),
    dtiStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("scenarios", {
      ...args,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });
  },
});

export const getById = query({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateScenario = mutation({
  args: {
    id: v.id("scenarios"),
    housePrice: v.optional(v.number()),
    downPayment: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    loanTerm: v.optional(v.number()),
    zipCode: v.optional(v.string()),
    creditScore: v.optional(v.string()),
    monthlyPayment: v.optional(v.number()),
    principalInterest: v.optional(v.number()),
    propertyTax: v.optional(v.number()),
    insurance: v.optional(v.number()),
    pmi: v.optional(v.number()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // DTI fields
    dtiSnapshot: v.optional(v.object({
      allowed: v.object({frontEnd: v.number(), backEnd: v.number()}),
      actual: v.object({frontEnd: v.number(), backEnd: v.number()}),
      maxPITI: v.number(),
      flags: v.array(v.string()),
      strongFactorCount: v.number(),
    })),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
    annualIncome: v.optional(v.number()),
    monthlyDebts: v.optional(v.number()),
    dtiStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteScenario = mutation({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const archiveScenario = mutation({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  },
});
