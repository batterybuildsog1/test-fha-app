/**
 * Compensating Factors Constants
 * 2025 FHA/Conventional guidelines with enhanced factor definitions
 */

import { CompensatingFactorDefinition } from '@/types/compensating-factors';

export const COMPENSATING_FACTORS: readonly CompensatingFactorDefinition[] = [
  {
    id: 'cashReserves',
    label: 'Cash Reserves (after closing)',
    description: 'Months of mortgage payments left in savings after your down payment and closing costs. Higher reserves demonstrate financial stability.',
    category: 'financial',
    priority: 'high',
    options: [
      { value: 'none', label: 'None', description: 'No cash reserves after closing' },
      { value: '1-2 months', label: '1-2 months', description: '1-2 months of payments' },
      { value: '3-5 months', label: '3-5 months', description: '3-5 months of payments' },
      { value: '6+ months', label: '6+ months', description: '6+ months of payments' },
    ],
    isStrong: (value: string) => value === '6+ months',
  },
  {
    id: 'residualIncome',
    label: 'Residual Income',
    description: 'Money left over after paying all bills. VA guidelines vary by family size and region.',
    category: 'financial',
    priority: 'high',
    options: [
      { value: 'does not meet', label: 'Does not meet VA guidelines' },
      { value: 'meets VA guidelines', label: 'Meets VA guidelines' },
    ],
    isStrong: (value: string) => value === 'meets VA guidelines',
    helpLink: 'https://www.hud.gov/sites/documents/4155-1_4_SECE.PDF',
  },
  {
    id: 'housingPaymentIncrease',
    label: 'Housing Payment Increase',
    description: 'How much your new mortgage payment will increase compared to your current housing expense.',
    category: 'housing',
    priority: 'high',
    options: [
      { value: '>20%', label: 'More than 20% increase' },
      { value: '10-20%', label: '10-20% increase' },
      { value: '<10%', label: 'Less than 10% increase' },
    ],
    isStrong: (value: string) => value === '<10%',
  },
  {
    id: 'employmentHistory',
    label: 'Employment History',
    description: 'How long you\'ve been in your current job or career field. Longer employment history indicates income stability.',
    category: 'employment',
    priority: 'medium',
    options: [
      { value: '<2 years', label: 'Less than 2 years' },
      { value: '2-5 years', label: '2-5 years' },
      { value: '>5 years', label: 'More than 5 years' },
    ],
    isStrong: (value: string) => value === '>5 years',
  },
  {
    id: 'creditUtilization',
    label: 'Credit Utilization',
    description: 'The percentage of your available credit you\'re currently using. Lower utilization indicates better credit management.',
    category: 'credit',
    priority: 'medium',
    options: [
      { value: '>30%', label: 'More than 30%' },
      { value: '10-30%', label: '10-30%' },
      { value: '<10%', label: 'Less than 10%' },
    ],
    isStrong: (value: string) => value === '<10%',
  },
  {
    id: 'downPayment',
    label: 'Down Payment',
    description: 'The percentage of the home price you plan to pay upfront. Higher down payments reduce lender risk.',
    category: 'financial',
    priority: 'medium',
    options: [
      { value: '<5%', label: 'Less than 5%' },
      { value: '5-10%', label: '5-10%' },
      { value: '>10%', label: 'More than 10%' },
    ],
    isStrong: (value: string) => value === '>10%',
  },
  {
    id: 'professionalLicense',
    label: 'Professional License',
    description: 'Licensed professionals typically have stable income and strong employment prospects.',
    category: 'employment',
    priority: 'low',
    options: [
      { value: 'none', label: 'No professional license' },
      { value: 'state license', label: 'State professional license' },
      { value: 'federal license', label: 'Federal professional license' },
    ],
    isStrong: (value: string) => value === 'federal license',
  },
  {
    id: 'educationLevel',
    label: 'Education Level',
    description: 'Higher education levels correlate with income stability and career advancement potential.',
    category: 'employment',
    priority: 'low',
    options: [
      { value: 'high school', label: 'High school diploma' },
      { value: 'some college', label: 'Some college' },
      { value: 'bachelors', label: 'Bachelor\'s degree' },
      { value: 'advanced', label: 'Advanced degree' },
    ],
    isStrong: (value: string) => value === 'advanced',
  },
] as const;

export const DTI_BOOST_THRESHOLDS = {
  BASIC: { minStrongFactors: 0, maxDTIBoost: 0 },
  ENHANCED: { minStrongFactors: 1, maxDTIBoost: 3 },
  MAXIMUM: { minStrongFactors: 2, maxDTIBoost: 6 },
} as const;

export const QUALIFICATION_TIERS = {
  basic: 'Standard DTI limits (31%/43%)',
  enhanced: 'Enhanced DTI limits (37%/47%)',
  maximum: 'Maximum DTI limits (40%/50%)',
} as const;

export const FACTOR_CATEGORIES = {
  financial: {
    label: 'Financial Strength',
    icon: 'PiggyBank',
    description: 'Factors related to your financial reserves and assets',
  },
  credit: {
    label: 'Credit Profile',
    icon: 'CreditCard',
    description: 'Factors related to your credit history and management',
  },
  employment: {
    label: 'Employment Stability',
    icon: 'Briefcase',
    description: 'Factors related to your job and career stability',
  },
  housing: {
    label: 'Housing Transition',
    icon: 'Home',
    description: 'Factors related to your housing payment change',
  },
} as const;