export enum TTL {
  RATES_DAILY = 0.25,
  INSURANCE_QUARTERLY = 90,
  TAX_ANNUAL = 365,
}

export function isFresh(timestamp: number, ttlDays: TTL): boolean {
  return Date.now() - timestamp < ttlDays * 24 * 60 * 60 * 1000;
}