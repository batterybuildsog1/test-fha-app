/**
 * Compensating Factors Context
 * Modern state management with proper error handling and performance optimization
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from 'react';
import { 
  CompensatingFactorContextType, 
  CompensatingFactorSelection, 
  CompensatingFactorState,
  CompensatingFactorError
} from '@/types/compensating-factors';
import { useCompensatingFactors } from '@/hooks/useCompensatingFactors';

// Action types for reducer
type CompensatingFactorAction = 
  | { type: 'UPDATE_SELECTION'; payload: { factorId: string; value: string } }
  | { type: 'UPDATE_CURRENT_HOUSING_PAYMENT'; payload: number }
  | { type: 'RESET_SELECTIONS' }
  | { type: 'SET_CREDIT_SCORE'; payload: number }
  | { type: 'SET_NON_HOUSING_DTI'; payload: number }
  | { type: 'SET_NEW_HOUSING_PAYMENT'; payload: number };

// Internal state for the reducer
interface InternalState {
  selections: CompensatingFactorSelection;
  currentHousingPayment: number;
  creditScore: number;
  nonHousingDTI: number;
  newHousingPayment: number;
}

// Initial state
const initialState: InternalState = {
  selections: {},
  currentHousingPayment: 0,
  creditScore: 700,
  nonHousingDTI: 10,
  newHousingPayment: 0,
};

// Reducer function
const compensatingFactorReducer = (
  state: InternalState, 
  action: CompensatingFactorAction
): InternalState => {
  switch (action.type) {
    case 'UPDATE_SELECTION':
      return {
        ...state,
        selections: {
          ...state.selections,
          [action.payload.factorId]: action.payload.value,
        },
      };
    
    case 'UPDATE_CURRENT_HOUSING_PAYMENT':
      return {
        ...state,
        currentHousingPayment: Math.max(0, action.payload),
      };
    
    case 'SET_CREDIT_SCORE':
      return {
        ...state,
        creditScore: Math.max(300, Math.min(850, action.payload)),
      };
    
    case 'SET_NON_HOUSING_DTI':
      return {
        ...state,
        nonHousingDTI: Math.max(0, Math.min(100, action.payload)),
      };
    
    case 'SET_NEW_HOUSING_PAYMENT':
      return {
        ...state,
        newHousingPayment: Math.max(0, action.payload),
      };
    
    case 'RESET_SELECTIONS':
      return {
        ...state,
        selections: {},
      };
    
    default:
      return state;
  }
};

// Context creation
const CompensatingFactorsContext = createContext<CompensatingFactorContextType | undefined>(undefined);

// Provider component
interface CompensatingFactorsProviderProps {
  children: ReactNode;
  initialSelections?: CompensatingFactorSelection;
  initialCurrentHousingPayment?: number;
  creditScore?: number;
  nonHousingDTI?: number;
  newHousingPayment?: number;
}

export const CompensatingFactorsProvider: React.FC<CompensatingFactorsProviderProps> = ({
  children,
  initialSelections = {},
  initialCurrentHousingPayment = 0,
  creditScore = 700,
  nonHousingDTI = 10,
  newHousingPayment = 0,
}) => {
  const [state, dispatch] = useReducer(compensatingFactorReducer, {
    ...initialState,
    selections: initialSelections,
    currentHousingPayment: initialCurrentHousingPayment,
    creditScore,
    nonHousingDTI,
    newHousingPayment,
  });

  // Use the custom hook for calculations
  const { analysis, calculatedFactors, validateSelections, qualificationTierDescription } = useCompensatingFactors({
    selections: state.selections,
    currentHousingPayment: state.currentHousingPayment,
    creditScore: state.creditScore,
    nonHousingDTI: state.nonHousingDTI,
    newHousingPayment: state.newHousingPayment,
  });

  // Memoized actions
  const updateSelection = useCallback((factorId: string, value: string) => {
    try {
      dispatch({ type: 'UPDATE_SELECTION', payload: { factorId, value } });
    } catch (error) {
      throw new CompensatingFactorError(
        `Failed to update selection for ${factorId}`,
        'UPDATE_SELECTION_ERROR',
        factorId
      );
    }
  }, []);

  const updateCurrentHousingPayment = useCallback((amount: number) => {
    try {
      dispatch({ type: 'UPDATE_CURRENT_HOUSING_PAYMENT', payload: amount });
    } catch (error) {
      throw new CompensatingFactorError(
        'Failed to update current housing payment',
        'UPDATE_HOUSING_PAYMENT_ERROR'
      );
    }
  }, []);

  const calculateHousingPaymentIncrease = useCallback((newPayment: number) => {
    try {
      dispatch({ type: 'SET_NEW_HOUSING_PAYMENT', payload: newPayment });
    } catch (error) {
      throw new CompensatingFactorError(
        'Failed to calculate housing payment increase',
        'CALCULATE_PAYMENT_INCREASE_ERROR'
      );
    }
  }, []);

  const resetSelections = useCallback(() => {
    try {
      dispatch({ type: 'RESET_SELECTIONS' });
    } catch (error) {
      throw new CompensatingFactorError(
        'Failed to reset selections',
        'RESET_SELECTIONS_ERROR'
      );
    }
  }, []);

  // Memoized context value
  const contextValue = useMemo((): CompensatingFactorContextType => ({
    selections: state.selections,
    currentHousingPayment: state.currentHousingPayment,
    calculatedFactors,
    analysis,
    updateSelection,
    updateCurrentHousingPayment,
    calculateHousingPaymentIncrease,
    resetSelections,
  }), [
    state.selections,
    state.currentHousingPayment,
    calculatedFactors,
    analysis,
    updateSelection,
    updateCurrentHousingPayment,
    calculateHousingPaymentIncrease,
    resetSelections,
  ]);

  return (
    <CompensatingFactorsContext.Provider value={contextValue}>
      {children}
    </CompensatingFactorsContext.Provider>
  );
};

// Custom hook to use the context
export const useCompensatingFactorsContext = (): CompensatingFactorContextType => {
  const context = useContext(CompensatingFactorsContext);
  if (!context) {
    throw new CompensatingFactorError(
      'useCompensatingFactorsContext must be used within a CompensatingFactorsProvider',
      'CONTEXT_ERROR'
    );
  }
  return context;
};

// Export the context for testing purposes
export { CompensatingFactorsContext };