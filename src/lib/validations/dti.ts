/**
 * DTI Validation Schemas
 * 
 * Comprehensive Zod validation schemas for DTI wizard components
 * ensuring data integrity and providing user-friendly error messages.
 */

import { z } from 'zod';

// ========== Income Validation ==========
export const incomeSchema = z.object({
  annualIncome: z
    .number({
      required_error: 'Annual income is required',
      invalid_type_error: 'Annual income must be a number',
    })
    .min(0, 'Annual income cannot be negative')
    .max(10000000, 'Annual income cannot exceed $10,000,000')
    .refine((val) => !isNaN(val), 'Annual income must be a valid number'),
  
  monthlyIncome: z
    .number({
      required_error: 'Monthly income is required',
      invalid_type_error: 'Monthly income must be a number',
    })
    .min(0, 'Monthly income cannot be negative')
    .refine((val) => !isNaN(val), 'Monthly income must be a valid number'),
  
  employmentType: z.enum(['w2', 'self-employed', '1099', 'retired'], {
    required_error: 'Employment type is required',
    invalid_type_error: 'Please select a valid employment type',
  }),
  
  otherIncome: z
    .number()
    .min(0, 'Other income cannot be negative')
    .optional()
    .nullable(),
});

// ========== Individual Debt Item ==========
export const debtItemSchema = z.object({
  id: z.string().min(1, 'Debt item ID is required'),
  
  type: z.enum(
    ['car_loan', 'credit_card', 'student_loan', 'personal_loan', 'other'],
    {
      required_error: 'Debt type is required',
      invalid_type_error: 'Please select a valid debt type',
    }
  ),
  
  monthlyPayment: z
    .number({
      required_error: 'Monthly payment is required',
      invalid_type_error: 'Monthly payment must be a number',
    })
    .min(0, 'Monthly payment cannot be negative')
    .refine((val) => !isNaN(val), 'Monthly payment must be a valid number'),
  
  balance: z
    .number()
    .min(0, 'Balance cannot be negative')
    .optional()
    .nullable(),
  
  name: z
    .string()
    .min(1, 'Debt name is required')
    .max(50, 'Debt name cannot exceed 50 characters')
    .trim(),
});

// ========== Debt Items Collection ==========
export const debtItemsSchema = z.object({
  carLoan: z
    .number()
    .min(0, 'Car loan payment cannot be negative')
    .default(0),
  
  studentLoan: z
    .number()
    .min(0, 'Student loan payment cannot be negative')
    .default(0),
  
  creditCard: z
    .number()
    .min(0, 'Credit card payment cannot be negative')
    .default(0),
  
  personalLoan: z
    .number()
    .min(0, 'Personal loan payment cannot be negative')
    .default(0),
  
  otherDebt: z
    .number()
    .min(0, 'Other debt payment cannot be negative')
    .default(0),
});

// ========== Compensating Factors ==========
export const compensatingFactorsSchema = z.object({
  cashReserves: z.enum(['none', '3_months', '6_months', '12_months_plus'], {
    required_error: 'Cash reserves selection is required',
    invalid_type_error: 'Please select a valid cash reserves option',
  }).default('none'),
  
  excellentCredit: z.boolean().default(false),
  
  minimalDebtIncrease: z.boolean().default(false),
  
  residualIncome: z.boolean().default(false),
  
  lowLTV: z.boolean().default(false),
  
  energyEfficientHome: z.boolean().default(false),
});

// Extended compensating factors schema (matching the context)
export const extendedCompensatingFactorsSchema = z.object({
  cashReserves: z.string().default('none'),
  residualIncome: z.string().default('does not meet'),
  housingPaymentIncrease: z.string().default('none'),
  employmentHistory: z.string().default('<2 years'),
  creditUtilization: z.string().default('none'),
  downPayment: z.string().default('<5%'),
  energyEfficient: z.string().optional(),
  overtimeIncome: z.string().optional(),
  minimumDebtPayments: z.string().optional(),
  paymentShock: z.string().optional(),
  liquidAssets: z.string().optional(),
  additionalIncome: z.string().optional(),
});

