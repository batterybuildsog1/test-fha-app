/**
 * Loan Product Domain Entity
 * 
 * Defines the loan product interface and implementations for FHA and Conventional loans.
 * Uses strategy pattern for different loan type calculations.
 */

import { BorrowerProfile } from "./BorrowerProfile";
import { DTILimits, QualificationResult } from "./types";

export interface AbstractLoanProduct {
  type: 'fha' | 'conventional';
  calculateLimits(profile: BorrowerProfile): DTILimits;
  validateQualification(profile: BorrowerProfile): QualificationResult;
  getMinDownPayment(): number;
  getMaxLTV(): number;
  getProductSpecificFactors(): string[];
}

export interface LoanProductConfig {
  name: string;
  type: 'fha' | 'conventional';
  limits: {
    frontEnd: {
      default: number;
      warning: number;
      hardCap: number | null;
    };
    backEnd: {
      default: number;
      warning: number;
      hardCap: number | null;
    };
  };
  requirements: {
    minDownPayment: number;
    maxLTV: number;
    minCreditScore: number;
  };
  features: {
    allowsCompensatingFactors: boolean;
    hasEnergyEfficiencyBonus: boolean;
    supportsHighDTI: boolean;
  };
}

// FHA Loan Product Configuration
export const FHA_PRODUCT_CONFIG: LoanProductConfig = {
  name: "FHA Loan",
  type: "fha",
  limits: {
    frontEnd: {
      default: 31,
      warning: 37,
      hardCap: 40,
    },
    backEnd: {
      default: 43,
      warning: 47,
      hardCap: 56.99,
    },
  },
  requirements: {
    minDownPayment: 3.5,
    maxLTV: 96.5,
    minCreditScore: 580,
  },
  features: {
    allowsCompensatingFactors: true,
    hasEnergyEfficiencyBonus: true,
    supportsHighDTI: true,
  },
};

// Conventional Loan Product Configuration
export const CONVENTIONAL_PRODUCT_CONFIG: LoanProductConfig = {
  name: "Conventional Loan",
  type: "conventional",
  limits: {
    frontEnd: {
      default: 28,
      warning: 36,
      hardCap: null, // DU is flexible
    },
    backEnd: {
      default: 36,
      warning: 45,
      hardCap: 50,
    },
  },
  requirements: {
    minDownPayment: 3.0,
    maxLTV: 97.0,
    minCreditScore: 620,
  },
  features: {
    allowsCompensatingFactors: true,
    hasEnergyEfficiencyBonus: false,
    supportsHighDTI: false,
  },
};

// Helper functions for loan products
export const getLoanProductConfig = (
  type: 'fha' | 'conventional'
): LoanProductConfig => {
  switch (type) {
    case 'fha':
      return FHA_PRODUCT_CONFIG;
    case 'conventional':
      return CONVENTIONAL_PRODUCT_CONFIG;
    default:
      throw new Error(`Unknown loan product type: ${type}`);
  }
};

export const isQualifiedForLoanType = (
  profile: BorrowerProfile,
  loanType: 'fha' | 'conventional'
): boolean => {
  const config = getLoanProductConfig(loanType);
  return profile.creditScore >= config.requirements.minCreditScore;
};

export const getBestLoanType = (
  profile: BorrowerProfile
): 'fha' | 'conventional' | null => {
  const qualifiesForFHA = isQualifiedForLoanType(profile, 'fha');
  const qualifiesForConventional = isQualifiedForLoanType(profile, 'conventional');
  
  if (qualifiesForConventional && qualifiesForFHA) {
    // Generally prefer conventional for higher credit scores
    return profile.creditScore >= 720 ? 'conventional' : 'fha';
  } else if (qualifiesForFHA) {
    return 'fha';
  } else if (qualifiesForConventional) {
    return 'conventional';
  }
  
  return null;
};