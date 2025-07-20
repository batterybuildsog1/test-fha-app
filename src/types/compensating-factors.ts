/**
 * Compensating Factors Type Definitions
 * Modern, type-safe definitions for FHA/Conventional compensating factors
 */

export interface CompensatingFactorOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface CompensatingFactorDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly options: readonly CompensatingFactorOption[];
  readonly isStrong: (value: string) => boolean;
  readonly helpLink?: string;
  readonly category: 'financial' | 'credit' | 'employment' | 'housing';
  readonly priority: 'high' | 'medium' | 'low';
}

export interface CompensatingFactorSelection {
  readonly [factorId: string]: string;
}

export interface CompensatingFactorAnalysis {
  readonly strongFactorCount: number;
  readonly moderateFactorCount: number;
  readonly totalFactorCount: number;
  readonly dtiBoostPercentage: number;
  readonly qualificationTier: 'basic' | 'enhanced' | 'maximum';
  readonly recommendations: readonly string[];
}

export interface CompensatingFactorState {
  readonly selections: CompensatingFactorSelection;
  readonly currentHousingPayment: number;
  readonly calculatedFactors: {
    readonly creditHistory: string;
    readonly nonHousingDTI: string;
    readonly housingPaymentIncrease: string;
  };
  readonly analysis: CompensatingFactorAnalysis;
}

export interface CompensatingFactorActions {
  readonly updateSelection: (factorId: string, value: string) => void;
  readonly updateCurrentHousingPayment: (amount: number) => void;
  readonly calculateHousingPaymentIncrease: (newPayment: number) => void;
  readonly resetSelections: () => void;
}

export type CompensatingFactorContextType = CompensatingFactorState & CompensatingFactorActions;

// Error types for proper error handling
export class CompensatingFactorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly factorId?: string
  ) {
    super(message);
    this.name = 'CompensatingFactorError';
  }
}

export interface CompensatingFactorValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly CompensatingFactorError[];
  readonly warnings: readonly string[];
}