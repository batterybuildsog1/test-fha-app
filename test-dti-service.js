/**
 * DTI Service Unit Tests
 * 
 * Comprehensive test suite for DTI calculation service layer functions.
 * Tests core business logic, edge cases, and compliance with 2025 guidelines.
 */

import { solveMaxPITI, getAllowedLimits, evaluateDTI, calculateMaxPurchasePriceWithDTI } from './convex/services/dtiService.js';
import { countStrongFactors, createEnhancedFactors } from './convex/services/compensatingFactorService.js';
import { cacheService } from './convex/services/cacheService.js';

// Test data
const testBorrowerProfile = {
  annualIncome: 80000,
  monthlyDebts: 500,
  creditScore: 720,
  zipCode: "12345",
  state: "NY",
  debtItems: {
    carLoan: 300,
    studentLoan: 200,
    creditCard: 0,
    personalLoan: 0,
    otherDebt: 0
  },
  compensatingFactors: {
    cashReserves: "6+ months",
    residualIncome: "meets VA guidelines",
    housingPaymentIncrease: "<10%",
    employmentHistory: "5+ years",
    creditUtilization: "<10%",
    downPayment: "20%+"
  }
};

const testDTIRequest = {
  annualIncome: 80000,
  monthlyDebts: 500,
  loanType: "fha",
  fico: 720,
  ltv: 80,
  factors: testBorrowerProfile.compensatingFactors,
  propertyTaxRate: 1.2,
  annualInsurance: 1200,
  downPaymentPercent: 20,
  pmiRate: 0,
  interestRate: 7.5,
  termYears: 30
};

// Test Results Tracker
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  failures: []
};

function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    console.log(`✅ ${message}`);
  } else {
    testResults.failed++;
    testResults.failures.push(message);
    console.log(`❌ ${message}`);
  }
}

function runTest(testName, testFn) {
  console.log(`\n🧪 Running: ${testName}`);
  try {
    testFn();
  } catch (error) {
    testResults.failed++;
    testResults.total++;
    testResults.failures.push(`${testName}: ${error.message}`);
    console.log(`❌ ${testName}: ${error.message}`);
  }
}

// Test 1: DTI Calculation Accuracy
runTest("DTI Calculation Accuracy", () => {
  const result = solveMaxPITI(testDTIRequest);
  
  assert(result.maxPITI > 0, "Should calculate positive max PITI");
  assert(result.allowed.frontEnd > 0, "Should have front-end limit");
  assert(result.allowed.backEnd > 0, "Should have back-end limit");
  assert(result.actual.frontEnd >= 0, "Should calculate actual front-end ratio");
  assert(result.actual.backEnd >= 0, "Should calculate actual back-end ratio");
  assert(result.strongFactorCount >= 0, "Should count strong factors");
  assert(Array.isArray(result.flags), "Should return flags array");
  assert(typeof result.enhancedFactors === 'object', "Should return enhanced factors");
});

// Test 2: FHA vs Conventional Limits
runTest("FHA vs Conventional Limits", () => {
  const fhaRequest = { ...testDTIRequest, loanType: "fha" };
  const convRequest = { ...testDTIRequest, loanType: "conventional" };
  
  const fhaResult = solveMaxPITI(fhaRequest);
  const convResult = solveMaxPITI(convRequest);
  
  assert(fhaResult.allowed.frontEnd >= 31, "FHA front-end should be at least 31%");
  assert(fhaResult.allowed.backEnd >= 43, "FHA back-end should be at least 43%");
  assert(convResult.allowed.frontEnd >= 28, "Conventional front-end should be at least 28%");
  assert(convResult.allowed.backEnd >= 36, "Conventional back-end should be at least 36%");
});

// Test 3: Compensating Factors Impact
runTest("Compensating Factors Impact", () => {
  const noFactors = { ...testDTIRequest, factors: {} };
  const withFactors = { ...testDTIRequest, factors: testBorrowerProfile.compensatingFactors };
  
  const noFactorsResult = solveMaxPITI(noFactors);
  const withFactorsResult = solveMaxPITI(withFactors);
  
  assert(withFactorsResult.strongFactorCount > noFactorsResult.strongFactorCount, 
    "Should count more strong factors with compensating factors");
  assert(withFactorsResult.allowed.backEnd >= noFactorsResult.allowed.backEnd, 
    "Compensating factors should increase or maintain DTI limits");
});