// ========== Credit and Loan Info ==========
export const creditInfoSchema = z.object({
  creditScore: z
    .number({
      required_error: 'Credit score is required',
      invalid_type_error: 'Credit score must be a number',
    })
    .min(300, 'Credit score must be at least 300')
    .max(850, 'Credit score cannot exceed 850')
    .refine((val) => Number.isInteger(val), 'Credit score must be a whole number'),
  
  loanType: z.enum(['fha', 'va', 'conventional', 'usda'], {
    required_error: 'Loan type is required',
    invalid_type_error: 'Please select a valid loan type',
  }),
  
  downPaymentPercent: z
    .number({
      required_error: 'Down payment percentage is required',
      invalid_type_error: 'Down payment percentage must be a number',
    })
    .min(0, 'Down payment cannot be negative')
    .max(100, 'Down payment cannot exceed 100%'),
  
  propertyType: z.enum(['single_family', 'condo', 'townhouse', 'multi_family'], {
    required_error: 'Property type is required',
    invalid_type_error: 'Please select a valid property type',
  }),
});

// ========== DTI Calculation Results ==========
export const dtiResultSchema = z.object({
  frontEndRatio: z
    .number()
    .min(0, 'Front-end ratio cannot be negative')
    .max(1, 'Front-end ratio cannot exceed 100%'),
  
  backEndRatio: z
    .number()
    .min(0, 'Back-end ratio cannot be negative')
    .max(1, 'Back-end ratio cannot exceed 100%'),
  
  maxLoanAmount: z
    .number()
    .min(0, 'Maximum loan amount cannot be negative'),
  
  maxMonthlyPayment: z
    .number()
    .min(0, 'Maximum monthly payment cannot be negative'),
  
  isQualified: z.boolean(),
});

// ========== DTI Limits Configuration ==========
export const DTI_LIMITS = {
  fha: { 
    frontEnd: 0.31, 
    backEnd: 0.43,
    frontEndWarning: 0.29,
    backEndWarning: 0.41,
    frontEndHardCap: 0.40,
    backEndHardCap: 0.57,
  },
  va: { 
    frontEnd: null, // VA has no front-end limit
    backEnd: 0.41,
    frontEndWarning: null,
    backEndWarning: 0.39,
    frontEndHardCap: null,
    backEndHardCap: 0.50,
  },
  conventional: { 
    frontEnd: 0.28, 
    backEnd: 0.36,
    frontEndWarning: 0.26,
    backEndWarning: 0.34,
    frontEndHardCap: 0.35,
    backEndHardCap: 0.50,
  },
  usda: { 
    frontEnd: 0.29, 
    backEnd: 0.41,
    frontEndWarning: 0.27,
    backEndWarning: 0.39,
    frontEndHardCap: 0.34,
    backEndHardCap: 0.44,
  },
} as const;

// ========== Validation Helper Functions ==========

/**
 * Validates DTI ratios against loan program requirements
 */
