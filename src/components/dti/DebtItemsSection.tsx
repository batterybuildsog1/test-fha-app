import React, { useState, useEffect } from "react";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { DollarSign, CreditCard, ChevronDown, AlertCircle, AlertTriangle } from "lucide-react";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "../ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useDTIContext } from '../../context/DTIContext';
import { debtItemsSchema, calculateTotalMonthlyDebt, validateDTIRatios, DTI_LIMITS } from '../../lib/validations';
import { z } from 'zod';

export const debtCategories = [
  { id: "carLoan", label: "Car Loans" },
  { id: "studentLoan", label: "Student Loans" },
  { id: "creditCard", label: "Credit Cards" },
  { id: "personalLoan", label: "Personal Loans" },
  { id: "otherDebt", label: "Other Debt" }
];

// Form type inferred from schema
type DebtItemsFormData = z.infer<typeof debtItemsSchema>;

interface DebtItemsSectionProps {
  /** Optional CSS classes */
  className?: string;
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

const DebtItemsSection = ({ 
  className = "",
  readOnly = false
}: DebtItemsSectionProps) => {
  const [isDebtsOpen, setIsDebtsOpen] = useState(false);
  const { state, setDebtItems } = useDTIContext();
  const { debtItems, monthlyIncome, loanType } = state;

  // Initialize form with validation
  const {
    control,
    watch,
    formState: { errors },
    trigger,
    setValue,
  } = useForm<DebtItemsFormData>({
    resolver: zodResolver(debtItemsSchema),
    defaultValues: debtItems,
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
  
  const calculateTotalMonthlyDebt = () => {
    return calculateTotalMonthlyDebt(formValues);
  };
  
  const calculateNonHousingDTI = () => {
    if (monthlyIncome <= 0) return 0;
    return (calculateTotalMonthlyDebt() / monthlyIncome) * 100;
  };
  
  const getNonHousingDTICategory = () => {
    const dti = calculateNonHousingDTI();
    if (dti < 5) return { text: "Low (<5%)", color: "text-green-600", severity: "low" };
    if (dti <= 10) return { text: "Moderate (5-10%)", color: "text-amber-600", severity: "moderate" };
    return { text: "High (>10%)", color: "text-red-600", severity: "high" };
  };

  // Validate DTI impact
  const validateDTIImpact = () => {
    if (monthlyIncome <= 0) return null;

    const nonHousingDTI = calculateNonHousingDTI() / 100;
    const limits = DTI_LIMITS[loanType as keyof typeof DTI_LIMITS] || DTI_LIMITS.conventional;
    
    // Calculate available room for housing payment
    const maxBackEndDTI = limits.backEnd;
    const availableForHousing = maxBackEndDTI - nonHousingDTI;
    
    if (availableForHousing < 0.20) {
      return {
        severity: 'high',
        message: 'High debt levels may limit mortgage options',
        detail: `Only ${(availableForHousing * 100).toFixed(1)}% DTI available for housing`
      };
    } else if (availableForHousing < 0.28) {
      return {
        severity: 'moderate',
        message: 'Moderate debt impact on borrowing power',
        detail: `${(availableForHousing * 100).toFixed(1)}% DTI available for housing`
      };
    }
    
    return null;
  };
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDebtItemChange = async (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValue(id as keyof DebtItemsFormData, numValue);
    await trigger(id as keyof DebtItemsFormData);
  };

  const totalMonthlyDebt = calculateTotalMonthlyDebt();
  const nonHousingDTI = calculateNonHousingDTI();
  const dtiCategory = getNonHousingDTICategory();
  const dtiImpact = validateDTIImpact();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <Label>Monthly Debt Payments: {formatCurrency(totalMonthlyDebt)}</Label>
        
        {monthlyIncome > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 text-xs">
                <span className={`font-medium ${dtiCategory.color}`}>{dtiCategory.text}</span>
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Non-Housing DTI: {nonHousingDTI.toFixed(1)}%<br />
                  (Monthly debt / monthly income)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* DTI Impact Warning */}
      {dtiImpact && (
        <div className={`p-3 rounded-md border ${
          dtiImpact.severity === 'high' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`h-4 w-4 mt-0.5 ${
              dtiImpact.severity === 'high' ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                dtiImpact.severity === 'high' ? 'text-red-800' : 'text-amber-800'
              }`}>
                {dtiImpact.message}
              </p>
              <p className={`text-xs mt-0.5 ${
                dtiImpact.severity === 'high' ? 'text-red-700' : 'text-amber-700'
              }`}>
                {dtiImpact.detail}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Please correct the following:</span>
          </div>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}>
                {debtCategories.find(c => c.id === key)?.label || key}: {error?.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <Collapsible
        open={isDebtsOpen}
        onOpenChange={setIsDebtsOpen}
        className="border rounded-md"
      >
        <CollapsibleTrigger 
          className="flex w-full items-center justify-between p-4 hover:bg-secondary"
          disabled={readOnly}
        >
          <div className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-muted-foreground" />
            <span>Itemize your monthly debts</span>
          </div>
          <ChevronDown className={`h-4 w-4 transform transition-transform ${isDebtsOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 pt-0 space-y-3">
          {debtCategories.map((category) => (
            <div key={category.id} className="space-y-1">
              <Label htmlFor={category.id}>{category.label}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Controller
                  name={category.id as keyof DebtItemsFormData}
                  control={control}
                  render={({ field }) => (
                    <Input
                      id={category.id}
                      type="number"
                      placeholder="0"
                      className={`pl-10 ${readOnly ? 'bg-secondary' : ''} ${
                        errors[category.id as keyof DebtItemsFormData] ? 'border-red-500' : ''
                      }`}
                      value={field.value || ''}
                      onChange={(e) => handleDebtItemChange(category.id, e.target.value)}
                      onBlur={field.onBlur}
                      readOnly={readOnly}
                      min="0"
                      step="1"
                    />
                  )}
                />
              </div>
              {errors[category.id as keyof DebtItemsFormData] && (
                <p className="text-xs text-red-500">{errors[category.id as keyof DebtItemsFormData]?.message}</p>
              )}
            </div>
          ))}
          <div className="flex justify-between items-center font-medium pt-2 border-t">
            <span>Total Monthly Debt:</span>
            <span className={totalMonthlyDebt > 0 ? 'text-primary' : ''}>{formatCurrency(totalMonthlyDebt)}</span>
          </div>
          
          {monthlyIncome > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between items-center text-sm">
                <span>Non-Housing DTI:</span>
                <span className={`font-medium ${dtiCategory.color}`}>
                  {nonHousingDTI.toFixed(1)}%
                </span>
              </div>
              
              {/* DTI Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      dtiCategory.severity === 'low' ? 'bg-green-500' :
                      dtiCategory.severity === 'moderate' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(nonHousingDTI * 5, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>5%</span>
                  <span>10%</span>
                  <span>15%</span>
                  <span>20%</span>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
      
      <p className="text-sm text-muted-foreground">
        Include all recurring monthly debt obligations. Lower debt improves your borrowing power.
      </p>
    </div>
  );
};

export default DebtItemsSection;