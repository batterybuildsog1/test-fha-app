import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DollarSign, PiggyBank, Briefcase, CreditCard, Home, Info, Scale, Percent, AlertCircle } from "lucide-react";
import { Input } from "../ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useDTIContext } from '../../context/DTIContext';
import { extendedCompensatingFactorsSchema, evaluateCompensatingFactors } from '../../lib/validations';
import { z } from 'zod';

// Compensating factor options with detailed structure
export const compensatingFactorOptions = [
  {
    id: "cashReserves",
    label: "Cash Reserves (after closing)",
    icon: <PiggyBank className="h-4 w-4 text-muted-foreground" />,
    options: [
      { value: "none", label: "None" },
      { value: "1-2 months", label: "1-2 months of payments" },
      { value: "3_months", label: "3-5 months of payments" },
      { value: "6_months", label: "6+ months of payments" },
      { value: "12_months_plus", label: "12+ months of payments" },
    ],
    description: "Months of mortgage payments left in savings after your down payment and closing costs.",
    isStrong: (value: string) => value === "6_months" || value === "12_months_plus"
  },
  {
    id: "residualIncome",
    label: "Residual Income",
    icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    options: [
      { value: "does not meet", label: "Does not meet VA guidelines" },
      { value: "meets VA guidelines", label: "Meets VA guidelines" },
    ],
    description: "Money left over after paying all bills. VA guidelines vary by family size and region.",
    isStrong: (value: string) => value === "meets VA guidelines",
    helpLink: "https://www.hud.gov/sites/documents/4155-1_4_SECE.PDF"
  },
  {
    id: "housingPaymentIncrease",
    label: "Housing Payment Increase",
    icon: <Home className="h-4 w-4 text-muted-foreground" />,
    options: [
      { value: ">20%", label: "More than 20% increase" },
      { value: "10-20%", label: "10-20% increase" },
      { value: "<10%", label: "Less than 10% increase" },
    ],
    description: "How much your new mortgage payment will increase compared to your current housing expense.",
    isStrong: (value: string) => value === "<10%"
  },
  {
    id: "employmentHistory",
    label: "Employment History",
    icon: <Briefcase className="h-4 w-4 text-muted-foreground" />,
    options: [
      { value: "<2 years", label: "Less than 2 years" },
      { value: "2-5 years", label: "2-5 years" },
      { value: ">5 years", label: "More than 5 years" },
    ],
    description: "How long you've been in your current job or career field.",
    isStrong: (value: string) => value === ">5 years"
  },
  {
    id: "creditUtilization",
    label: "Credit Utilization",
    icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
    options: [
      { value: ">30%", label: "More than 30%" },
      { value: "10-30%", label: "10-30%" },
      { value: "<10%", label: "Less than 10%" },
    ],
    description: "The percentage of your available credit you're currently using.",
    isStrong: (value: string) => value === "<10%"
  },
  {
    id: "downPayment",
    label: "Down Payment",
    icon: <Percent className="h-4 w-4 text-muted-foreground" />,
    options: [
      { value: "<5%", label: "Less than 5%" },
      { value: "5-10%", label: "5-10%" },
      { value: ">10%", label: "More than 10%" },
    ],
    description: "The percentage of the home price you plan to pay upfront.",
    isStrong: (value: string) => value === ">10%"
  },
];

// Form type inferred from schema
type CompensatingFactorsFormData = z.infer<typeof extendedCompensatingFactorsSchema>;

/**
 * Props for the CompensatingFactorsSection component
 */
