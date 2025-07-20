# DTI Wizard Persistence Implementation

## Overview

The DTI wizard now includes comprehensive session persistence functionality powered by Convex. Users can save their progress, resume incomplete sessions, and share sessions via URL.

## Features

### 1. Auto-Save
- Automatically saves progress after each step completion
- 2-second debounce to prevent excessive API calls
- Visual save status indicator (Saving... / Saved)
- Handles offline scenarios gracefully

### 2. Session Resume
- Detects incomplete sessions on page load
- Shows resume dialog with session details
- Allows users to continue or start fresh
- Sessions expire after 30 days of inactivity

### 3. URL-Based Sharing
- Session ID added to URL parameters
- Share sessions with others via link
- Direct access to specific sessions

### 4. Data Privacy
- Anonymous user IDs (UUID) stored in localStorage
- No PII logged or exposed
- Secure session management

### 5. Import/Export
- Export session data as JSON
- Import previously saved sessions
- Version validation for compatibility

## Architecture

### Convex Schema
```typescript
dtiWizardSessions: defineTable({
  userId: v.string(),
  sessionId: v.string(),
  currentStep: v.number(),
  completedSteps: v.array(v.number()),
  isComplete: v.boolean(),
  data: v.object({
    income: v.optional(...),
    debts: v.optional(...),
    compensatingFactors: v.optional(...),
    creditInfo: v.optional(...),
    results: v.optional(...)
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### Key Components

1. **DTIWizardWithPersistence**
   - Wrapper component adding persistence to DTIWizard
   - Handles session initialization and resume logic
   - Manages save status UI

2. **useDTIPersistence Hooks**
   - `useAutoSave`: Debounced auto-save functionality
   - `useResumeSession`: Session initialization and loading
   - `useSaveResults`: Save completed wizard results
   - `useClearSession`: Clear saved sessions
   - `useExportSession`: Export session as JSON
   - `useImportSession`: Import session from JSON

3. **Session Utilities**
   - URL parameter management
   - Session validation and migration
   - Anonymous user ID generation
   - Session formatting and analytics

## Usage Example

```tsx
import { DTIWizardWithPersistence } from './components/dti/DTIWizardWithPersistence';
import { DTIWizard } from './components/dti/DTIWizard';

function App() {
  return (
    <DTIWizardWithPersistence onComplete={handleComplete}>
      <DTIWizard.Progress showStepNames />
      
      <DTIWizard.Content>
        <DTIWizard.Step stepId="income">
          <IncomeStep />
        </DTIWizard.Step>
        {/* More steps... */}
      </DTIWizard.Content>
      
      <DTIWizard.Navigation />
    </DTIWizardWithPersistence>
  );
}
```

## API Functions

### Mutations
- `saveProgress`: Save current wizard state
- `completeWizard`: Mark wizard as complete
- `clearSession`: Delete a saved session
- `clearExpiredSessions`: Remove old sessions

### Queries
- `getLatestSession`: Get most recent incomplete session
- `getSession`: Get specific session by ID
- `listSessions`: List all user sessions
- `exportSession`: Export session data

### Actions
- `resumeOrCreateSession`: Initialize or resume session

## Session Lifecycle

1. **Creation**
   - User starts wizard → new session created
   - Anonymous user ID generated/retrieved
   - Session ID added to URL

2. **Progress Saving**
   - Auto-save triggered on step changes
   - 2-second debounce prevents excessive saves
   - Save status shown in UI

3. **Resume**
   - On page load, check for incomplete sessions
   - Show resume dialog if found
   - Load saved data into wizard state

4. **Completion**
   - Mark session as complete
   - Save final results
   - Session remains accessible via URL

5. **Expiry**
   - Sessions expire after 30 days
   - Automated cleanup removes old sessions

## Error Handling

- Network failures: Show error badge, retry automatically
- Invalid data: Validate before loading, show errors
- Session not found: Create new session automatically
- Schema changes: Migration system handles updates

## Testing

Run tests with:
```bash
npm test src/components/dti/__tests__/persistence.test.ts
```

## Security Considerations

1. No sensitive data in URLs
2. Session IDs are cryptographically random
3. User IDs are anonymous UUIDs
4. Data validation on load
5. Proper error handling prevents data leaks