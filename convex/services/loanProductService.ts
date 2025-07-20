/**
 * Loan Product Service
 * 
 * Implements the strategy pattern for different loan products.
 * Provides factory methods and product-specific logic for FHA and Conventional loans.
 */

import { BorrowerProfile } from "../domain/BorrowerProfile";
import { DTILimits, QualificationResult } from "../domain/types";
import { AbstractLoanProduct, FHA_PRODUCT_CONFIG, CONVENTIONAL_PRODUCT_CONFIG } from "../domain/LoanProduct";
import { createEnhancedFactors, countStrongFactors } from "./compensatingFactorService";
import { DTI_LIMITS_2025 } from "./dtiService";

/**
 * FHA Loan Product Implementation
 */
export class FhaProduct implements AbstractLoanProduct {
  type = 'fha' as const;
  
  calculateLimits(profile: BorrowerProfile): DTILimits {
    const monthlyIncome = profile.annualIncome / 12;
    const enhancedFactors = createEnhancedFactors(
      profile.compensatingFactors,
      profile.creditScore,
      profile.monthlyDebts,
      monthlyIncome
    );
    const strongFactorCount = countStrongFactors(enhancedFactors);
    
    return this.calculateFHALimits(profile.creditScore, 80, strongFactorCount); // Default LTV
  }
  
  private calculateFHALimits(fico: number, ltv: number, strongFactorCount: number): DTILimits {
    const baseLimits = DTI_LIMITS_2025.FHA;
    
    let frontEndDefault = baseLimits.FRONT_END.DEFAULT;  // 31%
    let backEndDefault = baseLimits.BACK_END.DEFAULT;    // 43%
    
    // FICO-based adjustments
    if (fico >= 720) {
      backEndDefault += 5;
    } else if (fico >= 680) {
      backEndDefault += 3;
    }
    
    // FHA tiered limits based on compensating factors
    let frontEndMaximum = frontEndDefault;
    let backEndMaximum = backEndDefault;
    
    if (strongFactorCount >= 2) {
      // With 2+ strong factors: can go to 40/50, potentially 56.99% with AUS
      frontEndMaximum = Math.min(40, frontEndDefault + 9);
      backEndMaximum = Math.min(baseLimits.BACK_END.HARD_CAP, backEndDefault + 13.99);
    } else if (strongFactorCount === 1) {
      // With 1 strong factor: can go to 37/47
      frontEndMaximum = Math.min(37, frontEndDefault + 6);
      backEndMaximum = Math.min(47, backEndDefault + 4);
    }
    
    return {
      frontEnd: {
        default: frontEndDefault,
        maximum: frontEndMaximum,
        warning: baseLimits.FRONT_END.WARNING,
        hardCap: baseLimits.FRONT_END.HARD_CAP,
      },
      backEnd: {
        default: backEndDefault,
        maximum: backEndMaximum,
        warning: baseLimits.BACK_END.WARNING,
        hardCap: baseLimits.BACK_END.HARD_CAP,
      },
    };
  }
  
  validateQualification(profile: BorrowerProfile): QualificationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Credit score requirements
    if (profile.creditScore < 580) {
      issues.push('Credit score below FHA minimum of 580');
    } else if (profile.creditScore < 620) {
      recommendations.push('Credit score above 620 would provide better rates');
    }
    
    // Income requirements
    if (profile.annualIncome < 25000) {
      issues.push('Annual income may be too low for FHA qualification');
    }
    
    // Debt-to-income check
    const monthlyIncome = profile.annualIncome / 12;
    const backEndRatio = (profile.monthlyDebts / monthlyIncome) * 100;
    
    if (backEndRatio > 57) {
      issues.push('Debt-to-income ratio exceeds FHA maximum of 57%');
    } else if (backEndRatio > 47) {
      recommendations.push('High debt-to-income ratio may require strong compensating factors');
    }
    
    return {
      qualified: issues.length === 0,
      issues,
      recommendations
    };
  }
  
  getMinDownPayment(): number {
    return FHA_PRODUCT_CONFIG.requirements.minDownPayment;
  }
  
  getMaxLTV(): number {
    return FHA_PRODUCT_CONFIG.requirements.maxLTV;
  }
  
  getProductSpecificFactors(): string[] {
    return ['energyEfficient', 'paymentShock', 'minimumDebtPayments'];
  }
}

/**
 * Conventional Loan Product Implementation
 */
export class ConventionalProduct implements AbstractLoanProduct {
  type = 'conventional' as const;
  
  calculateLimits(profile: BorrowerProfile): DTILimits {
    const monthlyIncome = profile.annualIncome / 12;
    const enhancedFactors = createEnhancedFactors(
      profile.compensatingFactors,
      profile.creditScore,
      profile.monthlyDebts,
      monthlyIncome
    );
    const strongFactorCount = countStrongFactors(enhancedFactors);
    
    return this.calculateConventionalLimits(profile.creditScore, 80, strongFactorCount); // Default LTV
  }
  
