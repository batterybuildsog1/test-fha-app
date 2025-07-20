import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }),

  scenarios: defineTable({
    // userId: v.id("users"), // Removed for simplicity
    housePrice: v.number(),
    downPayment: v.number(),
    interestRate: v.number(),
    loanTerm: v.number(),
    zipCode: v.string(),
    creditScore: v.string(),
    // Store the calculated results
    monthlyPayment: v.number(),
    principalInterest: v.number(),
    propertyTax: v.number(),
    insurance: v.number(),
    pmi: v.number(),
    // Enhanced scenario management fields
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    // DTI Integration fields
    dtiSnapshot: v.optional(v.object({
      allowed: v.object({frontEnd: v.number(), backEnd: v.number()}),
      actual: v.object({frontEnd: v.number(), backEnd: v.number()}),
      maxPITI: v.number(),
      flags: v.array(v.string()),
      strongFactorCount: v.number(),
    })),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
    // Income and debt info for DTI calculations
    annualIncome: v.optional(v.number()),
    monthlyDebts: v.optional(v.number()),
    dtiStatus: v.optional(v.string()),
    loanType: v.optional(v.string()),
    schemaVersion: v.optional(v.number()),
  })
    .index("by_created", ["createdAt"])
    .index("by_updated", ["updatedAt"])
    .index("by_archived", ["isArchived"])
    .index("by_borrower", ["borrowerProfileId"]),

  propertyTaxRates: defineTable({
    zipCode: v.string(),
    rawTaxRate: v.optional(v.number()),  // Temporarily optional for migration
    taxRate: v.optional(v.number()),     // Legacy field - will be removed
    timestamp: v.number(),               // ms since epoch
    ownerDiscountApplied: v.optional(v.boolean()), // Legacy field - will be removed
  }),

  insuranceRates: defineTable({
    state: v.string(),
    rate: v.number(),                // Legacy: annual premium for unspecified coverage
    per1000Rate: v.optional(v.number()), // New: rate per $1,000 of coverage
    timestamp: v.number(),
  }),

  homesteadExemptions: defineTable({
    state: v.string(),                // "UT"
    exemptionType: v.union(v.literal("percentage"), v.literal("dollar"), v.literal("none")),
    exemptionValue: v.number(),       // 0.45 or 100000 or 0
    source: v.string(),               // "official site url"
    timestamp: v.number(),
    needsReview: v.boolean(),
    notes: v.optional(v.string()),    // "Nuances like school taxes only"
  }).index("by_state", ["state"]),

  fhaRates: defineTable({
    key: v.string(),
    rate: v.number(),
    timestamp: v.number(),
  }),

  // DTI System Tables
  borrowerProfiles: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
    schemaVersion: v.optional(v.number()),
  })
    .index("by_updated", ["updatedAt"])
    .index("by_credit_score", ["creditScore"]),

  dtiCalculations: defineTable({
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
    timestamp: v.number(),
    schemaVersion: v.optional(v.number()),
  })
    .index("by_borrower_timestamp", ["borrowerProfileId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // DTI Wizard Sessions
  dtiWizardSessions: defineTable({
    userId: v.string(), // Can be anonymous UUID or authenticated user
    sessionId: v.string(),
    currentStep: v.number(),
    completedSteps: v.array(v.number()),
    isComplete: v.boolean(),
    data: v.object({
      income: v.optional(v.object({
        annualIncome: v.optional(v.number()),
        monthlyIncome: v.optional(v.number()),
        employmentType: v.optional(v.string()),
        otherIncome: v.optional(v.number()),
      })),
      debts: v.optional(v.array(v.object({
        id: v.string(),
        type: v.string(),
        name: v.string(),
        monthlyPayment: v.number(),
        balance: v.optional(v.number()),
      }))),
      compensatingFactors: v.optional(v.object({
        cashReserves: v.optional(v.string()),
        excellentCredit: v.optional(v.boolean()),
        minimalDebtIncrease: v.optional(v.boolean()),
        residualIncome: v.optional(v.boolean()),
        lowLTV: v.optional(v.boolean()),
        energyEfficientHome: v.optional(v.boolean()),
      })),
      creditInfo: v.optional(v.object({
        creditScore: v.optional(v.number()),
        loanType: v.optional(v.string()),
        downPaymentPercent: v.optional(v.number()),
        propertyType: v.optional(v.string()),
      })),
      results: v.optional(v.object({
        frontEndRatio: v.optional(v.number()),
        backEndRatio: v.optional(v.number()),
        maxLoanAmount: v.optional(v.number()),
        isQualified: v.optional(v.boolean()),
      })),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),
});