/**
 * Validation Examples and Usage Guide
 * 
 * This file provides examples of how to use the DTI validation schemas
 * in React components with react-hook-form.
 */

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  incomeSchema, 
  debtItemSchema, 
  compensatingFactorsSchema,
  validateDTIRatios,
  validateCompleteness,
  evaluateCompensatingFactors,
  DTI_LIMITS,
} from './index';

/**
 * Example 1: Basic Form with Validation
 * 
 * This example shows how to set up a form with Zod validation
 */
export function ExampleBasicValidation() {
  // Define your form schema
  const formSchema = z.object({
    annualIncome: incomeSchema.shape.annualIncome,
    creditScore: z.number().min(300).max(850),
    loanType: z.enum(['fha', 'conventional', 'va', 'usda']),
  });

  // Create form type
  type FormData = z.infer<typeof formSchema>;

  // Initialize react-hook-form with zodResolver
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      annualIncome: 0,
      creditScore: 700,
      loanType: 'fha',
    },
    mode: 'onChange', // Validate on change for real-time feedback
  });

  return form;
}

/**
 * Example 2: Validating Individual Debt Items
 * 
 * Shows how to validate debt items as they're added
 */
export function validateNewDebtItem(item: unknown) {
  try {
    // Parse with Zod schema
    const validatedItem = debtItemSchema.parse(item);
    
    // Additional business logic validation
    if (validatedItem.monthlyPayment > 10000) {
      return {
        isValid: false,
        error: 'Monthly payment seems unusually high. Please verify.',
      };
    }
    
    return {
      isValid: true,
      data: validatedItem,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0].message,
      };
    }
    return {
      isValid: false,
      error: 'Invalid debt item',
    };
  }
}

/**
 * Example 3: DTI Ratio Validation with Context
 * 
 * Shows how to validate DTI ratios and provide contextual feedback
 */
export function validateDTIWithContext(
  monthlyIncome: number,
  monthlyDebts: number,
  proposedMortgagePayment: number,
  loanType: keyof typeof DTI_LIMITS
) {
  // Calculate ratios
  const frontEndRatio = proposedMortgagePayment / monthlyIncome;
  const backEndRatio = (monthlyDebts + proposedMortgagePayment) / monthlyIncome;
  
  // Validate against limits
  const validation = validateDTIRatios(frontEndRatio, backEndRatio, loanType);
  
  // Provide contextual feedback
  const feedback = {
    isValid: validation.isValid,
    frontEndDTI: {
      ratio: frontEndRatio,
      percentage: (frontEndRatio * 100).toFixed(1),
      status: getFrontEndStatus(frontEndRatio, loanType),
    },
    backEndDTI: {
      ratio: backEndRatio,
      percentage: (backEndRatio * 100).toFixed(1),
      status: getBackEndStatus(backEndRatio, loanType),
    },
    errors: validation.errors,
    warnings: validation.warnings,
    suggestions: getSuggestions(frontEndRatio, backEndRatio, loanType),
  };
  
  return feedback;
}

/**
 * Example 4: Complete Form Validation with All Fields
 * 
 * Shows how to validate a complete DTI wizard form
 */
export function ExampleCompleteFormValidation() {
  // Combine multiple schemas for a complete form
  const completeFormSchema = z.object({
    // Income information
    income: incomeSchema,
    
    // Debt information
    debts: z.object({
      items: z.array(debtItemSchema),
      totalMonthly: z.number().min(0),
    }),
    
    // Compensating factors
    compensatingFactors: compensatingFactorsSchema,
    
    // Loan details
    loanDetails: z.object({
      loanType: z.enum(['fha', 'conventional', 'va', 'usda']),
      downPaymentPercent: z.number().min(0).max(100),
      propertyType: z.enum(['single_family', 'condo', 'townhouse', 'multi_family']),
    }),
  });

  type CompleteFormData = z.infer<typeof completeFormSchema>;

  // Custom validation function
  const validateCompleteForm = (data: CompleteFormData) => {
    // First, run Zod validation
    const result = completeFormSchema.safeParse(data);
    
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.errors,
      };
    }
    
    // Then run business logic validation
    const businessErrors: string[] = [];
    
    // Check if income is sufficient for any mortgage
    const minMortgagePayment = 500; // Minimum realistic mortgage
    const maxDTI = DTI_LIMITS[data.loanDetails.loanType].backEnd;
    const monthlyIncome = data.income.annualIncome / 12;
    const availableForHousing = (monthlyIncome * maxDTI) - data.debts.totalMonthly;
    
    if (availableForHousing < minMortgagePayment) {
      businessErrors.push(
        `With your current income and debts, you may only qualify for ${
          availableForHousing > 0 
            ? `$${availableForHousing.toFixed(0)}/month` 
            : 'no'
        } in housing payments.`
      );
    }
    
    // Evaluate compensating factors
    const factorEvaluation = evaluateCompensatingFactors(data.compensatingFactors);
    
    return {
      isValid: businessErrors.length === 0,
      errors: businessErrors,
      data: result.data,
      compensatingFactors: factorEvaluation,
      recommendations: getRecommendations(data, factorEvaluation),
    };
  };

  return { schema: completeFormSchema, validate: validateCompleteForm };
}

