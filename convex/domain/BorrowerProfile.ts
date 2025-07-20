/**
 * Borrower Profile Domain Entity
 * 
 * Represents a borrower's financial profile with all necessary information
 * for DTI calculation and loan qualification assessment.
 */

import { DebtItems, CompensatingFactors } from "./types";

export interface BorrowerProfile {
  id: string;
  annualIncome: number;
  monthlyDebts: number;
  creditScore: number;
  zipCode: string;
  state: string;
  debtItems: DebtItems;
  compensatingFactors: CompensatingFactors;
  createdAt: number;
  updatedAt: number;
}

export interface BorrowerProfileCreate {
  annualIncome: number;
  monthlyDebts: number;
  creditScore: number;
  zipCode: string;
  state: string;
  debtItems: DebtItems;
  compensatingFactors: CompensatingFactors;
}

export interface BorrowerProfileUpdate {
  annualIncome?: number;
  monthlyDebts?: number;
  creditScore?: number;
  zipCode?: string;
  state?: string;
  debtItems?: DebtItems;
  compensatingFactors?: CompensatingFactors;
}

// Helper functions for BorrowerProfile
export const createBorrowerProfile = (
  data: BorrowerProfileCreate
): Omit<BorrowerProfile, 'id'> => ({
  ...data,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const updateBorrowerProfile = (
  existing: BorrowerProfile,
  updates: BorrowerProfileUpdate
): BorrowerProfile => ({
  ...existing,
  ...updates,
  updatedAt: Date.now(),
});

export const getMonthlyIncome = (profile: BorrowerProfile): number => {
  return profile.annualIncome / 12;
};

export const getTotalMonthlyDebts = (profile: BorrowerProfile): number => {
  return profile.monthlyDebts;
};

export const getDebtBreakdown = (profile: BorrowerProfile): DebtItems => {
  return profile.debtItems;
};

export const getCompensatingFactors = (profile: BorrowerProfile): CompensatingFactors => {
  return profile.compensatingFactors;
};