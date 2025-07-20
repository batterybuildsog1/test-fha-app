import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { isFresh, TTL } from "./utils/fresh";
import { applyExemption } from "./utils/tax";
import { callApiNinjas } from "./utils/ninjas";


/* Query – cached raw rate if < 365 days */
export const getRawPropertyTax = query(async ({ db }, { zip }: { zip: string }) => {
  const row = await db
    .query("propertyTaxRates")
    .filter((q) => q.eq(q.field("zipCode"), zip))
    .first();
  if (row && isFresh(row.timestamp, TTL.TAX_ANNUAL)) {
    return row.rawTaxRate;
  }
  return null;
});

/* Mutation – upsert raw rate */
export const storeRawPropertyTax = mutation(
  async ({ db }, { zip, rate }: { zip: string; rate: number }) => {
    const now = Date.now();
    const existing = await db
      .query("propertyTaxRates")
      .filter((q) => q.eq(q.field("zipCode"), zip))
      .first();

    if (existing) {
      await db.patch(existing._id, { rawTaxRate: rate, timestamp: now });
    } else {
      await db.insert("propertyTaxRates", { zipCode: zip, rawTaxRate: rate, timestamp: now });
    }
  }
);


/* Calculate effective property tax rate with homestead exemptions */
const calculateEffectiveRate = async (
  rawRate: number, 
  state: string, 
  homeValue: number,
  runAction: any // From action context
): Promise<{ rate: number; exemptionApplied: boolean; notes?: string }> => {
  const exemptionData = await runAction(api.homestead.getFreshExemption, { state });
  const exemption = { type: exemptionData.exemptionType, value: exemptionData.exemptionValue };
  const result = applyExemption(rawRate, exemption, homeValue);
  
  let notes = result.notes;
  if (exemptionData.needsReview) {
    notes = (notes ? notes + '; ' : '') + 'Exemption flagged for review: ' + exemptionData.notes;
  }
  
  return { rate: result.effectiveRate, exemptionApplied: result.applied, notes };
};

/* Action – fetch fresh effective rate (requires homeValue; stores rawRate) */
export const getFreshPropertyTax = action(
  async ({ runQuery, runMutation, runAction }, { zip, state, homeValue }: { zip: string; state: string; homeValue: number }): Promise<number> => {
    console.log(`[getFreshPropertyTax] Starting for ZIP: ${zip}, state: ${state}, home value: ${homeValue.toLocaleString()}`);
    
    if (homeValue <= 0) throw new Error("Home value required and must be positive");

    let rawRate: number | null = await runQuery(api.propertyTax.getRawPropertyTax, { zip });
    
    if (rawRate === null) {
      console.log(`[getFreshPropertyTax] No cached rate found, fetching from API Ninjas...`);
      
      try {
        const resp = await callApiNinjas("propertytax", { zip });
        console.log(`[getFreshPropertyTax] Raw API Ninjas response for ZIP ${zip}:`, JSON.stringify(resp, null, 2));

        if (!Array.isArray(resp) || resp.length === 0) {
          throw new Error(`API returned no data or an invalid format.`);
        }

        const firstValidResult = resp.find(r => r && typeof r.property_tax_50th_percentile === 'number' && Number.isFinite(r.property_tax_50th_percentile));

        if (!firstValidResult) {
          throw new Error(`API response did not contain a valid 'property_tax_50th_percentile'.`);
        }

        const newRate = firstValidResult.property_tax_50th_percentile;
        
        console.log(`[getFreshPropertyTax] Retrieved and validated raw rate for ZIP ${zip}: ${(newRate * 100).toFixed(3)}%`);
        
        await runMutation(api.propertyTax.storeRawPropertyTax, { zip, rate: newRate });
        rawRate = newRate;

      } catch (error) {
        console.error(`[getFreshPropertyTax] API call or processing failed for ZIP ${zip}:`, (error as Error).message);
        throw new Error(`Unable to retrieve property tax rate. Please try a different ZIP code.`);
      }
    } else {
      console.log(`[getFreshPropertyTax] Using cached raw rate: ${(rawRate * 100).toFixed(3)}%`);
    }
    
    // This is the final, definitive check. If after all operations, rawRate is still not a number, fail loudly.
    if (typeof rawRate !== 'number') {
      throw new Error("Failed to obtain a valid raw tax rate after all attempts.");
    }

    const { rate: effectiveRate, notes } = await calculateEffectiveRate(rawRate, state, homeValue, runAction);
    
    if (notes) {
      console.log(`Tax calculation notes for ${zip}, ${state}: ${notes}`);
    }

    return effectiveRate;
  }
);

