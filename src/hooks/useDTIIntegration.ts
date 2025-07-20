import { useState, useCallback, useEffect } from 'react';
import { useDTIContext } from '../context/DTIContext';

export type DTIStatus = 'not-started' | 'in-progress' | 'completed' | 'needs-update';

interface DTIIntegrationState {
  isModalOpen: boolean;
  dtiStatus: DTIStatus;
  dtiResults: {
    dtiResponse: any;
    borrowingPowerResponse: any;
  } | null;
  lastCalculatedAt: number | null;
}

interface UseDTIIntegrationReturn {
  // State
  isDTIModalOpen: boolean;
  dtiStatus: DTIStatus;
  dtiResults: DTIIntegrationState['dtiResults'];
  
  // Actions
  openDTIModal: () => void;
  closeDTIModal: () => void;
  updateDTIResults: (results: DTIIntegrationState['dtiResults']) => void;
  resetDTI: () => void;
  
  // Computed
  shouldSuggestDTI: (loanAmount?: number) => boolean;
  isDTIStale: () => boolean;
}

const DTI_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const DTI_STALE_WARNING = 20 * 60 * 1000; // 20 minutes - warn before expiry

export function useDTIIntegration(): UseDTIIntegrationReturn {
  const dtiContext = useDTIContext();
  
  // Initialize state from localStorage if available
  const [state, setState] = useState<DTIIntegrationState>(() => {
    const savedState = localStorage.getItem('dti-integration-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Check if cached data is still valid
        const isExpired = parsed.lastCalculatedAt && 
          (Date.now() - parsed.lastCalculatedAt) > DTI_CACHE_DURATION;
        
        return {
          ...parsed,
          isModalOpen: false, // Always start with modal closed
          dtiStatus: isExpired ? 'needs-update' : parsed.dtiStatus,
          dtiResults: isExpired ? null : parsed.dtiResults,
        };
      } catch (e) {
        console.error('Failed to parse DTI integration state:', e);
      }
    }
    
    return {
      isModalOpen: false,
      dtiStatus: 'not-started',
      dtiResults: null,
      lastCalculatedAt: null,
    };
  });

  // Save state to localStorage whenever it changes (except modal state)
  useEffect(() => {
    const stateToSave = {
      ...state,
      isModalOpen: false, // Don't persist modal state
    };
    localStorage.setItem('dti-integration-state', JSON.stringify(stateToSave));
  }, [state]);

  // Sync with DTI context results
  useEffect(() => {
    if (dtiContext.state.dtiResponse && dtiContext.state.borrowingPowerResponse) {
      setState(prev => ({
        ...prev,
        dtiStatus: 'completed',
        dtiResults: {
          dtiResponse: dtiContext.state.dtiResponse,
          borrowingPowerResponse: dtiContext.state.borrowingPowerResponse,
        },
        lastCalculatedAt: Date.now(),
      }));
    }
  }, [dtiContext.state.dtiResponse, dtiContext.state.borrowingPowerResponse]);

  const openDTIModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: true,
      dtiStatus: prev.dtiStatus === 'not-started' ? 'in-progress' : prev.dtiStatus,
    }));
  }, []);

  const closeDTIModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalOpen: false,
    }));
  }, []);

  const updateDTIResults = useCallback((results: DTIIntegrationState['dtiResults']) => {
    setState(prev => ({
      ...prev,
      dtiResults: results,
      dtiStatus: results ? 'completed' : prev.dtiStatus,
      lastCalculatedAt: results ? Date.now() : prev.lastCalculatedAt,
    }));
  }, []);

  const resetDTI = useCallback(() => {
    setState({
      isModalOpen: false,
      dtiStatus: 'not-started',
      dtiResults: null,
      lastCalculatedAt: null,
    });
    dtiContext.resetAll();
  }, [dtiContext]);

  const shouldSuggestDTI = useCallback((loanAmount?: number): boolean => {
    // Suggest DTI if:
    // 1. Not calculated yet
    if (state.dtiStatus === 'not-started') return true;
    
    // 2. Results are stale
    if (isDTIStale()) return true;
    
    // 3. Loan amount is high (over $300k) and DTI not recently calculated
    if (loanAmount && loanAmount > 300000 && state.dtiStatus !== 'completed') {
      return true;
    }
    
    return false;
  }, [state.dtiStatus]);

  const isDTIStale = useCallback((): boolean => {
    if (!state.lastCalculatedAt) return false;
    
    const timeSinceCalculation = Date.now() - state.lastCalculatedAt;
    return timeSinceCalculation > DTI_CACHE_DURATION;
  }, [state.lastCalculatedAt]);

  // Smart behavior: Check if DTI is getting stale (approaching expiry)
  const isDTIGettingStale = useCallback((): boolean => {
    if (!state.lastCalculatedAt) return false;
    
    const timeSinceCalculation = Date.now() - state.lastCalculatedAt;
    return timeSinceCalculation > DTI_STALE_WARNING && timeSinceCalculation < DTI_CACHE_DURATION;
  }, [state.lastCalculatedAt]);

  // Get time remaining before DTI expires
  const getTimeUntilExpiry = useCallback((): number | null => {
    if (!state.lastCalculatedAt) return null;
    
    const timeSinceCalculation = Date.now() - state.lastCalculatedAt;
    const timeRemaining = DTI_CACHE_DURATION - timeSinceCalculation;
    
    return timeRemaining > 0 ? timeRemaining : 0;
  }, [state.lastCalculatedAt]);

  return {
    // State
    isDTIModalOpen: state.isModalOpen,
    dtiStatus: state.dtiStatus,
    dtiResults: state.dtiResults,
    
    // Actions
    openDTIModal,
    closeDTIModal,
    updateDTIResults,
    resetDTI,
    
    // Computed
    shouldSuggestDTI,
    isDTIStale,
  };
}