// Test 4: Credit Score Impact
runTest("Credit Score Impact", () => {
  const lowCredit = { ...testDTIRequest, fico: 650 };
  const highCredit = { ...testDTIRequest, fico: 750 };
  
  const lowCreditResult = solveMaxPITI(lowCredit);
  const highCreditResult = solveMaxPITI(highCredit);
  
  assert(highCreditResult.allowed.backEnd >= lowCreditResult.allowed.backEnd, 
    "Higher credit score should provide same or better DTI limits");
});

// Test 5: Evaluation Mode
runTest("Evaluation Mode", () => {
  const evaluationRequest = { ...testDTIRequest, proposedPITI: 2000 };
  const result = solveMaxPITI(evaluationRequest);
  
  assert(result.maxPITI === 2000, "Should return proposed PITI in evaluation mode");
  assert(result.actual.frontEnd > 0, "Should calculate actual front-end ratio");
  assert(result.actual.backEnd > 0, "Should calculate actual back-end ratio");
  assert(result.flags.length > 0, "Should return status flags");
});

// Test 6: DTI Status Evaluation
runTest("DTI Status Evaluation", () => {
  const evaluationRequest = { ...testDTIRequest, proposedPITI: 1500 };
  const status = evaluateDTI(evaluationRequest);
  
  assert(typeof status.value === 'number', "Should return numeric DTI value");
  assert(['normal', 'caution', 'warning', 'exceeded'].includes(status.status), 
    "Should return valid status");
  assert(typeof status.message === 'string', "Should return status message");
  assert(typeof status.helpText === 'string', "Should return help text");
});

// Test 7: Purchase Price Calculation
runTest("Purchase Price Calculation", () => {
  const result = calculateMaxPurchasePriceWithDTI(testDTIRequest);
  
  assert(result.maxPurchasePrice >= 0, "Should calculate non-negative purchase price");
  assert(result.maxLoanAmount >= 0, "Should calculate non-negative loan amount");
  assert(result.maxLoanAmount <= result.maxPurchasePrice, "Loan amount should not exceed purchase price");
  assert(typeof result.dtiResponse === 'object', "Should include DTI response");
});

// Test 8: Strong Factor Counting
runTest("Strong Factor Counting", () => {
  const factors = testBorrowerProfile.compensatingFactors;
  const enhancedFactors = createEnhancedFactors(factors, 720, 500, 6667);
  const strongCount = countStrongFactors(enhancedFactors);
  
  assert(strongCount >= 0, "Should count non-negative strong factors");
  assert(strongCount <= Object.keys(enhancedFactors).length, 
    "Strong factors should not exceed total factors");
});

// Test 9: Cache Service Functions
runTest("Cache Service Functions", () => {
  const cacheEntry = cacheService.createCacheEntry({ test: "data" }, "test-key", 30000);
  
  assert(cacheService.isFresh(cacheEntry), "Fresh cache entry should be fresh");
  assert(typeof cacheService.createDTIKey(80000, 500, "fha", 720, 80, {}) === 'string', 
    "Should create DTI cache key");
  assert(cacheService.isCacheEnabled('DTI_CALCULATIONS'), "DTI calculations cache should be enabled");
});

// Test 10: Error Handling
runTest("Error Handling", () => {
  try {
    const invalidRequest = { ...testDTIRequest, annualIncome: -1000 };
    solveMaxPITI(invalidRequest);
    assert(false, "Should throw error for negative income");
  } catch (error) {
    assert(error.message.includes("Annual income must be greater than 0"), 
      "Should throw appropriate error message");
  }
});

// Test 11: Edge Cases
runTest("Edge Cases", () => {
  // Test with zero monthly debts
  const zeroDebtsRequest = { ...testDTIRequest, monthlyDebts: 0 };
  const zeroDebtsResult = solveMaxPITI(zeroDebtsRequest);
  assert(zeroDebtsResult.maxPITI > 0, "Should handle zero monthly debts");
  
  // Test with very high income
  const highIncomeRequest = { ...testDTIRequest, annualIncome: 500000 };
  const highIncomeResult = solveMaxPITI(highIncomeRequest);
  assert(highIncomeResult.maxPITI > 0, "Should handle high income");
  
  // Test with minimum credit score
  const minCreditRequest = { ...testDTIRequest, fico: 580 };
  const minCreditResult = solveMaxPITI(minCreditRequest);
  assert(minCreditResult.maxPITI > 0, "Should handle minimum credit score");
});

