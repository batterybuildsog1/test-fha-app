# DTI Module Extraction & Refactor Plan
## Migrating DTI Calculator from Supabase to Convex Architecture

### Executive Summary

This document provides a comprehensive technical plan for extracting the DTI (Debt-to-Income) calculation module from the `homebuyer-empowerment-tool` (Supabase-based) and refactoring it for integration into the `test_FHA_APP` (Convex-based) architecture. The goal is to implement aggressive but compliant FHA/Conventional underwriting with maximum borrowing power calculations.

### DTI Module Analysis

#### Current DTI Architecture in Source App

**Core Engine Components:**
- `dtiEngine.ts` - Main calculation engine with 2025 guidelines
- `dtiCalculator.ts` - Wrapper functions for calculations
- `dtiStatusEvaluator.ts` - Status evaluation logic
- `compensatingFactorService.ts` - Compensating factors management
- `dtiLimitsCalculator.ts` - DTI limit calculations

**UI Components:**
- `CompensatingFactorsSection.tsx` - Factor selection interface
- `DebtItemsSection.tsx` - Debt input management
- `BorrowingPowerChart.tsx` - Borrowing power visualization
- `DTIWarningTooltip.tsx` - Warning display system

**Key Features:**
- 2025 FHA/Conventional guidelines compliance
- Tiered DTI limits (31/43 → 37/47 → 40/57)
- Bidirectional calculation (evaluation + solving)
- Comprehensive compensating factors
- Real-time validation with warnings

#### DTI Engine Flow Analysis

```typescript
// Current flow in legacy app
DTIRequest → dtiEngine.solveMaxPITI() → DTIResponse
├─ getAllowedLimits() - Calculate max DTI based on factors
├─ calculateConventionalLimits() - Conventional loan limits
├─ calculateFHALimits() - FHA loan limits with tiers
└─ solveMaxPITI() - Bidirectional solver
```

### Component Extraction Strategy

#### Phase 1: Core Engine Extraction

**Files to Extract (Backend Logic):**
1. `dtiEngine.ts` - Core calculation engine
2. `compensatingFactorService.ts` - Factor management
3. `dtiStatusEvaluator.ts` - Status evaluation
4. `dtiTypes.ts` - TypeScript interfaces
5. `compensatingFactorsDefinitions.ts` - Factor definitions
6. `creditUtils.ts` - Credit score utilities

**Extraction Process:**
- Remove React/browser dependencies
- Convert to pure TypeScript functions
- Update import paths for Convex environment
- Maintain all business logic intact

#### Phase 2: UI Component Extraction

**Components to Extract:**
1. `CompensatingFactorsSection.tsx` - Factor selection UI
2. `DebtItemsSection.tsx` - Debt management UI
3. `BorrowingPowerChart.tsx` - Borrowing power visualization
4. `DTIWarningTooltip.tsx` - Warning display
5. `DebtImpactList.tsx` - Debt impact analysis
6. `DebtIncomeBar.tsx` - Visual DTI bar

**Extraction Process:**
- Adapt to target UI framework (existing components use shadcn/ui)
- Remove Supabase dependencies
- Convert to Convex hooks (useQuery, useMutation, useAction)
- Update styling to match existing design system

### Convex Implementation Architecture

#### Service Layer Architecture

**New Convex Files Structure:**
```
convex/
├─ services/
│   ├─ dtiService.ts        # Pure DTI calculation functions
│   ├─ borrowingPowerService.ts  # Borrowing power calculations
│   ├─ loanProductService.ts     # Loan product strategy pattern
│   ├─ validationService.ts      # Input validation with Zod
│   └─ cacheService.ts          # Centralized TTL logic
├─ actions/
│   ├─ solveDTI.ts              # DTI calculation orchestration
│   ├─ calculateBorrowingPower.ts # Borrowing power orchestration
│   └─ evaluatePayment.ts       # Payment evaluation orchestration
├─ domain/
│   ├─ BorrowerProfile.ts       # Borrower domain entity
│   ├─ DTICalculation.ts        # DTI calculation domain model
│   ├─ LoanProduct.ts           # Loan product interfaces
│   └─ types.ts                 # Shared type definitions
├─ validators/
│   ├─ borrowerSchema.ts        # Borrower input validation
│   ├─ dtiSchema.ts             # DTI calculation validation
│   └─ loanSchema.ts            # Loan product validation
└─ config/
    └─ dtiLimits.ts            # DTI limits configuration
```

