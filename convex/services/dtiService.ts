/**
 * DTI Service - Pure TypeScript Functions
 * 
 * Core DTI calculation engine extracted from legacy app and converted to pure functions.
 * Provides bidirectional DTI solving with 2025 FHA/Conventional guideline compliance.
 */

import { DTIRequest, DTIResponse, DTIStatus, AllowedDTI, ActualDTI, MaxPitiResult, QualificationResult, CompensatingFactors } from "../domain/types";
import { countStrongFactors, createEnhancedFactors } from "./compensatingFactorService";

// Updated DTI limits aligned with 2025 guidelines
export const DTI_LIMITS_2025 = {
  CONVENTIONAL: {
    FRONT_END: {
      DEFAULT: 28,
      WARNING: 36,
      HARD_CAP: null      // DU is flexible
    },
    BACK_END: {
      DEFAULT: 36,
      WARNING: 45,
      HARD_CAP: 50
    }
  },
  FHA: {
    FRONT_END: {
      DEFAULT: 31,
      WARNING: 37,        // With 1 compensating factor
      HARD_CAP: 40        // With 2+ compensating factors
    },
    BACK_END: {
      DEFAULT: 43,
      WARNING: 47,        // With 1 compensating factor
      HARD_CAP: 56.99     // With 2+ strong factors + AUS
    }
  }
};

/**
 * Determine maximum allowable DTI limits based on FHA/Conventional rules
 * plus compensating factors following 2025 guidelines
 */
export function getAllowedLimits(
  fico: number,
  ltv: number,
  loanType: "conventional" | "fha",
  factors: CompensatingFactors
): AllowedDTI {
  const monthlyIncome = 0; // Will be passed separately in actual usage
  const monthlyDebts = 0;  // Will be passed separately in actual usage
  
  // Create enhanced factors with calculated values
  const enhancedFactors = createEnhancedFactors(factors, fico, monthlyDebts, monthlyIncome);
  const strongFactorCount = countStrongFactors(enhancedFactors);
  
  const baseLimits = DTI_LIMITS_2025[loanType.toUpperCase() as keyof typeof DTI_LIMITS_2025];
  
  if (loanType === 'conventional') {
    return calculateConventionalLimits(fico, ltv, strongFactorCount, baseLimits);
  } else {
    return calculateFHALimits(fico, ltv, strongFactorCount, baseLimits);
  }
}

/**
 * Calculate DTI limits for conventional loans
 */
function calculateConventionalLimits(
  fico: number,
  ltv: number,
  strongFactorCount: number,
  baseLimits: any
): AllowedDTI {
  let frontEnd = baseLimits.FRONT_END.DEFAULT;
  let backEnd = baseLimits.BACK_END.DEFAULT;
  
  // FICO-based adjustments
  if (fico >= 720) {
    backEnd += 3;
  } else if (fico >= 680) {
    backEnd += 2;
  }
  
  // LTV-based adjustments
  if (ltv <= 75) {
    backEnd += 3;
  } else if (ltv <= 80) {
    backEnd += 2;
  }
  
  // Strong factor adjustments
  if (strongFactorCount >= 2) {
    backEnd += 5;
  } else if (strongFactorCount === 1) {
    backEnd += 2;
  }
  
  // Apply caps
  frontEnd = Math.min(frontEnd, baseLimits.FRONT_END.WARNING);
  backEnd = Math.min(backEnd, baseLimits.BACK_END.HARD_CAP);
  
  return { frontEnd, backEnd };
}

/**
 * Calculate DTI limits for FHA loans following tiered structure
 */
function calculateFHALimits(
  fico: number,
  ltv: number,
  strongFactorCount: number,
  baseLimits: any
): AllowedDTI {
  let frontEnd = baseLimits.FRONT_END.DEFAULT;  // 31%
  let backEnd = baseLimits.BACK_END.DEFAULT;    // 43%
  
  // FICO-based adjustments
  if (fico >= 720) {
    backEnd += 5;
  } else if (fico >= 680) {
    backEnd += 3;
  }
  
  // FHA tiered limits based on compensating factors
  if (strongFactorCount >= 2) {
    // With 2+ strong factors: can go to 40/50, potentially 56.99% with AUS
    frontEnd = Math.min(40, frontEnd + 9);
    backEnd = Math.min(baseLimits.BACK_END.HARD_CAP, backEnd + 13.99);
  } else if (strongFactorCount === 1) {
    // With 1 strong factor: can go to 37/47
    frontEnd = Math.min(37, frontEnd + 6);
    backEnd = Math.min(47, backEnd + 4);
  }
  
  return { frontEnd, backEnd };
}

/**
 * Core DTI solver with bidirectional iteration
 */
