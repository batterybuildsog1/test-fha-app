import { query, action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { callGrok } from "./utils/grok";
import { isFresh, TTL } from "./utils/fresh";
import { buildFHARatePrompt } from "./shared/prompts";

/* -------------------------------------------------------------
 * Query: return cached FHA rate if it's fresh (< 24 h), else null
 * ----------------------------------------------------------- */
export const getFHARates = query(async ({ db }) => {
  const cached = await db
    .query("fhaRates")
    .filter((q) => q.eq(q.field("key"), "current"))
    .first();

  if (cached && isFresh(cached.timestamp, TTL.RATES_DAILY)) {
    return cached.rate;
  }
  return null;
});

/* ------------------------------------------
 * Mutation: upsert the current FHA rate cache
 * ---------------------------------------- */
export const storeFHARate = mutation(
  async ({ db }, { rate }: { rate: number }) => {
    const now = Date.now();
    const existing = await db
      .query("fhaRates")
      .filter((q) => q.eq(q.field("key"), "current"))
      .first();

    if (existing) {
      await db.patch(existing._id, { rate, timestamp: now });
    } else {
      await db.insert("fhaRates", { key: "current", rate, timestamp: now });
    }
  }
);

/* --------------------------------------------------------------
 * Action: return a fresh FHA rate (uses cache, else fetch & store)
 * ------------------------------------------------------------ */
export const getFreshFHARate = action(
  async ({ runQuery, runMutation }, _args): Promise<number> => {
    console.log(`[getFreshFHARate] Checking for FHA rate...`);
    
    /* 1️⃣ Use cache if still valid */
    const cached = await runQuery(api.getFHARates.getFHARates);
    if (cached !== null) {
      console.log(`[getFreshFHARate] Using cached rate: ${cached}%`);
      return cached;
    }

    /* 2️⃣ Fetch live rate via xAI Grok */
    console.log(`[getFreshFHARate] No cache found, fetching fresh rate from Grok...`);
    
    try {
      const parsed = await callGrok(buildFHARatePrompt(), { jsonSchema: { rate: "number" } });

      if (parsed.error) {
        console.error(`[getFreshFHARate] Grok API error:`, parsed.error);
        throw new Error(`Unable to fetch current FHA rate: ${parsed.error}`);
      }

      const rate = parsed.rate;
      if (typeof rate !== "number" || isNaN(rate)) {
        console.error(`[getFreshFHARate] Invalid rate returned:`, rate);
        throw new Error("Received invalid FHA rate from service");
      }

      if (rate < 3 || rate > 15) {
        console.warn(`[getFreshFHARate] Rate seems unusual: ${rate}% - might need verification`);
      }

      console.log(`[getFreshFHARate] Successfully fetched rate: ${rate}%`);

      /* 3️⃣ Cache & return */
      await runMutation(api.getFHARates.storeFHARate, { rate });
      return rate;
    } catch (error) {
      console.error(`[getFreshFHARate] Failed to fetch FHA rate:`, error);
      throw error instanceof Error ? error : new Error("Failed to fetch FHA rate");
    }
  }
);

/* Test action: force fresh fetch bypassing cache */
export const testFreshFetch = action(async ({ runMutation }, _args) => {
  const parsed = await callGrok(buildFHARatePrompt(), { jsonSchema: { rate: "number" } });

  if (parsed.error) {
    console.log("⚠️ Grok returned error:", parsed.error);
    throw new Error(`Grok API error: ${parsed.error}`);
  }

  const rate = parsed.rate;
  if (typeof rate !== "number" || isNaN(rate)) {
    console.log("❌ Invalid rate:", rate, typeof rate);
    throw new Error(`Invalid FHA rate returned: ${rate} (type: ${typeof rate})`);
  }

  await runMutation(api.getFHARates.storeFHARate, { rate });
  return rate;
});