/**
 * Loan Product Validation Schema
 * 
 * Zod schemas for validating loan product data and related inputs.
 */

import { z } from "zod";

// Loan Product Type validation
export const loanProductTypeSchema = z.enum(["fha", "conventional"]);

// DTI Limits validation
export const dtiLimitsSchema = z.object({
  frontEnd: z.object({
    default: z.number().min(0).max(100),
    maximum: z.number().min(0).max(100),
    warning: z.number().min(0).max(100),
    hardCap: z.number().min(0).max(100).nullable(),
  }),
  backEnd: z.object({
    default: z.number().min(0).max(100),
    maximum: z.number().min(0).max(100),
    warning: z.number().min(0).max(100),
    hardCap: z.number().min(0).max(100).nullable(),
  }),
});

// Qualification Result validation
export const qualificationResultSchema = z.object({
  qualified: z.boolean(),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// Loan Product Config validation
export const loanProductConfigSchema = z.object({
  name: z.string().min(1),
  type: loanProductTypeSchema,
  limits: z.object({
    frontEnd: z.object({
      default: z.number().min(0).max(100),
      warning: z.number().min(0).max(100),
      hardCap: z.number().min(0).max(100).nullable(),
    }),
    backEnd: z.object({
      default: z.number().min(0).max(100),
      warning: z.number().min(0).max(100),
      hardCap: z.number().min(0).max(100).nullable(),
    }),
  }),
  requirements: z.object({
    minDownPayment: z.number().min(0).max(100),
    maxLTV: z.number().min(0).max(100),
    minCreditScore: z.number().min(300).max(850),
  }),
  features: z.object({
    allowsCompensatingFactors: z.boolean(),
    hasEnergyEfficiencyBonus: z.boolean(),
    supportsHighDTI: z.boolean(),
  }),
});

// Loan Application validation
export const loanApplicationSchema = z.object({
  borrowerProfileId: z.string(),
  loanType: loanProductTypeSchema,
  requestedAmount: z.number().min(1).max(10000000),
  homePrice: z.number().min(1).max(10000000),
  downPayment: z.number().min(0).max(10000000),
  interestRate: z.number().min(0).max(30),
  termYears: z.number().min(5).max(50),
  propertyTaxRate: z.number().min(0).max(10).optional(),
  annualInsurance: z.number().min(0).max(100000).optional(),
  pmiRate: z.number().min(0).max(5).optional(),
});

// Loan Eligibility Check validation
export const loanEligibilityCheckSchema = z.object({
  creditScore: z.number().min(300).max(850),
  loanType: loanProductTypeSchema,
  downPaymentPercent: z.number().min(0).max(100),
  annualIncome: z.number().min(1).max(10000000),
  monthlyDebts: z.number().min(0).max(100000),
});

// Validation functions
export const validateLoanProductType = (data: unknown) => {
  return loanProductTypeSchema.parse(data);
};

export const validateDTILimits = (data: unknown) => {
  return dtiLimitsSchema.parse(data);
};

export const validateQualificationResult = (data: unknown) => {
  return qualificationResultSchema.parse(data);
};

export const validateLoanProductConfig = (data: unknown) => {
  return loanProductConfigSchema.parse(data);
};

export const validateLoanApplication = (data: unknown) => {
  return loanApplicationSchema.parse(data);
};

export const validateLoanEligibilityCheck = (data: unknown) => {
  return loanEligibilityCheckSchema.parse(data);
};

// Type exports for use in other modules
export type LoanProductTypeInput = z.infer<typeof loanProductTypeSchema>;
export type DTILimitsInput = z.infer<typeof dtiLimitsSchema>;
export type QualificationResultInput = z.infer<typeof qualificationResultSchema>;
export type LoanProductConfigInput = z.infer<typeof loanProductConfigSchema>;
export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;
export type LoanEligibilityCheckInput = z.infer<typeof loanEligibilityCheckSchema>;