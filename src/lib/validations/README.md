# DTI Validation System

## Overview

This directory contains comprehensive Zod validation schemas and utilities for the DTI (Debt-to-Income) wizard components. The validation system ensures data integrity, provides user-friendly error messages, and enforces business rules across all DTI-related forms.

## Files Structure

```
src/lib/validations/
├── index.ts          # Central export file for all validations
├── dti.ts           # Core DTI validation schemas and helpers
├── dti-config.ts    # DTI limits and configuration by loan type
├── examples.ts      # Usage examples and patterns
└── README.md        # This file
```

## Key Schemas

### 1. Income Schema (`incomeSchema`)
Validates income-related data:
- Annual income (0 - $10,000,000)
- Monthly income
- Employment type (W2, self-employed, 1099, retired)
- Other income (optional)

### 2. Debt Schemas
- `debtItemSchema` - Individual debt item validation
- `debtItemsSchema` - Collection of debt categories (car, student, credit card, etc.)

### 3. Compensating Factors Schema
Validates factors that can help qualify for higher DTI:
- Cash reserves
- Credit score excellence
- Minimal debt increase
- Residual income
- Low LTV ratio
- Energy efficient home

### 4. Credit Info Schema
Validates loan and credit information:
- Credit score (300-850)
- Loan type (FHA, VA, Conventional, USDA)
- Down payment percentage (0-100%)
- Property type

### 5. DTI Result Schema
Validates calculation results:
- Front-end and back-end ratios
- Maximum loan amount
- Maximum monthly payment
- Qualification status

## DTI Limits by Loan Type

| Loan Type | Front-End | Back-End | Max w/ Compensating |
|-----------|-----------|----------|-------------------|
| FHA       | 31%       | 43%      | 40% / 57%        |
| VA        | N/A       | 41%      | N/A / 50%        |
| Conventional | 28%    | 36%      | 35% / 50%        |
| USDA      | 29%       | 41%      | 34% / 44%        |

## Helper Functions

### `validateDTIRatios(frontEnd, backEnd, loanType)`
Validates DTI ratios against loan program limits and returns:
- `isValid`: boolean
- `errors`: array of error messages
- `warnings`: array of warning messages

### `validateCompleteness(data)`
Checks if all required fields are filled:
- Returns missing fields list
- Ensures data is ready for calculation

### `evaluateCompensatingFactors(factors)`
Analyzes compensating factors and returns:
- Strong factor count
- List of strong factors
- Recommendation text

### `calculateTotalMonthlyDebt(debtItems)`
Sums all debt items to get total monthly debt payment.

## Usage in Components

### Basic Setup with React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { incomeSchema } from '@/lib/validations';

const form = useForm({
  resolver: zodResolver(incomeSchema),
  mode: 'onChange', // Real-time validation
});
```

### Example Component Pattern

```typescript
import { debtItemsSchema } from '@/lib/validations';

// In your component
const {
  control,
  formState: { errors },
  watch,
} = useForm({
  resolver: zodResolver(debtItemsSchema),
  defaultValues: {
    carLoan: 0,
    studentLoan: 0,
    creditCard: 0,
  },
});

// Watch for changes
const totalDebt = watch((data) => 
  calculateTotalMonthlyDebt(data)
);
```

## Validation Features

### 1. Real-time Feedback
- Validates on change for immediate user feedback
- Shows inline errors as users type
- Prevents submission of invalid data

### 2. Contextual Warnings
- DTI approaching limits
- High debt levels
- Missing compensating factors

### 3. Smart Suggestions
- Recommends debt reduction amounts
- Suggests income increase targets
- Identifies strong compensating factors

### 4. Progressive Enhancement
- Basic field validation
- Cross-field validation
- Business rule validation
- Contextual recommendations

## Best Practices

1. **Always validate on both client and server**
   - Use these schemas in components for UX
   - Revalidate on the server for security

2. **Provide clear error messages**
   - Use the `formatZodError` helper
   - Add context-specific messages

3. **Show validation state visually**
   - Red borders for errors
   - Yellow for warnings
   - Green for valid fields

4. **Disable submit when invalid**
   - Use `formState.isValid`
   - Show why submission is disabled

5. **Validate progressively**
   - Start with basic field validation
   - Add cross-field validation
   - Apply business rules last

## Integration with DTI Context

The validation system integrates seamlessly with the DTI Context:

```typescript
const { state, setDebtItems } = useDTIContext();

// Validate before updating context
const validation = debtItemsSchema.safeParse(newDebtItems);
if (validation.success) {
  setDebtItems(validation.data);
}
```

## Testing Validation

Example test cases:

```typescript
// Test income validation
expect(incomeSchema.parse({ 
  annualIncome: 50000,
  monthlyIncome: 4166.67,
  employmentType: 'w2'
})).toBeDefined();

// Test DTI ratio validation
const result = validateDTIRatios(0.30, 0.42, 'fha');
expect(result.isValid).toBe(true);
expect(result.warnings).toHaveLength(0);
```

## Future Enhancements

1. Add validation for specific loan programs (jumbo, etc.)
2. Include regional variations in DTI limits
3. Add validation for assets and reserves
4. Implement custom validation messages per lender
5. Add multi-language support for error messages

## Support

For questions about validation schemas or to add new validation rules, please coordinate with the DTI team or check the examples in `examples.ts`.