# Feature: Add Creator Modal Component

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a comprehensive Add Creator Modal component that replaces the simple AddChannel component with an advanced modal interface. The modal provides content type selection (videos, shorts, lives), import settings (latest, oldest, all), video limit configuration, usage limits display, and upgrade prompts when limits are exceeded.

## User Story

As a ChannelChat user
I want to add YouTube creators through an advanced modal interface with content filtering and import options
So that I can precisely control what content gets indexed and stay within my plan limits

## Problem Statement

The current AddChannel component is too basic - it only provides a simple URL input without content type selection, import settings, or usage limit awareness. Users need more control over what content gets indexed and clear visibility into their plan limits.

## Solution Statement

Replace the simple AddChannel component with a comprehensive AddCreatorModal that provides content type selection, import mode configuration, video limit settings, usage limit display, and upgrade prompts. The modal will integrate with existing hooks and maintain the same API contract while providing a much richer user experience.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Chat UI, Creator Management, Usage Limits
**Dependencies**: shadcn/ui components, existing hooks (useIngestChannel, useAuth)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/components/AddChannel.tsx` (entire file) - Why: Current implementation to replace
- `src/hooks/useIngestChannel.ts` (entire file) - Why: Hook interface that needs to be updated
- `src/lib/types.ts` (lines 1-50, 80-120) - Why: Creator, ContentTypeOptions, ImportSettings types
- `src/components/ui/dialog.tsx` (entire file) - Why: Dialog component structure and patterns
- `src/components/ui/button.tsx` (entire file) - Why: Button component patterns
- `src/components/ui/input.tsx` (entire file) - Why: Input component patterns
- `src/pages/Chat.tsx` (lines 1-50) - Why: Integration point for modal usage

### New Files to Create

- `src/components/ui/label.tsx` - Label component for form fields
- `src/components/AddCreatorModal.tsx` - Main modal component
- `src/hooks/useUsageLimits.ts` - Usage limits hook (simplified version)
- `src/components/UpgradePlanDialog.tsx` - Upgrade dialog component (simplified)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Radix UI Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog)
  - Specific section: Dialog composition and state management
  - Why: Required for implementing modal behavior
- [shadcn/ui Label Component](https://ui.shadcn.com/docs/components/label)
  - Specific section: Label component implementation
  - Why: Needed for form field labels
- [React Hook Form Patterns](https://react-hook-form.com/get-started)
  - Specific section: Form validation and state management
  - Why: Shows proper form handling patterns

### Patterns to Follow

**Component Structure Pattern:**
```tsx
// From src/components/ui/dialog.tsx
export function ComponentName({ prop1, prop2, ...props }: ComponentProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogHeader>
        {/* Content */}
      </DialogContent>
    </Dialog>
  );
}
```

**Hook Usage Pattern:**
```tsx
// From src/hooks/useIngestChannel.ts
const { ingestChannel, isLoading, error, clearError } = useIngestChannel();
```

**Type Import Pattern:**
```tsx
// From src/lib/types.ts
import type { Creator, ContentTypeOptions, ImportSettings } from '@/lib/types';
```

**Error Handling Pattern:**
```tsx
// From src/components/AddChannel.tsx
{error && (
  <p className="text-sm text-red-500 mt-2">{error}</p>
)}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up missing UI components and simplified hooks needed for the modal.

**Tasks:**
- Create Label component following shadcn/ui patterns
- Create simplified useUsageLimits hook with mock data
- Create simplified UpgradePlanDialog component

### Phase 2: Core Implementation

Implement the main AddCreatorModal component with all features.

**Tasks:**
- Create AddCreatorModal component with dialog structure
- Implement content type selection UI
- Add import settings configuration
- Integrate with existing useIngestChannel hook

### Phase 3: Integration

Connect the modal to the existing Chat page and update hook interfaces.

**Tasks:**
- Update useIngestChannel hook to support new parameters
- Replace AddChannel usage in Chat.tsx with AddCreatorModal
- Add modal state management to Chat component

### Phase 4: Testing & Validation

Ensure the modal works correctly and maintains existing functionality.

**Tasks:**
- Test modal open/close behavior
- Validate form submission with different settings
- Verify integration with existing creator management
- Test error handling and loading states

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/components/ui/label.tsx

- **IMPLEMENT**: Label component following shadcn/ui patterns
- **PATTERN**: Standard shadcn/ui component structure
- **IMPORTS**: React, cn utility, Radix UI Label primitive
- **GOTCHA**: Must use forwardRef for proper form integration
- **VALIDATE**: `pnpm run build` (check TypeScript compilation)

### CREATE src/hooks/useUsageLimits.ts

- **IMPLEMENT**: Simplified usage limits hook with mock data
- **PATTERN**: Hook structure from useIngestChannel.ts
- **IMPORTS**: useState, useCallback from React
- **GOTCHA**: Return interface must match expected structure in modal
- **VALIDATE**: `pnpm run build` (check TypeScript compilation)

### CREATE src/components/UpgradePlanDialog.tsx

