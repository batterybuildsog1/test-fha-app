/**
 * Modern Compensating Factors Component
 * Uses compound component pattern with proper accessibility and performance optimization
 */

import React, { memo, useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useCompensatingFactorsContext } from '@/context/CompensatingFactorsContext';
import { COMPENSATING_FACTORS, FACTOR_CATEGORIES } from '@/constants/compensating-factors';
import { CompensatingFactorDefinition } from '@/types/compensating-factors';

// Icon mapping for better performance
const ICONS = {
  PiggyBank: '💰',
  CreditCard: '💳',
  Briefcase: '💼',
  Home: '🏠',
  Info: 'ℹ️',
  Scale: '⚖️',
  DollarSign: '$',
} as const;

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div 
    role="alert" 
    className="p-4 border border-red-200 rounded-lg bg-red-50"
    aria-live="polite"
  >
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      Something went wrong with compensating factors
    </h3>
    <p className="text-red-700 mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      aria-label="Retry compensating factors"
    >
      Try again
    </button>
  </div>
);

// Factor Option Component
const FactorOption = memo<{
  factor: CompensatingFactorDefinition;
  selectedValue: string;
  onValueChange: (value: string) => void;
}>(({ factor, selectedValue, onValueChange }) => {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange(event.target.value);
  }, [onValueChange]);

  const isStrong = useMemo(() => factor.isStrong(selectedValue), [factor, selectedValue]);
  const categoryIcon = FACTOR_CATEGORIES[factor.category]?.icon || 'Info';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label 
          htmlFor={`factor-${factor.id}`}
          className="flex items-center gap-2 text-sm font-medium text-gray-700"
        >
          <span 
            className="text-lg" 
            role="img" 
            aria-label={factor.category}
          >
            {ICONS[categoryIcon as keyof typeof ICONS]}
          </span>
          {factor.label}
          {isStrong && (
            <span 
              className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
              aria-label="Strong factor"
            >
              Strong
            </span>
          )}
        </label>
        
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label={`Information about ${factor.label}`}
          title={factor.description}
        >
          {ICONS.Info}
        </button>
      </div>
      
      <select
        id={`factor-${factor.id}`}
        value={selectedValue}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-describedby={`factor-${factor.id}-description`}
      >
        {factor.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div 
        id={`factor-${factor.id}-description`}
        className="text-xs text-gray-500"
      >
        {factor.description}
      </div>
      
      {factor.helpLink && (
        <a
          href={factor.helpLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 underline"
          aria-label={`View guidelines for ${factor.label}`}
        >
          View guidelines
        </a>
      )}
    </div>
  );
});

FactorOption.displayName = 'FactorOption';

// Current Housing Payment Component
const CurrentHousingPayment = memo(() => {
  const { currentHousingPayment, updateCurrentHousingPayment } = useCompensatingFactorsContext();

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value) || 0;
    updateCurrentHousingPayment(value);
  }, [updateCurrentHousingPayment]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label 
          htmlFor="currentHousingPayment"
          className="flex items-center gap-2 text-sm font-medium text-gray-700"
        >
          <span role="img" aria-label="housing">{ICONS.Home}</span>
          Current Housing Payment
        </label>
        
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Information about current housing payment"
          title="Your current monthly rent or mortgage payment"
        >
          {ICONS.Info}
        </button>
      </div>
      
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-gray-500">
          {ICONS.DollarSign}
        </span>
        <input
          id="currentHousingPayment"
          type="number"
          min="0"
          step="1"
          value={currentHousingPayment || ''}
          onChange={handleChange}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="0"
          aria-describedby="currentHousingPayment-description"
        />
      </div>
      
      <div 
        id="currentHousingPayment-description"
        className="text-xs text-gray-500"
      >
        Your current monthly rent or mortgage payment
      </div>
    </div>
  );
});

CurrentHousingPayment.displayName = 'CurrentHousingPayment';

// Analysis Summary Component
const AnalysisSummary = memo(() => {
  const { analysis } = useCompensatingFactorsContext();

  const summaryColor = useMemo(() => {
    switch (analysis.qualificationTier) {
      case 'maximum': return 'text-green-600';
      case 'enhanced': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }, [analysis.qualificationTier]);

  const summaryBgColor = useMemo(() => {
    switch (analysis.qualificationTier) {
      case 'maximum': return 'bg-green-50 border-green-200';
      case 'enhanced': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }, [analysis.qualificationTier]);

  return (
    <div className={`p-4 rounded-lg border ${summaryBgColor}`}>
      <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
        <span role="img" aria-label="analysis">{ICONS.Scale}</span>
        Compensating Factors Analysis
      </h4>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Strong factors:</span>
          <span className={`font-medium ${summaryColor}`}>
            {analysis.strongFactorCount}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">DTI boost:</span>
          <span className={`font-medium ${summaryColor}`}>
            +{analysis.dtiBoostPercentage}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Qualification tier:</span>
          <span className={`font-medium ${summaryColor} capitalize`}>
            {analysis.qualificationTier}
          </span>
        </div>
      </div>
      
      {analysis.recommendations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-blue-500 mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

AnalysisSummary.displayName = 'AnalysisSummary';

// Main Component
const CompensatingFactorsContent = memo(() => {
  const { selections, updateSelection } = useCompensatingFactorsContext();

  const handleFactorChange = useCallback((factorId: string, value: string) => {
    updateSelection(factorId, value);
  }, [updateSelection]);

  const factorsByCategory = useMemo(() => {
    const grouped = COMPENSATING_FACTORS.reduce((acc, factor) => {
      if (!acc[factor.category]) {
        acc[factor.category] = [];
      }
      acc[factor.category].push(factor);
      return acc;
    }, {} as Record<string, CompensatingFactorDefinition[]>);

    return grouped;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
          <span className="text-blue-600 text-lg" role="img" aria-label="compensating factors">
            {ICONS.Scale}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Compensating Factors
          </h3>
          <p className="text-sm text-gray-600">
            These factors can significantly increase your borrowing power and DTI approval limits.
          </p>
        </div>
      </div>

      {Object.entries(factorsByCategory).map(([category, factors]) => (
        <section key={category} className="space-y-4">
          <h4 className="font-medium text-gray-800 flex items-center gap-2">
            <span role="img" aria-label={category}>
              {ICONS[FACTOR_CATEGORIES[category as keyof typeof FACTOR_CATEGORIES]?.icon as keyof typeof ICONS]}
            </span>
            {FACTOR_CATEGORIES[category as keyof typeof FACTOR_CATEGORIES]?.label}
          </h4>
          
          <div className="space-y-4 pl-6">
            {factors.map(factor => (
              <FactorOption
                key={factor.id}
                factor={factor}
                selectedValue={selections[factor.id] || factor.options[0].value}
                onValueChange={(value) => handleFactorChange(factor.id, value)}
              />
            ))}
          </div>
        </section>
      ))}

      <CurrentHousingPayment />
      <AnalysisSummary />
    </div>
  );
});

CompensatingFactorsContent.displayName = 'CompensatingFactorsContent';

// Main export with error boundary
export const CompensatingFactors: React.FC = memo(() => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error, errorInfo) => {
      console.error('Compensating Factors Error:', error, errorInfo);
    }}
  >
    <CompensatingFactorsContent />
  </ErrorBoundary>
));

CompensatingFactors.displayName = 'CompensatingFactors';