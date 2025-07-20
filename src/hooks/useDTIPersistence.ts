/**
 * DTI Persistence Hooks
 * 
 * React hooks for managing DTI wizard session persistence
 * with Convex backend integration.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useDTIContext } from '../context/DTIContext';
import { useDebounce } from './useDebounce';

// Generate or retrieve anonymous user ID
const getAnonymousUserId = (): string => {
  const STORAGE_KEY = 'dti_anonymous_user_id';
  let userId = localStorage.getItem(STORAGE_KEY);
  
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, userId);
  }
  
  return userId;
};

// Session state type
interface SessionState {
  sessionId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

/**
 * Hook for auto-saving DTI wizard progress
 */
export const useAutoSave = (sessionId: string | null, currentStep: number, completedSteps: number[]) => {
  const { state } = useDTIContext();
  const saveProgress = useMutation(api.dtiWizard.saveProgress);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prepare data for saving
  const prepareSessionData = useCallback(() => {
    const { 
      annualIncome, 
      monthlyIncome, 
      employmentType, 
      otherIncome,
      debtItems,
      compensatingFactors,
      creditScore,
      loanType,
      downPaymentPercent,
      propertyType,
      dtiResponse,
      borrowingPowerResponse
    } = state;

    // Convert debt items to array format
    const debtsArray = Object.entries(debtItems).map(([type, amount]) => ({
      id: `debt_${type}`,
      type,
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      monthlyPayment: amount,
      balance: undefined,
    })).filter(debt => debt.monthlyPayment > 0);

    return {
      income: {
        annualIncome,
        monthlyIncome,
        employmentType,
        otherIncome,
      },
      debts: debtsArray,
      compensatingFactors: {
        cashReserves: compensatingFactors.cashReserves,
        excellentCredit: compensatingFactors.creditUtilization === '<10%',
        minimalDebtIncrease: compensatingFactors.housingPaymentIncrease === '<10%',
        residualIncome: compensatingFactors.residualIncome === 'meets VA guidelines',
        lowLTV: parseFloat(compensatingFactors.downPayment) > 20,
        energyEfficientHome: compensatingFactors.energyEfficient === 'yes',
      },
      creditInfo: {
        creditScore,
        loanType,
        downPaymentPercent: parseFloat(downPaymentPercent as any) || 0,
        propertyType: propertyType || 'single_family',
      },
      results: dtiResponse ? {
        frontEndRatio: dtiResponse.actual.frontEnd,
        backEndRatio: dtiResponse.actual.backEnd,
        maxLoanAmount: borrowingPowerResponse?.loanAmount || 0,
        isQualified: dtiResponse.actual.backEnd <= dtiResponse.allowed.backEnd,
      } : undefined,
    };
  }, [state]);

  // Debounced save data
  const debouncedData = useDebounce(prepareSessionData(), 2000);

  // Save effect
  useEffect(() => {
    if (!sessionId || !debouncedData) return;

    const save = async () => {
      setIsSaving(true);
      setError(null);
      
      try {
        await saveProgress({
          userId: getAnonymousUserId(),
          sessionId,
          currentStep,
          completedSteps,
          data: debouncedData,
        });
        
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to save progress:', err);
        setError(err instanceof Error ? err.message : 'Failed to save progress');
      } finally {
        setIsSaving(false);
      }
    };

    save();
  }, [sessionId, currentStep, completedSteps, debouncedData, saveProgress]);

  return { isSaving, lastSaved, error };
};

/**
 * Hook for resuming DTI wizard session
 */
