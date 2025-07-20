/**
 * Compensating Factors Service
 * 
 * Pure TypeScript service for handling compensating factors in DTI calculations.
 * Extracted from legacy app and converted to Convex-compatible format.
 */

import { CompensatingFactors } from "../domain/types";

/**
 * Compensating factors definitions (Enhanced for 2025 Guidelines)
 */
export const compensatingFactors = {
  cashReserves: {
    label: "Cash Reserves",
    options: ["none", "1-2 months", "3-5 months", "6+ months", "9+ months"],
    description: "Cash reserves available after closing (mortgage payments)",
    weight: "high",
    strongThreshold: "6+ months"
  },
  residualIncome: {
    label: "Residual Income",
    options: ["does not meet", "meets VA guidelines", "exceeds VA guidelines"],
    description: "Income remaining after all monthly expenses",
    weight: "high",
    strongThreshold: "meets VA guidelines"
  },
  housingPaymentIncrease: {
    label: "Housing Payment Increase",
    options: ["none", "<10%", "10-20%", ">20%"],
    description: "Increase in housing payment compared to current rent",
    weight: "medium",
    strongThreshold: "<10%"
  },
  employmentHistory: {
    label: "Employment History",
    options: ["<2 years", "2-5 years", "5+ years", "10+ years"],
    description: "Stability and length of employment history",
    weight: "medium",
    strongThreshold: "5+ years"
  },
  creditUtilization: {
    label: "Credit Utilization",
    options: ["none", "<10%", "10-30%", ">30%"],
    description: "Percentage of available credit currently used",
    weight: "medium",
    strongThreshold: "<10%"
  },
  downPayment: {
    label: "Down Payment",
    options: ["<5%", "5-10%", "10-20%", "20%+"],
    description: "Down payment percentage of home value",
    weight: "high",
    strongThreshold: "20%+"
  },
  energyEfficient: {
    label: "Energy-Efficient Home",
    options: ["no", "yes"],
    description: "Home meets energy-efficiency standards (ENERGY STAR, etc.)",
    weight: "medium",
    strongThreshold: "yes",
    loanTypes: ["fha"]
  },
  overtimeIncome: {
    label: "Overtime/Bonus Income",
    options: ["none", "occasional", "consistent 1+ years", "consistent 2+ years"],
    description: "Verified overtime or bonus income history",
    weight: "medium",
    strongThreshold: "consistent 2+ years"
  },
  minimumDebtPayments: {
    label: "Discretionary Debt Payments",
    options: ["high", "moderate", "minimal", "none"],
    description: "Monthly discretionary debt payments (non-housing)",
    weight: "medium",
    strongThreshold: "minimal"
  },
  paymentShock: {
    label: "Payment Shock",
    options: [">50%", "25-50%", "10-25%", "<10%"],
    description: "Percentage increase from current housing payment",
    weight: "medium",
    strongThreshold: "<10%"
  },
  liquidAssets: {
    label: "Liquid Assets",
    options: ["minimal", "moderate", "substantial", "significant"],
    description: "Liquid assets beyond reserves (stocks, bonds, etc.)",
    weight: "medium",
    strongThreshold: "substantial"
  },
  additionalIncome: {
    label: "Additional Income Sources",
    options: ["none", "rental", "investment", "business", "multiple"],
    description: "Verified additional income sources",
    weight: "medium",
    strongThreshold: "multiple"
  }
};

// Strong factor mapping for easy lookup
export const strongFactorThresholds = {
  cashReserves: ["6+ months", "9+ months"],
  residualIncome: ["meets VA guidelines", "exceeds VA guidelines"],
  housingPaymentIncrease: ["<10%"],
  employmentHistory: ["5+ years", "10+ years"],
  creditUtilization: ["<10%"],
  downPayment: ["20%+"],
  energyEfficient: ["yes"],
  overtimeIncome: ["consistent 2+ years"],
  minimumDebtPayments: ["minimal", "none"],
  paymentShock: ["<10%"],
  liquidAssets: ["substantial", "significant"],
  additionalIncome: ["multiple"]
};

// Options for non-housing DTI ratios
export enum NonHousingDTIOption {
  HIGH = ">10%",
  MODERATE = "5-10%",
  LOW = "<5%"
}

