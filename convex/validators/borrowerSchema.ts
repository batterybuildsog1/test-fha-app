/**
 * Borrower Profile Validation Schema
 * 
 * Zod schemas for validating borrower profile data and related inputs.
 */

import { z } from "zod";

// Debt Items validation
export const debtItemsSchema = z.object({
  carLoan: z.number().min(0, "Car loan must be non-negative"),
  studentLoan: z.number().min(0, "Student loan must be non-negative"),
  creditCard: z.number().min(0, "Credit card debt must be non-negative"),
  personalLoan: z.number().min(0, "Personal loan must be non-negative"),
  otherDebt: z.number().min(0, "Other debt must be non-negative"),
});

// Compensating Factors validation
export const compensatingFactorsSchema = z.object({
  cashReserves: z.enum(["none", "1-2 months", "3-5 months", "6+ months", "9+ months"]),
  residualIncome: z.enum(["does not meet", "meets VA guidelines", "exceeds VA guidelines"]),
  housingPaymentIncrease: z.enum(["none", "<10%", "10-20%", ">20%"]),
  employmentHistory: z.enum(["<2 years", "2-5 years", "5+ years", "10+ years"]),
  creditUtilization: z.enum(["none", "<10%", "10-30%", ">30%"]),
  downPayment: z.enum(["<5%", "5-10%", "10-20%", "20%+"]),
  energyEfficient: z.enum(["no", "yes"]).optional(),
  overtimeIncome: z.enum(["none", "occasional", "consistent 1+ years", "consistent 2+ years"]).optional(),
  minimumDebtPayments: z.enum(["high", "moderate", "minimal", "none"]).optional(),
  paymentShock: z.enum([">50%", "25-50%", "10-25%", "<10%"]).optional(),
  liquidAssets: z.enum(["minimal", "moderate", "substantial", "significant"]).optional(),
  additionalIncome: z.enum(["none", "rental", "investment", "business", "multiple"]).optional(),
});

// Borrower Profile validation
export const borrowerProfileSchema = z.object({
  annualIncome: z.number()
    .min(1, "Annual income must be greater than 0")
    .max(10000000, "Annual income seems unrealistic"),
  monthlyDebts: z.number()
    .min(0, "Monthly debts must be non-negative")
    .max(100000, "Monthly debts seem unrealistic"),
  creditScore: z.number()
    .min(300, "Credit score must be at least 300")
    .max(850, "Credit score cannot exceed 850"),
  zipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  state: z.string()
    .length(2, "State must be 2 characters")
    .regex(/^[A-Z]{2}$/, "State must be uppercase letters"),
  debtItems: debtItemsSchema,
  compensatingFactors: compensatingFactorsSchema,
});

// Borrower Profile Create validation
export const borrowerProfileCreateSchema = borrowerProfileSchema;

// Borrower Profile Update validation (all fields optional)
export const borrowerProfileUpdateSchema = borrowerProfileSchema.partial();

// Validation functions
export const validateBorrowerProfile = (data: unknown) => {
  return borrowerProfileSchema.parse(data);
};

export const validateBorrowerProfileCreate = (data: unknown) => {
  return borrowerProfileCreateSchema.parse(data);
};

export const validateBorrowerProfileUpdate = (data: unknown) => {
  return borrowerProfileUpdateSchema.parse(data);
};

export const validateDebtItems = (data: unknown) => {
  return debtItemsSchema.parse(data);
};

export const validateCompensatingFactors = (data: unknown) => {
  return compensatingFactorsSchema.parse(data);
};

// Type exports for use in other modules
export type DebtItemsInput = z.infer<typeof debtItemsSchema>;
export type CompensatingFactorsInput = z.infer<typeof compensatingFactorsSchema>;
export type BorrowerProfileInput = z.infer<typeof borrowerProfileSchema>;
export type BorrowerProfileCreateInput = z.infer<typeof borrowerProfileCreateSchema>;
export type BorrowerProfileUpdateInput = z.infer<typeof borrowerProfileUpdateSchema>;