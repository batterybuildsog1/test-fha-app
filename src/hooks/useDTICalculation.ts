/**
 * DTI Calculation Hook
 * 
 * Performant hook for DTI calculations with memoization, debouncing, and real-time updates.
 * This hook provides optimized access to DTI calculations with automatic caching and
 * intelligent recalculation triggers.
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useDTIContext } from '../context/DTIContext';
import { DTIResponse, DTIStatus, CompensatingFactors } from '../../convex/domain/types';

// Hook configuration options
interface UseDTICalculationOptions {
  /**
   * Debounce delay in milliseconds for automatic recalculation
   * @default 500
   */
  debounceMs?: number;
  
  /**
   * Whether to automatically recalculate when inputs change
   * @default true
   */
  autoCalculate?: boolean;
  
  /**
   * Minimum time in milliseconds between calculations
   * @default 100
   */
  minCalculationInterval?: number;
  
  /**
   * Whether to persist calculation results in localStorage
   * @default false
   */
  persistResults?: boolean;
  
  /**
   * Key for localStorage persistence
   * @default 'dti-calculation-cache'
   */
  persistenceKey?: string;
}

// Hook return type
interface UseDTICalculationReturn {
  // Current state
  dtiResponse: DTIResponse | null;
  isCalculating: boolean;
  calculationError: string | null;
  dtiStatus: DTIStatus | null;
  
  // Calculations
  calculateDTI: () => Promise<void>;
  evaluateDTI: (proposedPITI: number) => Promise<void>;
  
  // Memoized computed values
  frontEndDTI: number | null;
  backEndDTI: number | null;
  maxAllowedPITI: number | null;
  dtiMargin: number | null;
  
  // Validation
  hasRequiredInputs: boolean;
  validationErrors: Record<string, string>;
  
  // Performance metrics
  lastCalculationTime: number | null;
  calculationCount: number;
  averageCalculationTime: number | null;
  
  // Utilities
  clearCache: () => void;
  forceRecalculate: () => Promise<void>;
}

// Performance tracking
interface PerformanceMetrics {
  calculationTimes: number[];
  totalCalculations: number;
  lastCalculationTime: number | null;
}

