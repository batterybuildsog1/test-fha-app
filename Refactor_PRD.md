# Mortgage Calculator App Refactor PRD
## From Basic Calculator to Comprehensive Loan Advisory Platform

### Executive Summary

This PRD outlines the transformation of our basic FHA mortgage calculator into a comprehensive loan advisory platform that maximizes user borrowing power and guides them through the complete loan qualification process. The refactor introduces advanced DTI calculations, borrowing power analysis, compensating factors, and AI-driven advisory features to deliver on the promise: "The app gets the user a better loan than they could ever get."

### Current State Analysis

#### What Exists Today (High-Level Map)

**Layer** | **Current Elements** | **Limitations**
---|---|---
**Client UI** | InputForm, ScenarioList, ScenarioComparison, ApiStatusMonitor | Form-centric, no guided flow, single-page
**Domain Logic** | calculateFullPayment orchestrates rate/tax/insurance | Monolithic, missing DTI/qualification logic
**Data Model** | scenarios, rates, taxes, insurance tables | No user profiles, debt tracking, or loan products
**Integrations** | Mortgage News Daily, Bankrate, API Ninjas | Pull-only, no real-time advisory features

#### Current Workflow & Critical Gaps

**Current Flow:**
1. User enters house price, down payment, ZIP, credit score
2. System calculates monthly payment (P&I, tax, insurance, PMI)
3. User saves scenario
4. Basic scenario comparison

**Critical Gaps:**
- ❌ No borrowing power calculation ("How much can I afford?")
- ❌ No DTI analysis or qualification assessment
- ❌ No income/debt capture
- ❌ No compensating factors logic
- ❌ No guided workflow from qualification to optimization
- ❌ No loan product comparison (FHA vs Conventional)
- ❌ No fee transparency (LLPA, title, underwriting)
- ❌ No rate optimization (discount points, buydowns)
- ❌ No AI coaching or improvement recommendations
- ❌ No "path to yes" for unqualified users

### Target State Vision

#### 3-Phase Guided Advisory Flow

**Phase 1: Prepare (Qualification & Advice)**
- Borrowing-Power Wizard: income, debts, credit → max loan with roadblocks
- DTI Calculator: Real-time FHA/Conventional limits with compensating factors
- AI Loan Coach: Chat-driven recommendations for qualification improvement

**Phase 2: Explore (Product & Fee Optimization)**
- Scenario Builder 2.0: FHA vs Conventional with real fees
- Discount-Point Calculator: Rate vs cost optimization
- LLPA Calculator: Loan-level price adjustments
- Fee Transparency: Title, underwriting, recording fees by county

**Phase 3: Decide (Comparison & Action)**
- Offer Comparison: Side-by-side analysis ranked by total cost
- Action Plan Generator: Step-by-step qualification improvement
- Export & Apply: PDF reports, lender integration

#### User Journey Transformation

**Before:** "I want to calculate a payment for a $350k house"
**After:** "I want to buy a house. What can I afford and how do I get the best loan?"

### Implementation Plan by Feature Groups

#### 1. DTI Calculator & Borrowing Power Engine (Foundation)

**Purpose:** Calculate maximum borrowing power using aggressive but compliant underwriting

**Components:**
- DTI calculation engine with 2025 FHA/Conventional guidelines
- Compensating factors analysis (cash reserves, credit, employment)
- Tiered DTI limits (31/43 → 37/47 → 40/57 for FHA)
- Bidirectional solver (evaluation mode + max PITI calculation)

**Technical Implementation:**
- `convex/dti.ts` - Core DTI engine actions
- `convex/borrowingPower.ts` - Borrowing power calculations
- `src/components/dti/` - DTI wizard components
- `src/context/DTIContext.tsx` - Global DTI state management

**Key Features:**
- Real-time DTI validation with visual warnings
- Strong factor counting for enhanced limits
- Debt impact analysis ("pay off $5k to buy $25k more house")
- Geographic optimization suggestions

#### 2. Loan Product Comparison (FHA vs Conventional)

**Purpose:** Compare loan products with real fees and qualification requirements

