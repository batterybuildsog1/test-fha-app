/**
 * Borrowing Power Hook
 * 
 * Performant hook for borrowing power calculations with memoization and real-time updates.
 * This hook provides optimized access to borrowing power analysis with automatic caching
 * and intelligent recalculation triggers.
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useDTIContext } from '../context/DTIContext';
import { useDTICalculation } from './useDTICalculation';

// Borrowing power analysis interface
interface BorrowingPowerAnalysis {
  maxPurchasePrice: number;
  maxLoanAmount: number;
  requiredDownPayment: number;
  estimatedClosingCosts: number;
  totalCashNeeded: number;
  monthlyPaymentBreakdown: {
    principal: number;
    interest: number;
    taxes: number;
    insurance: number;
    pmi?: number;
    total: number;
  };
  affordabilityRating: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

// Hook configuration options
interface UseBorrowingPowerOptions {
  /**
   * Debounce delay in milliseconds for automatic recalculation
   * @default 750
   */
  debounceMs?: number;
  
  /**
   * Whether to automatically recalculate when inputs change
   * @default true
   */
  autoCalculate?: boolean;
  
  /**
   * Default down payment percentage for calculations
   * @default 20
   */
  defaultDownPaymentPercent?: number;
  
  /**
   * Default property tax rate (annual percentage)
   * @default 1.2
   */
  defaultPropertyTaxRate?: number;
  
  /**
   * Default annual insurance rate (percentage of home value)
   * @default 0.5
   */
  defaultInsuranceRate?: number;
  
  /**
   * Default interest rate (annual percentage)
   * @default 7.0
   */
  defaultInterestRate?: number;
  
  /**
   * Default loan term in years
   * @default 30
   */
  defaultTermYears?: number;
  
  /**
   * Whether to include PMI in calculations
   * @default true
   */
  includePMI?: boolean;
  
  /**
   * PMI rate (annual percentage)
   * @default 0.5
   */
  defaultPMIRate?: number;
  
  /**
   * Estimated closing costs as percentage of loan amount
   * @default 2.5
   */
  closingCostsPercent?: number;
  
  /**
   * Whether to persist results in localStorage
   * @default false
   */
  persistResults?: boolean;
  
  /**
   * Key for localStorage persistence
   * @default 'borrowing-power-cache'
   */
  persistenceKey?: string;
}

// Hook return type
interface UseBorrowingPowerReturn {
  // Current state
  borrowingPowerResponse: any | null;
  isCalculating: boolean;
  calculationError: string | null;
  
  // Analysis results
  analysis: BorrowingPowerAnalysis | null;
  
  // Calculations
  calculateBorrowingPower: () => Promise<void>;
  calculateWithCustomInputs: (overrides: Partial<BorrowingPowerAnalysis>) => Promise<void>;
  
  // Memoized computed values
  maxAffordablePrice: number | null;
  recommendedPrice: number | null;
  safePrice: number | null;
  dtiUtilization: number | null;
  
  // Scenarios
  scenarios: {
    conservative: BorrowingPowerAnalysis | null;
    moderate: BorrowingPowerAnalysis | null;
    aggressive: BorrowingPowerAnalysis | null;
  };
  
  // Performance metrics
  lastCalculationTime: number | null;
  calculationCount: number;
  averageCalculationTime: number | null;
  
  // Utilities
  clearCache: () => void;
  forceRecalculate: () => Promise<void>;
  exportAnalysis: () => string;
}

// Performance tracking
interface PerformanceMetrics {
  calculationTimes: number[];
  totalCalculations: number;
  lastCalculationTime: number | null;
}

