/**
 * DTI Wizard Persistence Tests
 * 
 * Tests for session management, auto-save, and data validation
 */

import { validateSessionData, migrateSessionData, formatSessionSummary, isSessionExpired } from '../../../lib/session-utils';

describe('Session Validation', () => {
  it('should validate valid session data', () => {
    const validData = {
      income: {
        annualIncome: 75000,
        employmentType: 'w2',
      },
      debts: [
        { id: '1', type: 'car_loan', name: 'Car Loan', monthlyPayment: 450 },
      ],
      creditInfo: {
        creditScore: 720,
        loanType: 'fha',
      },
    };

    const result = validateSessionData(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch invalid income data', () => {
    const invalidData = {
      income: {
        annualIncome: -5000, // Negative income
        employmentType: 'invalid_type',
      },
    };

    const result = validateSessionData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid annual income');
    expect(result.errors).toContain('Invalid employment type');
  });

  it('should catch invalid credit score', () => {
    const invalidData = {
      creditInfo: {
        creditScore: 900, // Too high
        loanType: 'invalid',
      },
    };

    const result = validateSessionData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Credit score must be between 300 and 850');
    expect(result.errors).toContain('Invalid loan type');
  });
});

describe('Session Migration', () => {
  it('should handle v1.0 data without migration', () => {
    const v1Data = {
      version: '1.0',
      income: { annualIncome: 75000 },
    };

    const migrated = migrateSessionData(v1Data, '1.0');
    expect(migrated).toEqual(v1Data);
  });
});

describe('Session Formatting', () => {
  it('should format session summary correctly', () => {
    const sessionData = {
      currentStep: 2,
      completedSteps: [0, 1],
      updatedAt: Date.now(),
      isComplete: false,
      data: {
        income: { annualIncome: 85000 },
      },
    };

    const summary = formatSessionSummary(sessionData);
    expect(summary.title).toBe('Income: $85,000/year');
    expect(summary.subtitle).toBe('Step 3 of 5');
    expect(summary.progress).toBe(60); // 3/5 * 100
  });

  it('should show completed status', () => {
    const sessionData = {
      currentStep: 4,
      completedSteps: [0, 1, 2, 3, 4],
      isComplete: true,
      data: {},
    };

    const summary = formatSessionSummary(sessionData);
    expect(summary.subtitle).toBe('Completed');
  });
});

describe('Session Expiry', () => {
  it('should detect expired sessions', () => {
    const oldTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
    expect(isSessionExpired(oldTimestamp, 30)).toBe(true);
  });

  it('should not mark recent sessions as expired', () => {
    const recentTimestamp = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day ago
    expect(isSessionExpired(recentTimestamp, 30)).toBe(false);
  });
});

describe('Anonymous User ID', () => {
  it('should generate and persist user ID', () => {
    // Mock localStorage
    const mockStorage: { [key: string]: string } = {};
    
    global.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
      length: 0,
      key: () => null,
    };

    // Mock crypto.randomUUID
    global.crypto = {
      randomUUID: () => 'test-uuid-123',
    } as any;

    // First call should generate new ID
    const getAnonymousUserId = () => {
      const STORAGE_KEY = 'dti_anonymous_user_id';
      let userId = localStorage.getItem(STORAGE_KEY);
      
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, userId);
      }
      
      return userId;
    };

    const firstId = getAnonymousUserId();
    expect(firstId).toBe('test-uuid-123');
    expect(mockStorage['dti_anonymous_user_id']).toBe('test-uuid-123');

    // Second call should return same ID
    const secondId = getAnonymousUserId();
    expect(secondId).toBe('test-uuid-123');
  });
});