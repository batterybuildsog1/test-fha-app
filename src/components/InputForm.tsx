import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getStateFromZip } from '../utils/zip-to-state';
import { Id } from '../../convex/_generated/dataModel';
import { useDTIContext } from '../context/DTIContext';
import { useDTIIntegration } from '../hooks/useDTIIntegration';
import { DTICalculatorModal } from './dti/DTICalculatorModal';
import { DTITriggerCard } from './dti/DTITriggerCard';
import { DTISummaryCard } from './dti/DTISummaryCard';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { 
  MortgageFormData, 
  MortgageCalculationResult, 
  FormErrors, 
  ApiStatus, 
  InputFormProps,
  ScenarioData 
} from '../types';

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

function InputForm({ trackApiCall, scenarioId, mode, onScenarioSaved, onCancel }: InputFormProps) {
  const [useCurrentRate, setUseCurrentRate] = useState(true);
  const [showDTISection, setShowDTISection] = useState(false);
  const fhaRateQuery = useQuery(api.getFHARates.getFHARates);
  const loadedScenario = useQuery(api.scenarios.getById, scenarioId ? { id: scenarioId } : "skip");
  const dtiContext = useDTIContext();
  const {
    isDTIModalOpen,
    dtiStatus,
    dtiResults,
    openDTIModal,
    closeDTIModal,
    updateDTIResults,
  } = useDTIIntegration();
  
  const [data, setData] = useState<MortgageFormData>({ 
    housePrice: 350000, 
    downPayment: 12250, 
    interestRate: fhaRateQuery ?? 0, 
    zipCode: '78701', 
    loanTerm: 30,
    creditScore: 'good',
    name: '',
    description: '',
    tags: [],
  });
  const [calculations, setCalculations] = useState<MortgageCalculationResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ message: '', type: '' });

  const fetchFreshRate = useAction(api.getFHARates.getFreshFHARate);
  const calculateFull = useAction(api.functions.calculateFullPayment);
  const saveScenario = useMutation(api.scenarios.saveScenario);
  const updateScenario = useMutation(api.scenarios.updateScenario);

  // Derive state from zipCode using useMemo to prevent dependency loops
  const derivedState = useMemo(() => {
    if (data.zipCode.length === 5) {
      return getStateFromZip(data.zipCode);
    }
    return '';
  }, [data.zipCode]);

  useEffect(() => {
    if (useCurrentRate) {
      if (fhaRateQuery !== null) {
        setData(prev => ({ ...prev, interestRate: fhaRateQuery }));
      } else {
        handleFetchRate();
      }
    }
  }, [useCurrentRate, fhaRateQuery]);

  const handleFetchRate = useCallback(() => {
    const tracker = trackApiCall ? trackApiCall('FHA Rate Fetch') : null;
    tracker?.start();
    setIsFetchingRate(true);
    setApiStatus({ message: 'Fetching current FHA rate...', type: 'info' });
    
    fetchFreshRate({}).then((rate) => {
      setData(prev => ({ ...prev, interestRate: rate }));
      setApiStatus({ message: `FHA rate updated: ${rate}%`, type: 'success' });
      tracker?.success();
      setTimeout(() => setApiStatus({ message: '', type: '' }), 3000);
    }).catch(err => {
      console.error('Failed to fetch FHA rate:', err);
      setErrors(prev => ({ ...prev, rate: 'Failed to fetch current FHA rate' }));
      setApiStatus({ message: 'Failed to fetch FHA rate', type: 'error' });
      tracker?.error(err.message || 'Failed to fetch FHA rate');
    }).finally(() => {
      setIsFetchingRate(false);
    });
  }, [fetchFreshRate, trackApiCall]);

  // Track the last derived state to prevent unnecessary updates
  const lastDerivedStateRef = useRef<string>('');
  
  // Update state when derivedState changes, but only if it's different from what we last set
  useEffect(() => {
    if (derivedState !== lastDerivedStateRef.current) {
      lastDerivedStateRef.current = derivedState;
      setData(prev => ({ ...prev, state: derivedState }));
    }
  }, [derivedState]);

  useEffect(() => {
    if (loadedScenario && scenarioId) {
      setData(prev => ({
        ...prev,
        housePrice: loadedScenario.housePrice,
        downPayment: loadedScenario.downPayment,
        interestRate: loadedScenario.interestRate,
        zipCode: loadedScenario.zipCode,
        loanTerm: loadedScenario.loanTerm,
        creditScore: loadedScenario.creditScore,
        name: loadedScenario.name || '',
        description: loadedScenario.description || '',
        tags: loadedScenario.tags || [],
      }));
      
      // Note: state will be automatically updated by the derivedState useEffect
      // when zipCode changes, so we don't need to manually set it here
      
      // For view/edit mode, also set the calculations if they exist
      if (mode !== 'create') {
        setCalculations({
          total: loadedScenario.monthlyPayment,
          principalInterest: loadedScenario.principalInterest,
          propertyTax: loadedScenario.propertyTax,
          insurance: loadedScenario.insurance,
          pmi: loadedScenario.pmi,
          details: {
            loanAmount: loadedScenario.housePrice - loadedScenario.downPayment,
            effectiveRate: loadedScenario.interestRate,
            downPaymentPercent: ((loadedScenario.downPayment / loadedScenario.housePrice) * 100).toFixed(1),
            creditScoreUsed: loadedScenario.creditScore
          }
        });
      }
    }
  }, [loadedScenario, scenarioId, mode]);

  const handleDTIComplete = useCallback((results: {
    dtiResponse: any;
    borrowingPowerResponse: any;
  }) => {
    updateDTIResults(results);
    
    // If we have a max loan amount from DTI, we can suggest it to the user
    if (results.borrowingPowerResponse?.maxLoanAmount) {
      const maxLoanAmount = results.borrowingPowerResponse.maxLoanAmount;
      const suggestedHousePrice = maxLoanAmount + data.downPayment;
      
      // Check if current house price exceeds DTI limits
      if (data.housePrice > suggestedHousePrice) {
        setApiStatus({
          message: `Based on your DTI, the maximum house price is $${suggestedHousePrice.toLocaleString()}`,
          type: 'warning'
        });
      }
    }
  }, [data.downPayment, data.housePrice, updateDTIResults]);

  // Real-time DTI feedback when house price or down payment changes
  useEffect(() => {
    if (dtiResults?.borrowingPowerResponse) {
      const loanAmount = data.housePrice - data.downPayment;
      const maxLoanAmount = dtiResults.borrowingPowerResponse.maxLoanAmount;
      
      if (loanAmount > maxLoanAmount) {
        const excess = loanAmount - maxLoanAmount;
        const suggestedDownPayment = data.housePrice - maxLoanAmount;
        const suggestedDownPaymentPercent = (suggestedDownPayment / data.housePrice) * 100;
        
        setApiStatus({
          message: `Based on DTI, you need ${suggestedDownPaymentPercent.toFixed(1)}% down ($${suggestedDownPayment.toLocaleString()})`,
          type: 'warning'
        });
      } else {
        // Clear warning if within limits
        setApiStatus(prev => prev.type === 'warning' ? { message: '', type: '' } : prev);
      }
    }
  }, [data.housePrice, data.downPayment, dtiResults]);

  // Smart behavior: Auto-suggest DTI calculation for high loan amounts
  useEffect(() => {
    const loanAmount = data.housePrice - data.downPayment;
    const isHighLoanAmount = loanAmount > 400000;
    const hasNeverCalculatedDTI = dtiStatus === 'not-started';
    const isNotInEditMode = mode !== 'edit';
    
    if (isHighLoanAmount && hasNeverCalculatedDTI && isNotInEditMode) {
      // Delay suggestion to avoid overwhelming user on initial load
      const timer = setTimeout(() => {
        setApiStatus({
          message: 'For jumbo loans over $400k, calculating DTI is highly recommended. Click the DTI calculator above.',
          type: 'info'
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [data.housePrice, data.downPayment, dtiStatus, mode]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (data.housePrice <= 0) newErrors.housePrice = 'House price must be positive.';
    if (data.downPayment < data.housePrice * 0.03) newErrors.downPayment = 'Minimum down payment is 3%.';
    if (data.downPayment >= data.housePrice) newErrors.downPayment = 'Down payment must be less than house price.';
    if (!useCurrentRate && (data.interestRate <= 0 || data.interestRate > 25)) newErrors.interestRate = 'Enter a valid rate.';
    if (!/^\d{5}$/.test(data.zipCode)) newErrors.zipCode = 'Must be 5 digits.';
    if (!derivedState || derivedState.length !== 2) newErrors.state = 'State is required.';
    
    // DTI validation warnings
    if (dtiResults?.borrowingPowerResponse) {
      const loanAmount = data.housePrice - data.downPayment;
      const maxLoanAmount = dtiResults.borrowingPowerResponse.maxLoanAmount;
      
      if (loanAmount > maxLoanAmount) {
        const excess = loanAmount - maxLoanAmount;
        newErrors.general = `Loan amount exceeds DTI limit by $${excess.toLocaleString()}. Consider increasing down payment or lowering house price.`;
      }
    } else if (data.housePrice > 300000 && dtiStatus === 'not-started') {
      // Suggest DTI calculation for higher loan amounts
      setApiStatus({ 
        message: 'For loans over $300k, we recommend calculating your DTI first.', 
        type: 'warning' 
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const tracker = trackApiCall ? trackApiCall('Full Payment Calculation') : null;
    tracker?.start();

    setIsLoading(true);
    setCalculations(null);
    setApiStatus({ message: 'Calculating your monthly payment...', type: 'info' });

    try {
      const result = await calculateFull({ 
        ...data, 
        state: derivedState, 
        useFHA: useCurrentRate,
        // Include DTI data if available
        dtiSnapshot: dtiResults?.dtiResponse ? {
          allowed: dtiResults.dtiResponse.allowed,
          actual: dtiResults.dtiResponse.actual,
          maxPITI: dtiResults.dtiResponse.maxPITI,
          flags: dtiResults.dtiResponse.flags || []
        } : undefined,
        annualIncome: dtiContext.state.annualIncome || undefined,
        monthlyDebts: dtiContext.state.monthlyDebts || undefined
      });
      setCalculations(result);
      setApiStatus({ message: 'Calculation complete!', type: 'success' });
      tracker?.success();
      setTimeout(() => setApiStatus({ message: '', type: '' }), 3000);
    } catch (error: any) {
      console.error('Full calculation failed:', error);
      const errorMessage = error.message || 'Calculation failed. Please check inputs.';
      setErrors({ general: errorMessage });
      setApiStatus({ message: 'Calculation failed', type: 'error' });
      tracker?.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!calculations) return;
    
    if (!data.name.trim()) {
      setApiStatus({ message: 'Please provide a name for this scenario', type: 'error' });
      return;
    }
    
    const scenarioData: ScenarioData = {
      housePrice: data.housePrice,
      downPayment: data.downPayment,
      interestRate: data.interestRate,
      loanTerm: data.loanTerm,
      zipCode: data.zipCode,
      state: derivedState,
      creditScore: data.creditScore,
      monthlyPayment: calculations.total,
      principalInterest: calculations.principalInterest,
      propertyTax: calculations.propertyTax,
      insurance: calculations.insurance,
      pmi: calculations.pmi,
      name: data.name,
      description: data.description,
      tags: data.tags,
      // Include DTI data if available
      dtiSnapshot: dtiResults?.dtiResponse ? {
        allowed: dtiResults.dtiResponse.allowed,
        actual: dtiResults.dtiResponse.actual,
        maxPITI: dtiResults.dtiResponse.maxPITI,
        flags: dtiResults.dtiResponse.flags || [],
        strongFactorCount: dtiResults.dtiResponse.strongFactorCount || 0
      } : undefined,
      annualIncome: dtiContext.state.annualIncome || undefined,
      monthlyDebts: dtiContext.state.monthlyDebts || undefined,
      dtiStatus: dtiStatus || undefined,
    };
    
    try {
      if (mode === 'edit' && scenarioId) {
        await updateScenario({ id: scenarioId, ...scenarioData });
        setApiStatus({ message: 'Scenario updated successfully!', type: 'success' });
      } else {
        await saveScenario(scenarioData);
        setApiStatus({ message: 'Scenario saved successfully!', type: 'success' });
      }
      
      if (onScenarioSaved) {
        onScenarioSaved(scenarioData);
      }
      
      setTimeout(() => setApiStatus({ message: '', type: '' }), 3000);
    } catch (error) {
      console.error('Failed to save scenario:', error);
      setApiStatus({ message: 'Failed to save scenario', type: 'error' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (mode === 'view') return; // Prevent changes in view mode
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setData(prev => ({ ...prev, [name]: isNumber ? +value : value }));
  };

  const isReadOnly = mode === 'view';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-200">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* House Price */}
          <div>
            <label htmlFor="housePrice" className="block text-sm font-medium text-gray-700 mb-1">House Price ($)</label>
            <input id="housePrice" name="housePrice" type="number" placeholder="e.g., 350000" value={data.housePrice || ''} onChange={handleInputChange} readOnly={isReadOnly}
              className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.housePrice ? 'border-red-500' : 'border-gray-300'} ${isReadOnly ? 'bg-gray-50' : ''}`} />
            {errors.housePrice && <p className="text-red-600 text-xs mt-1">{errors.housePrice}</p>}
          </div>

          {/* Down Payment */}
          <div>
            <label htmlFor="downPayment" className="block text-sm font-medium text-gray-700 mb-1">Down Payment ($)</label>
            <input 
              id="downPayment" 
              name="downPayment" 
              type="number" 
              placeholder="e.g., 12250" 
              value={data.downPayment || ''} 
              onChange={handleInputChange}
              readOnly={isReadOnly}
              min={data.housePrice > 0 ? data.housePrice * 0.03 : 0}
              max={data.housePrice}
              className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.downPayment ? 'border-red-500' : 'border-gray-300'} ${isReadOnly ? 'bg-gray-50' : ''}`} />
            {errors.downPayment && <p className="text-red-600 text-xs mt-1">{errors.downPayment}</p>}
            {data.housePrice > 0 && <p className="text-xs text-gray-500 mt-1">
              {((data.downPayment / data.housePrice) * 100).toFixed(1)}% (min 3%)
            </p>}
          </div>

          {/* Interest Rate */}
          <div className="md:col-span-2">
            <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
            <div className="flex items-center gap-2">
              <input id="interestRate" name="interestRate" type="number" step="0.01" value={data.interestRate || ''} onChange={handleInputChange} disabled={useCurrentRate || isReadOnly} readOnly={isReadOnly}
                className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.interestRate ? 'border-red-500' : 'border-gray-300'} ${useCurrentRate || isReadOnly ? 'bg-gray-100' : ''}`} />
              {!isReadOnly && (
                <button type="button" onClick={handleFetchRate} disabled={isFetchingRate || !useCurrentRate}
                  className="flex-shrink-0 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
                  {isFetchingRate ? <Spinner /> : 'Refresh'}
                </button>
              )}
            </div>
            {errors.interestRate && <p className="text-red-600 text-xs mt-1">{errors.interestRate}</p>}
            
            {!isReadOnly && (
              <label className="flex items-center mt-2 text-sm text-gray-700">
                <input type="checkbox" checked={useCurrentRate} onChange={e => setUseCurrentRate(e.target.checked)} className="form-checkbox mr-2 text-indigo-600 rounded" />
                Use current FHA rate {useCurrentRate && fhaRateQuery === null && !isFetchingRate ? '(fetching...)' : fhaRateQuery ? `(Cached: ${fhaRateQuery}%)` : ''}
              </label>
            )}
            {errors.rate && <p className="text-red-600 text-xs mt-1">{errors.rate}</p>}
          </div>

          {/* ZIP Code, Loan Term, Credit Score... */}
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
            <input id="zipCode" name="zipCode" type="text" placeholder="e.g., 78701" value={data.zipCode} onChange={handleInputChange} maxLength={5} readOnly={isReadOnly}
              className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.zipCode ? 'border-red-500' : 'border-gray-300'} ${isReadOnly ? 'bg-gray-50' : ''}`} />
            {errors.zipCode && <p className="text-red-600 text-xs mt-1">{errors.zipCode}</p>}
            {derivedState && <p className="text-xs text-green-600 mt-1">✓ Detected state: {derivedState}</p>}
          </div>
          <div>
            <label htmlFor="loanTerm" className="block text-sm font-medium text-gray-700 mb-1">Loan Term</label>
            <select id="loanTerm" name="loanTerm" value={data.loanTerm} onChange={handleInputChange} disabled={isReadOnly} className={`form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${isReadOnly ? 'bg-gray-50' : ''}`}>
              <option value={15}>15 years</option>
              <option value={30}>30 years</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="creditScore" className="block text-sm font-medium text-gray-700 mb-1">Credit Score Range</label>
            <select id="creditScore" name="creditScore" value={data.creditScore} onChange={handleInputChange} disabled={isReadOnly} className={`form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${isReadOnly ? 'bg-gray-50' : ''}`}>
              <option value="excellent">Excellent (740+)</option>
              <option value="good">Good (670-739)</option>
              <option value="fair">Fair (580-669)</option>
              <option value="poor">Poor (&lt;580)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Affects insurance rates and loan terms.</p>
          </div>

          {/* DTI Calculator Section */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700">
                Debt-to-Income Calculator
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-sm mb-1">What is DTI and why does it matter?</p>
                        <p className="text-sm">
                          Your Debt-to-Income (DTI) ratio is one of the most important factors in mortgage approval. 
                          It shows lenders what percentage of your income goes to debt payments.
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-semibold text-sm mb-1">DTI Requirements:</p>
                        <ul className="text-sm space-y-1">
                          <li>• <span className="font-medium">FHA loans:</span> Up to 43% standard (57% with compensating factors)</li>
                          <li>• <span className="font-medium">Conventional loans:</span> Typically 36-43%</li>
                        </ul>
                      </div>
                      
                      <div>
                        <p className="font-semibold text-sm mb-1">How to improve your DTI:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Pay down existing debts</li>
                          <li>• Increase your income</li>
                          <li>• Avoid taking on new debt</li>
                          <li>• Consider a co-borrower</li>
                        </ul>
                      </div>
                      
                      <p className="text-sm italic text-gray-600">
                        Calculate your DTI now to see your maximum borrowing power!
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {dtiStatus === 'not-started' || dtiStatus === 'needs-update' ? (
              <DTITriggerCard 
                onCalculate={openDTIModal} 
                status={dtiStatus}
              />
            ) : dtiResults ? (
              <DTISummaryCard 
                dtiResults={dtiResults}
                onRecalculate={openDTIModal}
              />
            ) : null}
          </div>

          {/* Scenario metadata fields */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Scenario Name</label>
            <input 
              id="name" 
              name="name" 
              type="text" 
              placeholder="e.g., Dream Home - Austin" 
              value={data.name} 
              onChange={handleInputChange}
              readOnly={isReadOnly}
              className={`form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${isReadOnly ? 'bg-gray-50' : ''}`}
            />
            <p className="text-xs text-gray-500 mt-1">Give this scenario a memorable name</p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea 
              id="description" 
              name="description" 
              rows={2}
              placeholder="e.g., Comparing FHA vs conventional for starter home"
              value={data.description} 
              onChange={handleInputChange}
              readOnly={isReadOnly}
              className={`form-textarea w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${isReadOnly ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>

        {errors.general && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{errors.general}</div>}
        {apiStatus.message && <div className={`p-2 rounded-lg text-sm ${apiStatus.type === 'error' ? 'bg-red-100 text-red-700' : apiStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{apiStatus.message}</div>}

        {!isReadOnly && (
          <div className="flex gap-4">
            <button type="submit" disabled={isLoading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-semibold text-lg transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
              {isLoading ? <><Spinner /> Calculating...</> : mode === 'edit' ? 'Update Scenario' : 'Calculate Monthly Payment'}
            </button>
            
            {mode !== 'create' && (
              <button type="button" onClick={onCancel}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-all">
                Cancel
              </button>
            )}
          </div>
        )}
      </form>

      {calculations && (
        <div className="mt-10 pt-8 border-t-2 border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-2xl md:text-3xl text-gray-900">Monthly Payment Breakdown</h3>
            {!isReadOnly && (
              <button onClick={handleSaveScenario} className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800">
                {mode === 'edit' ? 'Update Scenario' : 'Save Scenario'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm"><span className="text-gray-700">Principal & Interest:</span><span className="font-semibold text-lg">${calculations.principalInterest}</span></div>
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm"><span className="text-gray-700">Property Tax:</span><span className="font-semibold text-lg">${calculations.propertyTax}</span></div>
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm"><span className="text-gray-700">Homeowners Insurance:</span><span className="font-semibold text-lg">${calculations.insurance}</span></div>
            {calculations.pmi > 0 && <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm"><span className="text-gray-700">PMI:</span><span className="font-semibold text-lg">${calculations.pmi}</span></div>}
            
            <div className="mt-6 pt-6 border-t border-dashed border-gray-300">
              <div className="flex justify-between items-center p-5 bg-gray-800 text-white rounded-lg">
                <span className="text-xl font-semibold">Total Monthly Payment:</span>
                <span className="text-3xl font-bold">${calculations.total}</span>
              </div>
            </div>
            
            {calculations.details && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm">
                <h4 className="font-semibold mb-2 text-gray-700">Calculation Details:</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-600">
                  <p>Loan Amount: ${calculations.details.loanAmount?.toLocaleString()}</p>
                  <p>Down Payment: {calculations.details.downPaymentPercent}%</p>
                  <p>Interest Rate: {calculations.details.effectiveRate}%</p>
                  <p>Credit Score: {calculations.details.creditScoreUsed}</p>
                </div>
              </div>
            )}
            
            {/* DTI Validation Results */}
            {calculations.dtiValidation && (
              <div className={`mt-4 p-4 rounded-lg ${
                calculations.dtiValidation.status === 'approved' ? 'bg-green-50 border border-green-200' :
                calculations.dtiValidation.status === 'exceeds-limit' ? 'bg-red-50 border border-red-200' :
                calculations.dtiValidation.status === 'high-ratio' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-gray-50 border border-gray-200'
              }`}>
                <h4 className={`font-semibold mb-2 ${
                  calculations.dtiValidation.status === 'approved' ? 'text-green-800' :
                  calculations.dtiValidation.status === 'exceeds-limit' ? 'text-red-800' :
                  calculations.dtiValidation.status === 'high-ratio' ? 'text-yellow-800' :
                  'text-gray-700'
                }`}>DTI Analysis</h4>
                
                <div className="space-y-2 text-sm">
                  {calculations.dtiValidation.calculated && (
                    <>
                      <div className="flex justify-between">
                        <span>Front-end ratio (Housing):</span>
                        <span className={`font-medium ${
                          calculations.dtiValidation.calculated.frontEnd <= 31 ? 'text-green-700' :
                          calculations.dtiValidation.calculated.frontEnd <= 37 ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {calculations.dtiValidation.calculated.frontEnd.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Back-end ratio (Total Debt):</span>
                        <span className={`font-medium ${
                          calculations.dtiValidation.calculated.backEnd <= 43 ? 'text-green-700' :
                          calculations.dtiValidation.calculated.backEnd <= 50 ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {calculations.dtiValidation.calculated.backEnd.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                  
                  {calculations.dtiValidation.message && (
                    <p className={`mt-2 font-medium ${
                      calculations.dtiValidation.status === 'approved' ? 'text-green-700' :
                      calculations.dtiValidation.status === 'exceeds-limit' ? 'text-red-700' :
                      'text-yellow-700'
                    }`}>
                      {calculations.dtiValidation.message}
                    </p>
                  )}
                  
                  {calculations.dtiValidation.isConstrained && (
                    <p className="mt-2 text-xs text-gray-600">
                      Consider increasing your down payment or choosing a less expensive home to meet DTI requirements.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* DTI Calculator Modal */}
      <DTICalculatorModal 
        isOpen={isDTIModalOpen}
        onClose={closeDTIModal}
        onComplete={handleDTIComplete}
        initialData={{
          annualIncome: data.housePrice * 0.25, // Estimate based on 28% housing ratio
          creditScore: data.creditScore === 'excellent' ? 750 : 
                      data.creditScore === 'good' ? 700 : 
                      data.creditScore === 'fair' ? 620 : 550,
          loanType: 'FHA',
          monthlyDebts: 0
        }}
      />
    </div>
  );
}

export default InputForm;