export function validateDTIRatios(
  frontEndRatio: number,
  backEndRatio: number,
  loanType: keyof typeof DTI_LIMITS
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const limits = DTI_LIMITS[loanType];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate front-end ratio
  if (limits.frontEnd !== null) {
    if (frontEndRatio > limits.frontEndHardCap!) {
      errors.push(`Front-end DTI (${(frontEndRatio * 100).toFixed(1)}%) exceeds hard cap of ${(limits.frontEndHardCap * 100).toFixed(0)}%`);
    } else if (frontEndRatio > limits.frontEnd) {
      warnings.push(`Front-end DTI (${(frontEndRatio * 100).toFixed(1)}%) exceeds standard limit of ${(limits.frontEnd * 100).toFixed(0)}%`);
    } else if (limits.frontEndWarning && frontEndRatio > limits.frontEndWarning) {
      warnings.push(`Front-end DTI (${(frontEndRatio * 100).toFixed(1)}%) is approaching limit`);
    }
  }

  // Validate back-end ratio
  if (backEndRatio > limits.backEndHardCap) {
    errors.push(`Back-end DTI (${(backEndRatio * 100).toFixed(1)}%) exceeds hard cap of ${(limits.backEndHardCap * 100).toFixed(0)}%`);
  } else if (backEndRatio > limits.backEnd) {
    warnings.push(`Back-end DTI (${(backEndRatio * 100).toFixed(1)}%) exceeds standard limit of ${(limits.backEnd * 100).toFixed(0)}%`);
  } else if (limits.backEndWarning && backEndRatio > limits.backEndWarning) {
    warnings.push(`Back-end DTI (${(backEndRatio * 100).toFixed(1)}%) is approaching limit`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates completeness of DTI calculation inputs
 */
export function validateCompleteness(data: {
  annualIncome?: number;
  creditScore?: number;
  loanType?: string;
  debtItems?: Record<string, number>;
}): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!data.annualIncome || data.annualIncome <= 0) {
    missingFields.push('Annual income');
  }

  if (!data.creditScore || data.creditScore < 300 || data.creditScore > 850) {
    missingFields.push('Valid credit score');
  }

  if (!data.loanType) {
    missingFields.push('Loan type');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Creates user-friendly error messages from Zod errors
 */
export function formatZodError(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const field = err.path.join('.');
    return field ? `${field}: ${err.message}` : err.message;
  });
}

/**
 * Validates a single debt item with enhanced error messages
 */
export function validateDebtItem(item: unknown): {
  isValid: boolean;
  data?: z.infer<typeof debtItemSchema>;
  errors?: string[];
} {
  try {
    const data = debtItemSchema.parse(item);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: formatZodError(error),
      };
    }
    return {
      isValid: false,
      errors: ['Invalid debt item data'],
    };
  }
}

/**
 * Validates income data with enhanced error messages
 */
export function validateIncome(income: unknown): {
  isValid: boolean;
  data?: z.infer<typeof incomeSchema>;
  errors?: string[];
} {
  try {
    const data = incomeSchema.parse(income);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: formatZodError(error),
      };
    }
    return {
      isValid: false,
      errors: ['Invalid income data'],
    };
  }
}

/**
 * Calculates total monthly debt from debt items
 */
export function calculateTotalMonthlyDebt(debtItems: z.infer<typeof debtItemsSchema>): number {
  return Object.values(debtItems).reduce((sum, amount) => sum + (amount || 0), 0);
}

/**
 * Determines if compensating factors are strong enough for higher DTI
 */
export function evaluateCompensatingFactors(
  factors: z.infer<typeof extendedCompensatingFactorsSchema>
): {
  strongFactorCount: number;
  factors: string[];
  recommendation: string;
} {
  const strongFactors: string[] = [];

  // Check each factor
  if (factors.cashReserves === '6_months' || factors.cashReserves === '12_months_plus') {
    strongFactors.push('Strong cash reserves');
  }

  if (factors.residualIncome === 'meets VA guidelines') {
    strongFactors.push('Meets VA residual income guidelines');
  }

  if (factors.housingPaymentIncrease === '<10%') {
    strongFactors.push('Minimal housing payment increase');
  }

  if (factors.employmentHistory === '>5 years') {
    strongFactors.push('Stable employment history');
  }

  if (factors.creditUtilization === '<10%') {
    strongFactors.push('Low credit utilization');
  }

  if (factors.downPayment === '>10%') {
    strongFactors.push('Substantial down payment');
  }

  const strongFactorCount = strongFactors.length;
  let recommendation = '';

  if (strongFactorCount >= 3) {
    recommendation = 'Excellent compensating factors - may qualify for higher DTI limits';
  } else if (strongFactorCount >= 2) {
    recommendation = 'Good compensating factors - improved qualification chances';
  } else if (strongFactorCount >= 1) {
    recommendation = 'Some compensating factors present - consider strengthening others';
  } else {
    recommendation = 'Limited compensating factors - focus on improving key areas';
  }

  return {
    strongFactorCount,
    factors: strongFactors,
    recommendation,
  };
}