/**
 * Core domain types for DTI calculation system
 * 
 * These types define the domain entities and interfaces for the DTI calculation
 * system, providing a clean separation between domain logic and infrastructure.
 */

import { BorrowerProfile } from "./BorrowerProfile";

// Base interfaces for DTI calculation

export interface DTIRequest {
  annualIncome: number;
  monthlyDebts: number;
  proposedPITI?: number;     // Optional - engine will solve for max PITI if omitted
  loanType: "conventional" | "fha";
  fico: number;
  ltv: number;
  factors: CompensatingFactors;
  propertyTaxRate?: number;  // Annual percentage
  annualInsurance?: number;  // Annual dollar amount
  downPaymentPercent?: number;
  pmiRate?: number;         // Annual percentage
  interestRate?: number;    // Annual percentage
  termYears?: number;       // Loan term in years
}

export interface DTIEvaluationRequest {
  borrowerProfile: BorrowerProfile;
  proposedPITI: number;
  loanType: 'fha' | 'conventional';
}

export interface DTISolveRequest {
  borrowerProfile: BorrowerProfile;
  loanType: 'fha' | 'conventional';
  targetLTV?: number;
}

export interface AllowedDTI {
  frontEnd: number;
  backEnd: number;
}

export interface ActualDTI {
  frontEnd: number;
  backEnd: number;
}

export interface DTIResponse {
  allowed: AllowedDTI;
  actual: ActualDTI;
  maxPITI: number;
  strongFactorCount: number;
  flags: ("exceedsFrontEnd" | "exceedsBackEnd" | "withinLimits")[];
  enhancedFactors: Record<string, string>;
  calculationDetails: {
    monthlyIncome: number;
    maxHousingPayment: number;
    availableAfterDebts: number;
    factorAdjustments: string[];
  };
}

export interface DTIStatus {
  value: number;
  status: 'normal' | 'caution' | 'warning' | 'exceeded';
  message: string;
  helpText: string;
}

export interface MaxPitiResult {
  maxPITI: number;
  limits: AllowedDTI;
  actualRatios: ActualDTI;
  qualificationStatus: QualificationResult;
}

export interface QualificationResult {
  qualified: boolean;
  issues: string[];
  recommendations: string[];
}

// Debt Items structure
export interface DebtItems {
  carLoan: number;
  studentLoan: number;
  creditCard: number;
  personalLoan: number;
  otherDebt: number;
}

// Compensating Factors structure
export interface CompensatingFactors {
  cashReserves: string;
  residualIncome: string;
  housingPaymentIncrease: string;
  employmentHistory: string;
  creditUtilization: string;
  downPayment: string;
  energyEfficient?: string;
  overtimeIncome?: string;
  minimumDebtPayments?: string;
  paymentShock?: string;
  liquidAssets?: string;
  additionalIncome?: string;
}

// API Response envelope
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DTICalculationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DTICalculationError';
  }
}

// DTI Limits structure
export interface DTILimits {
  frontEnd: {
    default: number;
    maximum: number;
    warning: number;
    hardCap: number | null;
  };
  backEnd: {
    default: number;
    maximum: number;
    warning: number;
    hardCap: number | null;
  };
}

// Financial details for mortgage results
export interface FinancialDetails {
  maxDTI: number;
  monthlyIncome: number;
  maxMonthlyDebtPayment: number;
  availableForMortgage: number;
  adjustedRate: number;
  strongFactorCount?: number;
  frontEndDTI?: number;
  backEndDTI?: number;
  frontEndDTIStatus?: DTIStatus;
  backEndDTIStatus?: DTIStatus;
}