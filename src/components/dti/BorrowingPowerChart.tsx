/**
 * Borrowing Power Chart Component
 * 
 * A comprehensive borrowing power visualization that properly integrates with our 
 * existing Convex DTI system. Uses actual hook interfaces and domain types.
 */

import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Info, Calculator } from 'lucide-react';
import { useDTIContext } from '../../context/DTIContext';
import { useBorrowingPower } from '../../hooks/useBorrowingPower';
import { useDTICalculation } from '../../hooks/useDTICalculation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';

// Sub-components
import { BorrowingPowerSummary } from './borrowing-power/BorrowingPowerSummary';
import { DTIProgressBar } from './borrowing-power/DTIProgressBar';
import { DebtImpactAnalysis } from './borrowing-power/DebtImpactAnalysis';
import { BorrowingPowerInsights } from './borrowing-power/BorrowingPowerInsights';

interface BorrowingPowerChartProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showInsights?: boolean;
}

export const BorrowingPowerChart: React.FC<BorrowingPowerChartProps> = ({
  className = '',
  variant = 'default',
  showInsights = true,
}) => {
  const { state, hasRequiredInputs, dtiStatus } = useDTIContext();
  
  // Use the actual hook interfaces
  const {
    analysis,
    isCalculating,
    calculationError,
    scenarios,
    maxAffordablePrice,
    recommendedPrice,
    safePrice,
    calculateBorrowingPower,
    forceRecalculate,
  } = useBorrowingPower({
    autoCalculate: true,
    persistResults: true,
  });

  const {
    dtiResponse,
    maxAllowedPITI,
    dtiMargin,
    frontEndDTI,
    backEndDTI,
  } = useDTICalculation({
    autoCalculate: true,
  });

  // Calculate metrics from actual data
  const metrics = useMemo(() => {
    if (!analysis || !dtiResponse) return null;

    return {
      maxPurchasePrice: analysis.maxPurchasePrice,
      maxLoanAmount: analysis.maxLoanAmount,
      maxPITI: maxAllowedPITI || 0,
      totalCashNeeded: analysis.totalCashNeeded,
      monthlyPayment: analysis.monthlyPaymentBreakdown.total,
      affordabilityRating: analysis.affordabilityRating,
      dtiUtilization: dtiResponse.actual.backEnd / dtiResponse.allowed.backEnd,
      dtiHeadroom: dtiResponse.allowed.backEnd - dtiResponse.actual.backEnd,
      recommendations: analysis.recommendations,
    };
  }, [analysis, dtiResponse, maxAllowedPITI]);

  // Loading state
  if (isCalculating) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 animate-pulse" />
            Analyzing Borrowing Power...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-8" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (calculationError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Borrowing Power Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {calculationError}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button 
              onClick={forceRecalculate}
              variant="outline"
              size="sm"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!hasRequiredInputs || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Borrowing Power Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Complete your income and debt information to see your borrowing power analysis.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button 
              onClick={calculateBorrowingPower}
              variant="outline"
              size="sm"
              disabled={!hasRequiredInputs}
            >
              Calculate Borrowing Power
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Borrowing Power Analysis
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {state.loanType.toUpperCase()}
            </Badge>
            {metrics.affordabilityRating && (
              <Badge 
                variant={metrics.affordabilityRating === 'excellent' ? 'default' : 
                        metrics.affordabilityRating === 'good' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {metrics.affordabilityRating}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Borrowing Power Summary */}
        <BorrowingPowerSummary
          maxPurchasePrice={metrics.maxPurchasePrice}
          maxLoanAmount={metrics.maxLoanAmount}
          maxPITI={metrics.maxPITI}
          recommendedPrice={recommendedPrice}
          safePrice={safePrice}
          totalCashNeeded={metrics.totalCashNeeded}
          variant={variant}
        />

        {/* DTI Progress and Utilization */}
        {!isCompact && dtiResponse && (
          <DTIProgressBar
            dtiResponse={dtiResponse}
            monthlyIncome={state.annualIncome / 12}
            monthlyDebts={state.monthlyDebts}
            maxPITI={metrics.maxPITI}
            dtiMargin={dtiMargin}
            frontEndDTI={frontEndDTI}
            backEndDTI={backEndDTI}
          />
        )}

        {/* Debt Impact Analysis */}
        {(isDetailed || variant === 'default') && (
          <DebtImpactAnalysis
            debtItems={state.debtItems}
            monthlyIncome={state.annualIncome / 12}
            maxPurchasePrice={metrics.maxPurchasePrice}
            analysis={analysis}
          />
        )}

        {/* Borrowing Power Insights */}
        {showInsights && !isCompact && (
          <BorrowingPowerInsights
            analysis={analysis}
            dtiResponse={dtiResponse}
            scenarios={scenarios}
            recommendations={metrics.recommendations}
            compensatingFactors={state.compensatingFactors}
            loanType={state.loanType}
          />
        )}

        {/* Action Buttons */}
        {isDetailed && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={forceRecalculate}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Recalculate
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <DollarSign className="w-4 h-4 mr-2" />
              Export Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BorrowingPowerChart;