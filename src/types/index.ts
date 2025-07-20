/**
 * React App Types - Bridge between current app and Convex domain types
 * 
 * This file provides TypeScript interfaces for the current React app structure
 * while preparing for DTI integration with Convex domain types.
 */

// Import domain types from Convex
import { 
  DTIRequest, 
  DTIResponse, 
  CompensatingFactors, 
  ApiResponse,
  BorrowerProfile 
} from '../../convex/domain/types';
import { Id } from '../../convex/_generated/dataModel';

// Current form data structure (existing functionality)
export interface MortgageFormData {
  housePrice: number;
  downPayment: number;
  interestRate: number;
  zipCode: string;
  loanTerm: number;
  creditScore: string;
  name: string;
  description: string;
  tags: string[];
  state?: string; // Derived from zipCode
}

// Current calculation results structure (existing functionality)
export interface MortgageCalculationResult {
  total: number;
  principalInterest: number;
  propertyTax: number;
  insurance: number;
  pmi: number;
  details?: {
    loanAmount: number;
    effectiveRate: number;
    downPaymentPercent: string;
    creditScoreUsed: string;
  };
}

// Form validation errors
export interface FormErrors {
  housePrice?: string;
  downPayment?: string;
  interestRate?: string;
  zipCode?: string;
  state?: string;
  rate?: string;
  general?: string;
}

// API status for user feedback
export interface ApiStatus {
  message: string;
  type: 'info' | 'success' | 'error' | '';
}

// Enhanced form data with DTI integration (for future phases)
export interface EnhancedMortgageFormData extends MortgageFormData {
  // DTI-specific fields
  annualIncome?: number;
  monthlyDebts?: number;
  loanType?: 'fha' | 'conventional';
  compensatingFactors?: CompensatingFactors;
  borrowerProfileId?: Id<"borrowerProfiles">;
}

// Enhanced calculation results with DTI integration
export interface EnhancedMortgageCalculationResult extends MortgageCalculationResult {
  dtiSnapshot?: DTIResponse;
  dtiValidation?: DTIValidation;
  borrowingPower?: BorrowingPowerResult;
}

// DTI validation result
export interface DTIValidation {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
  maxAffordablePayment?: number;
}

// Borrowing power calculation result
export interface BorrowingPowerResult {
  maxPurchasePrice: number;
  maxLoanAmount: number;
  maxMonthlyPayment: number;
  dtiAnalysis: DTIResponse;
}

// Scenario data structure (matches current database schema)
export interface ScenarioData {
  _id?: Id<"scenarios">;
  housePrice: number;
  downPayment: number;
  interestRate: number;
  loanTerm: number;
  zipCode: string;
  state?: string;
  creditScore: string;
  monthlyPayment: number;
  principalInterest: number;
  propertyTax: number;
  insurance: number;
  pmi: number;
  name?: string;
  description?: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
  isArchived?: boolean;
  
  // DTI integration fields (optional for backward compatibility)
  dtiSnapshot?: {
    allowed: { frontEnd: number; backEnd: number };
    actual: { frontEnd: number; backEnd: number };
    maxPITI: number;
    flags: string[];
    strongFactorCount: number;
  };
  borrowerProfileId?: Id<"borrowerProfiles">;
  annualIncome?: number;
  monthlyDebts?: number;
  loanType?: string;
  schemaVersion?: number;
}

// Props interfaces for components
export interface InputFormProps {
  trackApiCall: (name: string, id?: string) => {
    start: () => void;
    success: (duration?: number) => void;
    error: (error: string, duration?: number) => void;
  };
  scenarioId?: Id<"scenarios">;
  mode: 'create' | 'edit' | 'view';
  onScenarioSaved?: (scenario: ScenarioData) => void;
  onCancel?: () => void;
}

export interface ScenarioListProps {
  onEditScenario: (id: Id<"scenarios">) => void;
  onViewScenario: (id: Id<"scenarios">) => void;
}

// DTI-specific form step types (for future multi-step form)
export type FormStep = 'income' | 'debts' | 'factors' | 'borrowingPower' | 'loanDetails' | 'results';

export interface DTIFormData {
  annualIncome: number;
  monthlyDebts: number;
  debtItems: {
    carLoan: number;
    studentLoan: number;
    creditCard: number;
    personalLoan: number;
    otherDebt: number;
  };
  compensatingFactors: CompensatingFactors;
  loanType: 'fha' | 'conventional';
  creditScore: number;
  zipCode: string;
  state: string;
}

// State management types
export interface AppState {
  scenarioMode: 'create' | 'edit' | 'view';
  activeScenarioId: Id<"scenarios"> | null;
  currentStep: FormStep;
  dtiData: DTIResponse | null;
  borrowingPowerData: BorrowingPowerResult | null;
}

// Hook return types
export interface UseDTICalculationResult {
  calculateDTI: (request: DTIRequest) => Promise<DTIResponse>;
  evaluateDTI: (request: DTIRequest) => Promise<DTIValidation>;
  calculateBorrowingPower: (request: DTIRequest) => Promise<BorrowingPowerResult>;
  loading: boolean;
  error: string | null;
}

// Re-export important domain types for convenience
export type { 
  DTIRequest, 
  DTIResponse, 
  CompensatingFactors, 
  ApiResponse,
  BorrowerProfile 
} from '../../convex/domain/types';

// Credit score mapping
export const CREDIT_SCORE_MAP = {
  'excellent': 760,
  'good': 700,
  'fair': 620,
  'poor': 550
} as const;

export type CreditScoreString = keyof typeof CREDIT_SCORE_MAP;

// Utility type guards
export const isValidCreditScore = (score: string): score is CreditScoreString => {
  return score in CREDIT_SCORE_MAP;
};

export const isEnhancedFormData = (data: MortgageFormData): data is EnhancedMortgageFormData => {
  return 'annualIncome' in data || 'monthlyDebts' in data || 'compensatingFactors' in data;
};

export const isEnhancedCalculationResult = (result: MortgageCalculationResult): result is EnhancedMortgageCalculationResult => {
  return 'dtiSnapshot' in result || 'dtiValidation' in result || 'borrowingPower' in result;
};