export function solveMaxPITI(request: DTIRequest): DTIResponse {
  const {
    annualIncome,
    monthlyDebts,
    proposedPITI,
    loanType,
    fico,
    ltv,
    factors,
    propertyTaxRate = 1.2,
    annualInsurance = 1200,
    downPaymentPercent = 20,
    pmiRate = 0,
    interestRate = 7.5,
    termYears = 30
  } = request;
  
  // Validate inputs
  if (annualIncome <= 0) {
    throw new Error("Annual income must be greater than 0");
  }
  
  const monthlyIncome = annualIncome / 12;
  
  // Create enhanced factors with calculated values
  const enhancedFactors = createEnhancedFactors(factors, fico, monthlyDebts, monthlyIncome);
  const strongFactorCount = countStrongFactors(enhancedFactors);
  
  // Get allowed limits
  const allowed = getAllowedLimits(fico, ltv, loanType, factors);
  
  // Calculate factor adjustments for details
  const factorAdjustments: string[] = [];
  if (fico >= 720) factorAdjustments.push(`FICO ${fico} boost: +${loanType === 'fha' ? 5 : 3}%`);
  if (strongFactorCount >= 2) factorAdjustments.push(`Strong factors (${strongFactorCount}): +${loanType === 'fha' ? 13.99 : 5}%`);
  else if (strongFactorCount === 1) factorAdjustments.push(`Strong factor (1): +${loanType === 'fha' ? 4 : 2}%`);
  
  let maxPITI: number;
  let actual: ActualDTI;
  
  if (proposedPITI !== undefined) {
    // Evaluation mode: check if proposed PITI meets both limits
    maxPITI = proposedPITI;
    actual = {
      frontEnd: (proposedPITI / monthlyIncome) * 100,
      backEnd: ((proposedPITI + monthlyDebts) / monthlyIncome) * 100
    };
  } else {
    // Solving mode: find maximum PITI that satisfies both limits
    const maxHousingFromBackEnd = (monthlyIncome * (allowed.backEnd / 100)) - monthlyDebts;
    const maxHousingFromFrontEnd = monthlyIncome * (allowed.frontEnd / 100);
    
    // Take the more restrictive limit
    maxPITI = Math.max(0, Math.min(maxHousingFromBackEnd, maxHousingFromFrontEnd));
    
    actual = {
      frontEnd: (maxPITI / monthlyIncome) * 100,
      backEnd: ((maxPITI + monthlyDebts) / monthlyIncome) * 100
    };
  }
  
  // Determine flags
  const flags: ("exceedsFrontEnd" | "exceedsBackEnd" | "withinLimits")[] = [];
  if (actual.frontEnd > allowed.frontEnd) flags.push("exceedsFrontEnd");
  if (actual.backEnd > allowed.backEnd) flags.push("exceedsBackEnd");
  if (flags.length === 0) flags.push("withinLimits");
  
  // Calculate details
  const maxHousingPayment = Math.min(
    monthlyIncome * (allowed.backEnd / 100),
    monthlyIncome * (allowed.frontEnd / 100)
  );
  const availableAfterDebts = maxHousingPayment - monthlyDebts;
  
  return {
    allowed,
    actual,
    maxPITI,
    strongFactorCount,
    flags,
    enhancedFactors,
    calculationDetails: {
      monthlyIncome,
      maxHousingPayment,
      availableAfterDebts,
      factorAdjustments
    }
  };
}

/**
 * Evaluate DTI status for a proposed PITI
 */
export function evaluateDTI(request: DTIRequest): DTIStatus {
  if (!request.proposedPITI) {
    throw new Error("Proposed PITI is required for DTI evaluation");
  }

  const response = solveMaxPITI(request);
  const { actual, allowed, flags } = response;
  
  // Determine overall status based on flags
  let status: 'normal' | 'caution' | 'warning' | 'exceeded' = 'normal';
  let message = '';
  let helpText = '';
  
  if (flags.includes('withinLimits')) {
    status = 'normal';
    message = 'DTI ratios are within standard guidelines';
    helpText = `Both front-end (${actual.frontEnd.toFixed(1)}%) and back-end (${actual.backEnd.toFixed(1)}%) ratios are within acceptable limits.`;
  } else if (flags.includes('exceedsFrontEnd') || flags.includes('exceedsBackEnd')) {
    const exceedsFront = flags.includes('exceedsFrontEnd');
    const exceedsBack = flags.includes('exceedsBackEnd');
    
    if (exceedsFront && exceedsBack) {
      status = 'exceeded';
      message = 'Both DTI ratios exceed guidelines';
      helpText = `Front-end ratio (${actual.frontEnd.toFixed(1)}%) exceeds ${allowed.frontEnd}% and back-end ratio (${actual.backEnd.toFixed(1)}%) exceeds ${allowed.backEnd}%. Consider reducing the loan amount or improving compensating factors.`;
    } else if (exceedsFront) {
      status = 'warning';
      message = 'Housing ratio exceeds guidelines';
      helpText = `Front-end ratio (${actual.frontEnd.toFixed(1)}%) exceeds ${allowed.frontEnd}%. Consider reducing the housing payment or improving compensating factors.`;
    } else {
      status = 'warning';
      message = 'Total debt ratio exceeds guidelines';
      helpText = `Back-end ratio (${actual.backEnd.toFixed(1)}%) exceeds ${allowed.backEnd}%. Consider reducing debts or improving compensating factors.`;
    }
  }
  
  return {
    value: Math.max(actual.frontEnd, actual.backEnd),
    status,
    message,
    helpText
  };
}

