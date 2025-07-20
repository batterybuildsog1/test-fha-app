/**
 * Borrowing Power Service
 * 
 * Dedicated service for calculating maximum borrowing capacity based on DTI limits,
 * loan products, and market conditions.
 */

import { DTIRequest, DTIResponse } from "../domain/types";
import { BorrowerProfile } from "../domain/BorrowerProfile";
import { solveMaxPITI, calculateMaxPurchasePriceWithDTI } from "./dtiService";
import { LoanProductFactory } from "./loanProductService";
import { cacheService } from "./cacheService";

export interface BorrowingPowerRequest {
  borrowerProfile: BorrowerProfile;
  loanType: 'fha' | 'conventional';
  targetDownPayment?: number;
  targetLTV?: number;
  propertyTaxRate?: number;
  annualInsurance?: number;
  interestRate?: number;
  termYears?: number;
  pmiRate?: number;
}

export interface BorrowingPowerResponse {
  maxPurchasePrice: number;
  maxLoanAmount: number;
  maxMonthlyPayment: number;
  dtiAnalysis: DTIResponse;
  paymentBreakdown: {
    principalInterest: number;
    propertyTax: number;
    insurance: number;
    pmi: number;
    total: number;
  };
  affordabilityMetrics: {
    housingToIncomeRatio: number;
    totalDebtToIncomeRatio: number;
    monthlyIncomeRemaining: number;
    debtCoverage: number;
  };
  recommendations: string[];
}

export interface BorrowingPowerComparison {
  fha: BorrowingPowerResponse;
  conventional: BorrowingPowerResponse;
  recommendation: 'fha' | 'conventional' | null;
  reasons: string[];
}

