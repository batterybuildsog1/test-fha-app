export function applyExemption(
  rawRate: number,
  exemption: { type: "percentage" | "dollar" | "none"; value: number },
  homeValue: number
): { effectiveRate: number; applied: boolean; notes?: string } {
  if (homeValue <= 0) throw new Error("Home value must be positive");

  if (exemption.type === "none") {
    return { effectiveRate: rawRate, applied: false };
  }

  let notes: string | undefined;
  let effectiveRate: number;

  if (exemption.type === "percentage") {
    effectiveRate = rawRate * (1 - exemption.value);
    return { effectiveRate, applied: true, notes };
  } else { // dollar
    const exemptValue = Math.min(exemption.value, homeValue);
    const taxableValue = Math.max(0, homeValue - exemptValue);
    effectiveRate = rawRate * (taxableValue / homeValue);
    if (exemptValue < exemption.value) {
      notes = "Exemption capped at home value";
    }
    return { effectiveRate, applied: exemptValue > 0, notes };
  }
}