export const useBorrowingPower = (
  options: UseBorrowingPowerOptions = {}
): UseBorrowingPowerReturn => {
  const {
    debounceMs = 750,
    autoCalculate = true,
    defaultDownPaymentPercent = 20,
    defaultPropertyTaxRate = 1.2,
    defaultInsuranceRate = 0.5,
    defaultInterestRate = 7.0,
    defaultTermYears = 30,
    includePMI = true,
    defaultPMIRate = 0.5,
    closingCostsPercent = 2.5,
    persistResults = false,
    persistenceKey = 'borrowing-power-cache',
  } = options;

  const dtiContext = useDTIContext();
  const {
    state,
    calculateBorrowingPower: contextCalculateBorrowingPower,
    hasRequiredInputs,
  } = dtiContext;

  // Use DTI calculation hook for dependency on DTI results
  const { dtiResponse, maxAllowedPITI } = useDTICalculation({
    autoCalculate: false, // We'll control this manually
  });

  // Performance tracking
  const performanceRef = useRef<PerformanceMetrics>({
    calculationTimes: [],
    totalCalculations: 0,
    lastCalculationTime: null,
  });

  // Debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized input hash for change detection
  const inputHash = useMemo(() => {
    return JSON.stringify({
      annualIncome: state.annualIncome,
      monthlyDebts: state.monthlyDebts,
      loanType: state.loanType,
      creditScore: state.creditScore,
      ltv: state.ltv,
      compensatingFactors: state.compensatingFactors,
      propertyTaxRate: state.propertyTaxRate || defaultPropertyTaxRate,
      annualInsurance: state.annualInsurance,
      downPaymentPercent: state.downPaymentPercent || defaultDownPaymentPercent,
      pmiRate: state.pmiRate || defaultPMIRate,
      interestRate: state.interestRate || defaultInterestRate,
      termYears: state.termYears || defaultTermYears,
    });
  }, [state, defaultDownPaymentPercent, defaultPropertyTaxRate, defaultPMIRate, defaultInterestRate, defaultTermYears]);

  // Persistence helpers
  const saveToCache = useCallback((data: any) => {
    if (!persistResults) return;
    
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        inputHash,
      };
      localStorage.setItem(persistenceKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save borrowing power to cache:', error);
    }
  }, [persistResults, persistenceKey, inputHash]);

  const loadFromCache = useCallback((): any | null => {
    if (!persistResults) return null;
    
    try {
      const cached = localStorage.getItem(persistenceKey);
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      
      // Check if cache is still valid (same inputs)
      if (cacheData.inputHash === inputHash) {
        return cacheData.data;
      }
    } catch (error) {
      console.warn('Failed to load borrowing power from cache:', error);
    }
    
    return null;
  }, [persistResults, persistenceKey, inputHash]);

  const clearCache = useCallback(() => {
    if (!persistResults) return;
    
    try {
      localStorage.removeItem(persistenceKey);
    } catch (error) {
      console.warn('Failed to clear borrowing power cache:', error);
    }
  }, [persistResults, persistenceKey]);

  // Calculate borrowing power analysis from raw response
  const calculateAnalysis = useCallback((rawResponse: any): BorrowingPowerAnalysis | null => {
    if (!rawResponse || !maxAllowedPITI) return null;

    const downPaymentPercent = state.downPaymentPercent || defaultDownPaymentPercent;
    const propertyTaxRate = state.propertyTaxRate || defaultPropertyTaxRate;
    const insuranceRate = defaultInsuranceRate;
    const interestRate = state.interestRate || defaultInterestRate;
    const termYears = state.termYears || defaultTermYears;
    const pmiRate = includePMI && downPaymentPercent < 20 ? (state.pmiRate || defaultPMIRate) : 0;

    // Calculate maximum loan amount based on PITI
    const monthlyTaxes = maxAllowedPITI * 0.25; // Rough estimate
    const monthlyInsurance = maxAllowedPITI * 0.15; // Rough estimate
    const monthlyPMI = maxAllowedPITI * 0.05; // Rough estimate if applicable
    const availableForPI = maxAllowedPITI - monthlyTaxes - monthlyInsurance - monthlyPMI;

    // Calculate loan amount using payment formula
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = termYears * 12;
    const maxLoanAmount = availableForPI * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);

    // Calculate purchase price
    const maxPurchasePrice = maxLoanAmount / (1 - downPaymentPercent / 100);

    // Calculate required down payment
    const requiredDownPayment = maxPurchasePrice * (downPaymentPercent / 100);

    // Calculate closing costs
    const estimatedClosingCosts = maxLoanAmount * (closingCostsPercent / 100);

    // Calculate total cash needed
    const totalCashNeeded = requiredDownPayment + estimatedClosingCosts;

    // Calculate monthly payment breakdown
    const principal = maxLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const interest = principal - (maxLoanAmount / numPayments);
    const taxes = maxPurchasePrice * (propertyTaxRate / 100) / 12;
    const insurance = maxPurchasePrice * (insuranceRate / 100) / 12;
    const pmi = pmiRate > 0 ? maxLoanAmount * (pmiRate / 100) / 12 : 0;
    const total = principal + taxes + insurance + pmi;

    // Determine affordability rating
    const dtiUtilization = (total / (state.annualIncome / 12)) * 100;
    let affordabilityRating: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (dtiUtilization <= 25) {
      affordabilityRating = 'excellent';
    } else if (dtiUtilization <= 28) {
      affordabilityRating = 'good';
    } else if (dtiUtilization <= 33) {
      affordabilityRating = 'fair';
    } else {
      affordabilityRating = 'poor';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (dtiUtilization > 28) {
      recommendations.push('Consider a lower price range to improve affordability');
    }
    
    if (downPaymentPercent < 20) {
      recommendations.push('A 20% down payment would eliminate PMI and reduce monthly costs');
    }
    
    if (state.creditScore < 740) {
      recommendations.push('Improving credit score could result in better interest rates');
    }
    
    if (state.monthlyDebts > state.annualIncome / 12 * 0.1) {
      recommendations.push('Paying down existing debt would increase borrowing power');
    }

    return {
      maxPurchasePrice,
      maxLoanAmount,
      requiredDownPayment,
      estimatedClosingCosts,
      totalCashNeeded,
      monthlyPaymentBreakdown: {
        principal,
        interest,
        taxes,
        insurance,
        pmi: pmi > 0 ? pmi : undefined,
        total,
      },
      affordabilityRating,
      recommendations,
    };
  }, [
    maxAllowedPITI,
    state,
    defaultDownPaymentPercent,
    defaultPropertyTaxRate,
    defaultInsuranceRate,
    defaultInterestRate,
    defaultTermYears,
    includePMI,
    defaultPMIRate,
    closingCostsPercent,
  ]);

  // Memoized analysis
  const analysis = useMemo(() => {
    return calculateAnalysis(state.borrowingPowerResponse);
  }, [state.borrowingPowerResponse, calculateAnalysis]);

  // Memoized computed values
  const maxAffordablePrice = useMemo(() => {
    return analysis?.maxPurchasePrice || null;
  }, [analysis]);

  const recommendedPrice = useMemo(() => {
    if (!maxAffordablePrice) return null;
    return maxAffordablePrice * 0.85; // 85% of max for safety
  }, [maxAffordablePrice]);

  const safePrice = useMemo(() => {
    if (!maxAffordablePrice) return null;
    return maxAffordablePrice * 0.75; // 75% of max for conservative approach
  }, [maxAffordablePrice]);

  const dtiUtilization = useMemo(() => {
    if (!analysis || !state.annualIncome) return null;
    return (analysis.monthlyPaymentBreakdown.total / (state.annualIncome / 12)) * 100;
  }, [analysis, state.annualIncome]);

  // Scenarios
  const scenarios = useMemo(() => {
    if (!analysis) {
      return {
        conservative: null,
        moderate: null,
        aggressive: null,
      };
    }

    return {
      conservative: {
        ...analysis,
        maxPurchasePrice: analysis.maxPurchasePrice * 0.75,
        maxLoanAmount: analysis.maxLoanAmount * 0.75,
        requiredDownPayment: analysis.requiredDownPayment * 0.75,
        estimatedClosingCosts: analysis.estimatedClosingCosts * 0.75,
        totalCashNeeded: analysis.totalCashNeeded * 0.75,
        monthlyPaymentBreakdown: {
          ...analysis.monthlyPaymentBreakdown,
          total: analysis.monthlyPaymentBreakdown.total * 0.75,
        },
      },
      moderate: analysis,
      aggressive: {
        ...analysis,
        maxPurchasePrice: analysis.maxPurchasePrice * 1.05,
        maxLoanAmount: analysis.maxLoanAmount * 1.05,
        requiredDownPayment: analysis.requiredDownPayment * 1.05,
        estimatedClosingCosts: analysis.estimatedClosingCosts * 1.05,
        totalCashNeeded: analysis.totalCashNeeded * 1.05,
        monthlyPaymentBreakdown: {
          ...analysis.monthlyPaymentBreakdown,
          total: analysis.monthlyPaymentBreakdown.total * 1.05,
        },
      },
    };
  }, [analysis]);

  // Performance metrics
  const averageCalculationTime = useMemo(() => {
    const metrics = performanceRef.current;
    if (metrics.calculationTimes.length === 0) return null;
    
    const sum = metrics.calculationTimes.reduce((acc, time) => acc + time, 0);
    return sum / metrics.calculationTimes.length;
  }, [performanceRef.current.calculationTimes]);

  // Enhanced calculation function
  const calculateBorrowingPower = useCallback(async () => {
    if (!hasRequiredInputs) return;
    
    const startTime = performance.now();
    
    // Check cache first
    const cachedResult = loadFromCache();
    if (cachedResult) {
      console.log('Using cached borrowing power result');
      return;
    }
    
    try {
      await contextCalculateBorrowingPower();
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      // Update performance metrics
      const metrics = performanceRef.current;
      metrics.calculationTimes.push(calculationTime);
      metrics.totalCalculations++;
      metrics.lastCalculationTime = Date.now();
      
      // Keep only last 50 calculation times for rolling average
      if (metrics.calculationTimes.length > 50) {
        metrics.calculationTimes.shift();
      }
      
      // Save to cache if successful
      if (state.borrowingPowerResponse) {
        saveToCache(state.borrowingPowerResponse);
      }
      
    } catch (error) {
      console.error('Borrowing power calculation failed:', error);
      throw error;
    }
  }, [
    hasRequiredInputs,
    contextCalculateBorrowingPower,
    loadFromCache,
    saveToCache,
    state.borrowingPowerResponse,
  ]);

  // Calculate with custom inputs
  const calculateWithCustomInputs = useCallback(async (overrides: Partial<BorrowingPowerAnalysis>) => {
    // This would be implemented to allow custom scenario calculations
    console.log('Custom calculation with overrides:', overrides);
    await calculateBorrowingPower();
  }, [calculateBorrowingPower]);

  // Force recalculation
  const forceRecalculate = useCallback(async () => {
    clearCache();
    await calculateBorrowingPower();
  }, [clearCache, calculateBorrowingPower]);

  // Export analysis
  const exportAnalysis = useCallback((): string => {
    if (!analysis) return '';
    
    return JSON.stringify({
      ...analysis,
      timestamp: new Date().toISOString(),
      inputs: {
        annualIncome: state.annualIncome,
        monthlyDebts: state.monthlyDebts,
        creditScore: state.creditScore,
        loanType: state.loanType,
        ltv: state.ltv,
      },
    }, null, 2);
  }, [analysis, state]);

  // Debounced auto-calculation
  const debouncedCalculate = useCallback(() => {
    if (!autoCalculate || !hasRequiredInputs) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      calculateBorrowingPower();
    }, debounceMs);
  }, [autoCalculate, hasRequiredInputs, debounceMs, calculateBorrowingPower]);

  // Effect for auto-calculation on input changes
  useEffect(() => {
    if (autoCalculate && dtiResponse) {
      debouncedCalculate();
    }
    
    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputHash, dtiResponse, debouncedCalculate, autoCalculate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // Current state
    borrowingPowerResponse: state.borrowingPowerResponse,
    isCalculating: state.isBorrowingPowerCalculating,
    calculationError: state.borrowingPowerError,
    
    // Analysis results
    analysis,
    
    // Calculations
    calculateBorrowingPower,
    calculateWithCustomInputs,
    
    // Memoized computed values
    maxAffordablePrice,
    recommendedPrice,
    safePrice,
    dtiUtilization,
    
    // Scenarios
    scenarios,
    
    // Performance metrics
    lastCalculationTime: performanceRef.current.lastCalculationTime,
    calculationCount: performanceRef.current.totalCalculations,
    averageCalculationTime,
    
    // Utilities
    clearCache,
    forceRecalculate,
    exportAnalysis,
  };
};