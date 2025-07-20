/**
 * DTI Wizard Example Implementation
 * 
 * Example showing how to use the DTI Wizard with persistence
 * including all wizard steps and auto-save functionality.
 */

import React from 'react';
import { DTIWizardWithPersistence } from './DTIWizardWithPersistence';
import { DTIWizard } from './DTIWizard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { useDTIContext } from '../../context/DTIContext';

// Import the new step components
import { CreditStep } from './steps/CreditStep';
import { CompensatingFactorsStep as NewCompensatingFactorsStep } from './steps/CompensatingFactorsStep';
import { ResultsStep as NewResultsStep } from './steps/ResultsStep';

// Income Step Component
const IncomeStep: React.FC = () => {
  const { state, setAnnualIncome, setEmploymentType, setOtherIncome } = useDTIContext();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="annual-income">Annual Income</Label>
        <Input
          id="annual-income"
          type="number"
          placeholder="Enter your annual income"
          value={state.annualIncome || ''}
          onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div>
        <Label htmlFor="employment-type">Employment Type</Label>
        <Select
          value={state.employmentType || ''}
          onValueChange={(value) => setEmploymentType(value as 'w2' | 'self-employed' | '1099' | 'retired')}
        >
          <SelectTrigger id="employment-type">
            <SelectValue placeholder="Select employment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="w2">W-2 Employee</SelectItem>
            <SelectItem value="self-employed">Self-Employed</SelectItem>
            <SelectItem value="1099">1099 Contractor</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="other-income">Other Monthly Income (Optional)</Label>
        <Input
          id="other-income"
          type="number"
          placeholder="Rental income, investments, etc."
          value={state.otherIncome || ''}
          onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );
};

// Debts Step Component
const DebtsStep: React.FC = () => {
  const { state, setDebtItems, totalDebtItems } = useDTIContext();

  const debtTypes = [
    { key: 'carLoan', label: 'Car Loan' },
    { key: 'studentLoan', label: 'Student Loan' },
    { key: 'creditCard', label: 'Credit Cards' },
    { key: 'personalLoan', label: 'Personal Loan' },
    { key: 'otherDebt', label: 'Other Debts' },
  ];

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Enter your minimum monthly payment for each debt type. 
          Leave blank or enter 0 if not applicable.
        </AlertDescription>
      </Alert>

      {debtTypes.map(({ key, label }) => (
        <div key={key}>
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            type="number"
            placeholder="Monthly payment"
            value={state.debtItems[key] || ''}
            onChange={(e) => setDebtItems({
              ...state.debtItems,
              [key]: parseFloat(e.target.value) || 0,
            })}
          />
        </div>
      ))}

      <div className="pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span>Total Monthly Debts:</span>
          <span className="font-semibold">
            ${totalDebtItems.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Note: We're using the imported CreditStep component instead

// Note: We're using the imported CompensatingFactorsStep and ResultsStep components instead

// Main Example Component
export const DTIWizardExample: React.FC = () => {
  const handleComplete = (results: any) => {
    console.log('DTI Wizard completed:', results);
    // Handle completion (e.g., navigate to results page, save to profile, etc.)
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">DTI Calculator</h1>
      
      <DTIWizardWithPersistence onComplete={handleComplete}>
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
            <NewCompensatingFactorsStep />
          </DTIWizard.Step>
          
          <DTIWizard.Step stepId="results">
            <NewResultsStep />
          </DTIWizard.Step>
        </DTIWizard.Content>
        
        <DTIWizard.Navigation className="mt-6" />
      </DTIWizardWithPersistence>
    </div>
  );
};