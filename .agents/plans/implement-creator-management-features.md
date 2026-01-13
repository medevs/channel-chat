# Feature: Implement Creator Management Features

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement comprehensive creator management features including View Profile, Refresh Videos, Share Link functionality, and a detailed Creator Profile page. These features will provide users with advanced creator management capabilities to enhance their interaction with YouTube creators in the ChannelChat platform.

## User Story

As a ChannelChat user
I want to manage my creators with advanced features like viewing detailed profiles, refreshing video lists, and sharing creator links
So that I can have better control over my creator library and share valuable creators with others

## Problem Statement

The current ChannelChat application needs enhanced creator management capabilities:
- Users need a "View Profile" option to see detailed creator information and statistics
- Users want "Refresh Videos" functionality to update creator content when new videos are published
- Users require "Share Link" feature to generate public creator links for sharing
- The application lacks a dedicated Creator Profile page with detailed statistics and video listings
- Creator interaction is currently limited to basic chat functionality

## Solution Statement

Implement a comprehensive creator management system by:
1. Adding dropdown menu options (View Profile, Refresh Videos, Share Link) to each creator
2. Creating a detailed Creator Profile page with statistics and video listings
3. Implementing refresh functionality to update creator video libraries from YouTube
4. Adding share link generation for public creator access
5. Enhancing routing to support creator profile navigation

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Frontend Components, Routing, Creator Management, Database Queries
**Dependencies**: React Router, Supabase client, existing creator hooks

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/components/chat/AppSidebar.tsx` (lines 280-320) - Why: Current dropdown menu implementation to extend
- `src/hooks/useCreators.ts` - Why: Creator management patterns and data fetching
- `src/types/database.ts` (lines 30-80) - Why: Database schema for channels and videos
- `src/App.tsx` - Why: Routing structure to extend with new creator profile route
- `src/pages/Chat.tsx` - Why: Current page structure and navigation patterns

### New Files to Create

- `src/pages/CreatorProfile.tsx` - Creator profile page with detailed statistics and video listings
- `src/hooks/useRefreshCreator.ts` - Hook for refreshing creator video data
- `src/components/creator/CreatorStats.tsx` - Component for displaying creator statistics
- `src/components/creator/VideoList.tsx` - Component for displaying creator's video list

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React Router Documentation](https://reactrouter.com/en/main/start/tutorial)
  - Specific section: Dynamic routing and useParams
  - Why: Required for implementing creator profile routes
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/select)
  - Specific section: Advanced queries and joins
  - Why: Needed for fetching creator and video data
- [Lucide React Icons](https://lucide.dev/icons/)
  - Specific section: User, RefreshCw, Share2 icons
  - Why: Icons needed for new dropdown menu options

### Patterns to Follow

**Dropdown Menu Pattern:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="w-3.5 h-3.5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem onClick={handleViewProfile}>
      <User className="w-4 h-4 mr-2" />
      View Profile
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleRefresh}>
      <RefreshCw className="w-4 h-4 mr-2" />
      Refresh Videos
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleShare}>
      <Share2 className="w-4 h-4 mr-2" />
      Share Link
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Navigation Pattern:**
```tsx
const navigate = useNavigate();
const handleViewProfile = (creatorId: string) => {
  navigate(`/creator/${creatorId}`);
};
```

**Hook Pattern:**
```tsx
export function useRefreshCreator() {
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  
  const refreshCreator = useCallback(async (channelId: string) => {
    // Implementation
  }, []);
  
  return { refreshCreator, isRefreshing };
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the basic infrastructure for creator management features including routing and hook structure.

**Tasks:**
- Create creator profile route structure
- Set up refresh creator hook foundation
- Add necessary icon imports

### Phase 2: Core Implementation

Implement the main creator management functionality including dropdown menu enhancements and profile page.

**Tasks:**
- Enhance AppSidebar dropdown menu with new options
- Create Creator Profile page with statistics
- Implement refresh creator functionality
- Add share link generation

### Phase 3: Integration

Connect all components and ensure proper navigation and data flow.

**Tasks:**
- Update routing configuration
- Connect profile page to navigation
- Integrate refresh functionality with existing creator management
- Add proper error handling and loading states

### Phase 4: Testing & Validation

Ensure all functionality works correctly and follows existing patterns.

**Tasks:**
- Test creator profile navigation
- Validate refresh functionality
- Test share link generation
- Verify responsive design and accessibility

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/hooks/useRefreshCreator.ts

- **IMPLEMENT**: Refresh creator hook with loading states and error handling
- **PATTERN**: Follow React hook patterns with useState and useCallback
- **IMPORTS**: useState, useCallback from react; supabase client; toast from sonner
- **GOTCHA**: Handle multiple simultaneous refresh requests with Set-based state
- **VALIDATE**: `pnpm run type-check`

### UPDATE src/components/chat/AppSidebar.tsx

- **IMPLEMENT**: Add View Profile, Refresh Videos, Share Link dropdown menu items
- **PATTERN**: Follow existing dropdown menu structure, add new menu items before separator
- **IMPORTS**: Add User, RefreshCw, Share2 from lucide-react; useNavigate from react-router-dom
- **GOTCHA**: Prevent event propagation on dropdown clicks, handle loading states
- **VALIDATE**: `pnpm run dev` and check dropdown menu appears with new options

### CREATE src/pages/CreatorProfile.tsx

- **IMPLEMENT**: Complete creator profile page with statistics and video list
- **PATTERN**: Follow existing page structure patterns from Chat.tsx
- **IMPORTS**: React hooks, react-router-dom, lucide-react icons, UI components, supabase client
- **GOTCHA**: Handle authentication checks, creator access validation, loading states
- **VALIDATE**: Navigate to `/creator/test-id` and verify page structure

### CREATE src/components/creator/CreatorStats.tsx

- **IMPLEMENT**: Creator statistics display component
- **PATTERN**: Card-based layout with metrics (total videos, indexed videos, status)
- **IMPORTS**: Card components, Badge, Avatar from UI library
- **GOTCHA**: Handle null/undefined values gracefully, format numbers properly
- **VALIDATE**: Component renders with mock data

### CREATE src/components/creator/VideoList.tsx

- **IMPLEMENT**: Video list component with sorting and filtering
- **PATTERN**: List layout with thumbnails, titles, dates, and status badges
- **IMPORTS**: UI components, date formatting utilities, lucide-react icons
- **GOTCHA**: Handle missing thumbnails, duration formatting, transcript status
- **VALIDATE**: Component renders video list correctly

### UPDATE src/App.tsx

- **IMPLEMENT**: Add creator profile route to routing configuration
- **PATTERN**: Follow existing route structure with ProtectedRoute wrapper
- **IMPORTS**: Add CreatorProfile page import
- **GOTCHA**: Ensure route parameter matches expected format (:creatorId)
- **VALIDATE**: `pnpm run dev` and verify routing works without errors

### UPDATE src/components/chat/AppSidebar.tsx (handlers)

- **IMPLEMENT**: Add event handlers for View Profile, Refresh Videos, Share Link
- **PATTERN**: Follow existing handler patterns with error handling and loading states
- **IMPORTS**: useRefreshCreator hook, navigation utilities
- **GOTCHA**: Handle async operations properly, show appropriate feedback
- **VALIDATE**: Click each dropdown option and verify expected behavior

### ADD share link functionality

- **IMPLEMENT**: Generate and copy share links for creators
- **PATTERN**: Create public slug if not exists, copy to clipboard with toast feedback
- **IMPORTS**: supabase client for database updates, clipboard API
- **GOTCHA**: Handle clipboard API failures gracefully, ensure unique slugs
- **VALIDATE**: Generate share link and verify it's copied to clipboard

### UPDATE src/types/database.ts (if needed)

- **IMPLEMENT**: Add any missing type definitions for new functionality
- **PATTERN**: Follow existing database type patterns
- **IMPORTS**: Extend existing Database interface
- **GOTCHA**: Ensure types match actual database schema
- **VALIDATE**: `pnpm run type-check`

### ADD responsive design support

- **IMPLEMENT**: Ensure creator profile page works on mobile and tablet
- **PATTERN**: Follow existing responsive patterns in Chat.tsx
- **IMPORTS**: useBreakpoint hook, responsive utility classes
- **GOTCHA**: Test on different screen sizes, ensure touch interactions work
- **VALIDATE**: Test on mobile viewport in browser dev tools

### ADD error handling and loading states

- **IMPLEMENT**: Comprehensive error handling for all new functionality
- **PATTERN**: Follow existing error handling patterns with toast notifications
- **IMPORTS**: Error boundary components, loading skeletons
- **GOTCHA**: Handle network failures, authentication errors, not found states
- **VALIDATE**: Test error scenarios and verify proper feedback

### UPDATE navigation integration

- **IMPLEMENT**: Ensure smooth navigation between chat and profile pages
- **PATTERN**: Maintain active creator state across navigation
- **IMPORTS**: Navigation utilities, state management hooks
- **GOTCHA**: Preserve chat state when navigating to profile and back
- **VALIDATE**: Navigate between pages and verify state persistence

---

## TESTING STRATEGY

### Unit Tests

Test individual components and hooks in isolation:
- useRefreshCreator hook functionality
- CreatorStats component rendering
- VideoList component sorting and filtering
- Share link generation logic

### Integration Tests

Test component interactions and data flow:
- AppSidebar dropdown menu interactions
- Creator profile page data loading
- Navigation between chat and profile pages
- Refresh functionality integration

### Edge Cases

Test specific edge cases that must be handled:
- Creator not found scenarios
- Network failure during refresh
- Clipboard API not available
- Missing creator data fields
- Authentication failures

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm run type-check
pnpm run lint
```

### Level 2: Build Verification

```bash
pnpm run build
```

### Level 3: Development Testing

```bash
pnpm run dev &
# Test in browser:
# 1. Navigate to chat page
# 2. Click creator dropdown menu
# 3. Verify new options appear
# 4. Click "View Profile" and verify navigation
# 5. Test refresh functionality
# 6. Test share link generation
```

### Level 4: Manual Validation

**Creator Profile Navigation:**
- Click "View Profile" from creator dropdown
- Verify navigation to `/creator/{id}` route
- Confirm creator statistics display correctly
- Check video list loads and displays properly

**Refresh Functionality:**
- Click "Refresh Videos" from dropdown
- Verify loading state appears
- Confirm toast notification on completion
- Check that new videos appear if available

**Share Link Generation:**
- Click "Share Link" from dropdown
- Verify link is copied to clipboard
- Confirm toast notification appears
- Test that generated link is accessible

### Level 5: Responsive Testing

```bash
# Test responsive design
# 1. Open browser dev tools
# 2. Test mobile viewport (375px width)
# 3. Test tablet viewport (768px width)
# 4. Verify all functionality works on touch devices
```

---

## ACCEPTANCE CRITERIA

- [ ] Creator dropdown menu includes View Profile, Refresh Videos, and Share Link options
- [ ] View Profile navigates to dedicated creator profile page
- [ ] Creator profile page displays comprehensive statistics and video list
- [ ] Refresh Videos functionality updates creator's video library
- [ ] Share Link generates and copies public creator links
- [ ] All functionality works on desktop, tablet, and mobile devices
- [ ] Loading states and error handling work correctly
- [ ] Navigation preserves application state appropriately
- [ ] All validation commands pass with zero errors
- [ ] Code follows existing patterns and conventions
- [ ] TypeScript types are properly defined and used
- [ ] Responsive design works across all screen sizes

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (build + dev testing)
- [ ] No TypeScript or linting errors
- [ ] Manual testing confirms all features work
- [ ] Responsive design verified on multiple screen sizes
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Decisions:**
- Following existing ChannelChat patterns for consistency
- Using existing UI component library for visual consistency
- Implementing progressive enhancement for share functionality
- Maintaining existing navigation patterns and state management

**Performance Considerations:**
- Lazy loading creator profile data
- Efficient video list rendering with virtualization if needed
- Optimistic UI updates for refresh functionality
- Proper cleanup of async operations

**Security Considerations:**
- Validating creator access permissions
- Sanitizing public slug generation
- Proper authentication checks on profile pages
- Rate limiting refresh operations

**Future Enhancements:**
- Video search and filtering on profile page
- Bulk creator operations
- Creator analytics and insights
- Export functionality for creator data