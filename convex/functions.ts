import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { STATE_NAMES } from "./homestead";
export const calculateMortgage = mutation(async ({ db }, { housePrice, downPayment, interestRate, loanTerm }: { housePrice: number; downPayment: number; interestRate: number; loanTerm: number }) => {
  const loan = housePrice - downPayment;
  const monthlyRate = interestRate / 1200;
  const payments = loanTerm * 12;
  return (loan * monthlyRate * (1 + monthlyRate) ** payments) / ((1 + monthlyRate) ** payments - 1);
});
export const getPropertyTaxRate = action(async ({ runAction }, { zip, state, homeValue }: { zip: string; state: string; homeValue: number }): Promise<number> => {
  return await runAction(api.propertyTax.getFreshPropertyTax, { zip, state, homeValue });
});
export const estimateInsurance = query(async ({ db }, { state, homeValue }: { state: string; homeValue: number }) => {
  const rateData = await db.query("insuranceRates").filter(q => q.eq(q.field("state"), state)).first();
  
  if (!rateData || typeof rateData.per1000Rate !== 'number') return 0;
  
  const rateToUse = rateData.per1000Rate;
  
  // Calculate base premium using per-$1000 rate
  const basePremium = (homeValue / 1000) * rateToUse;
  
  // Placeholder for future adjustments based on additional factors
  // Could include: credit score (0.8-1.2x), claims history (0.9-1.5x), 
  // construction type (0.95-1.1x), security features (0.9-1.0x)
  const adjustmentFactor = 1.0; // Future enhancement
  
  return Math.round(basePremium * adjustmentFactor);
});

// Add new function to get insurance rate details for transparency
export const getInsuranceRateDetails = query(async ({ db }, { state }: { state: string }) => {
  const rateData = await db.query("insuranceRates").filter(q => q.eq(q.field("state"), state)).first();
  
  if (!rateData) return null;
  
  return {
    ratePerThousand: rateData.per1000Rate, // Use new field when available
    legacyRate: rateData.rate, // Keep legacy for debugging
    hasPerThousandRate: !!rateData.per1000Rate, // Indicates if using new system
    sources: ["Unknown"], // Removed sources and year from schema
    year: "Unknown",
    lastUpdated: new Date(rateData.timestamp).toISOString(),
    isRecent: Date.now() - rateData.timestamp < 90 * 24 * 60 * 60 * 1000 // 90 days
  };
});

