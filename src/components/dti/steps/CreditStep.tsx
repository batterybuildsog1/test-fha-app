/**
 * Credit Step Component
 * 
 * Step for collecting credit score, loan type, down payment, and property type information.
 * Includes visual indicators for credit score ranges and loan program requirements.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDTIContext } from '../../../context/DTIContext';
import { useDTIWizard } from '../DTIWizard';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Slider } from '../../ui/slider';
import { InfoIcon, CreditCard, Home, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { creditInfoSchema, DTI_LIMITS } from '../../../lib/validations/dti';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';

type CreditStepFormData = z.infer<typeof creditInfoSchema>;

interface CreditStepProps {
  className?: string;
}

// Credit score ranges with colors and descriptions
const creditScoreRanges = [
  { min: 300, max: 579, label: 'Poor', color: 'bg-red-100 text-red-800', description: 'May have difficulty qualifying' },
  { min: 580, max: 669, label: 'Fair', color: 'bg-orange-100 text-orange-800', description: 'Minimum for most FHA loans' },
  { min: 670, max: 739, label: 'Good', color: 'bg-yellow-100 text-yellow-800', description: 'Qualifies for better rates' },
  { min: 740, max: 799, label: 'Very Good', color: 'bg-green-100 text-green-800', description: 'Excellent rates available' },
  { min: 800, max: 850, label: 'Excellent', color: 'bg-emerald-100 text-emerald-800', description: 'Best rates and terms' },
];

// Loan type information
const loanTypeInfo = {
  fha: {
    label: 'FHA Loan',
    minCreditScore: 580,
    minDownPayment: 3.5,
    maxDTI: 43,
    description: 'Government-backed loan with flexible requirements',
    benefits: ['Low down payment', 'Flexible credit requirements', 'Higher DTI allowed'],
  },
  va: {
    label: 'VA Loan',
    minCreditScore: 620,
    minDownPayment: 0,
    maxDTI: 41,
    description: 'For eligible veterans and service members',
    benefits: ['No down payment required', 'No PMI', 'Competitive rates'],
  },
  conventional: {
    label: 'Conventional Loan',
    minCreditScore: 620,
    minDownPayment: 3,
    maxDTI: 36,
    description: 'Traditional loan with competitive rates',
    benefits: ['Lower PMI options', 'Flexible terms', 'No upfront mortgage insurance'],
  },
  usda: {
    label: 'USDA Loan',
    minCreditScore: 640,
    minDownPayment: 0,
    maxDTI: 41,
    description: 'For eligible rural and suburban properties',
    benefits: ['No down payment required', 'Lower mortgage insurance', 'Below-market rates'],
  },
};

export const CreditStep: React.FC<CreditStepProps> = ({ className = '' }) => {
  const { state, setCreditScore, setLoanType, setDownPaymentPercent } = useDTIContext();
  const { updateStepValidation } = useDTIWizard();
  
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Initialize form with validation
  const {
    control,
    watch,
    formState: { errors, isValid },
    trigger,
    setValue,
  } = useForm<CreditStepFormData>({
    resolver: zodResolver(creditInfoSchema),
    defaultValues: {
      creditScore: state.creditScore || 700,
      loanType: state.loanType || 'fha',
      downPaymentPercent: state.downPaymentPercent || 3.5,
      propertyType: 'single_family',
    },
    mode: 'onChange',
  });

  // Watch form values
  const formValues = watch();
  const selectedLoanInfo = loanTypeInfo[formValues.loanType];
  
  // Get credit score range
  const getCreditScoreRange = useCallback((score: number) => {
    return creditScoreRanges.find(range => score >= range.min && score <= range.max) || creditScoreRanges[0];
  }, []);
  
  const currentCreditRange = getCreditScoreRange(formValues.creditScore);
  
  // Update wizard validation
  useEffect(() => {
    updateStepValidation('credit-loan', isValid);
  }, [isValid, updateStepValidation]);
  
  // Update context when values change
  useEffect(() => {
    if (formValues.creditScore !== state.creditScore) {
      setCreditScore(formValues.creditScore);
    }
  }, [formValues.creditScore, state.creditScore, setCreditScore]);
  
  useEffect(() => {
    if (formValues.loanType !== state.loanType) {
      setLoanType(formValues.loanType);
    }
  }, [formValues.loanType, state.loanType, setLoanType]);
  
  useEffect(() => {
    if (formValues.downPaymentPercent !== state.downPaymentPercent) {
      setDownPaymentPercent(formValues.downPaymentPercent);
    }
  }, [formValues.downPaymentPercent, state.downPaymentPercent, setDownPaymentPercent]);
  
  // Check if credit score meets loan requirements
  const meetsLoanRequirements = formValues.creditScore >= selectedLoanInfo.minCreditScore;
  const meetsDownPaymentRequirements = formValues.downPaymentPercent >= selectedLoanInfo.minDownPayment;
  
  return (
    <div className={`credit-step ${className}`}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Credit & Loan Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credit Score */}
          <div className="space-y-3">
            <Label htmlFor="credit-score" className="flex items-center justify-between">
              <span>Credit Score</span>
              <Badge className={currentCreditRange.color}>
                {currentCreditRange.label}
              </Badge>
            </Label>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>300</span>
                <span className="font-medium text-foreground text-lg">{formValues.creditScore}</span>
                <span>850</span>
              </div>
              
              <Controller
                name="creditScore"
                control={control}
                render={({ field }) => (
                  <Slider
                    id="credit-score"
                    value={[field.value]}
                    onValueChange={(value) => {
                      setHasInteracted(true);
                      field.onChange(value[0]);
                      trigger('creditScore');
                    }}
                    min={300}
                    max={850}
                    step={1}
                    className="w-full"
                  />
                )}
              />
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InfoIcon className="w-4 h-4" />
                <span>{currentCreditRange.description}</span>
              </div>
            </div>
            
            {errors.creditScore && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.creditScore.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Loan Type */}
          <div className="space-y-2">
            <Label htmlFor="loan-type">Loan Type</Label>
            <Controller
              name="loanType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger 
                    id="loan-type" 
                    className={errors.loanType ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(loanTypeInfo).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{info.label}</span>
                          <span className="text-xs text-muted-foreground">{info.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            
            {/* Loan Requirements */}
            <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {meetsLoanRequirements ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span>{selectedLoanInfo.label} Requirements</span>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Credit Score:</span>
                  <span className={formValues.creditScore >= selectedLoanInfo.minCreditScore ? 'text-green-600' : 'text-red-600'}>
                    {selectedLoanInfo.minCreditScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Down Payment:</span>
                  <span>{selectedLoanInfo.minDownPayment}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Standard Max DTI:</span>
                  <span>{selectedLoanInfo.maxDTI}%</span>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-1">Benefits:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {selectedLoanInfo.benefits.map((benefit, index) => (
                    <li key={index}>• {benefit}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {errors.loanType && (
              <p className="text-xs text-red-500">{errors.loanType.message}</p>
            )}
          </div>

          {/* Down Payment */}
          <div className="space-y-2">
            <Label htmlFor="down-payment" className="flex items-center justify-between">
              <span>Down Payment Percentage</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The percentage of the home price you'll pay upfront. 
                      Higher down payments can lead to better rates and lower monthly payments.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            
            <div className="flex items-center gap-2">
              <Controller
                name="downPaymentPercent"
                control={control}
                render={({ field }) => (
                  <Input
                    id="down-payment"
                    type="number"
                    value={field.value}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      field.onChange(value);
                      trigger('downPaymentPercent');
                    }}
                    min="0"
                    max="100"
                    step="0.5"
                    className={`w-24 ${errors.downPaymentPercent ? 'border-red-500' : ''}`}
                  />
                )}
              />
              <span className="text-muted-foreground">%</span>
              
              {meetsDownPaymentRequirements ? (
                <Badge variant="outline" className="ml-auto text-green-600">
                  Meets requirements
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-auto text-amber-600">
                  Below minimum ({selectedLoanInfo.minDownPayment}%)
                </Badge>
              )}
            </div>
            
            {errors.downPaymentPercent && (
              <p className="text-xs text-red-500">{errors.downPaymentPercent.message}</p>
            )}
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="property-type">Property Type</Label>
            <Controller
              name="propertyType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger 
                    id="property-type" 
                    className={errors.propertyType ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_family">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        <span>Single Family Home</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="condo">Condominium</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="multi_family">Multi-Family (2-4 units)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertyType && (
              <p className="text-xs text-red-500">{errors.propertyType.message}</p>
            )}
          </div>

          {/* Validation Summary */}
          {Object.keys(errors).length > 0 && hasInteracted && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please correct the errors above before proceeding.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Credit Score Improvement Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="w-4 h-4" />
            Credit Score Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {formValues.creditScore < 620 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Your credit score is below the minimum for most loan programs. 
                  Consider working on improving your credit before applying.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <p className="font-medium">Quick ways to improve your credit:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Pay down credit card balances (aim for under 30% utilization)</li>
                <li>• Make all payments on time</li>
                <li>• Don't close old credit cards</li>
                <li>• Avoid new credit applications before applying for a mortgage</li>
                <li>• Check for and dispute any errors on your credit report</li>
              </ul>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Pro Tip:</strong> Even a 20-point increase in your credit score 
                can save you thousands in interest over the life of your loan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};