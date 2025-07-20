/**
 * Hooks Index
 * 
 * Barrel export for all DTI-related hooks
 */

export { useDTICalculation } from './useDTICalculation';
export { useBorrowingPower } from './useBorrowingPower';
export { useCompensatingFactors } from './useCompensatingFactors';

// Type-only exports for hook configurations
import { useDTICalculation } from './useDTICalculation';
import { useBorrowingPower } from './useBorrowingPower';

export type UseDTICalculationOptions = Parameters<typeof useDTICalculation>[0];
export type UseDTICalculationReturn = ReturnType<typeof useDTICalculation>;
export type UseBorrowingPowerOptions = Parameters<typeof useBorrowingPower>[0];
export type UseBorrowingPowerReturn = ReturnType<typeof useBorrowingPower>;