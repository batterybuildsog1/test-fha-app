/**
 * DTI Data Bridge Utilities
 * 
 * Handles data synchronization between InputForm and DTI wizard
 */

import { MortgageFormData } from '../types';

/**
 * Map credit score range to numeric value
 */
export function mapCreditScoreToNumeric(creditScore: string): number {
  switch (creditScore) {
    case 'excellent':
      return 750;
    case 'good':
      return 700;
    case 'fair':
      return 620;
    case 'poor':
      return 550;
    default:
      return 700; // Default to good
  }
}

/**
 * Map numeric credit score to range
 */
export function mapNumericToCreditScoreRange(score: number): string {
  if (score >= 740) return 'excellent';
  if (score >= 670) return 'good';
  if (score >= 580) return 'fair';
  return 'poor';
}

/**
 * Calculate annual income from monthly mortgage payment
 * Using 28% front-end ratio as baseline
 */
export function estimateAnnualIncomeFromPayment(monthlyPayment: number): number {
  // Monthly payment should be roughly 28% of monthly income
  const monthlyIncome = monthlyPayment / 0.28;
  return Math.round(monthlyIncome * 12);
}

/**
 * Calculate annual income from house price
 * Using typical debt-to-income ratios
 */
export function estimateAnnualIncomeFromHousePrice(housePrice: number, downPayment: number): number {
  const loanAmount = housePrice - downPayment;
  // Assume typical mortgage payment is about 0.5% of loan amount per month
  const estimatedMonthlyPayment = loanAmount * 0.005;
  return estimateAnnualIncomeFromPayment(estimatedMonthlyPayment);
}

/**
 * Map InputForm data to DTI wizard initial state
 */
export function mapInputFormToDTI(formData: MortgageFormData, calculations?: any) {
  const creditScore = mapCreditScoreToNumeric(formData.creditScore);
  
  // Calculate annual income based on available data
  let annualIncome = 0;
  if (calculations?.total) {
    // If we have calculations, use the actual monthly payment
    annualIncome = estimateAnnualIncomeFromPayment(calculations.total);
  } else {
    // Otherwise estimate from house price
    annualIncome = estimateAnnualIncomeFromHousePrice(formData.housePrice, formData.downPayment);
  }
  
  // Calculate LTV
  const loanAmount = formData.housePrice - formData.downPayment;
  const ltv = (loanAmount / formData.housePrice) * 100;
  
  return {
    annualIncome,
    creditScore,
    loanType: 'FHA' as const, // Default to FHA
    monthlyDebts: 0, // User will need to fill this
    ltv,
    downPaymentPercent: (formData.downPayment / formData.housePrice) * 100,
    propertyValue: formData.housePrice,
    loanAmount,
  };
}

/**
 * Map DTI results back to InputForm constraints
 */
export function mapDTIToInputForm(dtiResults: any) {
  if (!dtiResults) return null;
  
  const { dtiResponse, borrowingPowerResponse } = dtiResults;
  
  return {
    maxLoanAmount: borrowingPowerResponse?.maxLoanAmount || null,
    maxHousePrice: borrowingPowerResponse?.maxPurchasePrice || null,
    frontEndRatio: dtiResponse?.actual?.frontEnd || null,
    backEndRatio: dtiResponse?.actual?.backEnd || null,
    dtiStatus: dtiResponse?.status || null,
    dtiFlags: dtiResponse?.flags || [],
    monthlyIncome: borrowingPowerResponse?.monthlyIncome || null,
    maxMonthlyPayment: borrowingPowerResponse?.maxMonthlyPayment || null,
  };
}

/**
 * Check if loan amount exceeds DTI limits
 */
export function isLoanAmountDTIConstrained(
  loanAmount: number, 
  dtiResults: any
): boolean {
  if (!dtiResults?.borrowingPowerResponse?.maxLoanAmount) {
    return false;
  }
  
  return loanAmount > dtiResults.borrowingPowerResponse.maxLoanAmount;
}

/**
 * Get DTI constraint message
 */
export function getDTIConstraintMessage(
  loanAmount: number,
  dtiResults: any
): string | null {
  if (!isLoanAmountDTIConstrained(loanAmount, dtiResults)) {
    return null;
  }
  
  const maxLoan = dtiResults.borrowingPowerResponse.maxLoanAmount;
  const difference = loanAmount - maxLoan;
  
  return `Loan amount exceeds DTI limit by $${difference.toLocaleString()}. Maximum qualifying amount is $${maxLoan.toLocaleString()}.`;
}

/**
 * Calculate suggested adjustments to meet DTI requirements
 */
export function calculateDTIAdjustments(
  formData: MortgageFormData,
  dtiResults: any
) {
  if (!dtiResults?.borrowingPowerResponse) {
    return null;
  }
  
  const currentLoanAmount = formData.housePrice - formData.downPayment;
  const maxLoanAmount = dtiResults.borrowingPowerResponse.maxLoanAmount;
  
  if (currentLoanAmount <= maxLoanAmount) {
    return null; // No adjustments needed
  }
  
  // Calculate options
  const requiredDownPayment = formData.housePrice - maxLoanAmount;
  const requiredDownPaymentPercent = (requiredDownPayment / formData.housePrice) * 100;
  
  // Alternative: lower house price
  const maxHousePrice = maxLoanAmount + formData.downPayment;
  
  return {
    currentLoanAmount,
    maxLoanAmount,
    options: [
      {
        type: 'increase-down-payment',
        description: `Increase down payment to $${requiredDownPayment.toLocaleString()} (${requiredDownPaymentPercent.toFixed(1)}%)`,
        newDownPayment: requiredDownPayment,
        newDownPaymentPercent: requiredDownPaymentPercent,
      },
      {
        type: 'lower-house-price',
        description: `Lower house price to $${maxHousePrice.toLocaleString()}`,
        newHousePrice: maxHousePrice,
        priceDifference: formData.housePrice - maxHousePrice,
      },
      {
        type: 'reduce-debts',
        description: 'Reduce monthly debts to increase borrowing power',
        estimatedDebtReduction: (currentLoanAmount - maxLoanAmount) * 0.005, // Rough estimate
      },
    ],
  };
}