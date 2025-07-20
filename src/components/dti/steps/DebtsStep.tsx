/**
 * Debts Step Component
 * 
 * Step for collecting individual debt information with validation and debt impact analysis.
 */

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDTIContext } from '../../../context/DTIContext';
import { useDTIWizard } from '../DTIWizard';
import { DebtItems } from '../../../../convex/domain/types';
import { debtItemsSchema } from '../../../lib/validations';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { CreditCard, Car, GraduationCap, User, Plus, AlertTriangle, InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';

// Form type inferred from schema
type DebtItemsFormData = z.infer<typeof debtItemsSchema>;

interface DebtsStepProps {
  className?: string;
}

// Debt item configuration
const DEBT_ITEMS = [
  {
    key: 'carLoan' as keyof DebtItems,
    label: 'Car Loan',
    description: 'Monthly auto loan payments',
    icon: Car,
    placeholder: 'e.g., $450',
    tooltip: 'Include all vehicle loan payments (cars, trucks, motorcycles). Enter the total if you have multiple auto loans.',
    example: 'Example: If you pay $350 for your car and $100 for your motorcycle, enter $450',
  },
  {
    key: 'studentLoan' as keyof DebtItems,
    label: 'Student Loans',
    description: 'Monthly student loan payments',
    icon: GraduationCap,
    placeholder: 'e.g., $250',
    tooltip: 'Enter your required minimum monthly payment for all student loans combined. If loans are in deferment, enter $0.',
    example: 'Tip: Federal loans often have income-driven repayment options that can lower your DTI',
  },
  {
    key: 'creditCard' as keyof DebtItems,
    label: 'Credit Cards',
    description: 'Minimum monthly credit card payments',
    icon: CreditCard,
    placeholder: 'e.g., $150',
    tooltip: 'Enter the total minimum payment for ALL credit cards. This is usually 2-3% of your balance, not the full balance.',
    example: 'Example: 3 cards with minimums of $50, $75, and $25 = enter $150',
  },
  {
    key: 'personalLoan' as keyof DebtItems,
    label: 'Personal Loans',
    description: 'Monthly personal loan payments',
    icon: User,
    placeholder: 'e.g., $200',
    tooltip: 'Include personal loans, signature loans, or loans from family/friends if you have a formal repayment agreement.',
    example: 'Does not include informal loans without set payment terms',
  },
  {
    key: 'otherDebt' as keyof DebtItems,
    label: 'Other Debts',
    description: 'Other monthly debt obligations',
    icon: Plus,
    placeholder: 'e.g., $300',
    tooltip: 'Include child support, alimony, tax payment plans, or any other regular debt obligations not listed above.',
    example: 'Example: $200 child support + $100 IRS payment plan = enter $300',
  },
];

export const DebtsStep: React.FC<DebtsStepProps> = ({ className = '' }) => {
  const { state, setDebtItems, totalDebtItems, monthlyIncome } = useDTIContext();
  const { updateStepValidation } = useDTIWizard();
  
  // Initialize form with validation
  const {
    control,
    watch,
    formState: { errors, isValid },
    trigger,
    setValue,
  } = useForm<DebtItemsFormData>({
    resolver: zodResolver(debtItemsSchema),
    defaultValues: state.debtItems,
    mode: 'onChange',
  });

  // Watch all form values
  const formValues = watch();

  // Sync form changes with context
  useEffect(() => {
    const subscription = watch((value) => {
      setDebtItems(value as DebtItemsFormData);
    });
    return () => subscription.unsubscribe();
  }, [watch, setDebtItems]);
  
  // Update wizard validation
  useEffect(() => {
    updateStepValidation('debts', isValid);
  }, [isValid, updateStepValidation]);
  
  // Calculate debt-to-income ratio
  const debtToIncomeRatio = monthlyIncome > 0 ? (totalDebtItems / monthlyIncome) * 100 : 0;
  
  // Get debt level assessment
  const getDebtAssessment = (dtiRatio: number) => {
    if (dtiRatio <= 20) {
      return {
        level: 'Low',
        color: 'bg-green-100 text-green-800',
        description: 'Your debt level is manageable and within healthy ranges.',
      };
    } else if (dtiRatio <= 36) {
      return {
        level: 'Moderate',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Your debt level is moderate. Consider paying down high-interest debts.',
      };
    } else if (dtiRatio <= 50) {
      return {
        level: 'High',
        color: 'bg-orange-100 text-orange-800',
        description: 'Your debt level is high. Focus on debt reduction before taking on more debt.',
      };
    } else {
      return {
        level: 'Very High',
        color: 'bg-red-100 text-red-800',
        description: 'Your debt level is very high. Consider debt consolidation or financial counseling.',
      };
    }
  };
  
  const debtAssessment = getDebtAssessment(debtToIncomeRatio);
  
  return (
    <div className={`debts-step ${className}`}>
      {/* Step guidance */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Step 2 of 5: Monthly Debt Payments</strong>
          <br />
          Now let's add up your monthly debt obligations. Only include minimum required payments, not what you actually pay. 
          This helps lenders understand your fixed monthly obligations.
        </AlertDescription>
      </Alert>

      {/* Example box */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-gray-900 mb-2">Quick Example:</p>
        <p className="text-sm text-gray-700">
          If your credit card balance is $5,000 but the minimum payment is $150, enter $150 (not $5,000).
        </p>
        <p className="text-sm text-gray-600 mt-2">
          <strong>Pro tip:</strong> Paying off credit cards can quickly improve your DTI since it eliminates the monthly payment.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Monthly Debt Obligations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Validation Errors Summary */}
          {Object.keys(errors).length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Please correct the following:</strong>
                <ul className="mt-1 list-disc list-inside">
                  {Object.entries(errors).map(([key, error]) => (
                    <li key={key}>
                      {DEBT_ITEMS.find(item => item.key === key)?.label || key}: {error?.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4">
            {DEBT_ITEMS.map((item) => {
              const Icon = item.icon;
              
              return (
                <div key={item.key} className="space-y-2">
                  <Label htmlFor={item.key} className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm font-medium mb-1">{item.tooltip}</p>
                          <p className="text-sm text-muted-foreground">{item.example}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Controller
                      name={item.key}
                      control={control}
                      render={({ field }) => (
                        <Input
                          id={item.key}
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                            trigger(item.key);
                          }}
                          onBlur={() => {
                            field.onBlur();
                            trigger(item.key);
                          }}
                          placeholder={item.placeholder.replace('e.g., $', '')}
                          className={`pl-8 ${errors[item.key] ? 'border-red-500' : ''}`}
                          aria-describedby={`${item.key}-description`}
                          min="0"
                          step="1"
                        />
                      )}
                    />
                  </div>
                  {errors[item.key] && (
                    <p className="text-xs text-red-500">{errors[item.key]?.message}</p>
                  )}
                  <p id={`${item.key}-description`} className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Helpful note about what to exclude */}
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Don't include:</strong> Utilities, rent (if you're buying), insurance, groceries, 
              gas, or other living expenses. DTI only counts debts that appear on your credit report.
            </AlertDescription>
          </Alert>
          
          <Separator />
          
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Monthly Debts:</span>
              <Badge variant="outline" className="text-sm">
                ${totalDebtItems.toLocaleString()}
              </Badge>
            </div>
            
            {monthlyIncome > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Debt-to-Income Ratio:</span>
                  <Badge className={debtAssessment.color}>
                    {debtToIncomeRatio.toFixed(1)}% - {debtAssessment.level}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {debtAssessment.description}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {debtToIncomeRatio > 36 && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>High Debt-to-Income Ratio:</strong> Your current debt obligations represent{' '}
            {debtToIncomeRatio.toFixed(1)}% of your monthly income. This may impact your ability to qualify for additional loans.
            Consider paying down existing debts to improve your borrowing capacity.
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Debt Management Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">For Credit Cards:</p>
              <p className="text-muted-foreground">
                Use the minimum payment shown on your statement, not the full balance.
                Paying more than the minimum can help reduce your overall debt faster.
              </p>
            </div>
            
            <div>
              <p className="font-medium">For Student Loans:</p>
              <p className="text-muted-foreground">
                Include all federal and private student loan payments.
                Income-driven repayment plans may affect your monthly payment amount.
              </p>
            </div>
            
            <div>
              <p className="font-medium">Debt Prioritization:</p>
              <p className="text-muted-foreground">
                Focus on paying down high-interest debts first (typically credit cards)
                while maintaining minimum payments on all other debts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};