export const borrowingPowerService = {
  /**
   * Calculate maximum borrowing power for a borrower
   */
  calculateBorrowingPower(request: BorrowingPowerRequest): BorrowingPowerResponse {
    const {
      borrowerProfile,
      loanType,
      targetDownPayment = 20,
      targetLTV = 80,
      propertyTaxRate = 1.2,
      annualInsurance = 1200,
      interestRate = 7.5,
      termYears = 30,
      pmiRate = 0.5
    } = request;

    // Create DTI request
    const dtiRequest: DTIRequest = {
      annualIncome: borrowerProfile.annualIncome,
      monthlyDebts: borrowerProfile.monthlyDebts,
      loanType,
      fico: borrowerProfile.creditScore,
      ltv: targetLTV,
      factors: borrowerProfile.compensatingFactors,
      propertyTaxRate,
      annualInsurance,
      downPaymentPercent: targetDownPayment,
      pmiRate,
      interestRate,
      termYears
    };

    // Calculate maximum purchase price using DTI
    const purchaseResult = calculateMaxPurchasePriceWithDTI(dtiRequest);
    
    // Calculate payment breakdown
    const paymentBreakdown = this.calculatePaymentBreakdown(
      purchaseResult.maxPurchasePrice,
      targetDownPayment,
      interestRate,
      termYears,
      propertyTaxRate,
      annualInsurance,
      pmiRate,
      targetLTV
    );

    // Calculate affordability metrics
    const monthlyIncome = borrowerProfile.annualIncome / 12;
    const affordabilityMetrics = {
      housingToIncomeRatio: (paymentBreakdown.total / monthlyIncome) * 100,
      totalDebtToIncomeRatio: ((paymentBreakdown.total + borrowerProfile.monthlyDebts) / monthlyIncome) * 100,
      monthlyIncomeRemaining: monthlyIncome - paymentBreakdown.total - borrowerProfile.monthlyDebts,
      debtCoverage: monthlyIncome / (paymentBreakdown.total + borrowerProfile.monthlyDebts)
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      borrowerProfile,
      purchaseResult.dtiResponse,
      affordabilityMetrics,
      loanType
    );

    return {
      maxPurchasePrice: purchaseResult.maxPurchasePrice,
      maxLoanAmount: purchaseResult.maxLoanAmount,
      maxMonthlyPayment: paymentBreakdown.total,
      dtiAnalysis: purchaseResult.dtiResponse,
      paymentBreakdown,
      affordabilityMetrics,
      recommendations
    };
  },

  /**
   * Calculate detailed payment breakdown
   */
  calculatePaymentBreakdown(
    homePrice: number,
    downPaymentPercent: number,
    interestRate: number,
    termYears: number,
    propertyTaxRate: number,
    annualInsurance: number,
    pmiRate: number,
    ltv: number
  ) {
    const loanAmount = homePrice * (ltv / 100);
    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = termYears * 12;

    // Calculate principal and interest
    let principalInterest = 0;
    if (monthlyRate > 0) {
      principalInterest = loanAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
    } else {
      principalInterest = loanAmount / totalPayments;
    }

    // Calculate other components
    const propertyTax = (homePrice * propertyTaxRate / 100) / 12;
    const insurance = annualInsurance / 12;
    const pmi = ltv > 80 ? (loanAmount * pmiRate / 100) / 12 : 0;

    return {
      principalInterest,
      propertyTax,
      insurance,
      pmi,
      total: principalInterest + propertyTax + insurance + pmi
    };
  },

  /**
   * Compare borrowing power between FHA and Conventional loans
   */
  compareBorrowingPower(borrowerProfile: BorrowerProfile): BorrowingPowerComparison {
    const fhaRequest: BorrowingPowerRequest = {
      borrowerProfile,
      loanType: 'fha',
      targetDownPayment: 3.5,
      targetLTV: 96.5,
      pmiRate: 0.85
    };

    const conventionalRequest: BorrowingPowerRequest = {
      borrowerProfile,
      loanType: 'conventional',
      targetDownPayment: 5,
      targetLTV: 95,
      pmiRate: 0.5
    };

    const fhaResult = this.calculateBorrowingPower(fhaRequest);
    const conventionalResult = this.calculateBorrowingPower(conventionalRequest);

    // Determine recommendation
    let recommendation: 'fha' | 'conventional' | null = null;
    const reasons: string[] = [];

    if (fhaResult.maxPurchasePrice > conventionalResult.maxPurchasePrice) {
      if (fhaResult.maxPurchasePrice - conventionalResult.maxPurchasePrice > 10000) {
        recommendation = 'fha';
        reasons.push('FHA provides significantly higher borrowing power');
      }
    } else if (conventionalResult.maxPurchasePrice > fhaResult.maxPurchasePrice) {
      if (conventionalResult.maxPurchasePrice - fhaResult.maxPurchasePrice > 10000) {
        recommendation = 'conventional';
        reasons.push('Conventional provides higher borrowing power');
      }
    }

    // Consider other factors
    if (borrowerProfile.creditScore >= 740) {
      recommendation = 'conventional';
      reasons.push('Excellent credit score favors conventional loans');
    } else if (borrowerProfile.creditScore < 620) {
      recommendation = 'fha';
      reasons.push('Credit score requires FHA loan');
    }

    // Consider monthly payment
    if (fhaResult.maxMonthlyPayment < conventionalResult.maxMonthlyPayment) {
      reasons.push('FHA offers lower monthly payment');
    } else if (conventionalResult.maxMonthlyPayment < fhaResult.maxMonthlyPayment) {
      reasons.push('Conventional offers lower monthly payment');
    }

    return {
      fha: fhaResult,
      conventional: conventionalResult,
      recommendation,
      reasons
    };
  },

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(
    profile: BorrowerProfile,
    dtiResponse: DTIResponse,
    affordabilityMetrics: any,
    loanType: 'fha' | 'conventional'
  ): string[] {
    const recommendations: string[] = [];

    // DTI-based recommendations
    if (dtiResponse.flags.includes('exceedsBackEnd')) {
      recommendations.push('Consider paying down existing debts to improve debt-to-income ratio');
      recommendations.push('Explore increasing your down payment to reduce monthly payment');
    }

    if (dtiResponse.flags.includes('exceedsFrontEnd')) {
      recommendations.push('Consider a less expensive home to reduce housing payment');
    }

    // Compensating factors recommendations
    if (dtiResponse.strongFactorCount < 2) {
      recommendations.push('Building stronger compensating factors could increase your borrowing power');
      
      if (profile.compensatingFactors.cashReserves === 'none') {
        recommendations.push('Build cash reserves of 3-6 months of payments');
      }
      
      if (profile.compensatingFactors.creditUtilization !== '<10%') {
        recommendations.push('Reduce credit utilization below 10% for better DTI limits');
      }
    }

    // Credit score recommendations
    if (profile.creditScore < 720) {
      recommendations.push('Improving your credit score could increase your borrowing power');
    }

    // Loan type specific recommendations
    if (loanType === 'fha' && profile.creditScore >= 740) {
      recommendations.push('Consider conventional loan for potentially better terms');
    } else if (loanType === 'conventional' && profile.creditScore < 680) {
      recommendations.push('FHA loan might offer better terms for your credit profile');
    }

    // Affordability recommendations
    if (affordabilityMetrics.monthlyIncomeRemaining < 1000) {
      recommendations.push('Consider a lower price point to maintain financial flexibility');
    }

    if (affordabilityMetrics.housingToIncomeRatio > 35) {
      recommendations.push('Target housing payment below 35% of income for better financial stability');
    }

    return recommendations;
  },

  /**
   * Calculate borrowing power with caching
   */
  calculateBorrowingPowerCached(request: BorrowingPowerRequest): BorrowingPowerResponse {
    const cacheKey = cacheService.createDTIKey(
      request.borrowerProfile.annualIncome,
      request.borrowerProfile.monthlyDebts,
      request.loanType,
      request.borrowerProfile.creditScore,
      request.targetLTV || 80,
      request.borrowerProfile.compensatingFactors
    );

    // For now, just calculate - caching would be implemented with a proper cache store
    return this.calculateBorrowingPower(request);
  },

  /**
   * Get borrowing power scenarios with different down payments
   */
  getBorrowingPowerScenarios(
    borrowerProfile: BorrowerProfile,
    loanType: 'fha' | 'conventional'
  ): Array<{ downPayment: number; result: BorrowingPowerResponse }> {
    const downPayments = loanType === 'fha' ? [3.5, 5, 10, 20] : [5, 10, 15, 20];
    
    return downPayments.map(downPayment => ({
      downPayment,
      result: this.calculateBorrowingPower({
        borrowerProfile,
        loanType,
        targetDownPayment: downPayment,
        targetLTV: 100 - downPayment
      })
    }));
  },

  /**
   * Validate borrowing power request
   */
  validateBorrowingPowerRequest(request: BorrowingPowerRequest): boolean {
    const { borrowerProfile, targetDownPayment = 20, targetLTV = 80 } = request;
    
    // Basic validation
    if (borrowerProfile.annualIncome <= 0) return false;
    if (borrowerProfile.monthlyDebts < 0) return false;
    if (borrowerProfile.creditScore < 300 || borrowerProfile.creditScore > 850) return false;
    if (targetDownPayment < 0 || targetDownPayment > 100) return false;
    if (targetLTV < 0 || targetLTV > 100) return false;
    
    // Loan type specific validation
    if (request.loanType === 'fha' && targetDownPayment < 3.5) return false;
    if (request.loanType === 'conventional' && targetDownPayment < 3) return false;
    
    return true;
  }
};

export default borrowingPowerService;