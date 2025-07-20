# DTI Wizard Steps Documentation

This directory contains all the step components for the DTI (Debt-to-Income) calculation wizard.

## Overview

The DTI wizard consists of 5 steps that guide users through calculating their debt-to-income ratio and determining their home buying power.

## Steps

### 1. IncomeStep (`IncomeStep.tsx`)
- Collects annual income information
- Employment type selection
- Optional additional income sources
- Real-time validation and income category display

### 2. DebtsStep (`DebtsStep.tsx`)
- Manages monthly debt obligations
- Multiple debt types (car loans, credit cards, student loans, etc.)
- Dynamic debt item management
- Total monthly debt calculation

### 3. CreditStep (`CreditStep.tsx`) - NEW
- Credit score input with visual slider (300-850)
- Loan type selection (FHA, VA, Conventional, USDA)
- Down payment percentage
- Property type selection
- Shows loan program requirements
- Visual indicators for credit score ranges
- Credit improvement tips

### 4. CompensatingFactorsStep (`CompensatingFactorsStep.tsx`) - NEW
- Wraps the existing CompensatingFactorsSection component
- Shows which factors are most important for the selected loan type
- Displays minimum factors needed based on DTI ratio
- Context-sensitive recommendations
- Tracks strong factors vs total selected factors

### 5. ResultsStep (`ResultsStep.tsx`) - NEW
- Comprehensive DTI calculation results
- Front-end and back-end DTI ratios with visual progress bars
- Approval likelihood indicator (traffic light system)
- Borrowing power chart and summary
- Specific recommendations for improvement
- Save, download, and restart options

## Key Features

### Validation
- Each step uses Zod schemas from `/src/lib/validations/dti.ts`
- React Hook Form with zodResolver for form management
- Real-time validation feedback
- Step validation state tracked by the wizard

### State Management
- Uses DTIContext for centralized state
- Automatic sync between form inputs and context
- Calculation triggers on reaching results step

### UI Components
- Consistent use of shadcn/ui components
- Responsive mobile-first design
- Accessible with proper ARIA labels
- Loading states and error handling

### Visual Feedback
- Color-coded indicators (green/amber/red)
- Progress bars for DTI ratios
- Badges for status display
- Icons for visual context

## Usage Example

```tsx
import { DTIWizard } from '../DTIWizard';
import { 
  IncomeStep, 
  DebtsStep, 
  CreditStep, 
  CompensatingFactorsStep, 
  ResultsStep 
} from './steps';

function DTICalculator() {
  return (
    <DTIWizard>
      <DTIWizard.Progress />
      
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
      
      <DTIWizard.Navigation />
    </DTIWizard>
  );
}
```

## Next Steps for Agent 3

The Results step includes placeholder functionality for:
- `handleSaveResults()` - Ready for persistence implementation
- The save button triggers a console log with all data needed for persistence
- All calculation results and inputs are packaged for saving

## Testing Recommendations

1. Test credit score validation boundaries (300-850)
2. Verify loan type requirements update correctly
3. Check compensating factors evaluation logic
4. Ensure DTI calculations are accurate
5. Test responsive design on mobile devices
6. Verify accessibility with screen readers