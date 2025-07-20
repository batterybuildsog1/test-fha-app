/**
 * Custom Hook for Compensating Factors Logic
 * Handles all compensating factor calculations and state management
 */

import { useCallback, useMemo } from 'react';
import { 
  CompensatingFactorSelection, 
  CompensatingFactorAnalysis, 
  CompensatingFactorError,
  CompensatingFactorValidationResult
} from '@/types/compensating-factors';
import { 
  COMPENSATING_FACTORS, 
  DTI_BOOST_THRESHOLDS, 
  QUALIFICATION_TIERS 
} from '@/constants/compensating-factors';

interface UseCompensatingFactorsProps {
  selections: CompensatingFactorSelection;
  currentHousingPayment: number;
  creditScore: number;
  nonHousingDTI: number;
  newHousingPayment: number;
}

export const useCompensatingFactors = ({
  selections,
  currentHousingPayment,
  creditScore,
  nonHousingDTI,
  newHousingPayment,
}: UseCompensatingFactorsProps) => {
  
  // Calculate credit history factor based on FICO score
  const creditHistoryFactor = useMemo(() => {
    if (creditScore >= 760) return '760+';
    if (creditScore >= 700) return '700-759';
    if (creditScore >= 640) return '640-699';
    return '<640';
  }, [creditScore]);

  // Calculate non-housing DTI factor
  const nonHousingDTIFactor = useMemo(() => {
    if (nonHousingDTI < 5) return '<5%';
    if (nonHousingDTI < 10) return '5-10%';
    if (nonHousingDTI < 20) return '10-20%';
    return '>20%';
  }, [nonHousingDTI]);

  // Calculate housing payment increase factor
  const housingPaymentIncreaseFactor = useMemo(() => {
    if (currentHousingPayment === 0) return 'new homebuyer';
    
    const increasePercentage = ((newHousingPayment - currentHousingPayment) / currentHousingPayment) * 100;
    
    if (increasePercentage < 10) return '<10%';
    if (increasePercentage < 20) return '10-20%';
    return '>20%';
  }, [currentHousingPayment, newHousingPayment]);

  // Calculate strong factors count
  const strongFactorCount = useMemo(() => {
    let count = 0;
    
    // Check user-selected factors
    COMPENSATING_FACTORS.forEach(factor => {
      const selectedValue = selections[factor.id];
      if (selectedValue && factor.isStrong(selectedValue)) {
        count++;
      }
    });
    
    // Check calculated factors
    if (creditHistoryFactor === '760+') count++;
    if (nonHousingDTIFactor === '<5%') count++;
    if (housingPaymentIncreaseFactor === '<10%') count++;
    
    return count;
  }, [selections, creditHistoryFactor, nonHousingDTIFactor, housingPaymentIncreaseFactor]);

  // Calculate moderate factors count
  const moderateFactorCount = useMemo(() => {
    let count = 0;
    
    COMPENSATING_FACTORS.forEach(factor => {
      const selectedValue = selections[factor.id];
      if (selectedValue && !factor.isStrong(selectedValue) && selectedValue !== 'none') {
        count++;
      }
    });
    
    // Check calculated moderate factors
    if (creditHistoryFactor === '700-759') count++;
    if (nonHousingDTIFactor === '5-10%') count++;
    if (housingPaymentIncreaseFactor === '10-20%') count++;
    
    return count;
  }, [selections, creditHistoryFactor, nonHousingDTIFactor, housingPaymentIncreaseFactor]);

  // Calculate DTI boost percentage
  const dtiBoostPercentage = useMemo(() => {
    if (strongFactorCount >= DTI_BOOST_THRESHOLDS.MAXIMUM.minStrongFactors) {
      return DTI_BOOST_THRESHOLDS.MAXIMUM.maxDTIBoost;
    }
    if (strongFactorCount >= DTI_BOOST_THRESHOLDS.ENHANCED.minStrongFactors) {
      return DTI_BOOST_THRESHOLDS.ENHANCED.maxDTIBoost;
    }
    return DTI_BOOST_THRESHOLDS.BASIC.maxDTIBoost;
  }, [strongFactorCount]);

  // Determine qualification tier
  const qualificationTier = useMemo(() => {
    if (strongFactorCount >= 2) return 'maximum' as const;
    if (strongFactorCount >= 1) return 'enhanced' as const;
    return 'basic' as const;
  }, [strongFactorCount]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (strongFactorCount < 2) {
      recs.push('Consider building 6+ months of cash reserves for maximum DTI approval');
    }
    
    if (creditScore < 760) {
      recs.push('Improving credit score to 760+ would add a strong compensating factor');
    }
    
    if (nonHousingDTI > 5) {
      recs.push('Paying down non-housing debt to under 5% DTI would strengthen your profile');
    }
    
    if (currentHousingPayment > 0 && housingPaymentIncreaseFactor === '>20%') {
      recs.push('Consider a smaller loan amount to reduce housing payment increase');
    }
    
    const hasEmploymentFactor = selections.employmentHistory === '>5 years';
    if (!hasEmploymentFactor) {
      recs.push('Document 5+ years of employment history if available');
    }
    
    return recs;
  }, [strongFactorCount, creditScore, nonHousingDTI, currentHousingPayment, housingPaymentIncreaseFactor, selections]);

  // Validation function
  const validateSelections = useCallback((): CompensatingFactorValidationResult => {
    const errors: CompensatingFactorError[] = [];
    const warnings: string[] = [];
    
    // Validate required fields
    if (currentHousingPayment < 0) {
      errors.push(new CompensatingFactorError(
        'Current housing payment cannot be negative',
        'INVALID_HOUSING_PAYMENT'
      ));
    }
    
    // Validate factor selections
    COMPENSATING_FACTORS.forEach(factor => {
      const selectedValue = selections[factor.id];
      if (selectedValue) {
        const isValidOption = factor.options.some(option => option.value === selectedValue);
        if (!isValidOption) {
          errors.push(new CompensatingFactorError(
            `Invalid selection for ${factor.label}`,
            'INVALID_FACTOR_SELECTION',
            factor.id
          ));
        }
      }
    });
    
    // Add warnings for missed opportunities
    if (strongFactorCount === 0) {
      warnings.push('No strong compensating factors selected - consider reviewing your options');
    }
    
    if (strongFactorCount === 1) {
      warnings.push('Adding one more strong factor would unlock maximum DTI limits');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [selections, currentHousingPayment, strongFactorCount]);

  // Analysis object
  const analysis: CompensatingFactorAnalysis = useMemo(() => ({
    strongFactorCount,
    moderateFactorCount,
    totalFactorCount: strongFactorCount + moderateFactorCount,
    dtiBoostPercentage,
    qualificationTier,
    recommendations,
  }), [strongFactorCount, moderateFactorCount, dtiBoostPercentage, qualificationTier, recommendations]);

  // Calculated factors for display
  const calculatedFactors = useMemo(() => ({
    creditHistory: creditHistoryFactor,
    nonHousingDTI: nonHousingDTIFactor,
    housingPaymentIncrease: housingPaymentIncreaseFactor,
  }), [creditHistoryFactor, nonHousingDTIFactor, housingPaymentIncreaseFactor]);

  return {
    analysis,
    calculatedFactors,
    validateSelections,
    qualificationTierDescription: QUALIFICATION_TIERS[qualificationTier],
  };
};