**Domain Entity Definitions:**
```typescript
// convex/domain/BorrowerProfile.ts
export interface BorrowerProfile {
  id: string;
  annualIncome: number;
  monthlyDebts: number;
  creditScore: number;
  zipCode: string;
  state: string;
  debtItems: DebtItems;
  compensatingFactors: CompensatingFactors;
  createdAt: number;
  updatedAt: number;
}

// convex/domain/DTICalculation.ts
export interface DTICalculation {
  id: string;
  borrowerProfileId: string;
  request: DTIRequest;
  response: DTIResponse;
  timestamp: number;
}

// convex/domain/LoanProduct.ts
export interface AbstractLoanProduct {
  type: 'fha' | 'conventional';
  calculateLimits(profile: BorrowerProfile): DTILimits;
  validateQualification(profile: BorrowerProfile): QualificationResult;
}
```

**Schema Extensions with Versioning:**
```typescript
// Add to convex/schema.ts
export default defineSchema({
  // ... existing tables
  
  borrowerProfiles: defineTable({
    annualIncome: v.number(),
    monthlyDebts: v.number(),
    creditScore: v.number(),
    zipCode: v.string(),
    state: v.string(),
    debtItems: v.object({
      carLoan: v.number(),
      studentLoan: v.number(),
      creditCard: v.number(),
      personalLoan: v.number(),
      otherDebt: v.number(),
    }),
    compensatingFactors: v.object({
      cashReserves: v.string(),
      residualIncome: v.string(),
      housingPaymentIncrease: v.string(),
      employmentHistory: v.string(),
      creditUtilization: v.string(),
      downPayment: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
    schemaVersion: v.optional(v.number()),
  }).index("by_updated", ["updatedAt"]),
  
  dtiCalculations: defineTable({
    borrowerProfileId: v.id("borrowerProfiles"),
    request: v.object({
      annualIncome: v.number(),
      monthlyDebts: v.number(),
      loanType: v.string(),
      fico: v.number(),
      ltv: v.number(),
      factors: v.object({}),
    }),
    response: v.object({
      allowed: v.object({
        frontEnd: v.number(),
        backEnd: v.number(),
      }),
      actual: v.object({
        frontEnd: v.number(),
        backEnd: v.number(),
      }),
      maxPITI: v.number(),
      strongFactorCount: v.number(),
      flags: v.array(v.string()),
    }),
    timestamp: v.number(),
    schemaVersion: v.optional(v.number()),
  }).index("by_borrower_timestamp", ["borrowerProfileId", "timestamp"]),
  
  // Extend scenarios table
  scenarios: defineTable({
    // ... existing fields
    dtiSnapshot: v.optional(v.object({
      allowed: v.object({frontEnd: v.number(), backEnd: v.number()}),
      actual: v.object({frontEnd: v.number(), backEnd: v.number()}),
      maxPITI: v.number(),
      flags: v.array(v.string()),
    })),
    borrowerProfileId: v.optional(v.id("borrowerProfiles")),
    schemaVersion: v.optional(v.number()),
  }),
});
```

**Service Layer Implementation:**
```typescript
// convex/services/dtiService.ts
import { borrowerProfileSchema } from '../validators/borrowerSchema';
import { DTIRequest, DTIResponse } from '../domain/types';

export function evaluateDTI(request: DTIRequest): DTIStatus {
  // Pure function for DTI evaluation
  const validatedRequest = borrowerProfileSchema.parse(request);
  // ... DTI evaluation logic
}

export function solveMaxPITI(request: DTIRequest): MaxPitiResult {
  // Pure function for max PITI calculation
  const validatedRequest = borrowerProfileSchema.parse(request);
  // ... Max PITI solving logic
}
```

**Orchestration Actions with Error Handling:**
```typescript
// convex/actions/solveDTI.ts
import { action } from '../_generated/server';
import { ApiResponse } from '../domain/types';
import { dtiService } from '../services/dtiService';
import { validationService } from '../services/validationService';

export const solveDTI = action({
  args: {
    annualIncome: v.number(),
    monthlyDebts: v.number(),
    loanType: v.string(),
    fico: v.number(),
    ltv: v.number(),
    factors: v.object({}),
  },
  handler: async (ctx, args): Promise<ApiResponse<DTIResponse>> => {
    try {
      // Validate inputs
      const validatedArgs = validationService.validateDTIRequest(args);
      
      // Call pure service function
      const result = dtiService.solveMaxPITI(validatedArgs);
      
      // Store calculation audit trail
      await ctx.db.insert('dtiCalculations', {
        borrowerProfileId: args.borrowerProfileId,
        request: validatedArgs,
        response: result,
        timestamp: Date.now(),
        schemaVersion: 1,
      });
      
      return { ok: true, data: result };
    } catch (error) {
      console.error('DTI calculation error:', error);
      return {
        ok: false,
        code: error instanceof ValidationError ? 'VALIDATION' : 'INTERNAL',
        message: error.message,
      };
    }
  },
});
```

