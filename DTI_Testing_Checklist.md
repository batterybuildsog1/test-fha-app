# DTI Integration Testing Checklist

## Mobile Optimization Checklist

### Dialog/Modal
- [x] Modal width responsive on mobile (95vw on small screens)
- [x] Max height set to 90vh with scroll
- [x] Close button accessible on mobile
- [ ] Test on actual mobile devices (iOS/Android)

### DTI Wizard Navigation
- [x] Navigation buttons properly sized for touch
- [x] Step progress bar visible on mobile
- [ ] Swipe gestures for step navigation (future enhancement)
- [ ] Test landscape orientation

### Form Inputs
- [x] Input fields use appropriate keyboard types (number inputs)
- [x] Labels and tooltips readable on mobile
- [x] Touch targets meet minimum size (44x44px)
- [ ] Test auto-focus behavior on mobile

### DTI Cards
- [x] DTITriggerCard responsive layout
- [x] DTISummaryCard collapses properly on mobile
- [x] Text remains readable at small sizes
- [ ] Test card interactions on touch devices

## End-to-End Testing Scenarios

### 1. First-Time User Flow
- [ ] User sees DTI trigger card after credit score
- [ ] Educational tooltip appears on hover/tap
- [ ] Clicking "Calculate DTI" opens modal
- [ ] Pre-filled data from mortgage form is correct
- [ ] User can complete all wizard steps
- [ ] Results display correctly
- [ ] DTI summary card replaces trigger card
- [ ] Results persist on page refresh

### 2. DTI Calculation Flow
- [ ] Income step validates required fields
- [ ] Debts step calculates total correctly
- [ ] Credit step shows appropriate options
- [ ] Compensating factors help is clear
- [ ] Results show accurate calculations
- [ ] Borrowing power chart displays correctly

### 3. Data Synchronization
- [ ] Annual income estimates correctly from house price
- [ ] Credit score maps correctly (range to numeric)
- [ ] DTI results affect mortgage calculations
- [ ] Warning appears when exceeding DTI limits
- [ ] Suggested adjustments are accurate

### 4. Validation & Errors
- [ ] Form validation prevents invalid submissions
- [ ] DTI warnings appear for high loan amounts
- [ ] Real-time feedback when changing house price
- [ ] Error messages are clear and helpful
- [ ] Recovery from errors works properly

### 5. Persistence & State Management
- [ ] DTI results persist in localStorage
- [ ] 30-minute cache works correctly
- [ ] State survives page refreshes
- [ ] Modal state doesn't persist (always closed on refresh)
- [ ] Scenario saving includes DTI data

### 6. Integration with Main Flow
- [ ] DTI validation in mortgage calculation
- [ ] DTI indicators in results display
- [ ] Color-coded status (green/yellow/red)
- [ ] DTI constraints properly applied
- [ ] Scenario persistence includes DTI fields

### 7. Smart Behaviors
- [ ] Auto-suggest for loans over $300k
- [ ] Auto-suggest for jumbo loans over $400k
- [ ] Delayed suggestions (2 second delay)
- [ ] Cache expiration after 30 minutes
- [ ] Progressive disclosure works properly

### 8. Accessibility
- [ ] Keyboard navigation through wizard
- [ ] Screen reader announcements
- [ ] Focus management in modal
- [ ] ARIA labels on interactive elements
- [ ] Color contrast meets WCAG standards

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance Testing
- [ ] Modal opens quickly (<100ms)
- [ ] Wizard steps transition smoothly
- [ ] Calculations complete quickly (<500ms)
- [ ] No memory leaks with repeated use
- [ ] Bundle size impact is reasonable

## Known Issues & Future Enhancements
1. Swipe navigation not implemented for mobile
2. Offline support not implemented
3. Print-friendly DTI report not available
4. Multi-language support not implemented

## Testing Commands
```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Manual Testing Steps
1. Open application on desktop browser
2. Complete DTI wizard with various scenarios
3. Test on mobile device (use ngrok for local testing)
4. Test error scenarios (invalid inputs, network issues)
5. Verify persistence across sessions
6. Test integration with mortgage calculator
7. Verify all tooltips and help text
8. Check accessibility with screen reader

## Automated Testing (Future)
- Unit tests for DTI calculations
- Integration tests for wizard flow
- E2E tests with Playwright/Cypress
- Visual regression tests
- Performance benchmarks