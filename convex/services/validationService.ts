/**
 * Validation Service
 * 
 * Centralized validation service using Zod schemas for all DTI-related operations.
 * Provides consistent validation across the application.
 */

import { ValidationError } from "../domain/types";
import { validateDTIRequest, validateDTIEvaluationRequest, validateDTISolveRequest } from "../validators/dtiSchema";
import { validateBorrowerProfile, validateBorrowerProfileCreate, validateBorrowerProfileUpdate } from "../validators/borrowerSchema";
import { validateLoanProductType, validateLoanApplication } from "../validators/loanSchema";

export const validationService = {
  /**
   * Validate DTI calculation request
   */
  validateDTIRequest: (data: unknown) => {
    try {
      return validateDTIRequest(data);
    } catch (error: any) {
      throw new ValidationError(`DTI request validation failed: ${error.message}`);
    }
  },

  /**
   * Validate DTI evaluation request
   */
  validateDTIEvaluationRequest: (data: unknown) => {
    try {
      return validateDTIEvaluationRequest(data);
    } catch (error: any) {
      throw new ValidationError(`DTI evaluation request validation failed: ${error.message}`);
    }
  },

  /**
   * Validate DTI solve request
   */
  validateDTISolveRequest: (data: unknown) => {
    try {
      return validateDTISolveRequest(data);
    } catch (error: any) {
      throw new ValidationError(`DTI solve request validation failed: ${error.message}`);
    }
  },

  /**
   * Validate borrower profile
   */
  validateBorrowerProfile: (data: unknown) => {
    try {
      return validateBorrowerProfile(data);
    } catch (error: any) {
      throw new ValidationError(`Borrower profile validation failed: ${error.message}`);
    }
  },

  /**
   * Validate borrower profile creation
   */
  validateBorrowerProfileCreate: (data: unknown) => {
    try {
      return validateBorrowerProfileCreate(data);
    } catch (error: any) {
      throw new ValidationError(`Borrower profile creation validation failed: ${error.message}`);
    }
  },

  /**
   * Validate borrower profile update
   */
  validateBorrowerProfileUpdate: (data: unknown) => {
    try {
      return validateBorrowerProfileUpdate(data);
    } catch (error: any) {
      throw new ValidationError(`Borrower profile update validation failed: ${error.message}`);
    }
  },

  /**
   * Validate loan product type
   */
  validateLoanProductType: (data: unknown) => {
    try {
      return validateLoanProductType(data);
    } catch (error: any) {
      throw new ValidationError(`Loan product type validation failed: ${error.message}`);
    }
  },

  /**
   * Validate loan application
   */
  validateLoanApplication: (data: unknown) => {
    try {
      return validateLoanApplication(data);
    } catch (error: any) {
      throw new ValidationError(`Loan application validation failed: ${error.message}`);
    }
  },

  /**
   * Validate numeric range
   */
  validateNumericRange: (value: number, min: number, max: number, fieldName: string) => {
    if (value < min || value > max) {
      throw new ValidationError(`${fieldName} must be between ${min} and ${max}`, fieldName);
    }
    return value;
  },

  /**
   * Validate required field
   */
  validateRequired: (value: any, fieldName: string) => {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
    return value;
  },

  /**
   * Validate income and debt consistency
   */
  validateIncomeDebtConsistency: (annualIncome: number, monthlyDebts: number) => {
    const monthlyIncome = annualIncome / 12;
    const debtToIncomeRatio = (monthlyDebts / monthlyIncome) * 100;
    
    if (debtToIncomeRatio > 100) {
      throw new ValidationError('Monthly debts cannot exceed monthly income');
    }
    
    if (debtToIncomeRatio > 80) {
      console.warn(`High debt-to-income ratio detected: ${debtToIncomeRatio.toFixed(1)}%`);
    }
    
    return { monthlyIncome, debtToIncomeRatio };
  },

  /**
   * Validate credit score
   */
  validateCreditScore: (score: number) => {
    if (score < 300 || score > 850) {
      throw new ValidationError('Credit score must be between 300 and 850');
    }
    return score;
  },

  /**
   * Validate ZIP code
   */
  validateZipCode: (zipCode: string) => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipCode)) {
      throw new ValidationError('Invalid ZIP code format');
    }
    return zipCode;
  },

  /**
   * Validate state code
   */
  validateStateCode: (state: string) => {
    const stateRegex = /^[A-Z]{2}$/;
    if (!stateRegex.test(state)) {
      throw new ValidationError('State must be 2 uppercase letters');
    }
    return state;
  }
};