#### Frontend Implementation

**New React Components:**
```
src/
├─ components/
│   ├─ dti/
│   │   ├─ DTIWizard.tsx           # Main DTI input wizard
│   │   ├─ IncomeInput.tsx         # Income input component
│   │   ├─ DebtItemsSection.tsx    # Debt management (extracted)
│   │   ├─ CompensatingFactors.tsx # Compensating factors (extracted)
│   │   ├─ BorrowingPowerChart.tsx # Borrowing power viz (extracted)
│   │   ├─ DTIWarningTooltip.tsx   # Warning tooltip (extracted)
│   │   └─ DebtImpactList.tsx      # Debt impact analysis (extracted)
│   └─ borrowingPower/
│       ├─ BorrowingPowerPanel.tsx # Main borrowing power panel
│       ├─ DebtIncomeBar.tsx       # DTI visualization bar
│       └─ LoanAmountSummary.tsx   # Loan amount summary
├─ context/
│   └─ DTIContext.tsx              # DTI state management
└─ hooks/
    ├─ useDTICalculation.ts        # DTI calculation hook
    └─ useBorrowingPower.ts        # Borrowing power hook
```

**DTI Context Implementation:**
```typescript
// src/context/DTIContext.tsx
export interface DTIContextType {
  // Input data
  annualIncome: number;
  monthlyDebts: number;
  debtItems: DebtItems;
  compensatingFactors: CompensatingFactors;
  
  // Calculation results
  dtiResponse: DTIResponse | null;
  borrowingPower: BorrowingPowerResponse | null;
  
  // Actions
  updateIncome: (income: number) => void;
  updateDebts: (debts: DebtItems) => void;
  updateFactors: (factors: CompensatingFactors) => void;
  calculateDTI: () => void;
  calculateBorrowingPower: () => void;
}
```

### Integration Points with Existing Code

#### 1. InputForm Integration

**Current InputForm.tsx modifications:**
- Add DTI step before loan details
- Integrate borrowing power calculation
- Add real-time DTI validation
- Update form state management

```typescript
// Modified InputForm.tsx structure
const InputForm = () => {
  const [currentStep, setCurrentStep] = useState('income'); // New: multi-step
  const { dtiResponse, calculateDTI } = useDTIContext();
  
  const steps = [
    'income',        // New: Income & debt input
    'factors',       // New: Compensating factors
    'borrowingPower', // New: Borrowing power results
    'loanDetails',   // Existing: House price, down payment, etc.
    'results'        // Existing: Payment calculation
  ];
  
  // ... rest of component
};
```

#### 2. ScenarioList Integration

**Enhanced scenario persistence:**
- Store DTI calculation snapshots
- Display borrowing power in scenario cards
- Add DTI status indicators
- Enable DTI-based filtering

#### 3. calculateFullPayment Integration

**Modified calculation flow:**
```typescript
// Enhanced calculateFullPayment action
export const calculateFullPayment = action(async (ctx, args) => {
  // 1. Calculate DTI if income/debts provided
  let dtiResponse = null;
  if (args.annualIncome && args.monthlyDebts) {
    dtiResponse = await ctx.runAction(api.dti.solveDTI, {
      annualIncome: args.annualIncome,
      monthlyDebts: args.monthlyDebts,
      loanType: args.loanType,
      fico: args.creditScore,
      ltv: (args.housePrice - args.downPayment) / args.housePrice * 100,
      factors: args.compensatingFactors || {},
    });
  }
  
  // 2. Existing calculation logic
  const paymentCalculation = await calculatePaymentBreakdown(args);
  
  // 3. DTI validation
  if (dtiResponse) {
    const monthlyPayment = paymentCalculation.total;
    const dtiValidation = validatePaymentAgainstDTI(monthlyPayment, dtiResponse);
    
    return {
      ...paymentCalculation,
      dtiSnapshot: dtiResponse,
      dtiValidation,
    };
  }
  
  return paymentCalculation;
});
```

### Data Flow Architecture

#### Input Flow with Validation
```
User Input → Client-side Validation (Zod) → DTI Context 
     ↓
Convex Action → Server-side Validation → Service Layer
     ↓
Pure Business Logic → Database → Response Envelope
     ↓
UI Updates → Warning Display → Progressive Disclosure
```

