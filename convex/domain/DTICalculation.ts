/**
 * DTI Calculation Domain Entity
 * 
 * Represents a DTI calculation with audit trail and versioning support.
 * Stores both the request and response for compliance and debugging.
 */

import { DTIRequest, DTIResponse } from "./types";

export interface DTICalculation {
  id: string;
  borrowerProfileId: string;
  request: DTIRequest;
  response: DTIResponse;
  timestamp: number;
  schemaVersion?: number;
}

export interface DTICalculationCreate {
  borrowerProfileId: string;
  request: DTIRequest;
  response: DTIResponse;
  schemaVersion?: number;
}

// Helper functions for DTICalculation
export const createDTICalculation = (
  data: DTICalculationCreate
): Omit<DTICalculation, 'id'> => ({
  ...data,
  timestamp: Date.now(),
  schemaVersion: data.schemaVersion || 1,
});

export const isCalculationRecent = (
  calculation: DTICalculation,
  maxAgeMinutes: number = 30
): boolean => {
  const ageMs = Date.now() - calculation.timestamp;
  const ageMinutes = ageMs / (1000 * 60);
  return ageMinutes <= maxAgeMinutes;
};

export const getCalculationSummary = (calculation: DTICalculation) => ({
  id: calculation.id,
  borrowerProfileId: calculation.borrowerProfileId,
  loanType: calculation.request.loanType,
  maxPITI: calculation.response.maxPITI,
  frontEndDTI: calculation.response.actual.frontEnd,
  backEndDTI: calculation.response.actual.backEnd,
  strongFactorCount: calculation.response.strongFactorCount,
  timestamp: calculation.timestamp,
  flags: calculation.response.flags,
});