export const useDTICalculation = (
  options: UseDTICalculationOptions = {}
): UseDTICalculationReturn => {
  const {
    debounceMs = 500,
    autoCalculate = true,
    minCalculationInterval = 100,
    persistResults = false,
    persistenceKey = 'dti-calculation-cache',
  } = options;

  const dtiContext = useDTIContext();
  const {
    state,
    calculateDTI: contextCalculateDTI,
    evaluateDTI: contextEvaluateDTI,
    validateInputs,
    hasRequiredInputs,
    dtiStatus,
  } = dtiContext;

  // Performance tracking
  const performanceRef = useRef<PerformanceMetrics>({
    calculationTimes: [],
    totalCalculations: 0,
    lastCalculationTime: null,
  });

  // Debouncing and throttling
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCalculationRef = useRef<number>(0);

  // Memoized input hash for change detection
  const inputHash = useMemo(() => {
    return JSON.stringify({
      annualIncome: state.annualIncome,
      monthlyDebts: state.monthlyDebts,
      debtItems: state.debtItems,
      compensatingFactors: state.compensatingFactors,
      loanType: state.loanType,
      creditScore: state.creditScore,
      ltv: state.ltv,
      propertyTaxRate: state.propertyTaxRate,
      annualInsurance: state.annualInsurance,
      downPaymentPercent: state.downPaymentPercent,
      pmiRate: state.pmiRate,
      interestRate: state.interestRate,
      termYears: state.termYears,
    });
  }, [state]);

  // Memoized computed values
  const frontEndDTI = useMemo(() => {
    return state.dtiResponse?.actual.frontEnd || null;
  }, [state.dtiResponse]);

  const backEndDTI = useMemo(() => {
    return state.dtiResponse?.actual.backEnd || null;
  }, [state.dtiResponse]);

  const maxAllowedPITI = useMemo(() => {
    return state.dtiResponse?.maxPITI || null;
  }, [state.dtiResponse]);

  const dtiMargin = useMemo(() => {
    if (!state.dtiResponse) return null;
    
    const allowedBackEnd = state.dtiResponse.allowed.backEnd;
    const actualBackEnd = state.dtiResponse.actual.backEnd;
    
    return (allowedBackEnd - actualBackEnd) / allowedBackEnd * 100;
  }, [state.dtiResponse]);

  // Performance metrics
  const averageCalculationTime = useMemo(() => {
    const metrics = performanceRef.current;
    if (metrics.calculationTimes.length === 0) return null;
    
    const sum = metrics.calculationTimes.reduce((acc, time) => acc + time, 0);
    return sum / metrics.calculationTimes.length;
  }, [performanceRef.current.calculationTimes]);

  // Persistence helpers
  const saveToCache = useCallback((data: DTIResponse) => {
    if (!persistResults) return;
    
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        inputHash,
      };
      localStorage.setItem(persistenceKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save DTI calculation to cache:', error);
    }
  }, [persistResults, persistenceKey, inputHash]);

  const loadFromCache = useCallback((): DTIResponse | null => {
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
      console.warn('Failed to load DTI calculation from cache:', error);
    }
    
    return null;
  }, [persistResults, persistenceKey, inputHash]);

  const clearCache = useCallback(() => {
    if (!persistResults) return;
    
    try {
      localStorage.removeItem(persistenceKey);
    } catch (error) {
      console.warn('Failed to clear DTI calculation cache:', error);
    }
  }, [persistResults, persistenceKey]);

  // Enhanced calculation functions with performance tracking
  const calculateDTI = useCallback(async () => {
    if (!hasRequiredInputs) return;
    
    const startTime = performance.now();
    
    // Check cache first
    const cachedResult = loadFromCache();
    if (cachedResult) {
      console.log('Using cached DTI calculation result');
      return;
    }
    
    try {
      await contextCalculateDTI();
      
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
      if (state.dtiResponse) {
        saveToCache(state.dtiResponse);
      }
      
    } catch (error) {
      console.error('DTI calculation failed:', error);
      throw error;
    }
  }, [
    hasRequiredInputs,
    contextCalculateDTI,
    loadFromCache,
    saveToCache,
    state.dtiResponse,
  ]);

  const evaluateDTI = useCallback(async (proposedPITI: number) => {
    if (!hasRequiredInputs) return;
    
    const startTime = performance.now();
    
    try {
      await contextEvaluateDTI(proposedPITI);
      
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
      
    } catch (error) {
      console.error('DTI evaluation failed:', error);
      throw error;
    }
  }, [hasRequiredInputs, contextEvaluateDTI]);

  // Force recalculation (bypasses cache and debouncing)
  const forceRecalculate = useCallback(async () => {
    clearCache();
    await calculateDTI();
  }, [clearCache, calculateDTI]);

  // Debounced auto-calculation
  const debouncedCalculate = useCallback(() => {
    if (!autoCalculate || !hasRequiredInputs) return;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      
      // Throttle calculations
      if (now - lastCalculationRef.current >= minCalculationInterval) {
        calculateDTI();
        lastCalculationRef.current = now;
      }
    }, debounceMs);
  }, [autoCalculate, hasRequiredInputs, debounceMs, minCalculationInterval, calculateDTI]);

  // Effect for auto-calculation on input changes
  useEffect(() => {
    if (autoCalculate) {
      debouncedCalculate();
    }
    
    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputHash, debouncedCalculate, autoCalculate]);

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
    dtiResponse: state.dtiResponse,
    isCalculating: state.isCalculating,
    calculationError: state.calculationError,
    dtiStatus,
    
    // Calculations
    calculateDTI,
    evaluateDTI,
    
    // Memoized computed values
    frontEndDTI,
    backEndDTI,
    maxAllowedPITI,
    dtiMargin,
    
    // Validation
    hasRequiredInputs,
    validationErrors: state.validationErrors,
    
    // Performance metrics
    lastCalculationTime: performanceRef.current.lastCalculationTime,
    calculationCount: performanceRef.current.totalCalculations,
    averageCalculationTime,
    
    // Utilities
    clearCache,
    forceRecalculate,
  };
};