interface CompensatingFactorsSectionProps {
  /** Optional CSS classes */
  className?: string;
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

/**
 * Component for displaying and managing compensating factors
 * These factors can help qualify for a higher DTI ratio
 */
const CompensatingFactorsSection = ({ 
  className = "",
  readOnly = false
}: CompensatingFactorsSectionProps) => {
  const { state, setCompensatingFactors } = useDTIContext();
  const { compensatingFactors } = state;

  // Initialize form with validation
  const {
    control,
    watch,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<CompensatingFactorsFormData>({
    resolver: zodResolver(extendedCompensatingFactorsSchema),
    defaultValues: compensatingFactors,
    mode: 'onChange',
  });

  // Watch all form values
  const formValues = watch();

  // Sync form changes with context
  useEffect(() => {
    const subscription = watch((value) => {
      setCompensatingFactors(value as CompensatingFactorsFormData);
    });
    return () => subscription.unsubscribe();
  }, [watch, setCompensatingFactors]);

  // Evaluate compensating factors
  const evaluation = evaluateCompensatingFactors(formValues);

  // Count strong factors that significantly impact DTI allowance
  const countStrongFactors = () => {
    let count = 0;
    
    // Check each factor to see if it's a strong factor
    compensatingFactorOptions.forEach(factor => {
      if (factor.isStrong && factor.isStrong(formValues[factor.id as keyof CompensatingFactorsFormData] || 'none')) {
        count++;
      }
    });
    
    return count;
  };
  
  const strongFactorCount = countStrongFactors();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-medium">Compensating Factors</h3>
          <p className="text-sm text-muted-foreground">
            These factors can significantly increase your purchasing power.
          </p>
        </div>
      </div>

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Please correct the following:</span>
          </div>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}>{error?.message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {compensatingFactorOptions.map((factor) => (
        <div key={factor.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {factor.icon} {factor.label}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    {factor.description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Controller
            name={factor.id as keyof CompensatingFactorsFormData}
            control={control}
            render={({ field }) => (
              <Select 
                value={field.value || factor.options[0].value} 
                onValueChange={(value) => {
                  field.onChange(value);
                  trigger(factor.id as keyof CompensatingFactorsFormData);
                }}
                disabled={readOnly}
              >
                <SelectTrigger className={`${readOnly ? "bg-secondary" : ""} ${errors[factor.id as keyof CompensatingFactorsFormData] ? "border-red-500" : ""}`}>
                  <SelectValue placeholder={`Select ${factor.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {factor.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors[factor.id as keyof CompensatingFactorsFormData] && (
            <p className="text-xs text-red-500">{errors[factor.id as keyof CompensatingFactorsFormData]?.message}</p>
          )}
          {factor.helpLink && (
            <p className="text-xs text-muted-foreground">
              <a href={factor.helpLink} target="_blank" rel="noopener noreferrer" className="underline">
                View guidelines
              </a>
            </p>
          )}
        </div>
      ))}
      
      <div className="bg-secondary p-3 rounded-md border border-border mt-4">
        <h4 className="font-medium text-sm flex items-center gap-1 mb-2">
          <Scale className="h-4 w-4 text-primary" />
          Strong Factors for Higher DTI Approval
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• 6+ months of cash reserves</li> 
          <li>• Credit score 760 or above</li>
          <li>• Minimal non-housing debt (less than 5% DTI)</li>
          <li>• Meeting VA residual income guidelines</li>
        </ul>
        <p className="text-xs mt-2">
          You have <span className={strongFactorCount >= 2 ? "text-green-600 font-medium" : ""}>{strongFactorCount} strong factor{strongFactorCount !== 1 ? 's' : ''}</span>.
          {strongFactorCount < 2 ? " Having at least two factors significantly increases approval chances." : ""}
        </p>
        
        {/* Evaluation Summary */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium mb-1">Evaluation Summary:</p>
          <p className={`text-xs ${evaluation.strongFactorCount >= 2 ? 'text-green-600' : 'text-amber-600'}`}>
            {evaluation.recommendation}
          </p>
          {evaluation.factors.length > 0 && (
            <ul className="text-xs text-muted-foreground mt-1">
              {evaluation.factors.map((factor, index) => (
                <li key={index}>• {factor}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompensatingFactorsSection;