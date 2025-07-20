import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useState } from "react";
import { DebtItems, CompensatingFactors } from "../lib/validations";

interface BorrowerProfileData {
  annualIncome: number;
  monthlyDebts: number;
  creditScore: number;
  zipCode: string;
  state: string;
  debtItems: DebtItems;
  compensatingFactors: CompensatingFactors;
}

interface UseBorrowerProfileReturn {
  // Queries
  profiles: any[] | undefined;
  currentProfile: any | undefined;
  mostRecentProfile: any | undefined;
  isLoading: boolean;
  
  // Mutations
  createProfile: (data: BorrowerProfileData) => Promise<Id<"borrowerProfiles">>;
  updateProfile: (id: Id<"borrowerProfiles">, data: Partial<BorrowerProfileData>) => Promise<void>;
  deleteProfile: (id: Id<"borrowerProfiles">) => Promise<void>;
  upsertProfile: (data: BorrowerProfileData) => Promise<Id<"borrowerProfiles">>;
  
  // State
  selectedProfileId: Id<"borrowerProfiles"> | null;
  setSelectedProfileId: (id: Id<"borrowerProfiles"> | null) => void;
  
  // Error handling
  error: Error | null;
}

export function useBorrowerProfile(): UseBorrowerProfileReturn {
  const [selectedProfileId, setSelectedProfileId] = useState<Id<"borrowerProfiles"> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Queries
  const profiles = useQuery(api.borrowerProfiles.getAll);
  const currentProfile = useQuery(
    api.borrowerProfiles.getById,
    selectedProfileId ? { id: selectedProfileId } : "skip"
  );
  const mostRecentProfile = useQuery(api.borrowerProfiles.getMostRecent);
  
  // Mutations
  const createMutation = useMutation(api.borrowerProfiles.create);
  const updateMutation = useMutation(api.borrowerProfiles.update);
  const deleteMutation = useMutation(api.borrowerProfiles.remove);
  const upsertMutation = useMutation(api.borrowerProfiles.upsert);
  
  // Wrapped mutations with error handling
  const createProfile = useCallback(async (data: BorrowerProfileData) => {
    try {
      setError(null);
      const profileId = await createMutation(data);
      setSelectedProfileId(profileId);
      return profileId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [createMutation]);
  
  const updateProfile = useCallback(async (
    id: Id<"borrowerProfiles">,
    data: Partial<BorrowerProfileData>
  ) => {
    try {
      setError(null);
      await updateMutation({ id, ...data });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [updateMutation]);
  
  const deleteProfile = useCallback(async (id: Id<"borrowerProfiles">) => {
    try {
      setError(null);
      await deleteMutation({ id });
      if (selectedProfileId === id) {
        setSelectedProfileId(null);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [deleteMutation, selectedProfileId]);
  
  const upsertProfile = useCallback(async (data: BorrowerProfileData) => {
    try {
      setError(null);
      const profileId = await upsertMutation(data);
      setSelectedProfileId(profileId);
      return profileId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [upsertMutation]);
  
  const isLoading = profiles === undefined && 
                    (selectedProfileId ? currentProfile === undefined : true);
  
  return {
    // Queries
    profiles,
    currentProfile,
    mostRecentProfile,
    isLoading,
    
    // Mutations
    createProfile,
    updateProfile,
    deleteProfile,
    upsertProfile,
    
    // State
    selectedProfileId,
    setSelectedProfileId,
    
    // Error handling
    error,
  };
}

// Hook for managing DTI calculations related to a borrower profile
export function useDTICalculations(borrowerProfileId: Id<"borrowerProfiles"> | null) {
  const [error, setError] = useState<Error | null>(null);
  
  // Queries
  const calculations = useQuery(
    api.dtiCalculations.getByBorrowerProfile,
    borrowerProfileId ? { borrowerProfileId } : "skip"
  );
  
  const mostRecentCalculation = useQuery(
    api.dtiCalculations.getMostRecentForBorrower,
    borrowerProfileId ? { borrowerProfileId } : "skip"
  );
  
  const statistics = useQuery(
    api.dtiCalculations.getStatistics,
    borrowerProfileId ? { borrowerProfileId } : "skip"
  );
  
  // Mutations
  const createCalculation = useMutation(api.dtiCalculations.create);
  const deleteCalculation = useMutation(api.dtiCalculations.remove);
  const deleteAllCalculations = useMutation(api.dtiCalculations.removeAllForBorrower);
  
  // Wrapped mutations with error handling
  const recordCalculation = useCallback(async (
    request: any,
    response: any
  ) => {
    if (!borrowerProfileId) {
      throw new Error("No borrower profile selected");
    }
    
    try {
      setError(null);
      const calculationId = await createCalculation({
        borrowerProfileId,
        request,
        response,
      });
      return calculationId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [createCalculation, borrowerProfileId]);
  
  const removeCalculation = useCallback(async (id: Id<"dtiCalculations">) => {
    try {
      setError(null);
      await deleteCalculation({ id });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [deleteCalculation]);
  
  const clearAllCalculations = useCallback(async () => {
    if (!borrowerProfileId) {
      throw new Error("No borrower profile selected");
    }
    
    try {
      setError(null);
      const result = await deleteAllCalculations({ borrowerProfileId });
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [deleteAllCalculations, borrowerProfileId]);
  
  return {
    // Queries
    calculations,
    mostRecentCalculation,
    statistics,
    isLoading: calculations === undefined,
    
    // Mutations
    recordCalculation,
    removeCalculation,
    clearAllCalculations,
    
    // Error handling
    error,
  };
}