/**
 * Example 5: Real-time Validation Hook
 * 
 * Custom hook for real-time DTI validation
 */
export function useRealTimeDTIValidation(
  monthlyIncome: number,
  monthlyDebts: number,
  loanType: keyof typeof DTI_LIMITS
) {
  // Calculate maximum allowed mortgage payment
  const limits = DTI_LIMITS[loanType];
  const maxBackEndPayment = monthlyIncome * limits.backEnd;
  const maxMortgagePayment = maxBackEndPayment - monthlyDebts;
  
  // Calculate front-end limit
  const maxFrontEndPayment = limits.frontEnd 
    ? monthlyIncome * limits.frontEnd 
    : maxMortgagePayment;
  
  // Determine the binding constraint
  const maxAllowedPayment = Math.min(maxFrontEndPayment, maxMortgagePayment);
  
  return {
    maxMortgagePayment: Math.max(0, maxAllowedPayment),
    remainingDTIRoom: Math.max(0, (limits.backEnd - (monthlyDebts / monthlyIncome)) * 100),
    isOverLimit: monthlyDebts / monthlyIncome > limits.backEnd,
    suggestions: {
      reduceDebtBy: Math.max(0, monthlyDebts - (monthlyIncome * limits.backEnd * 0.9)),
      increaseIncomeBy: Math.max(0, (monthlyDebts / (limits.backEnd * 0.9)) - monthlyIncome),
    },
  };
}

// Helper functions
function getFrontEndStatus(ratio: number, loanType: keyof typeof DTI_LIMITS) {
  const limit = DTI_LIMITS[loanType].frontEnd;
  if (!limit) return 'not-applicable';
  if (ratio <= limit * 0.8) return 'excellent';
  if (ratio <= limit) return 'good';
  if (ratio <= limit * 1.1) return 'marginal';
  return 'exceeded';
}

function getBackEndStatus(ratio: number, loanType: keyof typeof DTI_LIMITS) {
  const limit = DTI_LIMITS[loanType].backEnd;
  if (ratio <= limit * 0.7) return 'excellent';
  if (ratio <= limit * 0.9) return 'good';
  if (ratio <= limit) return 'acceptable';
  if (ratio <= limit * 1.1) return 'marginal';
  return 'exceeded';
}

function getSuggestions(
  frontEndRatio: number, 
  backEndRatio: number, 
  loanType: keyof typeof DTI_LIMITS
): string[] {
  const suggestions: string[] = [];
  const limits = DTI_LIMITS[loanType];
  
  if (backEndRatio > limits.backEnd) {
    suggestions.push('Consider paying down existing debts to improve your DTI ratio');
    suggestions.push('Look for ways to increase your income');
  }
  
  if (frontEndRatio > (limits.frontEnd || 1)) {
    suggestions.push('Consider a smaller loan amount or less expensive property');
    suggestions.push('Increase your down payment to reduce the loan amount');
  }
  
  if (backEndRatio > limits.backEnd * 0.9) {
    suggestions.push('Build strong compensating factors like cash reserves');
  }
  
  return suggestions;
}

function getRecommendations(
  data: any, 
  factorEvaluation: ReturnType<typeof evaluateCompensatingFactors>
): string[] {
  const recommendations: string[] = [];
  
  if (factorEvaluation.strongFactorCount < 2) {
    recommendations.push('Strengthen your compensating factors to improve approval chances');
  }
  
  if (data.income.employmentType === 'self-employed') {
    recommendations.push('Prepare 2 years of tax returns and profit/loss statements');
  }
  
  if (data.debts.totalMonthly > data.income.monthlyIncome * 0.20) {
    recommendations.push('Your non-housing debt is high - consider debt consolidation');
  }
  
  return recommendations;
}

/**
 * Example 6: Component Usage Pattern
 * 
 * This shows the recommended pattern for using validation in components
 */
export const ValidationComponentPattern = `
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { incomeSchema } from '@/lib/validations';

// Define your component schema
const componentSchema = z.object({
  annualIncome: incomeSchema.shape.annualIncome,
  // ... other fields
});

type FormData = z.infer<typeof componentSchema>;

export function MyComponent() {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(componentSchema),
    mode: 'onChange',
  });

  // Watch for real-time updates
  const watchedValues = watch();

  const onSubmit = (data: FormData) => {
    console.log('Valid data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="annualIncome"
        control={control}
        render={({ field }) => (
          <div>
            <input {...field} type="number" />
            {errors.annualIncome && (
              <span className="error">{errors.annualIncome.message}</span>
            )}
          </div>
        )}
      />
      
      <button type="submit" disabled={!isValid}>
        Submit
      </button>
    </form>
  );
}
`;