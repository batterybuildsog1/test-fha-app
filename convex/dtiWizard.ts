/**
 * DTI Wizard Convex Functions
 * 
 * Handles persistence for DTI wizard sessions including
 * saving progress, resuming sessions, and managing session lifecycle.
 */

import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Session expiry time (30 days in milliseconds)
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// ========== Mutations ==========

/**
 * Save DTI wizard progress
 * Creates or updates a session with current wizard state
 */
export const saveProgress = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
    currentStep: v.number(),
    completedSteps: v.array(v.number()),
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if session already exists
    const existingSession = await ctx.db
      .query("dtiWizardSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, {
        currentStep: args.currentStep,
        completedSteps: args.completedSteps,
        data: args.data,
        updatedAt: now,
      });
      return existingSession._id;
    } else {
      // Create new session
      const sessionId = await ctx.db.insert("dtiWizardSessions", {
        userId: args.userId,
        sessionId: args.sessionId,
        currentStep: args.currentStep,
        completedSteps: args.completedSteps,
        isComplete: false,
        data: args.data,
        createdAt: now,
        updatedAt: now,
      });
      return sessionId;
    }
  },
});

/**
 * Complete DTI wizard session
 * Marks session as complete and saves final results
 */
export const completeWizard = mutation({
  args: {
    sessionId: v.string(),
    results: v.object({
      frontEndRatio: v.number(),
      backEndRatio: v.number(),
      maxLoanAmount: v.number(),
      isQualified: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("dtiWizardSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      isComplete: true,
      data: {
        ...session.data,
        results: args.results,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Clear DTI wizard session
 * Deletes a specific session
 */
export const clearSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("dtiWizardSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

/**
 * Clear expired sessions
 * Removes sessions older than 30 days
 */
export const clearExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const expiryDate = Date.now() - SESSION_EXPIRY_MS;
    
    const expiredSessions = await ctx.db
      .query("dtiWizardSessions")
      .filter((q) => q.lt(q.field("updatedAt"), expiryDate))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return expiredSessions.length;
  },
});

// ========== Queries ==========

/**
 * Get latest incomplete session for user
 */
export const getLatestSession = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("dtiWizardSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isComplete"), false))
      .order("desc")
      .first();

    return sessions;
  },
});

/**
 * Get specific session by ID
 */
export const getSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("dtiWizardSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return session;
  },
});

/**
 * List all sessions for a user
 */
export const listSessions = query({
  args: {
    userId: v.string(),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("dtiWizardSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (!args.includeCompleted) {
      query = query.filter((q) => q.eq(q.field("isComplete"), false));
    }

    const sessions = await query.order("desc").take(10);
    
    return sessions;
  },
});

// ========== Actions ==========

/**
 * Resume or create session
 * Checks for existing incomplete session or creates new one
 */
export const resumeOrCreateSession = action({
  args: {
    userId: v.string(),
    forceNew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Generate new session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!args.forceNew) {
      // Check for existing incomplete session
      const latestSession = await ctx.runQuery(getLatestSession, {
        userId: args.userId,
      });

      if (latestSession) {
        // Check if session is not expired
        const isExpired = Date.now() - latestSession.updatedAt > SESSION_EXPIRY_MS;
        
        if (!isExpired) {
          return {
            sessionId: latestSession.sessionId,
            isResumed: true,
            data: latestSession,
          };
        }
      }
    }

    // Create new session
    await ctx.runMutation(saveProgress, {
      userId: args.userId,
      sessionId: newSessionId,
      currentStep: 0,
      completedSteps: [],
      data: {},
    });

    return {
      sessionId: newSessionId,
      isResumed: false,
      data: null,
    };
  },
});

/**
 * Export session data
 * Returns session data in a format suitable for JSON export
 */
export const exportSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("dtiWizardSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    // Remove internal fields for export
    const { _id, _creationTime, ...exportData } = session;
    
    return {
      ...exportData,
      exportedAt: Date.now(),
      version: "1.0",
    };
  },
});

/**
 * Import session data
 * Creates a new session from imported data
 */
export const importSession = mutation({
  args: {
    userId: v.string(),
    importData: v.object({
      sessionId: v.optional(v.string()),
      currentStep: v.number(),
      completedSteps: v.array(v.number()),
      isComplete: v.boolean(),
      data: v.any(),
      version: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const newSessionId = args.importData.sessionId || 
      `imported_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate version compatibility
    const version = args.importData.version || "1.0";
    if (version !== "1.0") {
      throw new Error(`Unsupported import version: ${version}`);
    }

    const sessionId = await ctx.db.insert("dtiWizardSessions", {
      userId: args.userId,
      sessionId: newSessionId,
      currentStep: args.importData.currentStep,
      completedSteps: args.importData.completedSteps,
      isComplete: args.importData.isComplete,
      data: args.importData.data,
      createdAt: now,
      updatedAt: now,
    });

    return { sessionId: newSessionId, _id: sessionId };
  },
});