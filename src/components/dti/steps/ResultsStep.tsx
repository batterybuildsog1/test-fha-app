/**
 * Results Step Component
 * 
 * Final step displaying comprehensive DTI calculation results with charts,
 * summaries, and recommendations for improvement.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDTIContext } from '../../../context/DTIContext';
import { useDTIWizard } from '../DTIWizard';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Separator } from '../../ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Download, 
  Save, 
  RefreshCw, 
  TrendingUp,
  Calculator,
  Home,
  FileText,
  Loader2
} from 'lucide-react';
import BorrowingPowerChart from '../BorrowingPowerChart';
import { BorrowingPowerSummary } from '../borrowing-power/BorrowingPowerSummary';
import { DTI_LIMITS, validateDTIRatios } from '../../../lib/validations/dti';

interface ResultsStepProps {
  className?: string;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({ className = '' }) => {
  const { 
    state, 
    calculateDTI, 
    calculateBorrowingPower, 
    resetAll,
    dtiStatus 
  } = useDTIContext();
  const { updateStepValidation } = useDTIWizard();
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  
  // Calculate results on mount if not already calculated
  useEffect(() => {
    const performCalculations = async () => {
      if (!state.dtiResponse && !state.isCalculating) {
        setIsCalculating(true);
        setCalculationError(null);
        
        try {
          await calculateDTI();
          await calculateBorrowingPower();
        } catch (error) {
          console.error('Calculation error:', error);
          setCalculationError(error instanceof Error ? error.message : 'Failed to calculate results');
        } finally {
          setIsCalculating(false);
        }
      }
    };
    
    performCalculations();
  }, [state.dtiResponse, state.isCalculating, calculateDTI, calculateBorrowingPower]);
  
  // This step is always valid as it's just displaying results
  useEffect(() => {
    updateStepValidation('results', true);
  }, [updateStepValidation]);
  
  // Handle download report
  const handleDownloadReport = useCallback(() => {
    if (!state.dtiResponse) return;
    
    // Create a simple text report
    const report = `
DTI CALCULATION REPORT
Generated: ${new Date().toLocaleDateString()}

INCOME INFORMATION
Annual Income: $${state.annualIncome.toLocaleString()}
Monthly Income: $${(state.annualIncome / 12).toLocaleString()}

DEBT INFORMATION
Total Monthly Debts: $${state.monthlyDebts.toLocaleString()}

LOAN DETAILS
Loan Type: ${state.loanType.toUpperCase()}
Credit Score: ${state.creditScore}
Down Payment: ${state.downPaymentPercent || 0}%

DTI RESULTS
Front-End DTI: ${(state.dtiResponse.actual.frontEnd * 100).toFixed(1)}%
Back-End DTI: ${(state.dtiResponse.actual.backEnd * 100).toFixed(1)}%
Status: ${state.dtiResponse.qualified ? 'QUALIFIED' : 'NOT QUALIFIED'}

DTI LIMITS (${state.loanType.toUpperCase()})
Front-End Limit: ${((DTI_LIMITS[state.loanType].frontEnd || 0) * 100).toFixed(0)}%
Back-End Limit: ${(DTI_LIMITS[state.loanType].backEnd * 100).toFixed(0)}%

COMPENSATING FACTORS
${Object.entries(state.compensatingFactors)
  .filter(([_, value]) => value && value !== 'none' && value !== 'does not meet')
  .map(([key, value]) => `- ${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`)
  .join('\n')}

RECOMMENDATIONS
${state.dtiResponse.recommendations.join('\n')}
    `.trim();
    
    // Create and download the file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DTI_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);
  
  // Handle save results (prepare for Agent 3's persistence)
  const handleSaveResults = useCallback(() => {
    // This will be implemented by Agent 3 for persistence
    console.log('Save results - to be implemented by Agent 3', {
      dtiResponse: state.dtiResponse,
      borrowingPowerResponse: state.borrowingPowerResponse,
      inputs: {
        annualIncome: state.annualIncome,
        monthlyDebts: state.monthlyDebts,
        creditScore: state.creditScore,
        loanType: state.loanType,
        downPaymentPercent: state.downPaymentPercent,
        compensatingFactors: state.compensatingFactors,
      }
    });
    
    // Show temporary success message
    alert('Results prepared for saving. Full persistence will be implemented in the next phase.');
  }, [state]);
  
  // Loading state
  if (isCalculating || state.isCalculating || state.isBorrowingPowerCalculating) {
    return (
      <div className={`results-step ${className}`}>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Calculating your DTI results...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (calculationError || state.calculationError) {
    return (
      <div className={`results-step ${className}`}>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Calculation Error:</strong> {calculationError || state.calculationError}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Calculation
          </Button>
        </div>
      </div>
    );
  }
  
  // No results state
  if (!state.dtiResponse) {
    return (
      <div className={`results-step ${className}`}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No results available. Please complete all previous steps.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const { dtiResponse } = state;
  const frontEndDTI = dtiResponse.actual.frontEnd * 100;
  const backEndDTI = dtiResponse.actual.backEnd * 100;
  const frontEndLimit = (DTI_LIMITS[state.loanType].frontEnd || 0) * 100;
  const backEndLimit = DTI_LIMITS[state.loanType].backEnd * 100;
  
  // Validate DTI ratios
  const validation = validateDTIRatios(
    dtiResponse.actual.frontEnd,
    dtiResponse.actual.backEnd,
    state.loanType
  );
  
  // Get approval likelihood
  const getApprovalLikelihood = () => {
    if (validation.errors.length > 0) {
      return { label: 'Unlikely', color: 'bg-red-100 text-red-800', icon: XCircle };
    }
    if (validation.warnings.length > 0) {
      return { label: 'Possible with Factors', color: 'bg-amber-100 text-amber-800', icon: AlertCircle };
    }
    if (backEndDTI <= backEndLimit * 0.8) {
      return { label: 'Very Likely', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    return { label: 'Likely', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
  };
  
  const approvalLikelihood = getApprovalLikelihood();
  const ApprovalIcon = approvalLikelihood.icon;
  
  return (
    <div className={`results-step ${className}`}>
      {/* Main Results Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              DTI Calculation Results
            </div>
            <Badge className={approvalLikelihood.color}>
              <ApprovalIcon className="w-4 h-4 mr-1" />
              {approvalLikelihood.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DTI Ratios */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Front-End DTI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Front-End DTI (Housing)</span>
                <span className={`text-lg font-bold ${frontEndDTI > frontEndLimit ? 'text-red-600' : 'text-green-600'}`}>
                  {frontEndDTI.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(frontEndDTI / frontEndLimit) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Limit: {frontEndLimit.toFixed(0)}% • 
                {frontEndDTI <= frontEndLimit ? ' Within limits' : ' Exceeds limit'}
              </p>
            </div>
            
            {/* Back-End DTI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Back-End DTI (Total)</span>
                <span className={`text-lg font-bold ${backEndDTI > backEndLimit ? 'text-red-600' : 'text-green-600'}`}>
                  {backEndDTI.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(backEndDTI / backEndLimit) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Limit: {backEndLimit.toFixed(0)}% • 
                {backEndDTI <= backEndLimit ? ' Within limits' : ' Exceeds limit'}
              </p>
            </div>
          </div>
          
          <Separator />
          
          {/* Qualification Status */}
          <div className="p-4 rounded-lg bg-secondary/50">
            <div className="flex items-start gap-3">
              {dtiResponse.qualified ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {dtiResponse.qualified ? 'You qualify based on DTI!' : 'DTI exceeds standard limits'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {dtiResponse.qualified 
                    ? 'Your debt-to-income ratios are within acceptable limits for your loan type.'
                    : 'You may need strong compensating factors or consider reducing debts.'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Warnings and Errors */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <Alert key={`error-${index}`} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
              {validation.warnings.map((warning, index) => (
                <Alert key={`warning-${index}`} className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Borrowing Power Chart */}
      {state.borrowingPowerResponse && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Your Borrowing Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BorrowingPowerChart />
          </CardContent>
        </Card>
      )}
      
      {/* Borrowing Power Summary */}
      {state.borrowingPowerResponse && (
        <div className="mb-6">
          <BorrowingPowerSummary />
        </div>
      )}
      
      {/* Recommendations */}
      {dtiResponse.recommendations && dtiResponse.recommendations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recommendations for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dtiResponse.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">{index + 1}</span>
                  </div>
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
            
            {/* Quick Actions */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Quick Actions to Improve DTI:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Pay down credit card balances (fastest impact)</li>
                <li>• Consider a debt consolidation loan</li>
                <li>• Increase income with a side job</li>
                <li>• Wait to pay off a car loan before applying</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSaveResults}
              className="flex-1"
              variant="default"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Results
            </Button>
            
            <Button 
              onClick={handleDownloadReport}
              className="flex-1"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            
            <Button 
              onClick={resetAll}
              className="flex-1"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start New Calculation
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              <FileText className="w-3 h-3 inline mr-1" />
              Results are estimates based on the information provided. 
              Actual loan approval depends on full underwriting.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};