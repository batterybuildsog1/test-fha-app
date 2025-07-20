/**
 * Central export file for all DTI validation schemas and utilities
 * 
 * This file provides a single point of import for all validation-related
 * functionality used throughout the DTI wizard components.
 */

// Export all schemas
export {
  incomeSchema,
  debtItemSchema,
  debtItemsSchema,
  compensatingFactorsSchema,
  extendedCompensatingFactorsSchema,
  creditInfoSchema,
  dtiResultSchema,
} from './dti';

// Export DTI limits configuration
export { DTI_LIMITS } from './dti';

// Export DTI configuration
export {
  DTI_PROGRAM_LIMITS,
  COMPENSATING_FACTOR_CONFIG,
  DTI_CALCULATION_RULES,
  DTI_STATUS_THRESHOLDS,
  getDTILimits,
  getDTIStatus,
  type DTILimitConfig,
} from './dti-config';

// Export validation helper functions
export {
  validateDTIRatios,
  validateCompleteness,
  formatZodError,
  validateDebtItem,
  validateIncome,
  calculateTotalMonthlyDebt,
  evaluateCompensatingFactors,
} from './dti';

// Export types inferred from schemas
import { z } from 'zod';
import {
  incomeSchema,
  debtItemSchema,
  debtItemsSchema,
  compensatingFactorsSchema,
  extendedCompensatingFactorsSchema,
  creditInfoSchema,
  dtiResultSchema,
} from './dti';

export type IncomeData = z.infer<typeof incomeSchema>;
export type DebtItem = z.infer<typeof debtItemSchema>;
export type DebtItems = z.infer<typeof debtItemsSchema>;
export type CompensatingFactors = z.infer<typeof compensatingFactorsSchema>;
export type ExtendedCompensatingFactors = z.infer<typeof extendedCompensatingFactorsSchema>;
export type CreditInfo = z.infer<typeof creditInfoSchema>;
export type DTIResult = z.infer<typeof dtiResultSchema>;