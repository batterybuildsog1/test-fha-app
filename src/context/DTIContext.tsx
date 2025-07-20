/**
 * DTI Context
 * 
 * Modern DTI state management with proper error handling and Convex integration.
 * This context manages the complete DTI calculation workflow including input data,
 * calculation results, and borrowing power analysis.
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  DTIResponse, 
  DTIStatus, 
  CompensatingFactors, 
  DebtItems, 
  ApiResponse,
  ValidationError,
  DTICalculationError
} from '../../convex/domain/types';

// DTI Context State Types
export interface DTIContextState {
  // Input data
  annualIncome: number;
  monthlyDebts: number;
  debtItems: DebtItems;
  compensatingFactors: CompensatingFactors;
  loanType: 'fha' | 'conventional';
  creditScore: number;
  ltv: number;
  
  // Additional fields
  employmentType?: 'w2' | 'self-employed' | '1099' | 'retired';
  otherIncome?: number;
  propertyType?: 'single_family' | 'condo' | 'townhouse' | 'multi_family';
  
  // Optional parameters
  proposedPITI?: number;
  propertyTaxRate?: number;
  annualInsurance?: number;
  downPaymentPercent?: number;
  pmiRate?: number;
  interestRate?: number;
  termYears?: number;
  
  // Calculation results
  dtiResponse: DTIResponse | null;
  borrowingPowerResponse: any | null;
  
  // Loading and error states
  isCalculating: boolean;
  isBorrowingPowerCalculating: boolean;
  calculationError: string | null;
  borrowingPowerError: string | null;
  
  // Validation state
  validationErrors: Record<string, string>;
  isValid: boolean;
}

// DTI Context Actions
type DTIContextAction = 
  | { type: 'SET_ANNUAL_INCOME'; payload: number }
  | { type: 'SET_MONTHLY_DEBTS'; payload: number }
  | { type: 'SET_DEBT_ITEMS'; payload: DebtItems }
  | { type: 'SET_COMPENSATING_FACTORS'; payload: CompensatingFactors }
  | { type: 'SET_LOAN_TYPE'; payload: 'fha' | 'conventional' }
  | { type: 'SET_CREDIT_SCORE'; payload: number }
  | { type: 'SET_LTV'; payload: number }
  | { type: 'SET_PROPOSED_PITI'; payload: number | undefined }
  | { type: 'SET_PROPERTY_TAX_RATE'; payload: number | undefined }
  | { type: 'SET_ANNUAL_INSURANCE'; payload: number | undefined }
  | { type: 'SET_DOWN_PAYMENT_PERCENT'; payload: number | undefined }
  | { type: 'SET_PMI_RATE'; payload: number | undefined }
  | { type: 'SET_INTEREST_RATE'; payload: number | undefined }
  | { type: 'SET_TERM_YEARS'; payload: number | undefined }
  | { type: 'SET_EMPLOYMENT_TYPE'; payload: 'w2' | 'self-employed' | '1099' | 'retired' | undefined }
  | { type: 'SET_OTHER_INCOME'; payload: number | undefined }
  | { type: 'SET_PROPERTY_TYPE'; payload: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | undefined }
  | { type: 'SET_DTI_CALCULATING'; payload: boolean }
  | { type: 'SET_DTI_RESPONSE'; payload: DTIResponse }
  | { type: 'SET_DTI_ERROR'; payload: string | null }
  | { type: 'SET_BORROWING_POWER_CALCULATING'; payload: boolean }
  | { type: 'SET_BORROWING_POWER_RESPONSE'; payload: any }
  | { type: 'SET_BORROWING_POWER_ERROR'; payload: string | null }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string> }
  | { type: 'RESET_CALCULATIONS' }
  | { type: 'RESET_ALL' };

// DTI Context Type
export interface DTIContextType {
  state: DTIContextState;
  
  // Input actions
  setAnnualIncome: (income: number) => void;
  setMonthlyDebts: (debts: number) => void;
  setDebtItems: (items: DebtItems) => void;
  setCompensatingFactors: (factors: CompensatingFactors) => void;
  setLoanType: (loanType: 'fha' | 'conventional') => void;
  setCreditScore: (score: number) => void;
  setLTV: (ltv: number) => void;
  setProposedPITI: (piti?: number) => void;
  setPropertyTaxRate: (rate?: number) => void;
  setAnnualInsurance: (insurance?: number) => void;
  setDownPaymentPercent: (percent?: number) => void;
  setPMIRate: (rate?: number) => void;
  setInterestRate: (rate?: number) => void;
  setTermYears: (years?: number) => void;
  setEmploymentType: (type?: 'w2' | 'self-employed' | '1099' | 'retired') => void;
  setOtherIncome: (income?: number) => void;
  setPropertyType: (type?: 'single_family' | 'condo' | 'townhouse' | 'multi_family') => void;
  
  // Calculation actions
  calculateDTI: () => Promise<void>;
  evaluateDTI: (proposedPITI: number) => Promise<void>;
  calculateBorrowingPower: () => Promise<void>;
  
  // Utility actions
  validateInputs: () => boolean;
  resetCalculations: () => void;
  resetAll: () => void;
  
  // Computed values
  hasRequiredInputs: boolean;
  monthlyIncome: number;
  totalDebtItems: number;
  dtiStatus: DTIStatus | null;
}

// Initial state
const initialState: DTIContextState = {
  annualIncome: 0,
  monthlyDebts: 0,
  debtItems: {
    carLoan: 0,
    studentLoan: 0,
    creditCard: 0,
    personalLoan: 0,
    otherDebt: 0,
  },
  compensatingFactors: {
    cashReserves: 'none',
    residualIncome: 'does not meet',
    housingPaymentIncrease: 'none',
    employmentHistory: '<2 years',
    creditUtilization: 'none',
    downPayment: '<5%',
  },
  loanType: 'fha',
  creditScore: 700,
  ltv: 80,
  dtiResponse: null,
  borrowingPowerResponse: null,
  isCalculating: false,
  isBorrowingPowerCalculating: false,
  calculationError: null,
  borrowingPowerError: null,
  validationErrors: {},
  isValid: true,
};

// Reducer function
const dtiReducer = (state: DTIContextState, action: DTIContextAction): DTIContextState => {
  switch (action.type) {
    case 'SET_ANNUAL_INCOME':
      return { ...state, annualIncome: Math.max(0, action.payload) };
    
    case 'SET_MONTHLY_DEBTS':
      return { ...state, monthlyDebts: Math.max(0, action.payload) };
    
    case 'SET_DEBT_ITEMS':
      return { ...state, debtItems: action.payload };
    
    case 'SET_COMPENSATING_FACTORS':
      return { ...state, compensatingFactors: action.payload };
    
    case 'SET_LOAN_TYPE':
      return { ...state, loanType: action.payload };
    
    case 'SET_CREDIT_SCORE':
      return { ...state, creditScore: Math.max(300, Math.min(850, action.payload)) };
    
    case 'SET_LTV':
      return { ...state, ltv: Math.max(0, Math.min(100, action.payload)) };
    
    case 'SET_PROPOSED_PITI':
      return { ...state, proposedPITI: action.payload };
    
    case 'SET_PROPERTY_TAX_RATE':
      return { ...state, propertyTaxRate: action.payload };
    
    case 'SET_ANNUAL_INSURANCE':
      return { ...state, annualInsurance: action.payload };
    
    case 'SET_DOWN_PAYMENT_PERCENT':
      return { ...state, downPaymentPercent: action.payload };
    
    case 'SET_PMI_RATE':
      return { ...state, pmiRate: action.payload };
    
    case 'SET_INTEREST_RATE':
      return { ...state, interestRate: action.payload };
    
    case 'SET_TERM_YEARS':
      return { ...state, termYears: action.payload };
    
    case 'SET_EMPLOYMENT_TYPE':
      return { ...state, employmentType: action.payload };
    
    case 'SET_OTHER_INCOME':
      return { ...state, otherIncome: action.payload };
    
    case 'SET_PROPERTY_TYPE':
      return { ...state, propertyType: action.payload };
    
    case 'SET_DTI_CALCULATING':
      return { ...state, isCalculating: action.payload };
    
    case 'SET_DTI_RESPONSE':
      return { 
        ...state, 
        dtiResponse: action.payload,
        isCalculating: false,
        calculationError: null
      };
    
    case 'SET_DTI_ERROR':
      return { 
        ...state, 
        calculationError: action.payload,
        isCalculating: false,
        dtiResponse: null
      };
    
    case 'SET_BORROWING_POWER_CALCULATING':
      return { ...state, isBorrowingPowerCalculating: action.payload };
    
    case 'SET_BORROWING_POWER_RESPONSE':
      return { 
        ...state, 
        borrowingPowerResponse: action.payload,
        isBorrowingPowerCalculating: false,
        borrowingPowerError: null
      };
    
    case 'SET_BORROWING_POWER_ERROR':
      return { 
        ...state, 
        borrowingPowerError: action.payload,
        isBorrowingPowerCalculating: false,
        borrowingPowerResponse: null
      };
    
    case 'SET_VALIDATION_ERRORS':
      return { 
        ...state, 
        validationErrors: action.payload,
        isValid: Object.keys(action.payload).length === 0
      };
    
    case 'RESET_CALCULATIONS':
      return {
        ...state,
        dtiResponse: null,
        borrowingPowerResponse: null,
        isCalculating: false,
        isBorrowingPowerCalculating: false,
        calculationError: null,
        borrowingPowerError: null,
      };
    
    case 'RESET_ALL':
      return { ...initialState };
    
    default:
      return state;
  }
};

// Context creation
const DTIContext = createContext<DTIContextType | undefined>(undefined);

// Provider component
interface DTIProviderProps {
  children: ReactNode;
  initialState?: Partial<DTIContextState>;
}

export const DTIProvider: React.FC<DTIProviderProps> = ({ 
  children, 
  initialState: initialStateOverride 
}) => {
  const [state, dispatch] = useReducer(dtiReducer, {
    ...initialState,
    ...initialStateOverride,
  });

  // Convex actions
  const solveDTIAction = useAction(api.actions.solveDTI);
  const evaluateDTIAction = useAction(api.actions.evaluateDTI);
  const calculateBorrowingPowerAction = useAction(api.actions.calculateBorrowingPower);

  // Input actions
  const setAnnualIncome = useCallback((income: number) => {
    dispatch({ type: 'SET_ANNUAL_INCOME', payload: income });
  }, []);

  const setMonthlyDebts = useCallback((debts: number) => {
    dispatch({ type: 'SET_MONTHLY_DEBTS', payload: debts });
  }, []);

  const setDebtItems = useCallback((items: DebtItems) => {
    dispatch({ type: 'SET_DEBT_ITEMS', payload: items });
  }, []);

  const setCompensatingFactors = useCallback((factors: CompensatingFactors) => {
    dispatch({ type: 'SET_COMPENSATING_FACTORS', payload: factors });
  }, []);

  const setLoanType = useCallback((loanType: 'fha' | 'conventional') => {
    dispatch({ type: 'SET_LOAN_TYPE', payload: loanType });
  }, []);

  const setCreditScore = useCallback((score: number) => {
    dispatch({ type: 'SET_CREDIT_SCORE', payload: score });
  }, []);

  const setLTV = useCallback((ltv: number) => {
    dispatch({ type: 'SET_LTV', payload: ltv });
  }, []);

  const setProposedPITI = useCallback((piti?: number) => {
    dispatch({ type: 'SET_PROPOSED_PITI', payload: piti });
  }, []);

  const setPropertyTaxRate = useCallback((rate?: number) => {
    dispatch({ type: 'SET_PROPERTY_TAX_RATE', payload: rate });
  }, []);

  const setAnnualInsurance = useCallback((insurance?: number) => {
    dispatch({ type: 'SET_ANNUAL_INSURANCE', payload: insurance });
  }, []);

  const setDownPaymentPercent = useCallback((percent?: number) => {
    dispatch({ type: 'SET_DOWN_PAYMENT_PERCENT', payload: percent });
  }, []);

  const setPMIRate = useCallback((rate?: number) => {
    dispatch({ type: 'SET_PMI_RATE', payload: rate });
  }, []);

  const setInterestRate = useCallback((rate?: number) => {
    dispatch({ type: 'SET_INTEREST_RATE', payload: rate });
  }, []);

  const setTermYears = useCallback((years?: number) => {
    dispatch({ type: 'SET_TERM_YEARS', payload: years });
  }, []);

  const setEmploymentType = useCallback((type?: 'w2' | 'self-employed' | '1099' | 'retired') => {
    dispatch({ type: 'SET_EMPLOYMENT_TYPE', payload: type });
  }, []);

  const setOtherIncome = useCallback((income?: number) => {
    dispatch({ type: 'SET_OTHER_INCOME', payload: income });
  }, []);

  const setPropertyType = useCallback((type?: 'single_family' | 'condo' | 'townhouse' | 'multi_family') => {
    dispatch({ type: 'SET_PROPERTY_TYPE', payload: type });
  }, []);

  // Validation function
  const validateInputs = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (state.annualIncome <= 0) {
      errors.annualIncome = 'Annual income must be greater than 0';
    }

    if (state.monthlyDebts < 0) {
      errors.monthlyDebts = 'Monthly debts cannot be negative';
    }

    if (state.creditScore < 300 || state.creditScore > 850) {
      errors.creditScore = 'Credit score must be between 300 and 850';
    }

    if (state.ltv <= 0 || state.ltv > 100) {
      errors.ltv = 'LTV must be between 0 and 100';
    }

    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
    return Object.keys(errors).length === 0;
  }, [state]);

  // Calculation actions
  const calculateDTI = useCallback(async () => {
    if (!validateInputs()) return;

    dispatch({ type: 'SET_DTI_CALCULATING', payload: true });

    try {
      const result = await solveDTIAction({
        annualIncome: state.annualIncome,
        monthlyDebts: state.monthlyDebts,
        loanType: state.loanType,
        fico: state.creditScore,
        ltv: state.ltv,
        factors: state.compensatingFactors,
        proposedPITI: state.proposedPITI,
        propertyTaxRate: state.propertyTaxRate,
        annualInsurance: state.annualInsurance,
        downPaymentPercent: state.downPaymentPercent,
        pmiRate: state.pmiRate,
        interestRate: state.interestRate,
        termYears: state.termYears,
      });

      if (result.ok && result.data) {
        dispatch({ type: 'SET_DTI_RESPONSE', payload: result.data });
      } else {
        dispatch({ type: 'SET_DTI_ERROR', payload: result.message || 'DTI calculation failed' });
      }
    } catch (error) {
      console.error('DTI calculation error:', error);
      dispatch({ 
        type: 'SET_DTI_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }, [state, validateInputs, solveDTIAction]);

  const evaluateDTI = useCallback(async (proposedPITI: number) => {
    if (!validateInputs()) return;

    dispatch({ type: 'SET_DTI_CALCULATING', payload: true });

    try {
      const result = await evaluateDTIAction({
        annualIncome: state.annualIncome,
        monthlyDebts: state.monthlyDebts,
        proposedPITI,
        loanType: state.loanType,
        fico: state.creditScore,
        ltv: state.ltv,
        factors: state.compensatingFactors,
        propertyTaxRate: state.propertyTaxRate,
        annualInsurance: state.annualInsurance,
        downPaymentPercent: state.downPaymentPercent,
        pmiRate: state.pmiRate,
        interestRate: state.interestRate,
        termYears: state.termYears,
      });

      if (result.ok && result.data) {
        dispatch({ type: 'SET_DTI_RESPONSE', payload: result.data });
      } else {
        dispatch({ type: 'SET_DTI_ERROR', payload: result.message || 'DTI evaluation failed' });
      }
    } catch (error) {
      console.error('DTI evaluation error:', error);
      dispatch({ 
        type: 'SET_DTI_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }, [state, validateInputs, evaluateDTIAction]);

  const calculateBorrowingPower = useCallback(async () => {
    if (!validateInputs()) return;

    dispatch({ type: 'SET_BORROWING_POWER_CALCULATING', payload: true });

    try {
      const result = await calculateBorrowingPowerAction({
        annualIncome: state.annualIncome,
        monthlyDebts: state.monthlyDebts,
        loanType: state.loanType,
        fico: state.creditScore,
        ltv: state.ltv,
        factors: state.compensatingFactors,
        propertyTaxRate: state.propertyTaxRate,
        annualInsurance: state.annualInsurance,
        downPaymentPercent: state.downPaymentPercent,
        pmiRate: state.pmiRate,
        interestRate: state.interestRate,
        termYears: state.termYears,
      });

      if (result.ok && result.data) {
        dispatch({ type: 'SET_BORROWING_POWER_RESPONSE', payload: result.data });
      } else {
        dispatch({ type: 'SET_BORROWING_POWER_ERROR', payload: result.message || 'Borrowing power calculation failed' });
      }
    } catch (error) {
      console.error('Borrowing power calculation error:', error);
      dispatch({ 
        type: 'SET_BORROWING_POWER_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }, [state, validateInputs, calculateBorrowingPowerAction]);

  // Utility actions
  const resetCalculations = useCallback(() => {
    dispatch({ type: 'RESET_CALCULATIONS' });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  // Computed values
  const hasRequiredInputs = useMemo(() => {
    return state.annualIncome > 0 && state.creditScore >= 300 && state.ltv > 0;
  }, [state.annualIncome, state.creditScore, state.ltv]);

  const monthlyIncome = useMemo(() => {
    return state.annualIncome / 12;
  }, [state.annualIncome]);

  const totalDebtItems = useMemo(() => {
    return Object.values(state.debtItems).reduce((sum, debt) => sum + debt, 0);
  }, [state.debtItems]);

  const dtiStatus = useMemo((): DTIStatus | null => {
    if (!state.dtiResponse) return null;

    const backEndDTI = state.dtiResponse.actual.backEnd;
    const allowedBackEnd = state.dtiResponse.allowed.backEnd;

    if (backEndDTI <= allowedBackEnd * 0.8) {
      return {
        value: backEndDTI,
        status: 'normal',
        message: 'DTI is within safe limits',
        helpText: 'Your debt-to-income ratio is healthy and well within acceptable ranges.'
      };
    } else if (backEndDTI <= allowedBackEnd) {
      return {
        value: backEndDTI,
        status: 'caution',
        message: 'DTI is approaching limits',
        helpText: 'Your debt-to-income ratio is acceptable but getting close to the maximum allowed.'
      };
    } else if (backEndDTI <= allowedBackEnd * 1.1) {
      return {
        value: backEndDTI,
        status: 'warning',
        message: 'DTI slightly exceeds limits',
        helpText: 'Your debt-to-income ratio exceeds standard limits but may be acceptable with compensating factors.'
      };
    } else {
      return {
        value: backEndDTI,
        status: 'exceeded',
        message: 'DTI significantly exceeds limits',
        helpText: 'Your debt-to-income ratio is too high and will likely require significant changes to qualify.'
      };
    }
  }, [state.dtiResponse]);

  // Context value
  const contextValue: DTIContextType = useMemo(() => ({
    state,
    setAnnualIncome,
    setMonthlyDebts,
    setDebtItems,
    setCompensatingFactors,
    setLoanType,
    setCreditScore,
    setLTV,
    setProposedPITI,
    setPropertyTaxRate,
    setAnnualInsurance,
    setDownPaymentPercent,
    setPMIRate,
    setInterestRate,
    setTermYears,
    setEmploymentType,
    setOtherIncome,
    setPropertyType,
    calculateDTI,
    evaluateDTI,
    calculateBorrowingPower,
    validateInputs,
    resetCalculations,
    resetAll,
    hasRequiredInputs,
    monthlyIncome,
    totalDebtItems,
    dtiStatus,
  }), [
    state,
    setAnnualIncome,
    setMonthlyDebts,
    setDebtItems,
    setCompensatingFactors,
    setLoanType,
    setCreditScore,
    setLTV,
    setProposedPITI,
    setPropertyTaxRate,
    setAnnualInsurance,
    setDownPaymentPercent,
    setPMIRate,
    setInterestRate,
    setTermYears,
    setEmploymentType,
    setOtherIncome,
    setPropertyType,
    calculateDTI,
    evaluateDTI,
    calculateBorrowingPower,
    validateInputs,
    resetCalculations,
    resetAll,
    hasRequiredInputs,
    monthlyIncome,
    totalDebtItems,
    dtiStatus,
  ]);

  return (
    <DTIContext.Provider value={contextValue}>
      {children}
    </DTIContext.Provider>
  );
};

// Custom hook to use the DTI context
export const useDTIContext = (): DTIContextType => {
  const context = useContext(DTIContext);
  if (!context) {
    throw new DTICalculationError(
      'useDTIContext must be used within a DTIProvider',
      'CONTEXT_ERROR'
    );
  }
  return context;
};

// Export the context for testing purposes
export { DTIContext };