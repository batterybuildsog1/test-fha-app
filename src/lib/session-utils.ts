/**
 * Session Management Utilities
 * 
 * Utilities for managing DTI wizard sessions including
 * URL parameters, session validation, and data migration.
 */

/**
 * Get session ID from URL parameters
 */
export function getSessionIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('session');
}

/**
 * Update URL with session ID
 */
export function updateUrlWithSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.set('session', sessionId);
  window.history.replaceState({}, '', url.toString());
}

/**
 * Remove session ID from URL
 */
export function removeSessionIdFromUrl(): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete('session');
  window.history.replaceState({}, '', url.toString());
}

/**
 * Generate shareable session URL
 */
export function generateShareableUrl(sessionId: string): string {
  if (typeof window === 'undefined') return '';
  
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('session', sessionId);
  return url.toString();
}

/**
 * Validate session data against current schema
 */
export function validateSessionData(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required structure
  if (!data || typeof data !== 'object') {
    errors.push('Invalid session data format');
    return { isValid: false, errors };
  }

  // Validate income data if present
  if (data.income) {
    if (data.income.annualIncome !== undefined && 
        (typeof data.income.annualIncome !== 'number' || data.income.annualIncome < 0)) {
      errors.push('Invalid annual income');
    }
    if (data.income.employmentType && 
        !['w2', 'self-employed', '1099', 'retired'].includes(data.income.employmentType)) {
      errors.push('Invalid employment type');
    }
  }

  // Validate debts if present
  if (data.debts && !Array.isArray(data.debts)) {
    errors.push('Debts must be an array');
  } else if (data.debts) {
    data.debts.forEach((debt: any, index: number) => {
      if (!debt.id || !debt.type || !debt.name || typeof debt.monthlyPayment !== 'number') {
        errors.push(`Invalid debt item at index ${index}`);
      }
    });
  }

  // Validate credit info if present
  if (data.creditInfo) {
    if (data.creditInfo.creditScore !== undefined) {
      const score = data.creditInfo.creditScore;
      if (typeof score !== 'number' || score < 300 || score > 850) {
        errors.push('Credit score must be between 300 and 850');
      }
    }
    if (data.creditInfo.loanType && 
        !['fha', 'va', 'conventional', 'usda'].includes(data.creditInfo.loanType)) {
      errors.push('Invalid loan type');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Migrate session data to current schema version
 */
export function migrateSessionData(data: any, fromVersion: string = '1.0'): any {
  // Currently only version 1.0 exists
  // This function will handle future migrations
  
  if (fromVersion === '1.0') {
    return data; // No migration needed
  }

  // Future migration logic would go here
  console.warn(`Unknown session data version: ${fromVersion}`);
  return data;
}

/**
 * Format session data for display
 */
export function formatSessionSummary(sessionData: any): {
  title: string;
  subtitle: string;
  progress: number;
  lastUpdated: string;
} {
  const { currentStep = 0, completedSteps = [], updatedAt, data = {} } = sessionData;
  
  // Calculate progress
  const totalSteps = 5; // Based on DEFAULT_STEPS in DTIWizard
  const progress = Math.round(((completedSteps.length + 1) / totalSteps) * 100);
  
  // Generate title based on data
  let title = 'DTI Wizard Session';
  if (data.income?.annualIncome) {
    title = `Income: $${data.income.annualIncome.toLocaleString()}/year`;
  }
  
  // Generate subtitle
  let subtitle = `Step ${currentStep + 1} of ${totalSteps}`;
  if (sessionData.isComplete) {
    subtitle = 'Completed';
  }
  
  // Format last updated
  const lastUpdated = updatedAt 
    ? new Date(updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Unknown';
  
  return {
    title,
    subtitle,
    progress,
    lastUpdated,
  };
}

/**
 * Check if session is expired
 */
export function isSessionExpired(updatedAt: number, expiryDays: number = 30): boolean {
  const expiryMs = expiryDays * 24 * 60 * 60 * 1000;
  return Date.now() - updatedAt > expiryMs;
}

/**
 * Generate session analytics data
 */
export function getSessionAnalytics(sessionData: any): {
  completionRate: number;
  timeSpent: number;
  stepsCompleted: number;
  hasIncome: boolean;
  hasDebts: boolean;
  hasCredit: boolean;
  hasResults: boolean;
} {
  const { createdAt, updatedAt, completedSteps = [], data = {} } = sessionData;
  
  return {
    completionRate: Math.round((completedSteps.length / 5) * 100),
    timeSpent: updatedAt && createdAt ? updatedAt - createdAt : 0,
    stepsCompleted: completedSteps.length,
    hasIncome: !!data.income?.annualIncome,
    hasDebts: !!(data.debts && data.debts.length > 0),
    hasCredit: !!data.creditInfo?.creditScore,
    hasResults: !!data.results,
  };
}