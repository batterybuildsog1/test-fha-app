/**
 * Compensating Factors Step Component
 * 
 * Wizard step that wraps the existing CompensatingFactorsSection component
 * with step-specific features and context-sensitive recommendations.
 */

import React, { useEffect, useMemo } from 'react';
import { useDTIContext } from '../../../context/DTIContext';
import { useDTIWizard } from '../DTIWizard';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { InfoIcon, CheckCircle, AlertCircle, TrendingUp, Scale, HelpCircle } from 'lucide-react';
import CompensatingFactorsSection, { compensatingFactorOptions } from '../CompensatingFactorsSection';
import { evaluateCompensatingFactors } from '../../../lib/validations/dti';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';

interface CompensatingFactorsStepProps {
  className?: string;
}

export const CompensatingFactorsStep: React.FC<CompensatingFactorsStepProps> = ({ className = '' }) => {
  const { state } = useDTIContext();
  const { updateStepValidation } = useDTIWizard();
  
  // Evaluate compensating factors
  const evaluation = evaluateCompensatingFactors(state.compensatingFactors);
  
  // Calculate DTI ratios for recommendations
  const monthlyIncome = state.annualIncome / 12;
  const totalMonthlyDebts = state.monthlyDebts;
  const backEndDTI = monthlyIncome > 0 ? (totalMonthlyDebts / monthlyIncome) : 0;
  
  // Determine minimum factors needed based on DTI
  const getMinimumFactorsNeeded = () => {
    if (backEndDTI <= 0.36) return 0; // Well within limits
    if (backEndDTI <= 0.43) return 1; // Standard range
    if (backEndDTI <= 0.50) return 2; // Requires compensating factors
    return 3; // High DTI requires strong factors
  };
  
  const minimumFactorsNeeded = getMinimumFactorsNeeded();
  const hasEnoughFactors = evaluation.strongFactorCount >= minimumFactorsNeeded;
  
  // Update validation based on requirements
  useEffect(() => {
    // This step is not required, but we validate based on DTI needs
    const isValid = minimumFactorsNeeded === 0 || hasEnoughFactors;
    updateStepValidation('compensating-factors', isValid);
  }, [hasEnoughFactors, minimumFactorsNeeded, updateStepValidation]);
  
  // Get loan-specific recommendations
  const getLoanSpecificRecommendations = () => {
    const recommendations = [];
    
    switch (state.loanType) {
      case 'fha':
        recommendations.push({
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: "FHA loans are flexible with compensating factors",
          detail: "Cash reserves and minimal payment increase are highly valued"
        });
        if (state.creditScore >= 580) {
          recommendations.push({
            icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
            text: "Your credit score meets FHA minimum requirements",
            detail: "Focus on cash reserves to strengthen your application"
          });
        }
        break;
        
      case 'conventional':
        recommendations.push({
          icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
          text: "Conventional loans have stricter DTI limits",
          detail: "Strong compensating factors are essential above 36% DTI"
        });
        if (state.downPaymentPercent && state.downPaymentPercent >= 20) {
          recommendations.push({
            icon: <CheckCircle className="w-4 h-4 text-green-600" />,
            text: "20%+ down payment is a strong factor",
            detail: "No PMI required, which helps with DTI"
          });
        }
        break;
    }
    
    return recommendations;
  };
  
  const loanRecommendations = getLoanSpecificRecommendations();
  
  // Count selected factors
  const selectedFactorsCount = useMemo(() => {
    let count = 0;
    compensatingFactorOptions.forEach(factor => {
      const value = state.compensatingFactors[factor.id as keyof typeof state.compensatingFactors];
      if (value && value !== 'none' && value !== 'does not meet' && value !== '<2 years' && value !== '>30%' && value !== '<5%' && value !== '>20%') {
        count++;
      }
    });
    return count;
  }, [state.compensatingFactors]);
  
  return (
    <div className={`compensating-factors-step ${className}`}>
      {/* Step guidance */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Step 4 of 5: Compensating Factors</strong>
          <br />
          These are positive factors that can help you qualify for a loan even with a higher DTI ratio. 
          The more factors you have, the better your chances of approval.
        </AlertDescription>
      </Alert>

      {/* What are compensating factors box */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-5 h-5 text-gray-600 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">What are compensating factors?</p>
            <p className="text-sm text-gray-700">
              These are strengths in your financial profile that offset a higher DTI ratio. Lenders consider these 
              when your DTI is above standard limits (43% for FHA, 36% for conventional).
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-blue-600 hover:text-blue-700 underline">
                      Why do they matter?
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      With strong compensating factors, FHA loans may approve DTIs up to 57%, 
                      and conventional loans may go up to 50%. Each lender has different requirements.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Step Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Compensating Factors
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={hasEnoughFactors ? 'default' : 'secondary'}>
                {evaluation.strongFactorCount} Strong Factors
              </Badge>
              <Badge variant="outline">
                {selectedFactorsCount} Total Selected
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Compensating factors can help you qualify for a higher DTI ratio. 
            Based on your current DTI of <span className="font-medium">{(backEndDTI * 100).toFixed(1)}%</span>, 
            {minimumFactorsNeeded === 0 
              ? " you're well within standard limits and don't require compensating factors."
              : ` you should have at least ${minimumFactorsNeeded} strong compensating factor${minimumFactorsNeeded > 1 ? 's' : ''}.`
            }
          </p>
          
          {/* DTI-based Alert */}
          {backEndDTI > 0.43 && (
            <Alert className={hasEnoughFactors ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'} variant="default">
              <div className="flex items-start gap-2">
                {hasEnoughFactors ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                )}
                <div>
                  <AlertDescription className={hasEnoughFactors ? 'text-green-800' : 'text-amber-800'}>
                    <strong>High DTI Detected:</strong> Your DTI exceeds standard limits. 
                    {hasEnoughFactors 
                      ? ` You have ${evaluation.strongFactorCount} strong compensating factors which should help with approval.`
                      : ` You need at least ${minimumFactorsNeeded} strong compensating factors. Currently you have ${evaluation.strongFactorCount}.`
                    }
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Main Compensating Factors Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <CompensatingFactorsSection />
        </CardContent>
      </Card>
      
      {/* Loan-Specific Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4" />
            {state.loanType.toUpperCase()} Loan Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loanRecommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3">
                {rec.icon}
                <div className="flex-1">
                  <p className="text-sm font-medium">{rec.text}</p>
                  <p className="text-xs text-muted-foreground">{rec.detail}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Most Important Factors for This Loan Type */}
          <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Most Important Factors for {state.loanType.toUpperCase()}:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {state.loanType === 'fha' && (
                <>
                  <li>• Cash reserves (3-6 months preferred)</li>
                  <li>• Minimal housing payment increase</li>
                  <li>• Stable employment history</li>
                </>
              )}
              {state.loanType === 'conventional' && (
                <>
                  <li>• Strong credit (740+ preferred)</li>
                  <li>• Substantial down payment (10%+)</li>
                  <li>• Low credit utilization (&lt;10%)</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};