// Comprehensive payment calculation action that orchestrates all calculations
export const calculateFullPayment = action(async ({ runQuery, runAction, runMutation }, { 
  housePrice, 
  downPayment, 
  interestRate, 
  useFHA, 
  loanTerm, 
  zipCode, 
  state, 
  creditScore,
  // DTI fields
  dtiSnapshot,
  annualIncome,
  monthlyDebts 
}: { 
  housePrice: number; 
  downPayment: number; 
  interestRate: number; 
  useFHA: boolean;
  loanTerm: number; 
  zipCode: string; 
  state: string; 
  creditScore: string;
  // Optional DTI fields
  dtiSnapshot?: {
    allowed: { frontEnd: number; backEnd: number };
    actual: { frontEnd: number; backEnd: number };
    maxPITI: number;
    flags: string[];
  };
  annualIncome?: number;
  monthlyDebts?: number;
}) => {
  console.log(`[calculateFullPayment] Starting calculation for house price: $${housePrice.toLocaleString()}, state: ${state}, ZIP: ${zipCode}, credit: ${creditScore}`);

  let finalRate = interestRate;
  if (useFHA) {
    console.log('[calculateFullPayment] Fetching fresh FHA rate...');
    try {
      finalRate = await runAction(api.getFHARates.getFreshFHARate, {});
      console.log(`[calculateFullPayment] Retrieved FHA rate: ${finalRate}%`);
    } catch (error) {
      console.error('[calculateFullPayment] Failed to fetch FHA rate:', error);
      throw new Error('Unable to fetch current FHA rate. Please try again or enter rate manually.');
    }
  }

  // Mortgage calculation
  const loan = housePrice - downPayment;
  const monthlyRate = finalRate / 100 / 12;
  const payments = loanTerm * 12;
  const mortgage = (loan * monthlyRate * Math.pow((1 + monthlyRate), payments)) / (Math.pow((1 + monthlyRate), payments) - 1);
  console.log(`[calculateFullPayment] Calculated P&I: $${mortgage.toFixed(2)}/month (loan: $${loan.toLocaleString()}, rate: ${finalRate}%)`);

  // Property tax
  console.log('[calculateFullPayment] Fetching property tax rate...');
  let monthlyTax = 0;
  try {
    const propTaxRate = await runAction(api.propertyTax.getFreshPropertyTax, { zip: zipCode, state, homeValue: housePrice });
    const annualTax = housePrice * propTaxRate;
    monthlyTax = annualTax / 12;
    console.log(`[calculateFullPayment] Property tax: $${monthlyTax.toFixed(2)}/month (rate: ${(propTaxRate * 100).toFixed(3)}%)`);
  } catch (error) {
    console.error('[calculateFullPayment] Property tax calculation failed:', error);
    // Use a reasonable default
    const defaultRate = 0.01; // 1% default
    monthlyTax = (housePrice * defaultRate) / 12;
    console.log(`[calculateFullPayment] Using default property tax rate: ${(defaultRate * 100)}%`);
  }

  // Insurance
  let monthlyInsurance = 0;
  try {
    const stateName = STATE_NAMES[state.toUpperCase()];
    if (!stateName) {
      throw new Error(`Unknown state code: ${state}`);
    }
    console.log(`[calculateFullPayment] Fetching insurance rate for ${stateName}...`);
    
    const insuranceRate = await runAction(api.insuranceRates.getFreshInsuranceRate, { state, stateName });
    let annualInsurance = (housePrice / 1000) * insuranceRate;

    // Credit score adjustment
    let creditFactor = 1.0;
    switch (creditScore) {
      case 'excellent': creditFactor = 0.9; break;
      case 'good': creditFactor = 1.0; break;
      case 'fair': creditFactor = 1.2; break;
      case 'poor': creditFactor = 1.5; break;
    }
    annualInsurance *= creditFactor;
    monthlyInsurance = annualInsurance / 12;
    console.log(`[calculateFullPayment] Insurance: $${monthlyInsurance.toFixed(2)}/month (rate: $${insuranceRate.toFixed(2)}/$1000, credit factor: ${creditFactor}x)`);
  } catch (error) {
    console.error('[calculateFullPayment] Insurance calculation failed:', error);
    // Use a reasonable default
    const defaultPer1000 = 8; // $8 per $1000 default
    monthlyInsurance = ((housePrice / 1000) * defaultPer1000) / 12;
    console.log(`[calculateFullPayment] Using default insurance rate: $${defaultPer1000}/$1000`);
  }

  // PMI calculation (if down payment < 20%)
  let monthlyPMI = 0;
  const downPaymentPercent = downPayment / housePrice;
  if (downPaymentPercent < 0.2) {
    // PMI typically ranges from 0.3% to 1.5% annually
    const pmiRate = 0.005; // 0.5% annual rate as default
    monthlyPMI = (loan * pmiRate) / 12;
    console.log(`[calculateFullPayment] PMI required (${(downPaymentPercent * 100).toFixed(1)}% down): $${monthlyPMI.toFixed(2)}/month`);
  } else {
    console.log(`[calculateFullPayment] No PMI required (${(downPaymentPercent * 100).toFixed(1)}% down)`);
  }

  const totalMonthly = mortgage + monthlyTax + monthlyInsurance + monthlyPMI;
  
  // DTI Validation if data is available
  let dtiValidation = null;
  if (dtiSnapshot || (annualIncome && annualIncome > 0)) {
    console.log('[calculateFullPayment] Performing DTI validation...');
    
    const monthlyIncome = annualIncome ? annualIncome / 12 : 0;
    const housingExpense = totalMonthly;
    const totalDebts = (monthlyDebts || 0) + housingExpense;
    
    // Calculate actual DTI ratios
    const actualFrontEnd = monthlyIncome > 0 ? (housingExpense / monthlyIncome) * 100 : 0;
    const actualBackEnd = monthlyIncome > 0 ? (totalDebts / monthlyIncome) * 100 : 0;
    
    // Check against DTI limits if snapshot provided
    let dtiStatus = 'not-calculated';
    let dtiMessage = '';
    let isConstrained = false;
    
    if (dtiSnapshot) {
      // Check if payment exceeds DTI limits
      if (housingExpense > dtiSnapshot.maxPITI) {
        isConstrained = true;
        const excess = housingExpense - dtiSnapshot.maxPITI;
        dtiMessage = `Payment exceeds DTI limit by $${excess.toFixed(0)}/month`;
        dtiStatus = 'exceeds-limit';
      } else if (actualBackEnd > dtiSnapshot.allowed.backEnd) {
        dtiStatus = 'high-ratio';
        dtiMessage = `Back-end ratio (${actualBackEnd.toFixed(1)}%) exceeds limit (${dtiSnapshot.allowed.backEnd}%)`;
      } else {
        dtiStatus = 'approved';
        dtiMessage = 'Payment within DTI limits';
      }
    }
    
    dtiValidation = {
      calculated: {
        frontEnd: actualFrontEnd,
        backEnd: actualBackEnd,
        monthlyIncome,
        housingExpense,
        totalDebts
      },
      status: dtiStatus,
      message: dtiMessage,
      isConstrained,
      snapshot: dtiSnapshot || null
    };
    
    console.log('[calculateFullPayment] DTI validation result:', dtiValidation);
  }
  
  const result = {
    principalInterest: Math.round(mortgage),
    propertyTax: Math.round(monthlyTax),
    insurance: Math.round(monthlyInsurance),
    pmi: Math.round(monthlyPMI),
    total: Math.round(totalMonthly),
    // Additional details for transparency
    details: {
      loanAmount: loan,
      effectiveRate: finalRate,
      downPaymentPercent: (downPaymentPercent * 100).toFixed(1),
      creditScoreUsed: creditScore
    },
    // DTI validation results
    dtiValidation
  };

  console.log('[calculateFullPayment] Final calculation result:', result);
  return result;
});

