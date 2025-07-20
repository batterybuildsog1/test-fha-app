/**
 * DTI Configuration and Limits
 * 
 * Centralized configuration for DTI limits and validation rules
 * across different loan programs.
 */

export interface DTILimitConfig {
  frontEnd: number | null;
  backEnd: number;
  frontEndWarning: number | null;
  backEndWarning: number;
  frontEndHardCap: number | null;
  backEndHardCap: number;
  description: string;
  compensatingFactorsAllowed: boolean;
  maxWithCompensating?: {
    frontEnd?: number | null;
    backEnd?: number;
  };
}

/**
 * DTI Limits by Loan Program
 * 
 * These limits are based on standard lending guidelines but can be
 * exceeded with strong compensating factors.
 */
export const DTI_PROGRAM_LIMITS: Record<string, DTILimitConfig> = {
  fha: {
    frontEnd: 0.31,
    backEnd: 0.43,
    frontEndWarning: 0.29,
    backEndWarning: 0.41,
    frontEndHardCap: 0.40,
    backEndHardCap: 0.57,
    description: 'FHA loans allow higher DTI ratios with compensating factors',
    compensatingFactorsAllowed: true,
    maxWithCompensating: {
      frontEnd: 0.40,
      backEnd: 0.57,
    },
  },
  va: {
    frontEnd: null, // VA has no front-end limit
    backEnd: 0.41,
    frontEndWarning: null,
    backEndWarning: 0.39,
    frontEndHardCap: null,
    backEndHardCap: 0.50,
    description: 'VA loans focus on residual income rather than front-end DTI',
    compensatingFactorsAllowed: true,
    maxWithCompensating: {
      frontEnd: null,
      backEnd: 0.50,
    },
  },
  conventional: {
    frontEnd: 0.28,
    backEnd: 0.36,
    frontEndWarning: 0.26,
    backEndWarning: 0.34,
    frontEndHardCap: 0.35,
    backEndHardCap: 0.50,
    description: 'Conventional loans have stricter DTI requirements',
    compensatingFactorsAllowed: true,
    maxWithCompensating: {
      frontEnd: 0.35,
      backEnd: 0.50,
    },
  },
  usda: {
    frontEnd: 0.29,
    backEnd: 0.41,
    frontEndWarning: 0.27,
    backEndWarning: 0.39,
    frontEndHardCap: 0.34,
    backEndHardCap: 0.44,
    description: 'USDA loans for rural properties with moderate DTI limits',
    compensatingFactorsAllowed: true,
    maxWithCompensating: {
      frontEnd: 0.34,
      backEnd: 0.44,
    },
  },
};

/**
 * Compensating Factors Configuration
 * 
 * Defines which factors are considered strong and their impact on DTI limits
 */
export const COMPENSATING_FACTOR_CONFIG = {
  strongFactors: {
    cashReserves: {
      threshold: '6_months',
      description: '6+ months of mortgage payments in reserves',
      impact: 'Allows up to 3% higher DTI',
    },
    creditScore: {
      threshold: 760,
      description: 'Excellent credit score (760+)',
      impact: 'Demonstrates strong payment history',
    },
    minimalDebtIncrease: {
      threshold: 0.05,
      description: 'Non-housing debt less than 5% DTI',
      impact: 'More income available for housing',
    },
    residualIncome: {
      threshold: 'meets',
      description: 'Meets VA residual income guidelines',
      impact: 'Ensures adequate living expenses coverage',
    },
    lowLTV: {
      threshold: 0.80,
      description: 'Loan-to-value ratio 80% or less',
      impact: 'Lower risk due to equity position',
    },
    stableEmployment: {
      threshold: '5_years',
      description: '5+ years with same employer',
      impact: 'Demonstrates income stability',
    },
  },
  requiredForHighDTI: 2, // Number of strong factors needed for max DTI
  maxDTIIncrease: 0.14, // Maximum DTI increase with compensating factors (14%)
};

/**
 * DTI Calculation Rules
 * 
 * Business rules for DTI calculations and adjustments
 */
export const DTI_CALCULATION_RULES = {
  // Minimum income requirements
  minAnnualIncome: 12000, // $12,000 minimum annual income
  
  // Debt calculation rules
  includeMinimumPayments: true,
  creditCardMinimumPercent: 0.02, // 2% of balance if no payment specified
  
  // Housing expense components
  includePropertyTax: true,
  includeHomeownersInsurance: true,
  includeHOA: true,
  includeMortgageInsurance: true,
  
  // Rounding rules
  roundDTI: 2, // Round to 2 decimal places
  roundCurrency: 0, // Round currency to whole dollars
};

/**
 * DTI Status Thresholds
 * 
 * Define thresholds for different DTI status levels
 */
export const DTI_STATUS_THRESHOLDS = {
  excellent: {
    maxBackEnd: 0.25,
    message: 'Excellent - Strong qualification',
    color: 'green',
  },
  good: {
    maxBackEnd: 0.33,
    message: 'Good - Well within limits',
    color: 'blue',
  },
  acceptable: {
    maxBackEnd: 0.41,
    message: 'Acceptable - Standard qualification',
    color: 'yellow',
  },
  marginal: {
    maxBackEnd: 0.50,
    message: 'Marginal - May need compensating factors',
    color: 'orange',
  },
  high: {
    maxBackEnd: 1.00,
    message: 'High - Difficult to qualify',
    color: 'red',
  },
};

/**
 * Get DTI limits for a specific loan program
 */
export function getDTILimits(loanType: string, hasCompensatingFactors: boolean = false): {
  frontEnd: number | null;
  backEnd: number;
} {
  const config = DTI_PROGRAM_LIMITS[loanType] || DTI_PROGRAM_LIMITS.conventional;
  
  if (hasCompensatingFactors && config.maxWithCompensating) {
    return {
      frontEnd: config.maxWithCompensating.frontEnd ?? config.frontEnd,
      backEnd: config.maxWithCompensating.backEnd ?? config.backEnd,
    };
  }
  
  return {
    frontEnd: config.frontEnd,
    backEnd: config.backEnd,
  };
}

/**
 * Get DTI status based on current ratio
 */
export function getDTIStatus(backEndRatio: number): {
  status: string;
  message: string;
  color: string;
} {
  for (const [status, config] of Object.entries(DTI_STATUS_THRESHOLDS)) {
    if (backEndRatio <= config.maxBackEnd) {
      return {
        status,
        message: config.message,
        color: config.color,
      };
    }
  }
  
  return DTI_STATUS_THRESHOLDS.high;
}