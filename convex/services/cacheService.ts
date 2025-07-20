/**
 * Cache Service - Centralized TTL Logic
 * 
 * Provides caching mechanisms for DTI calculations and external API calls
 * with configurable TTL (Time-To-Live) policies.
 */

import { Doc } from "../_generated/dataModel";
import { CompensatingFactors } from "../domain/types";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // TTL in milliseconds
  key: string;
}

export interface CachePolicy {
  defaultTTL: number;
  maxTTL: number;
  enableCache: boolean;
}

// Cache policies for different data types
export const CACHE_POLICIES = {
  DTI_CALCULATIONS: {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxTTL: 2 * 60 * 60 * 1000, // 2 hours
    enableCache: true
  },
  BORROWER_PROFILES: {
    defaultTTL: 60 * 60 * 1000, // 1 hour
    maxTTL: 24 * 60 * 60 * 1000, // 24 hours
    enableCache: true
  },
  EXTERNAL_API: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxTTL: 15 * 60 * 1000, // 15 minutes
    enableCache: true
  },
  LOAN_PRODUCTS: {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    enableCache: true
  }
} as const;

export const cacheService = {
  /**
   * Check if a cache entry is still fresh
   */
  isFresh<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < entry.ttl;
  },

  /**
   * Check if a DTI calculation is still fresh
   */
  isDTICalculationFresh(calculation: Doc<"dtiCalculations">, ttlMinutes: number = 30): boolean {
    const now = Date.now();
    const age = now - calculation.timestamp;
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    return age < ttl;
  },

  /**
   * Check if a borrower profile is still fresh
   */
  isBorrowerProfileFresh(profile: Doc<"borrowerProfiles">, ttlMinutes: number = 60): boolean {
    const now = Date.now();
    const age = now - profile.updatedAt;
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    return age < ttl;
  },

  /**
   * Create a cache key for DTI calculations
   */
  createDTIKey(
    annualIncome: number,
    monthlyDebts: number,
    loanType: string,
    fico: number,
    ltv: number,
    factors: CompensatingFactors
  ): string {
    const factorsKey = Object.entries(factors)
      .filter(([_, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return `dti:${annualIncome}:${monthlyDebts}:${loanType}:${fico}:${ltv}:${factorsKey}`;
  },

  /**
   * Create a cache key for borrower profiles
   */
  createBorrowerKey(
    annualIncome: number,
    monthlyDebts: number,
    creditScore: number,
    zipCode: string,
    state: string
  ): string {
    return `borrower:${annualIncome}:${monthlyDebts}:${creditScore}:${zipCode}:${state}`;
  },

  /**
   * Create a cache key for external API calls
   */
  createApiKey(endpoint: string, params: Record<string, any>): string {
    const paramsKey = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return `api:${endpoint}:${paramsKey}`;
  },

  /**
   * Validate cache policy
   */
  validateCachePolicy(policy: CachePolicy): boolean {
    return (
      policy.defaultTTL > 0 &&
      policy.maxTTL > 0 &&
      policy.defaultTTL <= policy.maxTTL &&
      typeof policy.enableCache === 'boolean'
    );
  },

  /**
   * Get cache policy by type
   */
  getCachePolicy(type: keyof typeof CACHE_POLICIES): CachePolicy {
    return CACHE_POLICIES[type];
  },

  /**
   * Calculate cache expiration time
   */
  calculateExpiration(ttlMs: number): number {
    return Date.now() + ttlMs;
  },

  /**
   * Check if cache is enabled for a specific type
   */
  isCacheEnabled(type: keyof typeof CACHE_POLICIES): boolean {
    return CACHE_POLICIES[type].enableCache;
  },

  /**
   * Get time until cache expires
   */
  getTimeUntilExpiration(timestamp: number, ttlMs: number): number {
    const expiration = timestamp + ttlMs;
    return Math.max(0, expiration - Date.now());
  },

  /**
   * Clean up expired cache entries (utility function)
   */
  isExpired(timestamp: number, ttlMs: number): boolean {
    return Date.now() > (timestamp + ttlMs);
  },

  /**
   * Create cache entry
   */
  createCacheEntry<T>(
    data: T,
    key: string,
    ttlMs: number = CACHE_POLICIES.DTI_CALCULATIONS.defaultTTL
  ): CacheEntry<T> {
    return {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      key
    };
  },

  /**
   * Cache statistics helper
   */
  getCacheStats(entries: CacheEntry<any>[]): {
    total: number;
    fresh: number;
    expired: number;
    hitRate: number;
  } {
    const now = Date.now();
    const fresh = entries.filter(entry => now - entry.timestamp < entry.ttl).length;
    const expired = entries.length - fresh;
    const hitRate = entries.length > 0 ? (fresh / entries.length) * 100 : 0;

    return {
      total: entries.length,
      fresh,
      expired,
      hitRate: Math.round(hitRate * 100) / 100
    };
  },

  /**
   * Hash function for creating shorter cache keys
   */
  hashKey(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  },

  /**
   * Circuit breaker pattern for cache failures
   */
  circuitBreaker: {
    failures: 0,
    lastFailure: 0,
    threshold: 5,
    timeout: 60000, // 1 minute
    
    recordFailure(): void {
      this.failures++;
      this.lastFailure = Date.now();
    },
    
    recordSuccess(): void {
      this.failures = 0;
    },
    
    isOpen(): boolean {
      return this.failures >= this.threshold && 
             (Date.now() - this.lastFailure) < this.timeout;
    },
    
    reset(): void {
      this.failures = 0;
      this.lastFailure = 0;
    }
  }
};

export default cacheService;