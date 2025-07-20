import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { callGrok } from "./utils/grok";
import { isFresh, TTL } from "./utils/fresh";
import { buildHomesteadPrimaryPrompt, buildHomesteadVerifyPrompt } from "./shared/prompts";

// Map for state names to improve search prompts
export const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
};

export const getExemption = query(
  async ({ db }, { state }: { state: string }) => {
    const row = await db
      .query("homesteadExemptions")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    if (row && isFresh(row.timestamp, TTL.TAX_ANNUAL)) {
      return row;
    }
    return null;
  }
);

export const storeExemption = mutation(
  async (
    { db },
    {
      state,
      exemptionType,
      exemptionValue,
      source,
      needsReview,
      notes,
    }: {
      state: string;
      exemptionType: "percentage" | "dollar" | "none";
      exemptionValue: number;
      source: string;
      needsReview: boolean;
      notes?: string;
    }
  ) => {
    const now = Date.now();
    const existing = await db
      .query("homesteadExemptions")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    const row = {
      state,
      exemptionType,
      exemptionValue,
      source,
      timestamp: now,
      needsReview,
      notes,
    };
    if (existing) {
      await db.replace(existing._id, row);
    } else {
      await db.insert("homesteadExemptions", row);
    }
  }
);

export const getFreshExemption = action(
  async ({ runQuery, runMutation }, { state, stateNameOverride }: { state: string; stateNameOverride?: string }): Promise<{ exemptionType: "percentage" | "dollar" | "none"; exemptionValue: number; source: string; needsReview: boolean; notes?: string }> => {
    const cached = await runQuery(api.homestead.getExemption, { state });
    if (cached) return cached;

    const stateName = stateNameOverride || STATE_NAMES[state.toUpperCase()];
    if (!stateName) throw new Error(`Unknown state: ${state}`);

    // Primary search
    const prim = await callGrok(buildHomesteadPrimaryPrompt(stateName), { jsonSchema: { type: "string", value: "number", source: "string", notes: "string" } });

    // Verification search
    const ver = await callGrok(buildHomesteadVerifyPrompt(stateName), { jsonSchema: { type: "string", value: "number", source: "string", notes: "string" } });

    // Determine needsReview
    let needsReview = !!prim.notes || !!ver.notes || prim.type !== ver.type;
    if (!needsReview && prim.type === "percentage") {
      needsReview = Math.abs(prim.value - ver.value) > 0.002;
    } else if (!needsReview && prim.type === "dollar") {
      needsReview = Math.abs(prim.value - ver.value) > 500;
    }

    // Combine notes
    const finalNotes = [prim.notes, ver.notes].filter(Boolean).join('; Verification: ');

    await runMutation(api.homestead.storeExemption, {
      state,
      exemptionType: prim.type,
      exemptionValue: prim.value,
      source: prim.source,
      needsReview,
      notes: finalNotes,
    });

    return { exemptionType: prim.type, exemptionValue: prim.value, source: prim.source, needsReview, notes: finalNotes };
  }
);


// Test action for validation
export const testExemptions = action(
  async ({ runAction }, { states }: { states: string[] }): Promise<Array<{ state: string; exemptionType?: string; exemptionValue?: number; source?: string; needsReview?: boolean; notes?: string; error?: string }>> => {
    const results = [];
    for (const state of states) {
      try {
        const exemption = await runAction(api.homestead.getFreshExemption, { state });
        results.push({ state, ...exemption });
      } catch (error) {
        results.push({ state, error: (error as Error).message });
      }
    }
    return results;
  }
);