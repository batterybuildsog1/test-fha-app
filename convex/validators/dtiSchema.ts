/**
 * DTI Calculation Validation Schema
 * 
 * Zod schemas for validating DTI calculation requests and responses.
 */

import { z } from "zod";
import { compensatingFactorsSchema } from "./borrowerSchema";

// DTI Request validation
export const dtiRequestSchema = z.object({
  annualIncome: z.number()
    .min(1, "Annual income must be greater than 0")
    .max(10000000, "Annual income seems unrealistic"),
  monthlyDebts: z.number()
    .min(0, "Monthly debts must be non-negative")
    .max(100000, "Monthly debts seem unrealistic"),
  proposedPITI: z.number()
    .min(0, "Proposed PITI must be non-negative")
    .max(50000, "Proposed PITI seems unrealistic")
    .optional(),
  loanType: z.enum(["conventional", "fha"]),
  fico: z.number()
    .min(300, "FICO score must be at least 300")
    .max(850, "FICO score cannot exceed 850"),
  ltv: z.number()
    .min(0, "LTV must be non-negative")
    .max(100, "LTV cannot exceed 100%"),
  factors: compensatingFactorsSchema,
  propertyTaxRate: z.number()
    .min(0, "Property tax rate must be non-negative")
    .max(10, "Property tax rate seems unrealistic")
    .optional(),
  annualInsurance: z.number()
    .min(0, "Annual insurance must be non-negative")
    .max(100000, "Annual insurance seems unrealistic")
    .optional(),
  downPaymentPercent: z.number()
    .min(0, "Down payment percent must be non-negative")
    .max(100, "Down payment percent cannot exceed 100%")
    .optional(),
  pmiRate: z.number()
    .min(0, "PMI rate must be non-negative")
    .max(5, "PMI rate seems unrealistic")
    .optional(),
  interestRate: z.number()
    .min(0, "Interest rate must be non-negative")
    .max(30, "Interest rate seems unrealistic")
    .optional(),
  termYears: z.number()
    .min(5, "Term years must be at least 5")
    .max(50, "Term years cannot exceed 50")
    .optional(),
});

// DTI Evaluation Request validation
export const dtiEvaluationRequestSchema = z.object({
  borrowerProfileId: z.string(),
  proposedPITI: z.number()
    .min(0, "Proposed PITI must be non-negative")
    .max(50000, "Proposed PITI seems unrealistic"),
  loanType: z.enum(["fha", "conventional"]),
});

// DTI Solve Request validation
export const dtiSolveRequestSchema = z.object({
  borrowerProfileId: z.string(),
  loanType: z.enum(["fha", "conventional"]),
  targetLTV: z.number()
    .min(0, "Target LTV must be non-negative")
    .max(100, "Target LTV cannot exceed 100%")
    .optional(),
});

// Allowed DTI validation
export const allowedDTISchema = z.object({
  frontEnd: z.number().min(0).max(100),
  backEnd: z.number().min(0).max(100),
});

// Actual DTI validation
export const actualDTISchema = z.object({
  frontEnd: z.number().min(0),
  backEnd: z.number().min(0),
});

// DTI Response validation
export const dtiResponseSchema = z.object({
  allowed: allowedDTISchema,
  actual: actualDTISchema,
  maxPITI: z.number().min(0),
  strongFactorCount: z.number().min(0),
  flags: z.array(z.enum(["exceedsFrontEnd", "exceedsBackEnd", "withinLimits"])),
  enhancedFactors: z.record(z.string(), z.string()),
  calculationDetails: z.object({
    monthlyIncome: z.number().min(0),
    maxHousingPayment: z.number().min(0),
    availableAfterDebts: z.number(),
    factorAdjustments: z.array(z.string()),
  }),
});

// DTI Status validation
export const dtiStatusSchema = z.object({
  value: z.number().min(0),
  status: z.enum(['normal', 'caution', 'warning', 'exceeded']),
  message: z.string().min(1),
  helpText: z.string().min(1),
});

// Max PITI Result validation
export const maxPitiResultSchema = z.object({
  maxPITI: z.number().min(0),
  limits: allowedDTISchema,
  actualRatios: actualDTISchema,
  qualificationStatus: z.object({
    qualified: z.boolean(),
    issues: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
});

// API Response validation
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  ok: z.boolean(),
  data: dataSchema.optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

// Validation functions
export const validateDTIRequest = (data: unknown) => {
  return dtiRequestSchema.parse(data);
};

export const validateDTIEvaluationRequest = (data: unknown) => {
  return dtiEvaluationRequestSchema.parse(data);
};

export const validateDTISolveRequest = (data: unknown) => {
  return dtiSolveRequestSchema.parse(data);
};

export const validateDTIResponse = (data: unknown) => {
  return dtiResponseSchema.parse(data);
};

export const validateDTIStatus = (data: unknown) => {
  return dtiStatusSchema.parse(data);
};

export const validateMaxPitiResult = (data: unknown) => {
  return maxPitiResultSchema.parse(data);
};

// Type exports for use in other modules
export type DTIRequestInput = z.infer<typeof dtiRequestSchema>;
export type DTIEvaluationRequestInput = z.infer<typeof dtiEvaluationRequestSchema>;
export type DTISolveRequestInput = z.infer<typeof dtiSolveRequestSchema>;
export type DTIResponseInput = z.infer<typeof dtiResponseSchema>;
export type DTIStatusInput = z.infer<typeof dtiStatusSchema>;
export type MaxPitiResultInput = z.infer<typeof maxPitiResultSchema>;