#### Calculation Flow with Error Handling
```
DTI Request → Validation Service → DTI Service (Pure Functions)
     ↓
evaluateDTI() / solveMaxPITI() → Domain Logic → Result
     ↓
Audit Trail Storage → Error Handling → ApiResponse<T>
     ↓
UI Update → Status Display → User Feedback
```

#### Service Layer Interaction
```
Frontend → Convex Action (≤20 LOC) → Service Layer
     ↓
dtiService.evaluateDTI() → Pure TypeScript Function
     ↓
loanProductService.getProduct() → Strategy Pattern
     ↓
validationService.validate() → Zod Validation
     ↓
cacheService.isFresh() → TTL Logic
```

#### Error Handling Flow
```
Service Error → Validation Error → External API Error
     ↓
Error Classification → Error Envelope → User-friendly Message
     ↓
Fallback Logic → Circuit Breaker → Graceful Degradation
```

### Implementation Steps

#### Step 1: Architecture Setup & Core Engine Extraction (Week 1)
- [ ] Set up service layer architecture in `convex/services/`
- [ ] Create domain entity definitions in `convex/domain/`
- [ ] Implement Zod validation schemas in `convex/validators/`
- [ ] Extract DTI engine files from legacy app
- [ ] Remove React/browser dependencies and convert to pure TypeScript
- [ ] Implement explicit bidirectional DTI solver API:
  - `evaluateDTI(args) -> DTIStatus`
  - `solveMaxPITI(args) -> MaxPitiResult`
- [ ] Create unit tests for core calculations
- [ ] Verify calculation accuracy against known scenarios

#### Step 2: Service Layer & Backend Implementation (Week 2)
- [ ] Implement loan product strategy pattern:
  - `AbstractLoanProduct` interface
  - `FhaProduct` and `ConventionalProduct` implementations
  - Factory pattern for product selection
- [ ] Create DTI service with pure functions
- [ ] Implement borrowing power service
- [ ] Add validation service with Zod schemas
- [ ] Create cache service for centralized TTL logic
- [ ] Implement orchestration actions with error handling
- [ ] Add schema versioning to all tables
- [ ] Create audit trail for DTI calculations

#### Step 3: React Component Migration & UI (Week 3)
- [ ] Extract UI components from legacy app
- [ ] Adapt to shadcn/ui design system
- [ ] Convert to Convex hooks with error handling
- [ ] Create DTI context with ApiResponse handling
- [ ] Build DTI wizard component with progressive disclosure
- [ ] Implement real-time validation with user-friendly errors
- [ ] Add DTI warning tooltips and status indicators

#### Step 4: Integration & Error Handling (Week 4)
- [ ] Modify InputForm for multi-step flow
- [ ] Integrate DTI calculation with existing flow
- [ ] Update scenario persistence with DTI snapshots
- [ ] Add DTI validation to payment calculation
- [ ] Update ScenarioList with DTI information
- [ ] Implement circuit breaker pattern for external services
- [ ] Add comprehensive error logging and monitoring

#### Step 5: Testing & Quality Assurance (Week 5)
- [ ] Unit tests for all service layer functions
- [ ] Integration tests for Convex actions with error scenarios
- [ ] UI component tests with error states
- [ ] End-to-end workflow testing
- [ ] Performance optimization and load testing
- [ ] Validation accuracy testing against FHA/Conventional guidelines
- [ ] Error handling and fallback scenario testing

### Testing Strategy

#### Unit Tests
- DTI calculation accuracy
- Compensating factor logic
- Limit calculation verification
- Status evaluation correctness

#### Integration Tests
- Convex action functionality
- Database schema validation
- Real-time calculation performance
- Error handling scenarios

#### UI Tests
- Component rendering
- User interaction flows
- State management
- Validation feedback

#### End-to-End Tests
- Complete DTI workflow
- Borrowing power calculation
- Scenario persistence
- Multi-step form navigation

### Risk Mitigation

#### Technical Risks
- **Calculation Accuracy:** Extensive testing against known scenarios
- **Performance Impact:** Optimize for real-time calculations
- **Data Migration:** Careful schema evolution strategy
- **Integration Complexity:** Gradual rollout with feature flags

#### Business Risks
- **User Experience:** Progressive disclosure of complexity
- **Regulatory Compliance:** Regular guideline updates
- **Competitive Advantage:** Focus on unique value proposition

### Advanced Architecture Patterns

#### Loan Product Strategy Pattern