// Test 12: Allowed Limits Function
runTest("Allowed Limits Function", () => {
  const allowedFHA = getAllowedLimits(720, 80, "fha", testBorrowerProfile.compensatingFactors);
  const allowedConv = getAllowedLimits(720, 80, "conventional", testBorrowerProfile.compensatingFactors);
  
  assert(allowedFHA.frontEnd > 0 && allowedFHA.backEnd > 0, "FHA limits should be positive");
  assert(allowedConv.frontEnd > 0 && allowedConv.backEnd > 0, "Conventional limits should be positive");
  assert(allowedFHA.frontEnd >= 31, "FHA front-end should meet minimum");
  assert(allowedConv.frontEnd >= 28, "Conventional front-end should meet minimum");
});

// Test 13: 2025 Guidelines Compliance
runTest("2025 Guidelines Compliance", () => {
  // Test FHA maximum limits
  const maxFHARequest = { 
    ...testDTIRequest, 
    loanType: "fha",
    factors: {
      cashReserves: "9+ months",
      residualIncome: "exceeds VA guidelines",
      downPayment: "20%+",
      creditUtilization: "<10%",
      employmentHistory: "10+ years"
    }
  };
  const maxFHAResult = solveMaxPITI(maxFHARequest);
  
  assert(maxFHAResult.allowed.backEnd <= 56.99, "FHA back-end should not exceed 56.99%");
  assert(maxFHAResult.allowed.frontEnd <= 40, "FHA front-end should not exceed 40%");
  
  // Test Conventional maximum limits
  const maxConvRequest = { 
    ...testDTIRequest, 
    loanType: "conventional",
    factors: {
      cashReserves: "9+ months",
      residualIncome: "exceeds VA guidelines",
      downPayment: "20%+",
      creditUtilization: "<10%",
      employmentHistory: "10+ years"
    }
  };
  const maxConvResult = solveMaxPITI(maxConvRequest);
  
  assert(maxConvResult.allowed.backEnd <= 50, "Conventional back-end should not exceed 50%");
});

// Test 14: Calculation Details
runTest("Calculation Details", () => {
  const result = solveMaxPITI(testDTIRequest);
  const details = result.calculationDetails;
  
  assert(details.monthlyIncome > 0, "Should calculate monthly income");
  assert(details.maxHousingPayment >= 0, "Should calculate max housing payment");
  assert(details.availableAfterDebts >= 0, "Should calculate available after debts");
  assert(Array.isArray(details.factorAdjustments), "Should return factor adjustments array");
});

// Test 15: Bidirectional Solving
runTest("Bidirectional Solving", () => {
  // Test solving mode (no proposed PITI)
  const solvingResult = solveMaxPITI(testDTIRequest);
  
  // Test evaluation mode (with proposed PITI)
  const evaluationRequest = { ...testDTIRequest, proposedPITI: solvingResult.maxPITI };
  const evaluationResult = solveMaxPITI(evaluationRequest);
  
  assert(evaluationResult.maxPITI === solvingResult.maxPITI, 
    "Evaluation mode should return the proposed PITI");
  assert(Math.abs(evaluationResult.actual.frontEnd - solvingResult.actual.frontEnd) < 0.01, 
    "Front-end ratios should be similar");
  assert(Math.abs(evaluationResult.actual.backEnd - solvingResult.actual.backEnd) < 0.01, 
    "Back-end ratios should be similar");
});

// Print test results
console.log("\n" + "=".repeat(50));
console.log("📊 TEST RESULTS SUMMARY");
console.log("=".repeat(50));
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed} ✅`);
console.log(`Failed: ${testResults.failed} ❌`);
console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

if (testResults.failures.length > 0) {
  console.log("\n❌ FAILED TESTS:");
  testResults.failures.forEach(failure => console.log(`  - ${failure}`));
}

if (testResults.failed === 0) {
  console.log("\n🎉 ALL TESTS PASSED! Step 2 implementation is working correctly.");
} else {
  console.log("\n⚠️  Some tests failed. Please review the implementations.");
}

console.log("\n" + "=".repeat(50));