export const useResumeSession = () => {
  const resumeOrCreate = useAction(api.dtiWizard.resumeOrCreateSession);
  const { dispatch } = useDTIContext();
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: null,
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    error: null,
  });
  const [hasResumeOption, setHasResumeOption] = useState(false);

  // Initialize session
  const initializeSession = useCallback(async (forceNew = false) => {
    setSessionState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await resumeOrCreate({
        userId: getAnonymousUserId(),
        forceNew,
      });

      setSessionState(prev => ({
        ...prev,
        sessionId: result.sessionId,
        isLoading: false,
      }));

      if (result.isResumed && result.data) {
        setHasResumeOption(true);
        return result.data;
      }

      return null;
    } catch (err) {
      console.error('Failed to initialize session:', err);
      setSessionState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to initialize session',
      }));
      return null;
    }
  }, [resumeOrCreate]);

  // Load session data into context
  const loadSessionData = useCallback((sessionData: any) => {
    if (!sessionData?.data) return;

    const { income, debts, compensatingFactors, creditInfo } = sessionData.data;

    // Load income data
    if (income) {
      if (income.annualIncome) dispatch({ type: 'SET_ANNUAL_INCOME', payload: income.annualIncome });
      if (income.monthlyIncome) dispatch({ type: 'SET_MONTHLY_INCOME', payload: income.monthlyIncome });
      if (income.employmentType) dispatch({ type: 'SET_EMPLOYMENT_TYPE', payload: income.employmentType });
      if (income.otherIncome) dispatch({ type: 'SET_OTHER_INCOME', payload: income.otherIncome });
    }

    // Load debt data
    if (debts && Array.isArray(debts)) {
      const debtItems = debts.reduce((acc, debt) => {
        const type = debt.type.replace(/ /g, '_').toLowerCase();
        return { ...acc, [type]: debt.monthlyPayment };
      }, {});
      dispatch({ type: 'SET_DEBT_ITEMS', payload: debtItems });
    }

    // Load compensating factors
    if (compensatingFactors) {
      const factors = {
        cashReserves: compensatingFactors.cashReserves || 'none',
        creditUtilization: compensatingFactors.excellentCredit ? '<10%' : 'none',
        housingPaymentIncrease: compensatingFactors.minimalDebtIncrease ? '<10%' : 'none',
        residualIncome: compensatingFactors.residualIncome ? 'meets VA guidelines' : 'does not meet',
        downPayment: compensatingFactors.lowLTV ? '>20%' : '<5%',
        energyEfficient: compensatingFactors.energyEfficientHome ? 'yes' : undefined,
        employmentHistory: '<2 years', // Default since not stored
        overtimeIncome: undefined,
        minimumDebtPayments: undefined,
        paymentShock: undefined,
        liquidAssets: undefined,
        additionalIncome: undefined,
      };
      dispatch({ type: 'SET_COMPENSATING_FACTORS', payload: factors });
    }

    // Load credit info
    if (creditInfo) {
      if (creditInfo.creditScore) dispatch({ type: 'SET_CREDIT_SCORE', payload: creditInfo.creditScore });
      if (creditInfo.loanType) dispatch({ type: 'SET_LOAN_TYPE', payload: creditInfo.loanType });
      if (creditInfo.downPaymentPercent) dispatch({ type: 'SET_DOWN_PAYMENT_PERCENT', payload: creditInfo.downPaymentPercent });
      if (creditInfo.propertyType) dispatch({ type: 'SET_PROPERTY_TYPE', payload: creditInfo.propertyType });
    }

    return {
      currentStep: sessionData.currentStep || 0,
      completedSteps: sessionData.completedSteps || [],
    };
  }, [dispatch]);

  return {
    sessionState,
    hasResumeOption,
    initializeSession,
    loadSessionData,
  };
};

/**
 * Hook for saving completed DTI wizard results
 */
export const useSaveResults = (sessionId: string | null) => {
  const completeWizard = useMutation(api.dtiWizard.completeWizard);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveResults = useCallback(async (results: {
    frontEndRatio: number;
    backEndRatio: number;
    maxLoanAmount: number;
    isQualified: boolean;
  }) => {
    if (!sessionId) {
      setError('No active session');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      await completeWizard({
        sessionId,
        results,
      });
      return true;
    } catch (err) {
      console.error('Failed to save results:', err);
      setError(err instanceof Error ? err.message : 'Failed to save results');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, completeWizard]);

  return { saveResults, isSaving, error };
};

/**
 * Hook for clearing DTI wizard session
 */
export const useClearSession = () => {
  const clearSession = useMutation(api.dtiWizard.clearSession);
  
  const clear = useCallback(async (sessionId: string) => {
    try {
      await clearSession({ sessionId });
      return true;
    } catch (err) {
      console.error('Failed to clear session:', err);
      return false;
    }
  }, [clearSession]);

  return clear;
};

/**
 * Hook for exporting session data
 */
export const useExportSession = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportSession = useCallback(async (sessionId: string) => {
    setIsExporting(true);

    try {
      // Query session data
      const response = await fetch(`/api/convex/query?name=dtiWizard:exportSession&args=${encodeURIComponent(JSON.stringify({ sessionId }))}`);
      const data = await response.json();

      if (!data) {
        throw new Error('Session not found');
      }

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dti-wizard-session-${sessionId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('Failed to export session:', err);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportSession, isExporting };
};

/**
 * Hook for importing session data
 */
export const useImportSession = () => {
  const importSession = useMutation(api.dtiWizard.importSession);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(async (file: File): Promise<string | null> => {
    setIsImporting(true);

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      const result = await importSession({
        userId: getAnonymousUserId(),
        importData,
      });

      return result.sessionId;
    } catch (err) {
      console.error('Failed to import session:', err);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, [importSession]);

  return { handleImport, isImporting };
};