**Abstract Interface:**
```typescript
// convex/domain/LoanProduct.ts
export interface AbstractLoanProduct {
  type: 'fha' | 'conventional';
  calculateLimits(profile: BorrowerProfile): DTILimits;
  validateQualification(profile: BorrowerProfile): QualificationResult;
  getMinDownPayment(): number;
  getMaxLTV(): number;
}
```

**Concrete Implementations:**
```typescript
// convex/services/loanProducts/FhaProduct.ts
export class FhaProduct implements AbstractLoanProduct {
  type = 'fha' as const;
  
  calculateLimits(profile: BorrowerProfile): DTILimits {
    // FHA-specific tiered limits (31/43 → 37/47 → 40/57)
    const strongFactorCount = this.countStrongFactors(profile);
    return this.calculateFHALimits(profile, strongFactorCount);
  }
  
  validateQualification(profile: BorrowerProfile): QualificationResult {
    // FHA-specific qualification rules
    return this.validateFHAQualification(profile);
  }
}

// convex/services/loanProducts/ConventionalProduct.ts
export class ConventionalProduct implements AbstractLoanProduct {
  type = 'conventional' as const;
  
  calculateLimits(profile: BorrowerProfile): DTILimits {
    // Conventional limits with DU flexibility
    return this.calculateConventionalLimits(profile);
  }
}
```

**Factory Pattern:**
```typescript
// convex/services/loanProductService.ts
export class LoanProductFactory {
  static createProduct(type: 'fha' | 'conventional'): AbstractLoanProduct {
    switch (type) {
      case 'fha':
        return new FhaProduct();
      case 'conventional':
        return new ConventionalProduct();
      default:
        throw new Error(`Unknown loan product type: ${type}`);
    }
  }
}
```

#### Bidirectional DTI Solver API

**Clear API Separation:**
```typescript
// convex/services/dtiService.ts
export interface DTIService {
  // Evaluation mode: Check if given payment meets DTI requirements
  evaluateDTI(request: DTIEvaluationRequest): DTIStatus;
  
  // Solving mode: Calculate maximum allowable PITI
  solveMaxPITI(request: DTISolveRequest): MaxPitiResult;
}

export interface DTIEvaluationRequest {
  borrowerProfile: BorrowerProfile;
  proposedPITI: number;
  loanType: 'fha' | 'conventional';
}

export interface DTISolveRequest {
  borrowerProfile: BorrowerProfile;
  loanType: 'fha' | 'conventional';
  targetLTV?: number;
}
```

**Implementation:**
```typescript
export const dtiService: DTIService = {
  evaluateDTI(request: DTIEvaluationRequest): DTIStatus {
    const product = LoanProductFactory.createProduct(request.loanType);
    const limits = product.calculateLimits(request.borrowerProfile);
    
    // Calculate actual DTI ratios
    const actualRatios = this.calculateActualRatios(
      request.borrowerProfile,
      request.proposedPITI
    );
    
    // Evaluate against limits
    return this.evaluateAgainstLimits(actualRatios, limits);
  },
  
  solveMaxPITI(request: DTISolveRequest): MaxPitiResult {
    const product = LoanProductFactory.createProduct(request.loanType);
    const limits = product.calculateLimits(request.borrowerProfile);
    
    // Calculate maximum PITI that satisfies both front-end and back-end ratios
    const maxPITI = this.calculateMaxPITI(request.borrowerProfile, limits);
    
    return {
      maxPITI,
      limits,
      actualRatios: this.calculateActualRatios(request.borrowerProfile, maxPITI),
      qualificationStatus: product.validateQualification(request.borrowerProfile),
    };
  },
};
```

### Quality Assurance

#### Code Quality
- TypeScript strict mode
- Comprehensive error handling
- Detailed logging and monitoring
- Performance benchmarking
- Service layer unit testability

#### Calculation Accuracy
- Test against FHA/Conventional guidelines
- Validate with mortgage professionals
- Cross-reference with other calculators
- Regular accuracy audits
- Strategy pattern ensures product-specific rules

#### User Experience
- Usability testing
- Progressive disclosure
- Clear error messages
- Helpful guidance tooltips
- Consistent API responses

### Conclusion

This extraction and refactor plan provides a comprehensive approach to migrating the DTI calculation module from the legacy Supabase application to the new Convex architecture. The focus on aggressive but compliant underwriting ensures users receive maximum borrowing power while maintaining regulatory compliance.

The implementation maintains all existing business logic while adapting to the new technical architecture, providing a solid foundation for the comprehensive loan advisory platform described in the main PRD.