  private calculateConventionalLimits(fico: number, ltv: number, strongFactorCount: number): DTILimits {
    const baseLimits = DTI_LIMITS_2025.CONVENTIONAL;
    
    let frontEndDefault = baseLimits.FRONT_END.DEFAULT;  // 28%
    let backEndDefault = baseLimits.BACK_END.DEFAULT;    // 36%
    
    // FICO-based adjustments
    if (fico >= 720) {
      backEndDefault += 3;
    } else if (fico >= 680) {
      backEndDefault += 2;
    }
    
    // LTV-based adjustments
    if (ltv <= 75) {
      backEndDefault += 3;
    } else if (ltv <= 80) {
      backEndDefault += 2;
    }
    
    // Strong factor adjustments
    let backEndMaximum = backEndDefault;
    if (strongFactorCount >= 2) {
      backEndMaximum += 5;
    } else if (strongFactorCount === 1) {
      backEndMaximum += 2;
    }
    
    // Apply caps
    const frontEndMaximum = Math.min(frontEndDefault, baseLimits.FRONT_END.WARNING);
    backEndMaximum = Math.min(backEndMaximum, baseLimits.BACK_END.HARD_CAP);
    
    return {
      frontEnd: {
        default: frontEndDefault,
        maximum: frontEndMaximum,
        warning: baseLimits.FRONT_END.WARNING,
        hardCap: baseLimits.FRONT_END.HARD_CAP,
      },
      backEnd: {
        default: backEndDefault,
        maximum: backEndMaximum,
        warning: baseLimits.BACK_END.WARNING,
        hardCap: baseLimits.BACK_END.HARD_CAP,
      },
    };
  }
  
  validateQualification(profile: BorrowerProfile): QualificationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Credit score requirements
    if (profile.creditScore < 620) {
      issues.push('Credit score below conventional minimum of 620');
    } else if (profile.creditScore < 680) {
      recommendations.push('Credit score above 680 would provide better rates');
    }
    
    // Income requirements
    if (profile.annualIncome < 30000) {
      issues.push('Annual income may be too low for conventional qualification');
    }
    
    // Debt-to-income check
    const monthlyIncome = profile.annualIncome / 12;
    const backEndRatio = (profile.monthlyDebts / monthlyIncome) * 100;
    
    if (backEndRatio > 50) {
      issues.push('Debt-to-income ratio exceeds conventional maximum of 50%');
    } else if (backEndRatio > 45) {
      recommendations.push('High debt-to-income ratio may require strong compensating factors');
    }
    
    return {
      qualified: issues.length === 0,
      issues,
      recommendations
    };
  }
  
  getMinDownPayment(): number {
    return CONVENTIONAL_PRODUCT_CONFIG.requirements.minDownPayment;
  }
  
  getMaxLTV(): number {
    return CONVENTIONAL_PRODUCT_CONFIG.requirements.maxLTV;
  }
  
  getProductSpecificFactors(): string[] {
    return []; // No specific factors for conventional loans
  }
}

/**
 * Loan Product Factory
 */
export class LoanProductFactory {
  static createProduct(type: 'fha' | 'conventional'): AbstractLoanProduct {
    switch (type) {
      case 'fha':
        return new FhaProduct();
      case 'conventional':
        return new ConventionalProduct();
      default:
        throw new Error(`Unknown loan product type: ${type}`);
    }
  }
}

/**
 * Service functions for loan product operations
 */
export const loanProductService = {
  /**
   * Get the best loan product for a borrower profile
   */
  getBestLoanProduct(profile: BorrowerProfile): AbstractLoanProduct | null {
    const fhaProduct = new FhaProduct();
    const conventionalProduct = new ConventionalProduct();
    
    const fhaQualification = fhaProduct.validateQualification(profile);
    const conventionalQualification = conventionalProduct.validateQualification(profile);
    
    if (conventionalQualification.qualified && fhaQualification.qualified) {
      // Both qualify - choose based on credit score
      return profile.creditScore >= 720 ? conventionalProduct : fhaProduct;
    } else if (fhaQualification.qualified) {
      return fhaProduct;
    } else if (conventionalQualification.qualified) {
      return conventionalProduct;
    }
    
    return null;
  },
  
  /**
   * Compare loan products for a borrower
   */
  compareLoanProducts(profile: BorrowerProfile): {
    fha: { product: AbstractLoanProduct; qualification: QualificationResult };
    conventional: { product: AbstractLoanProduct; qualification: QualificationResult };
  } {
    const fhaProduct = new FhaProduct();
    const conventionalProduct = new ConventionalProduct();
    
    return {
      fha: {
        product: fhaProduct,
        qualification: fhaProduct.validateQualification(profile)
      },
      conventional: {
        product: conventionalProduct,
        qualification: conventionalProduct.validateQualification(profile)
      }
    };
  },
  
  /**
   * Get all available loan products
   */
  getAllProducts(): AbstractLoanProduct[] {
    return [
      new FhaProduct(),
      new ConventionalProduct()
    ];
  }
};