- **IMPLEMENT**: Simplified upgrade dialog component
- **PATTERN**: Dialog structure from src/components/ui/dialog.tsx
- **IMPORTS**: Dialog components, Button from UI
- **GOTCHA**: Must handle dialog state properly with onClose callback
- **VALIDATE**: `pnpm run build` (check TypeScript compilation)

### UPDATE src/hooks/useIngestChannel.ts

- **IMPLEMENT**: Add support for ContentTypeOptions and ImportSettings parameters
- **PATTERN**: Existing parameter handling in ingestChannel function
- **IMPORTS**: Add ContentTypeOptions, ImportSettings from types
- **GOTCHA**: Maintain backward compatibility with existing usage
- **VALIDATE**: `pnpm run build` (check TypeScript compilation)

### CREATE src/components/AddCreatorModal.tsx

- **IMPLEMENT**: Complete modal component with all features from reference
- **PATTERN**: Dialog structure and form handling patterns
- **IMPORTS**: All UI components, hooks, types, and icons
- **GOTCHA**: Must handle form state, validation, and error display properly
- **VALIDATE**: `pnpm run build` (check TypeScript compilation)

### UPDATE src/pages/Chat.tsx

- **IMPLEMENT**: Replace AddChannel with AddCreatorModal usage
- **PATTERN**: Existing component integration in Chat.tsx
- **IMPORTS**: Add AddCreatorModal import, remove AddChannel
- **GOTCHA**: Must maintain existing handleChannelAdded callback interface
- **VALIDATE**: `pnpm run dev &` and test modal opens/closes

### REMOVE src/components/AddChannel.tsx

- **IMPLEMENT**: Delete the old AddChannel component file
- **PATTERN**: File deletion
- **IMPORTS**: None
- **GOTCHA**: Ensure no other files import AddChannel
- **VALIDATE**: `pnpm run build` (check no import errors)

### UPDATE src/components/index.ts

- **IMPLEMENT**: Update component exports to include AddCreatorModal
- **PATTERN**: Existing export structure in index.ts
- **IMPORTS**: Add AddCreatorModal export
- **GOTCHA**: Remove AddChannel export if it exists
- **VALIDATE**: `pnpm run build` (check export resolution)

---

## TESTING STRATEGY

### Unit Tests

Test individual component behavior and hook functionality:
- Modal open/close state management
- Form validation and submission
- Content type selection logic
- Import settings configuration
- Error handling and display

### Integration Tests

Test component integration with existing system:
- Modal integration with Chat page
- Hook integration with Supabase functions
- Creator addition workflow end-to-end
- Error state propagation

### Edge Cases

- Empty URL submission
- Invalid YouTube URLs
- Network errors during ingestion
- Plan limit exceeded scenarios
- Modal close during loading state

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm run lint
pnpm run build
```

### Level 2: Development Server

```bash
pnpm run dev &
curl -s http://localhost:5173 | head -5
```

### Level 3: Component Testing

```bash
# Manual testing steps:
# 1. Open http://localhost:5173/chat
# 2. Click "Add Creator" button
# 3. Verify modal opens with all sections
# 4. Test content type selection toggles
# 5. Test import mode selection
# 6. Test video limit input
# 7. Submit with valid YouTube URL
# 8. Verify creator gets added to sidebar
```

### Level 4: Error Handling

```bash
# Manual testing steps:
# 1. Submit empty URL - should show validation
# 2. Submit invalid URL - should show error
# 3. Test network error handling
# 4. Test modal close during loading
```

---

## ACCEPTANCE CRITERIA

- [ ] Modal opens and closes properly with smooth animations
- [ ] Content type selection works with at least one type required
- [ ] Import mode selection (latest/oldest/all) functions correctly
- [ ] Video limit input validates and clamps to reasonable ranges
- [ ] Form submission integrates with existing useIngestChannel hook
- [ ] Error states display clearly with appropriate messaging
- [ ] Loading states show proper indicators and disable interactions
- [ ] Modal integrates seamlessly with existing Chat page
- [ ] Creator addition workflow maintains existing functionality
- [ ] All TypeScript types compile without errors
- [ ] Component follows existing UI patterns and styling
- [ ] Responsive design works on mobile and desktop

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Modal opens and functions correctly
- [ ] Form submission works with real YouTube URLs
- [ ] Error handling displays appropriate messages
- [ ] Loading states work properly
- [ ] Integration with Chat page is seamless
- [ ] No TypeScript compilation errors
- [ ] No linting errors
- [ ] Manual testing confirms all features work
- [ ] Existing creator management functionality preserved

---

## NOTES

**Design Decisions:**
- Simplified useUsageLimits hook with mock data to avoid complex billing integration
- Simplified UpgradePlanDialog that shows upgrade message without actual billing
- Maintained existing useIngestChannel hook interface while extending parameters
- Used existing shadcn/ui components for consistency

**Trade-offs:**
- Mock usage limits instead of real billing integration (can be enhanced later)
- Simplified upgrade dialog without payment processing
- Maintained backward compatibility with existing AddChannel usage patterns

**Future Enhancements:**
- Real usage limits integration with billing system
- Advanced content filtering options
- Bulk creator import functionality
- Creator management dashboard