// Options for cash reserves
export enum CashReservesOption {
  NONE = "none",
  LOW = "1-2 months",
  MODERATE = "3-5 months",
  HIGH = "6+ months"
}

// Options for residual income
export enum ResidualIncomeOption {
  DOES_NOT_MEET = "does not meet",
  MEETS = "meets VA guidelines"
}

/**
 * Get credit history option based on FICO score
 */
export function getCreditHistoryOption(ficoScore: number): string {
  if (ficoScore >= 760) return "760+";
  if (ficoScore >= 720) return "720-759";
  if (ficoScore >= 680) return "680-719";
  if (ficoScore >= 640) return "640-679";
  return "<640";
}

/**
 * Determines the non-housing DTI option based on monthly debts and income
 */
export const getNonHousingDTIOption = (monthlyDebts: number, monthlyIncome: number): string => {
  if (monthlyIncome <= 0) return NonHousingDTIOption.HIGH;
  
  const nonHousingDTIPercentage = (monthlyDebts / monthlyIncome) * 100;
  if (nonHousingDTIPercentage < 5) return NonHousingDTIOption.LOW;
  if (nonHousingDTIPercentage <= 10) return NonHousingDTIOption.MODERATE;
  return NonHousingDTIOption.HIGH;
};

/**
 * Checks if a specific factor value is considered a "strong" factor for DTI enhancement
 */
export const isStrongFactor = (factor: string, value: string): boolean => {
  // Legacy mappings for backward compatibility
  const strongFactorMap: Record<string, string[]> = {
    creditHistory: ["760+"],
    nonHousingDTI: [NonHousingDTIOption.LOW],
    // Enhanced mappings
    ...strongFactorThresholds
  };
  
  return strongFactorMap[factor]?.includes(value) || false;
};

/**
 * Counts the number of strong compensating factors in the selected options
 */
export const countStrongFactors = (selectedFactors: Record<string, string>): number => {
  let count = 0;
  
  for (const [factor, option] of Object.entries(selectedFactors)) {
    if (isStrongFactor(factor, option)) {
      count++;
    }
  }
  
  return count;
};

/**
 * Creates enhanced compensating factors with calculated and derived values
 */
export const createEnhancedFactors = (
  selectedFactors: CompensatingFactors,
  ficoScore: number,
  monthlyDebts: number,
  monthlyIncome: number
): Record<string, string> => {
  // Create safe selected factors with defaults
  const safeSelectedFactors = Object.keys(compensatingFactors).reduce((acc, factor) => {
    acc[factor] = selectedFactors[factor as keyof CompensatingFactors] || "none";
    return acc;
  }, {} as Record<string, string>);
  
  // Add calculated credit history based on FICO
  const creditHistoryOption = getCreditHistoryOption(ficoScore);
  
  // Calculate non-housing DTI
  const nonHousingDTIOption = getNonHousingDTIOption(monthlyDebts, monthlyIncome);
  
  // Return enhanced factors
  return {
    ...safeSelectedFactors,
    creditHistory: creditHistoryOption,
    nonHousingDTI: nonHousingDTIOption
  };
};

/**
 * Gets the maximum DTI cap based on the number of strong factors
 */
export const getMaxDTICap = (
  strongFactorCount: number,
  loanType: 'conventional' | 'fha'
): number => {
  if (loanType === 'conventional') {
    return 50; // Conventional loans cap at 50% regardless of strong factors
  }
  
  // FHA loans can go up to 57% with at least 2 strong factors
  return strongFactorCount >= 2 ? 57 : 50;
};

/**
 * Prepares all necessary data for DTI calculation
 */
export const prepareDTICalculationData = (
  ficoScore: number,
  ltv: number,
  loanType: 'conventional' | 'fha',
  selectedFactors: CompensatingFactors = {} as CompensatingFactors,
  monthlyDebts: number = 0,
  monthlyIncome: number = 0
) => {
  // Create enhanced factors with calculated values
  const enhancedFactors = createEnhancedFactors(
    selectedFactors,
    ficoScore,
    monthlyDebts,
    monthlyIncome
  );
  
  // Count strong factors
  const strongFactorCount = countStrongFactors(enhancedFactors);
  
  // Get max DTI cap based on strong factors
  const dtiCap = getMaxDTICap(strongFactorCount, loanType);
  
  return {
    enhancedFactors,
    strongFactorCount,
    dtiCap
  };
};