/**
 * DTI Calculation Action
 * 
 * Convex action for orchestrating DTI calculations with validation and error handling.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { ApiResponse, DTIResponse, ValidationError } from "../domain/types";
import { solveMaxPITI } from "../services/dtiService";
import { validationService } from "../services/validationService";
import { api } from "../_generated/api";

export const solveDTI = action({
  args: {
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
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
  },
  handler: async (ctx, args): Promise<ApiResponse<DTIResponse>> => {
    try {
      // Validate inputs
      const validatedArgs = validationService.validateDTIRequest(args);
      
      // Call pure service function
      const result = solveMaxPITI(validatedArgs);
      
      // Store calculation audit trail if borrower profile is provided
      if (args.borrowerProfileId) {
        await ctx.runMutation(api.functions.insertDTICalculation, {
          borrowerProfileId: args.borrowerProfileId,
          request: validatedArgs,
          response: result,
          timestamp: Date.now(),
          schemaVersion: 1,
        });
      }
      
      return { ok: true, data: result };
    } catch (error) {
      console.error('DTI calculation error:', error);
      
      let code = 'INTERNAL';
      let message = 'Internal server error';
      
      if (error instanceof ValidationError) {
        code = 'VALIDATION';
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      return {
        ok: false,
        code,
        message,
      };
    }
  },
});

export const evaluateDTI = action({
  args: {
    annualIncome: v.number(),
    monthlyDebts: v.number(),
    proposedPITI: v.number(),
    loanType: v.string(),
    fico: v.number(),
    ltv: v.number(),
    factors: v.object({}),
    propertyTaxRate: v.optional(v.number()),
    annualInsurance: v.optional(v.number()),
    downPaymentPercent: v.optional(v.number()),
    pmiRate: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    termYears: v.optional(v.number()),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
  },
  handler: async (ctx, args) => {
    try {
      // Validate inputs
      const validatedArgs = validationService.validateDTIRequest(args);
      
      // Import evaluateDTI from service
      const { evaluateDTI } = await import("../services/dtiService");
      const result = evaluateDTI(validatedArgs);
      
      // Store calculation audit trail if borrower profile is provided
      if (args.borrowerProfileId) {
        // Get DTI response for audit trail
        const dtiResponse = solveMaxPITI(validatedArgs);
        
        await ctx.runMutation(api.functions.insertDTICalculation, {
          borrowerProfileId: args.borrowerProfileId,
          request: validatedArgs,
          response: dtiResponse,
          timestamp: Date.now(),
          schemaVersion: 1,
        });
      }
      
      return { ok: true, data: result };
    } catch (error) {
      console.error('DTI evaluation error:', error);
      
      let code = 'INTERNAL';
      let message = 'Internal server error';
      
      if (error instanceof ValidationError) {
        code = 'VALIDATION';
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      return {
        ok: false,
        code,
        message,
      };
    }
  },
});

export const calculateBorrowingPower = action({
  args: {
    annualIncome: v.number(),
    monthlyDebts: v.number(),
    loanType: v.string(),
    fico: v.number(),
    ltv: v.number(),
    factors: v.object({}),
    propertyTaxRate: v.optional(v.number()),
    annualInsurance: v.optional(v.number()),
    downPaymentPercent: v.optional(v.number()),
    pmiRate: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    termYears: v.optional(v.number()),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
  },
  handler: async (ctx, args) => {
    try {
      // Validate inputs
      const validatedArgs = validationService.validateDTIRequest(args);
      
      // Import calculateMaxPurchasePriceWithDTI from service
      const { calculateMaxPurchasePriceWithDTI } = await import("../services/dtiService");
      const result = calculateMaxPurchasePriceWithDTI(validatedArgs);
      
      // Store calculation audit trail if borrower profile is provided
      if (args.borrowerProfileId) {
        await ctx.runMutation(api.functions.insertDTICalculation, {
          borrowerProfileId: args.borrowerProfileId,
          request: validatedArgs,
          response: result.dtiResponse,
          timestamp: Date.now(),
          schemaVersion: 1,
        });
      }
      
      return { ok: true, data: result };
    } catch (error) {
      console.error('Borrowing power calculation error:', error);
      
      let code = 'INTERNAL';
      let message = 'Internal server error';
      
      if (error instanceof ValidationError) {
        code = 'VALIDATION';
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      return {
        ok: false,
        code,
        message,
      };
    }
  },
});