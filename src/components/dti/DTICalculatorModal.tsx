import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { DTIWizardWithPersistence } from './DTIWizardWithPersistence';
import { DTIWizard } from './DTIWizard';
import { useDTIContext } from '../../context/DTIContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { lockBodyScroll, unlockBodyScroll, isMobileDevice } from '../../utils/mobileOptimizations';

// Import the step components
import { CreditStep } from './steps/CreditStep';
import { CompensatingFactorsStep } from './steps/CompensatingFactorsStep';
import { ResultsStep } from './steps/ResultsStep';

interface DTICalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (results: {
    dtiResponse: any;
    borrowingPowerResponse: any;
  }) => void;
  initialData?: {
    annualIncome?: number;
    creditScore?: number;
    loanType?: 'FHA' | 'Conventional';
    monthlyDebts?: number;
  };
}

// Income Step Component
const IncomeStep: React.FC = () => {
  const { state, setAnnualIncome, setEmploymentType, setOtherIncome } = useDTIContext();
  const monthlyIncome = state.annualIncome ? state.annualIncome / 12 : 0;

  return (
    <div className="space-y-6">
      {/* Step guidance */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Step 1 of 5: Income Information</strong>
          <br />
          We'll start by understanding your income. Lenders use your gross (before tax) income to calculate DTI.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Label htmlFor="annual-income" className="flex items-center gap-2">
            Annual Income (Gross)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Enter your total annual income before taxes. This includes salary, bonuses, 
                    commissions, and other regular income.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="annual-income"
            type="number"
            placeholder="e.g., 75000"
            value={state.annualIncome || ''}
            onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
          {monthlyIncome > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Monthly income: ${monthlyIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="employment-type" className="flex items-center gap-2">
            Employment Type
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Your employment type affects documentation requirements. Self-employed 
                    borrowers typically need 2 years of tax returns.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            value={state.employmentType || ''}
            onValueChange={(value) => setEmploymentType(value as 'w2' | 'self-employed' | '1099' | 'retired')}
          >
            <SelectTrigger id="employment-type" className="mt-1">
              <SelectValue placeholder="Select employment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="w2">W-2 Employee (Regular employment)</SelectItem>
              <SelectItem value="self-employed">Self-Employed (Business owner)</SelectItem>
              <SelectItem value="1099">1099 Contractor (Independent contractor)</SelectItem>
              <SelectItem value="retired">Retired (Pension/Social Security)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="other-income" className="flex items-center gap-2">
            Other Monthly Income (Optional)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Include rental income, investment dividends, alimony, or other regular 
                    monthly income. Note: You'll need to document these income sources.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="other-income"
            type="number"
            placeholder="e.g., 500"
            value={state.otherIncome || ''}
            onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Helpful tip */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-700">
          <strong>Tip:</strong> Include all verifiable income sources. The more income you can document, 
          the higher your borrowing power will be.
        </p>
      </div>
    </div>
  );
};

// Debts Step Component
const DebtsStep: React.FC = () => {
  const { state, setDebtItems, totalDebtItems } = useDTIContext();

  const debtTypes = [
    { 
      key: 'carLoan', 
      label: 'Car Loan', 
      tooltip: 'Include all auto loan payments (cars, trucks, motorcycles)',
      example: 'e.g., $450'
    },
    { 
      key: 'studentLoan', 
      label: 'Student Loan', 
      tooltip: 'Minimum monthly payment on all student loans',
      example: 'e.g., $250'
    },
    { 
      key: 'creditCard', 
      label: 'Credit Cards', 
      tooltip: 'Total minimum payments on all credit cards',
      example: 'e.g., $150'
    },
    { 
      key: 'personalLoan', 
      label: 'Personal Loan', 
      tooltip: 'Any personal or signature loans',
      example: 'e.g., $200'
    },
    { 
      key: 'otherDebt', 
      label: 'Other Debts', 
      tooltip: 'Child support, alimony, or other recurring obligations',
      example: 'e.g., $300'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Step guidance */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Step 2 of 5: Monthly Debt Payments</strong>
          <br />
          Now let's add up your monthly debt obligations. Only include minimum required payments, not what you actually pay.
        </AlertDescription>
      </Alert>

      {/* Example box */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-700 font-medium mb-1">Quick Example:</p>
        <p className="text-sm text-gray-600">
          If your credit card balance is $5,000 but the minimum payment is $150, enter $150 (not $5,000).
        </p>
      </div>

      <div className="space-y-4">
        {debtTypes.map(({ key, label, tooltip, example }) => (
          <div key={key}>
            <Label htmlFor={key} className="flex items-center gap-2">
              {label}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id={key}
              type="number"
              placeholder={example}
              value={state.debtItems[key as keyof typeof state.debtItems] || ''}
              onChange={(e) => setDebtItems({
                ...state.debtItems,
                [key]: parseFloat(e.target.value) || 0,
              })}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">Total Monthly Debts:</p>
            <p className="text-sm text-gray-600">This is what lenders will use</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold">
              ${totalDebtItems.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600">per month</p>
          </div>
        </div>
      </div>

      {/* Helpful note */}
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Don't include:</strong> Utilities, insurance, groceries, or other living expenses. 
          DTI only counts debt obligations that appear on your credit report.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export const DTICalculatorModal: React.FC<DTICalculatorModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialData,
}) => {
  const dtiContext = useDTIContext();

  // Handle body scroll locking on mobile
  useEffect(() => {
    if (isOpen && isMobileDevice()) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isOpen]);

  // Initialize DTI context with initial data when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      // Set initial values in DTI context
      if (initialData.annualIncome) {
        dtiContext.setAnnualIncome(initialData.annualIncome);
      }
      if (initialData.creditScore) {
        dtiContext.setCreditScore(initialData.creditScore);
      }
      if (initialData.loanType) {
        dtiContext.setLoanType(initialData.loanType.toLowerCase() as 'fha' | 'conventional');
      }
      if (initialData.monthlyDebts !== undefined) {
        dtiContext.setMonthlyDebts(initialData.monthlyDebts);
      }
    }
  }, [isOpen, initialData]);

  const handleWizardComplete = (results: any) => {
    // The wizard completion should have triggered DTI calculations
    // Pass the results from the context to the parent
    const completeResults = {
      dtiResponse: dtiContext.state.dtiResponse,
      borrowingPowerResponse: dtiContext.state.borrowingPowerResponse,
    };
    
    onComplete(completeResults);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto dti-scrollable">
        <DialogHeader>
          <DialogTitle>DTI Calculator</DialogTitle>
          <DialogDescription>
            Let's calculate your debt-to-income ratio step by step. This will help determine your maximum borrowing power and loan eligibility.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <DTIWizardWithPersistence onComplete={handleWizardComplete}>
            <DTIWizard.Progress showStepNames />
            
            <DTIWizard.Content>
              <DTIWizard.Step stepId="income">
                <IncomeStep />
              </DTIWizard.Step>
              
              <DTIWizard.Step stepId="debts">
                <DebtsStep />
              </DTIWizard.Step>
              
              <DTIWizard.Step stepId="credit">
                <CreditStep />
              </DTIWizard.Step>
              
              <DTIWizard.Step stepId="compensating-factors">
                <CompensatingFactorsStep />
              </DTIWizard.Step>
              
              <DTIWizard.Step stepId="results">
                <ResultsStep />
              </DTIWizard.Step>
            </DTIWizard.Content>
            
            <DTIWizard.Navigation className="mt-6" />
          </DTIWizardWithPersistence>
        </div>
      </DialogContent>
    </Dialog>
  );
};