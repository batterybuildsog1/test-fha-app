/**
 * Income Step Component
 * 
 * Step for collecting annual income information with validation and real-time feedback.
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
import { InfoIcon, DollarSign, TrendingUp, Briefcase, AlertCircle } from 'lucide-react';
import { incomeSchema } from '../../../lib/validations';

// Create a partial schema for just the income step
const incomeStepSchema = z.object({
  annualIncome: incomeSchema.shape.annualIncome,
  employmentType: incomeSchema.shape.employmentType,
  otherIncome: incomeSchema.shape.otherIncome,
});

type IncomeStepFormData = z.infer<typeof incomeStepSchema>;

interface IncomeStepProps {
  className?: string;
}

export const IncomeStep: React.FC<IncomeStepProps> = ({ className = '' }) => {
  const { state, setAnnualIncome } = useDTIContext();
  const { updateStepValidation } = useDTIWizard();
  
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Initialize form with validation
  const {
    control,
    watch,
    formState: { errors, isValid },
    trigger,
    setValue,
  } = useForm<IncomeStepFormData>({
    resolver: zodResolver(incomeStepSchema),
    defaultValues: {
      annualIncome: state.annualIncome || 0,
      employmentType: 'w2',
      otherIncome: 0,
    },
    mode: 'onChange',
  });

  // Watch form values
  const formValues = watch();
  const monthlyIncome = (formValues.annualIncome || 0) / 12;
  
  // Update wizard validation
  useEffect(() => {
    updateStepValidation('income', isValid);
  }, [isValid, updateStepValidation]);
  
  // Update context when annual income changes
  useEffect(() => {
    if (formValues.annualIncome !== state.annualIncome) {
      setAnnualIncome(formValues.annualIncome || 0);
    }
  }, [formValues.annualIncome, state.annualIncome, setAnnualIncome]);
  
  // Handle input change
  const handleIncomeChange = useCallback(async (value: string) => {
    setHasInteracted(true);
    const numericValue = parseFloat(value.replace(/,/g, '')) || 0;
    setValue('annualIncome', numericValue);
    await trigger('annualIncome');
  }, [setValue, trigger]);
  
  // Get income category
  const getIncomeCategory = useCallback((income: number) => {
    if (income < 30000) return { label: 'Low Income', color: 'bg-orange-100 text-orange-800' };
    if (income < 50000) return { label: 'Moderate Income', color: 'bg-yellow-100 text-yellow-800' };
    if (income < 100000) return { label: 'Middle Income', color: 'bg-blue-100 text-blue-800' };
    if (income < 200000) return { label: 'Upper Middle Income', color: 'bg-green-100 text-green-800' };
    return { label: 'High Income', color: 'bg-purple-100 text-purple-800' };
  }, []);
  
  const incomeCategory = getIncomeCategory(formValues.annualIncome || 0);
  
  // Format number for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className={`income-step ${className}`}>
      {/* Step guidance */}
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Step 1 of 5: Income Information</strong>
          <br />
          Let's start with your income. Lenders use your gross (before tax) annual income to calculate DTI. 
          The more income you can document, the more you can potentially borrow.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Annual Income Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Employment Type */}
          <div className="space-y-2">
            <Label htmlFor="employment-type" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Employment Type
            </Label>
            <Controller
              name="employmentType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger 
                    id="employment-type" 
                    className={errors.employmentType ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w2">W-2 Employee</SelectItem>
                    <SelectItem value="self-employed">Self-Employed</SelectItem>
                    <SelectItem value="1099">1099 Contractor</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employmentType && (
              <p className="text-xs text-red-500">{errors.employmentType.message}</p>
            )}
          </div>

          {/* Annual Income */}
          <div className="space-y-2">
            <Label htmlFor="annual-income" className="text-sm font-medium">
              Gross Annual Income
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Controller
                name="annualIncome"
                control={control}
                render={({ field }) => (
                  <Input
                    id="annual-income"
                    type="text"
                    value={field.value ? field.value.toLocaleString() : ''}
                    onChange={(e) => handleIncomeChange(e.target.value)}
                    onBlur={field.onBlur}
                    placeholder="Enter your annual income"
                    className={`pl-8 text-lg ${errors.annualIncome ? 'border-red-500' : ''}`}
                    aria-describedby="income-description income-validation"
                  />
                )}
              />
            </div>
            
            <p id="income-description" className="text-sm text-muted-foreground">
              Enter your total gross annual income before taxes and deductions
            </p>
            
            {errors.annualIncome && hasInteracted && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription id="income-validation">
                  {errors.annualIncome.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Other Income (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="other-income" className="text-sm font-medium">
              Other Income (Optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Controller
                name="otherIncome"
                control={control}
                render={({ field }) => (
                  <Input
                    id="other-income"
                    type="number"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      field.onChange(value);
                    }}
                    placeholder="Additional income sources"
                    className={`pl-8 ${errors.otherIncome ? 'border-red-500' : ''}`}
                    min="0"
                  />
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Include rental income, investments, or other regular income
            </p>
            {errors.otherIncome && (
              <p className="text-xs text-red-500">{errors.otherIncome.message}</p>
            )}
          </div>
          
          {/* Income Summary */}
          {(formValues.annualIncome || 0) > 0 && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monthly Income:</span>
                <Badge variant="outline" className="text-sm">
                  {formatCurrency(monthlyIncome)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Income Category:</span>
                <Badge className={incomeCategory.color}>
                  {incomeCategory.label}
                </Badge>
              </div>

              {(formValues.otherIncome || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Annual Income:</span>
                  <Badge variant="secondary" className="text-sm">
                    {formatCurrency((formValues.annualIncome || 0) + (formValues.otherIncome || 0))}
                  </Badge>
                </div>
              )}
            </div>
          )}

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
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <InfoIcon className="w-4 h-4" />
            Income Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">Include all income sources:</p>
                <ul className="mt-1 text-muted-foreground list-disc list-inside">
                  <li>Base salary or wages</li>
                  <li>Bonuses and commissions (2-year average)</li>
                  <li>Overtime pay (if consistent for 2+ years)</li>
                  <li>Rental income (75% of gross rent)</li>
                  <li>Investment income</li>
                  <li>Social Security benefits</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-2 mt-3">
              <InfoIcon className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium">Documentation required:</p>
                <p className="text-muted-foreground">
                  You'll need pay stubs, W-2s, tax returns, and bank statements
                  to verify your income when applying for a loan.
                </p>
              </div>
            </div>

            {formValues.employmentType === 'self-employed' && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 rounded-md">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Self-Employment Note:</p>
                  <p className="text-amber-700 text-xs">
                    Self-employed borrowers typically need 2 years of tax returns 
                    and may need to provide additional documentation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};