**Components:**
- Loan product definitions and rules
- PMI vs MIP calculations
- Down payment requirement variations
- Qualification threshold comparisons

**Technical Implementation:**
- `convex/loanProducts.ts` - Product definitions and calculations
- `src/components/products/` - Product comparison components
- Enhanced scenario builder with product selection

#### 3. LLPA & Rate Adjustments

**Purpose:** Provide transparent pricing with loan-level price adjustments

**Components:**
- LLPA matrix integration (Fannie/Freddie data)
- FICO/LTV-based rate adjustments
- Automatic rate pricing based on profile

**Technical Implementation:**
- `convex/llpa.ts` - LLPA calculation actions
- `convex/rateAdjustments.ts` - Rate adjustment logic
- Daily CSV import jobs for LLPA updates

#### 4. Discount Points & Permanent Buydowns

**Purpose:** Rate optimization through points and buydown strategies

**Components:**
- Points cost calculator
- Breakeven analysis
- Permanent buydown options
- Rate lock strategies

**Technical Implementation:**
- `convex/points.ts` - Points and buydown calculations
- `src/components/rates/` - Rate optimization components
- Interactive sliders for cost/rate tradeoffs

#### 5. Comprehensive Fee Transparency

**Purpose:** All-inclusive upfront cost calculation with real data

**Components:**
- Title company fee integration
- Underwriting fee calculations
- Recording fee database by county
- Lender fee variations

**Technical Implementation:**
- `convex/fees.ts` - Fee calculation actions
- External API integrations for real-time fees
- Fee breakdown components with explanations

#### 6. AI Loan Coach & Debt Optimizer

**Purpose:** Intelligent recommendations for qualification improvement

**Components:**
- Chat-based interface for loan advice
- Debt payoff optimization algorithms
- Income improvement suggestions
- Geographic optimization analysis

**Technical Implementation:**
- `convex/aiCoach.ts` - AI coaching actions
- `convex/debtOptimizer.ts` - Debt optimization algorithms
- `src/components/coach/` - Chat interface components
- Integration with OpenAI/Anthropic APIs

### Technical Architecture Overhaul

#### Service Layer Pattern

**Current:** Monolithic Convex actions orchestrate many concerns at once
**Target:** Thin orchestration actions + pure business logic services

```typescript
// Service layer architecture
convex/
├─ services/
│   ├─ dtiService.ts        # Pure DTI calculation functions
│   ├─ rateService.ts       # Rate fetching and caching
│   ├─ insuranceService.ts  # Insurance rate calculations
│   ├─ taxService.ts        # Property tax calculations
│   └─ cacheService.ts      # Centralized TTL logic
├─ actions/
│   ├─ calculatePayment.ts  # ≤20 LOC orchestration shell
│   ├─ solveDTI.ts         # DTI calculation orchestration
│   └─ fetchRates.ts       # Rate fetching orchestration
└─ domain/
    ├─ BorrowerProfile.ts   # Domain entity types
    ├─ LoanScenario.ts      # Loan scenario domain model
    └─ DTICalculation.ts    # DTI calculation domain model
```

**Benefits:**
- Business logic can be unit-tested without Convex
- Retry logic separated from business rules
- Easier evolution and parallelization
- Clear separation of concerns

#### Domain-Driven Design (DDD) Lite

**Domain Entities:**
```typescript
// convex/domain/BorrowerProfile.ts
export interface BorrowerProfile {
  id: string;
  annualIncome: number;
  monthlyDebts: number;
  creditScore: number;
  debtItems: DebtItems;
  compensatingFactors: CompensatingFactors;
  location: {
    zipCode: string;
    state: string;
    county?: string;
  };
}

// convex/domain/LoanScenario.ts
export interface LoanScenario {
  id: string;
  borrowerProfileId: string;
  loanProduct: LoanProduct;
  housePrice: number;
  downPayment: number;
  dtiSnapshot: DTICalculation;
  paymentBreakdown: PaymentBreakdown;
}
```

#### Enhanced Data Model with Versioning

**Schema Versioning Strategy:**
All tables include `schemaVersion: v.optional(v.number())` to prevent silent mismatches when stale clients hit newly-migrated backends.