// DTI Calculation mutation for database operations
export const insertDTICalculation = mutation({
  args: {
    borrowerProfileId: v.id("borrowerProfiles"),
    request: v.object({
      annualIncome: v.number(),
      monthlyDebts: v.number(),
      loanType: v.string(),
      fico: v.number(),
      ltv: v.number(),
      factors: v.object({}),
      proposedPITI: v.optional(v.number()),
      propertyTaxRate: v.optional(v.number()),
      annualInsurance: v.optional(v.number()),
      downPaymentPercent: v.optional(v.number()),
      pmiRate: v.optional(v.number()),
      interestRate: v.optional(v.number()),
      termYears: v.optional(v.number()),
    }),
    response: v.object({
      allowed: v.object({
        frontEnd: v.number(),
        backEnd: v.number(),
      }),
      actual: v.object({
        frontEnd: v.number(),
        backEnd: v.number(),
      }),
      maxPITI: v.number(),
      strongFactorCount: v.number(),
      flags: v.array(v.string()),
      enhancedFactors: v.object({}),
      calculationDetails: v.object({
        monthlyIncome: v.number(),
        maxHousingPayment: v.number(),
        availableAfterDebts: v.number(),
        factorAdjustments: v.array(v.string()),
      }),
    }),
    timestamp: v.number(),
    schemaVersion: v.optional(v.number()),
  },
  handler: async ({ db }, args) => {
    return await db.insert('dtiCalculations', args);
  },
});