/**
 * Calculate maximum purchase price using DTI engine
 */
export function calculateMaxPurchasePriceWithDTI(request: DTIRequest): {
  maxPurchasePrice: number;
  maxLoanAmount: number;
  dtiResponse: DTIResponse;
} {
  const {
    annualIncome,
    monthlyDebts,
    loanType,
    fico,
    ltv,
    factors,
    propertyTaxRate = 1.2,
    annualInsurance = 1200,
    downPaymentPercent = 20,
    pmiRate = 0,
    interestRate = 7.5,
    termYears = 30
  } = request;
  
  // Get DTI response
  const dtiResponse = solveMaxPITI(request);
  
  // If no PITI available, return zeros
  if (dtiResponse.maxPITI <= 0) {
    return {
      maxPurchasePrice: 0,
      maxLoanAmount: 0,
      dtiResponse
    };
  }
  
  // Calculate price components
  const monthlyPropertyTaxRate = (propertyTaxRate / 100) / 12;
  const monthlyInsuranceRate = annualInsurance / 12;
  const loanToValueRatio = ltv / 100;
  const effectivePmiRate = (pmiRate / 100) * loanToValueRatio / 12;
  
  // Calculate PI multiplier
  const monthlyRate = interestRate / 100 / 12;
  const totalPayments = termYears * 12;
  
  let piMultiplier: number;
  if (monthlyRate === 0) {
    piMultiplier = 1 / (totalPayments * loanToValueRatio);
  } else {
    piMultiplier = (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                  ((Math.pow(1 + monthlyRate, totalPayments) - 1) * loanToValueRatio);
  }
  
  // Total multiplier for home price
  const totalMultiplier = piMultiplier + monthlyPropertyTaxRate + effectivePmiRate;
  
  // Calculate max home price
  const maxPurchasePrice = (dtiResponse.maxPITI - monthlyInsuranceRate) / totalMultiplier;
  const maxLoanAmount = maxPurchasePrice * loanToValueRatio;
  
  return {
    maxPurchasePrice: Math.max(0, Math.floor(maxPurchasePrice)),
    maxLoanAmount: Math.max(0, Math.floor(maxLoanAmount)),
    dtiResponse
  };
}

/**
 * Create a qualification result based on DTI analysis
 */
export function createQualificationResult(
  dtiResponse: DTIResponse,
  loanType: 'fha' | 'conventional',
  creditScore: number
): QualificationResult {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let qualified = true;
  
  // Check DTI flags
  if (dtiResponse.flags.includes('exceedsFrontEnd')) {
    issues.push(`Front-end DTI ratio (${dtiResponse.actual.frontEnd.toFixed(1)}%) exceeds ${dtiResponse.allowed.frontEnd}%`);
    recommendations.push('Consider reducing the target home price or increasing down payment');
    qualified = false;
  }
  
  if (dtiResponse.flags.includes('exceedsBackEnd')) {
    issues.push(`Back-end DTI ratio (${dtiResponse.actual.backEnd.toFixed(1)}%) exceeds ${dtiResponse.allowed.backEnd}%`);
    recommendations.push('Consider paying down existing debts or increasing income');
    qualified = false;
  }
  
  // Check compensating factors
  if (dtiResponse.strongFactorCount < 2 && (dtiResponse.flags.includes('exceedsFrontEnd') || dtiResponse.flags.includes('exceedsBackEnd'))) {
    recommendations.push('Improve compensating factors such as cash reserves or credit utilization');
  }
  
  // Loan type specific checks
  if (loanType === 'fha' && creditScore < 580) {
    issues.push('Credit score below FHA minimum of 580');
    qualified = false;
  }
  
  if (loanType === 'conventional' && creditScore < 620) {
    issues.push('Credit score below conventional minimum of 620');
    qualified = false;
  }
  
  return {
    qualified,
    issues,
    recommendations
  };
}