**Normalized Data Structure:**
```typescript
// Split for better provenance and auditing
rateSources: defineTable({
  source: v.string(),          // "mortgageNewsDaily", "bankrate"
  rawData: v.any(),           // Original scraped data
  scrapedAt: v.number(),
  schemaVersion: v.optional(v.number()),
}),

insuranceRates: defineTable({
  state: v.string(),
  per1000Rate: v.number(),    // Canonical computed rate
  sourceId: v.id("rateSources"),
  computedAt: v.number(),
  schemaVersion: v.optional(v.number()),
}).index("by_state_timestamp", ["state", "computedAt"]),

// Normalized borrower information
borrowerProfiles: defineTable({
  annualIncome: v.number(),
  monthlyDebts: v.number(),
  creditScore: v.number(),
  zipCode: v.string(),
  state: v.string(),
  debtItems: v.object({...}),
  compensatingFactors: v.object({...}),
  schemaVersion: v.optional(v.number()),
}),
```

**New Tables:**
- `rateSources` - Raw scraped data with provenance
- `insuranceRates` - Computed canonical rates
- `borrowerProfiles` - Normalized borrower information
- `loanProducts` - Product definitions and rules
- `llpaMatrix` - Loan-level price adjustments
- `feeCatalog` - Title, underwriting, recording fees
- `coachSessions` - AI coaching conversations
- `dtiCalculations` - DTI calculation audit trail

#### Navigation & Routing

**Current:** Single-page application
**Target:** Multi-step guided workflow

```
/
├─ wizard/
│   ├─ qualification  (DTI, borrowing power)
│   ├─ products       (FHA vs Conventional)
│   ├─ optimization   (rates, points, fees)
│   └─ coaching       (AI recommendations)
├─ scenarios/         (comparison & management)
├─ dashboard/         (user profile & progress)
└─ export/            (PDF reports, applications)
```

#### API Contract & Error Handling

**Consistent Error Envelope:**
```typescript
type ApiError = { 
  ok: false; 
  code: 'VALIDATION' | 'EXTERNAL' | 'INTERNAL'; 
  message: string;
  details?: any;
};
type ApiOk<T> = { ok: true; data: T };
type ApiResponse<T> = ApiOk<T> | ApiError;
```

**Error Handling Strategy:**
- All Convex actions return `ApiResponse<T>` envelope
- UI renders friendly errors without guesswork
- Detailed error logging for debugging
- Graceful fallbacks for external service failures

#### Validation Strategy

**Input Validation:**
```typescript
// convex/validators/borrower.ts
export const borrowerProfileSchema = z.object({
  annualIncome: z.number().positive().max(10000000),
  monthlyDebts: z.number().nonnegative(),
  creditScore: z.number().min(300).max(850),
  zipCode: z.string().regex(/^\d{5}$/),
});
```

**Validation Points:**
- Form inputs validated client-side with Zod
- All Convex action inputs validated server-side
- Third-party API responses validated before processing
- Database writes validated against schema

#### External Service Policy

**Retry & Fallback Matrix:**
```typescript
// convex/config/externalPolicy.ts
export const EXTERNAL_POLICIES = {
  mortgageNewsDaily: {
    retries: 2,
    cacheTtl: 6 * 60 * 60 * 1000, // 6 hours
    fallback: 'lastCachedValue',
    timeout: 30000,
  },
  apiNinjasPropertyTax: {
    retries: 1,
    cacheTtl: 365 * 24 * 60 * 60 * 1000, // 1 year
    fallback: 'default1Percent',
    timeout: 15000,
  },
  bankrateInsurance: {
    retries: 2,
    cacheTtl: 90 * 24 * 60 * 60 * 1000, // 90 days
    fallback: 'stateAverage',
    timeout: 45000,
  },
};
```

**Service Resilience:**
- Circuit breaker pattern for failing services
- Exponential backoff for retries
- Graceful degradation with fallback values
- Comprehensive monitoring and alerting

### DTI Module Integration Plan

