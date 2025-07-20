import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { callKimi } from "./utils/kimi"; // Use Kimi now
import { isFresh, TTL } from "./utils/fresh";
import { buildBankratePrompt, buildBankrateLegacyPrompt } from "./shared/prompts";

/* Cache query – returns per-$1000 rate */
export const getInsuranceRate = query(
  async ({ db }, { state }: { state: string }) => {
    const row = await db
      .query("insuranceRates")
      .filter((q) => q.eq(q.field("state"), state))
      .first();
    if (row && isFresh(row.timestamp, TTL.INSURANCE_QUARTERLY)) {
      return row.per1000Rate;
    }
    return null;
  }
);

/* New query specifically for per-$1000 rates */
export const getPer1000Rate = query(
  async ({ db }, { state }: { state: string }) => {
    const row = await db
      .query("insuranceRates")
      .filter((q) => q.eq(q.field("state"), state))
      .first();
    if (row && isFresh(row.timestamp, TTL.INSURANCE_QUARTERLY)) {
      return row.per1000Rate;
    }
    return null;
  }
);

/* Enhanced upsert mutation - supports both legacy rate and per1000Rate */
export const storeInsuranceRate = mutation(
  async ({ db }, { state, rate, per1000Rate }: { 
    state: string; 
    rate?: number;          // Legacy: annual premium
    per1000Rate?: number;   // New: rate per $1,000 coverage
  }) => {
    if (!rate && !per1000Rate) {
      throw new Error("Either rate or per1000Rate must be provided");
    }
    
    const now = Date.now();
    const existing = await db
      .query("insuranceRates")
      .filter((q) => q.eq(q.field("state"), state))
      .first();
      
    const updateData: any = { timestamp: now };
    if (rate !== undefined) updateData.rate = rate;
    if (per1000Rate !== undefined) updateData.per1000Rate = per1000Rate;
    
    if (existing) {
      await db.patch(existing._id, updateData);
    } else {
      await db.insert("insuranceRates", { 
        state,
        rate: rate ?? 0, // Required field for backward compatibility
        ...updateData
      });
    }
  }
);

/* Action – fetch per-$1000 rate with fallback to legacy */
export const getFreshInsuranceRate = action(
  async ({ runQuery, runMutation }, { state, stateName }: { state: string; stateName: string }): Promise<number> => {
    console.log(`[getFreshInsuranceRate] Starting for state: ${state} (${stateName})`);
    
    const cached = await runQuery(api.insuranceRates.getInsuranceRate, { state });
    if (cached !== null) {
      console.log(`[getFreshInsuranceRate] Using cached rate: ${cached} per $1000`);
      return cached;
    }

    console.log(`[getFreshInsuranceRate] No cache found, fetching fresh rate with Kimi...`);

    // Try new per-$1000 approach first
    try {
      const parsed = await callKimi(buildBankratePrompt(stateName), { 
        jsonSchema: { premium: "number", coverage: "number" } 
      });
      console.log('[getFreshInsuranceRate] Primary Kimi response:', parsed);

      if (parsed && !parsed.error && typeof parsed.premium === "number" && typeof parsed.coverage === "number" && parsed.coverage > 0) {
        console.log(`[getFreshInsuranceRate] Calculating primary per-1000 rate from premium: ${parsed.premium} and coverage: ${parsed.coverage}`);
        const per1000Rate = parsed.premium / (parsed.coverage / 1000);

        if (per1000Rate > 0 && per1000Rate < 50) {
          console.log(`[getFreshInsuranceRate] Successfully calculated per-$1000 rate: ${per1000Rate.toFixed(2)}`);
          
          await runMutation(api.insuranceRates.storeInsuranceRate, { 
            state, 
            rate: parsed.premium,
            per1000Rate 
          });
          return per1000Rate;
        } else {
          console.warn(`[getFreshInsuranceRate] Calculated per-$1000 rate of ${per1000Rate.toFixed(2)} is unreasonable. Falling back.`);
        }
      } else {
        console.warn('[getFreshInsuranceRate] Primary Kimi response was invalid or had an error. Falling back.', parsed);
      }
    } catch (error) {
      console.warn(`[getFreshInsuranceRate] Per-$1000 fetch failed for ${state}, falling back to legacy: ${(error as Error).message}`);
    }

    // Fallback to legacy approach
    console.log(`[getFreshInsuranceRate] Attempting legacy approach for ${stateName} with Kimi...`);
    const legacyParsed = await callKimi(buildBankrateLegacyPrompt(stateName), { 
      jsonSchema: { premium: "number" } 
    });
    console.log('[getFreshInsuranceRate] Legacy Kimi response:', legacyParsed);

    if (legacyParsed && !legacyParsed.error && typeof legacyParsed.premium === "number" && Number.isFinite(legacyParsed.premium)) {
      const annualPremium = legacyParsed.premium;
      console.log(`[getFreshInsuranceRate] Calculating legacy per-1000 rate from annual premium: ${annualPremium}, assuming $300k coverage.`);
      const per1000Rate = annualPremium / 300;

      if (per1000Rate > 0 && per1000Rate < 50) {
        console.log(`[getFreshInsuranceRate] Legacy rate retrieved: ${annualPremium}, converted to per-$1000 rate: ${per1000Rate.toFixed(2)}`);
        
        await runMutation(api.insuranceRates.storeInsuranceRate, { 
          state, 
          rate: annualPremium,
          per1000Rate: per1000Rate
        });
        
        return per1000Rate;
      } else {
        console.error(`[getFreshInsuranceRate] Unreasonable per-$1000 rate in fallback: ${per1000Rate.toFixed(2)} from annual premium ${annualPremium}`);
        throw new Error(`Calculated unreasonable insurance rate for ${stateName}`);
      }
    }

    console.error(`[getFreshInsuranceRate] Legacy Kimi fetch failed for ${stateName}:`, legacyParsed?.error || 'Invalid or missing premium in response');
    throw new Error(`Unable to retrieve insurance rate for ${stateName}`);
  }
);

/* Utility: Calculate annual insurance premium from per-$1000 rate */
export function calculateAnnualInsurance(per1000Rate: number, homeValue: number): number {
  if (homeValue <= 0) throw new Error("Home value must be positive");
  if (per1000Rate < 0) throw new Error("Per-$1000 rate must be non-negative");
  return (homeValue / 1000) * per1000Rate;
}