#### Phase 1: Core DTI Engine
- Extract DTI calculation engine from legacy app
- Implement 2025 FHA/Conventional guidelines with tiered limits
- Add compensating factors logic with strong factor counting
- Create explicit bidirectional solver API:
  - `evaluateDTI(args) -> DTIStatus` - Evaluate given payment against DTI
  - `solveMaxPITI(args) -> MaxPitiResult` - Calculate maximum allowable PITI
- Implement loan product strategy pattern:
  - `AbstractLoanProduct` interface
  - `FhaProduct` and `ConventionalProduct` implementations
  - Factory pattern for product selection

#### Phase 2: UI Components
- DTI wizard with income/debt inputs and real-time validation
- Compensating factors selection interface with tooltips
- Borrowing power visualization with debt impact analysis
- Real-time validation warnings with progressive disclosure

#### Phase 3: Advisory Features
- Debt impact analysis ("pay off $5k to buy $25k more house")
- Geographic optimization suggestions (nearby ZIP codes)
- Qualification improvement recommendations
- Integration with AI coaching for personalized advice

### Implementation Timeline

#### Phase 1: Foundation & Architecture (Weeks 1-4)
- [ ] Service layer setup (`convex/services/`)
- [ ] Domain entity definitions (`convex/domain/`)
- [ ] Schema versioning and table normalization
- [ ] Validation framework with Zod schemas
- [ ] External service policy configuration
- [ ] DTI engine extraction and refactoring
- [ ] Bidirectional DTI solver API implementation
- [ ] Basic error handling and logging

#### Phase 2: Core Features & UI (Weeks 5-8)
- [ ] Loan product strategy pattern implementation
- [ ] DTI wizard components with real-time validation
- [ ] Borrowing power visualization components
- [ ] Enhanced scenario persistence with DTI snapshots
- [ ] LLPA integration with daily CSV imports
- [ ] Fee transparency with external API integration
- [ ] Discount points calculator with breakeven analysis

#### Phase 3: Advanced Features & Advisory (Weeks 9-12)
- [ ] AI loan coach with OpenAI/Anthropic integration
- [ ] Debt optimizer with impact analysis
- [ ] Geographic optimization suggestions
- [ ] Multi-step guided workflow routing
- [ ] Export functionality (PDF reports)
- [ ] Rate provider interface with multiple sources
- [ ] Circuit breaker pattern for external services

#### Phase 4: Testing, Polish & Launch (Weeks 13-16)
- [ ] Comprehensive unit testing for all services
- [ ] Integration testing for Convex actions
- [ ] End-to-end testing of user workflows
- [ ] Performance optimization and load testing
- [ ] UI/UX refinements and accessibility
- [ ] Monitoring and alerting setup
- [ ] Launch preparation and rollout strategy

### Success Metrics

#### User Experience Metrics
- **Qualification Rate:** % of users who discover they can qualify
- **Borrowing Power Discovery:** Average increase in perceived affordability
- **Feature Adoption:** % using DTI calculator, coaching, optimization
- **Completion Rate:** % completing full advisory workflow

#### Business Metrics
- **User Engagement:** Session duration, return visits
- **Conversion Rate:** % moving from calculation to action
- **Recommendation Accuracy:** % following AI coach suggestions
- **Platform Stickiness:** Multi-session usage patterns

### Risk Assessment & Mitigation

#### Technical Risks
- **DTI Calculation Accuracy:** Mitigate with extensive testing against known scenarios
- **External API Reliability:** Implement fallbacks and caching strategies
- **Performance Impact:** Load testing and optimization for complex calculations
- **Data Privacy:** Ensure PII handling compliance

#### Business Risks
- **User Adoption:** Gradual rollout with feature flags
- **Complexity Overwhelm:** Progressive disclosure and guided workflows
- **Competitive Response:** Focus on unique value proposition
- **Regulatory Changes:** Monitor and adapt to underwriting guideline updates

### Conclusion

This refactor transforms our basic calculator into a comprehensive loan advisory platform that maximizes user borrowing power while providing transparent, actionable guidance. The DTI module serves as the foundation for qualification assessment, while the additional features create a complete loan optimization ecosystem.

The result: Users get better loans than they could obtain elsewhere, and those who can't qualify today receive a clear path to qualification tomorrow.