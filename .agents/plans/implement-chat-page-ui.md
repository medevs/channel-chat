# Feature: Chat Page UI Implementation

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement the complete chat page UI for ChannelChat, featuring a three-column layout with collapsible sidebar, main chat area, and conditional video panel. The interface provides a coach-like experience where users can select creators, view chat history, send messages, and interact with video citations. The UI follows a dark theme with teal accents and includes responsive behavior for mobile devices.

## User Story

As a ChannelChat user
I want to interact with a comprehensive chat interface
So that I can select creators, view conversations, send messages, and watch referenced video content seamlessly

## Problem Statement

The current chat page is a placeholder with basic authentication display. Users need a fully functional chat interface that matches the detailed UI specifications and mockup, including sidebar navigation, message display, confidence indicators, source citations, and video playback integration.

## Solution Statement

Implement a complete chat dashboard UI with three main components: AppSidebar for creator management, ChatArea for message interaction, and VideoPanel for video playback. The interface will be responsive, accessible, and follow the established design system with proper state management and user interactions.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Frontend UI, Chat Components, Video Integration
**Dependencies**: shadcn/ui components, Lucide React icons, React state management

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/pages/Chat.tsx` (lines 1-85) - Why: Current placeholder implementation to replace
- `src/components/ui/button.tsx` - Why: Existing button component patterns
- `src/components/ui/card.tsx` - Why: Card component for message bubbles and creator cards
- `src/components/ui/input.tsx` - Why: Input component patterns for message input
- `src/contexts/AuthContext.tsx` - Why: User authentication context for user data
- `src/hooks/useAuth.ts` - Why: Authentication hook patterns
- `src/lib/utils.ts` - Why: Utility functions for className merging
- `tailwind.config.js` - Why: Tailwind configuration and theme colors
- `components.json` - Why: shadcn/ui configuration

### New Files to Create

- `src/components/chat/AppSidebar.tsx` - Main sidebar with creator list and navigation
- `src/components/chat/ChatArea.tsx` - Central chat interface with messages and input
- `src/components/chat/VideoPanel.tsx` - Video player panel for timestamp playback
- `src/components/chat/CreatorCard.tsx` - Individual creator card in sidebar
- `src/components/chat/MessageBubble.tsx` - Chat message display component
- `src/components/chat/SourceCard.tsx` - Video source citation component
- `src/components/chat/ConfidenceIndicator.tsx` - AI response confidence display
- `src/components/chat/EmptyState.tsx` - Empty chat state with suggestions
- `src/components/chat/TypingIndicator.tsx` - AI typing animation
- `src/components/chat/index.ts` - Chat components barrel export
- `src/types/chat.ts` - TypeScript types for chat functionality
- `src/hooks/useChat.ts` - Chat state management hook
- `src/hooks/useVideoPlayer.ts` - Video player state management

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [shadcn/ui Avatar](https://ui.shadcn.com/docs/components/avatar)
  - Specific section: Avatar with fallback and image handling
  - Why: Required for creator avatars and user profile display
- [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge)
  - Specific section: Badge variants and styling
  - Why: Status badges, confidence indicators, subscriber counts
- [shadcn/ui Textarea](https://ui.shadcn.com/docs/components/textarea)
  - Specific section: Auto-resizing textarea
  - Why: Message input with multi-line support
- [shadcn/ui ScrollArea](https://ui.shadcn.com/docs/components/scroll-area)
  - Specific section: Custom scrollbars
  - Why: Scrollable message area and creator list
- [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/sheet)
  - Specific section: Responsive drawer behavior
  - Why: Mobile sidebar overlay functionality
- [shadcn/ui Tooltip](https://ui.shadcn.com/docs/components/tooltip)
  - Specific section: Tooltip positioning and content
  - Why: Confidence explanations and UI hints
- [Lucide React Icons](https://lucide.dev/icons/)
  - Specific section: Icon usage in React
  - Why: All UI icons (send, menu, play, bookmark, etc.)

### Patterns to Follow

**Component Structure Pattern:**
```typescript
// From existing components
interface ComponentProps {
  className?: string;
  // specific props
}

export function Component({ className, ...props }: ComponentProps) {
  return (
    <div className={cn("base-classes", className)} {...props}>
      {/* content */}
    </div>
  );
}
```

**Styling Pattern:**
```typescript
// From tailwind.config.js and existing components
const variants = cva("base-classes", {
  variants: {
    variant: {
      default: "default-classes",
      secondary: "secondary-classes",
    },
    size: {
      sm: "small-classes",
      lg: "large-classes",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});
```

**State Management Pattern:**
```typescript
// From AuthContext.tsx
const [state, setState] = useState<StateType>(() => ({
  // initial state
}));

// Custom hook pattern
export function useCustomHook() {
  const [loading, setLoading] = useState(false);
  // hook logic
  return { loading, /* other values */ };
}
```

**Responsive Design Pattern:**
```css
/* Mobile-first approach from existing components */
.component {
  @apply base-mobile-classes;
  @apply sm:tablet-classes;
  @apply lg:desktop-classes;
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation Setup

Set up required shadcn/ui components and base types for chat functionality.

**Tasks:**
- Install all required shadcn/ui components
- Create TypeScript types for chat data structures
- Set up component directory structure
- Create barrel exports for organization

### Phase 2: Core Components

Implement the main chat components with proper styling and basic functionality.

**Tasks:**
- Create AppSidebar with creator list and navigation
- Implement ChatArea with message display and input
- Build VideoPanel for video playback
- Add responsive behavior and mobile support

### Phase 3: Interactive Elements

Add interactive features like message bubbles, confidence indicators, and source citations.

**Tasks:**
- Implement MessageBubble with user/AI variants
- Create ConfidenceIndicator with tooltip explanations
- Build SourceCard for video citations
- Add EmptyState and TypingIndicator components

### Phase 4: Integration & Polish

Connect components together and add final polish with animations and accessibility.

**Tasks:**
- Integrate all components in main Chat page
- Add proper state management hooks
- Implement responsive drawer behavior
- Add animations and accessibility features

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### INSTALL shadcn/ui components

- **IMPLEMENT**: Install all required shadcn/ui components for chat interface
- **PATTERN**: Use pnpm dlx shadcn@latest add command
- **IMPORTS**: Avatar, Badge, Textarea, ScrollArea, Tooltip, Sheet, Separator, Dialog, DropdownMenu, Popover, Skeleton, Progress
- **GOTCHA**: Install components one by one to avoid conflicts
- **VALIDATE**: `ls src/components/ui/ | wc -l` should show 15+ components

### CREATE src/types/chat.ts

- **IMPLEMENT**: TypeScript interfaces for chat functionality
- **PATTERN**: Follow existing type patterns from src/types/auth.ts
- **IMPORTS**: No external imports needed
- **GOTCHA**: Use proper TypeScript naming conventions (PascalCase for interfaces)
- **VALIDATE**: `tsc --noEmit` should pass without errors

### CREATE src/components/chat/index.ts

- **IMPLEMENT**: Barrel export file for chat components
- **PATTERN**: Follow src/components/index.ts pattern
- **IMPORTS**: Export all chat components
- **GOTCHA**: Keep exports organized and alphabetical
- **VALIDATE**: File should exist and export placeholder components

### CREATE src/components/chat/AppSidebar.tsx

- **IMPLEMENT**: Main sidebar component with creator list, add button, saved answers, and user profile
- **PATTERN**: Use Sheet component for mobile overlay, regular div for desktop
- **IMPORTS**: Avatar, Badge, Button, ScrollArea, Sheet, Separator, DropdownMenu from shadcn/ui
- **GOTCHA**: Handle responsive behavior with proper breakpoints (lg:)
- **VALIDATE**: Component renders without errors and shows proper layout

### CREATE src/components/chat/CreatorCard.tsx

- **IMPLEMENT**: Individual creator card with avatar, name, status badge, subscriber count, and menu
- **PATTERN**: Use Card component with hover states and click handlers
- **IMPORTS**: Avatar, Badge, Card, DropdownMenu, Button from shadcn/ui
- **GOTCHA**: Handle long creator names with text truncation
- **VALIDATE**: Card displays properly with all elements and hover effects

### CREATE src/components/chat/ChatArea.tsx

- **IMPLEMENT**: Main chat interface with header, message area, and input
- **PATTERN**: Flex column layout with sticky header and footer
- **IMPORTS**: ScrollArea, Textarea, Button, Badge, Avatar from shadcn/ui
- **GOTCHA**: Auto-scroll to bottom on new messages, handle input auto-resize
- **VALIDATE**: Layout works correctly with proper scrolling behavior

### CREATE src/components/chat/MessageBubble.tsx

- **IMPLEMENT**: Chat message component with user and AI variants
- **PATTERN**: Conditional styling based on message role (user/assistant)
- **IMPORTS**: Avatar, Badge from shadcn/ui, cn from utils
- **GOTCHA**: Proper alignment (right for user, left for AI) and tail styling
- **VALIDATE**: Both user and AI message variants display correctly

### CREATE src/components/chat/ConfidenceIndicator.tsx

- **IMPLEMENT**: Confidence level display with icon, label, and tooltip
- **PATTERN**: Use Badge component with Tooltip for explanations
- **IMPORTS**: Badge, Tooltip from shadcn/ui, appropriate Lucide icons
- **GOTCHA**: Different colors for confidence levels (green, amber, orange, gray)
- **VALIDATE**: All confidence levels display with correct colors and tooltips

### CREATE src/components/chat/SourceCard.tsx

- **IMPLEMENT**: Video citation card with thumbnail, title, timestamp, and click handler
- **PATTERN**: Use Card component with hover effects and play icon
- **IMPORTS**: Card, Button from shadcn/ui, Play icon from Lucide
- **GOTCHA**: Handle missing timestamps gracefully, truncate long titles
- **VALIDATE**: Cards display properly and handle click events

### CREATE src/components/chat/VideoPanel.tsx

- **IMPLEMENT**: Video player panel with YouTube embed and responsive behavior
- **PATTERN**: Use Sheet for mobile modal, regular div for desktop sidebar
- **IMPORTS**: Sheet, Button, Badge from shadcn/ui
- **GOTCHA**: Proper aspect ratio (16:9) and autoplay with timestamp
- **VALIDATE**: Panel opens correctly and displays video embed

### CREATE src/components/chat/EmptyState.tsx

- **IMPLEMENT**: Empty chat state with sparkle animation and suggested prompts
- **PATTERN**: Centered layout with animated icon and clickable suggestions
- **IMPORTS**: Button from shadcn/ui, Sparkles icon from Lucide
- **GOTCHA**: Gentle animation on sparkle icon, proper button styling
- **VALIDATE**: Empty state displays with animation and interactive buttons

### CREATE src/components/chat/TypingIndicator.tsx

- **IMPLEMENT**: AI typing animation with bouncing dots
- **PATTERN**: CSS animation with staggered delays for dots
- **IMPORTS**: No external components needed
- **GOTCHA**: Smooth animation timing and proper alignment
- **VALIDATE**: Animation plays smoothly and aligns with message bubbles

### CREATE src/hooks/useChat.ts

- **IMPLEMENT**: Chat state management hook with message handling
- **PATTERN**: Follow useAuth.ts pattern with state and actions
- **IMPORTS**: useState, useEffect from React
- **GOTCHA**: Proper state updates and error handling
- **VALIDATE**: Hook returns expected interface without errors

### CREATE src/hooks/useVideoPlayer.ts

- **IMPLEMENT**: Video player state management for panel visibility and current video
- **PATTERN**: Simple state hook with open/close actions
- **IMPORTS**: useState from React
- **GOTCHA**: Handle video URL construction and timestamp formatting
- **VALIDATE**: Hook manages video state correctly

### UPDATE src/pages/Chat.tsx

- **IMPLEMENT**: Replace placeholder content with complete chat dashboard
- **PATTERN**: Three-column layout with responsive behavior
- **IMPORTS**: All chat components from @/components/chat
- **GOTCHA**: Proper responsive breakpoints and state management
- **VALIDATE**: Full chat interface renders correctly on all screen sizes

### UPDATE src/components/index.ts

- **IMPLEMENT**: Add chat components to main barrel export
- **PATTERN**: Re-export from chat/index.ts
- **IMPORTS**: Export * from './chat'
- **GOTCHA**: Maintain alphabetical order
- **VALIDATE**: Components can be imported from @/components

---

## TESTING STRATEGY

### Unit Tests

Test individual chat components in isolation with proper props and state handling.

Design unit tests with React Testing Library:
- Component rendering with different props
- User interactions (clicks, typing, hover)
- State changes and callbacks
- Responsive behavior testing

### Integration Tests

Test component interactions and data flow between chat components.

Focus on:
- Sidebar creator selection updating chat area
- Message sending and display
- Video panel opening from source citations
- Mobile drawer behavior

### Edge Cases

Test specific edge cases for chat functionality:
- Empty creator list
- Long creator names and message content
- Missing video thumbnails or timestamps
- Network errors and loading states
- Mobile device orientations

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# TypeScript compilation
pnpm run build

# ESLint checking
pnpm run lint

# Component installation verification
ls src/components/ui/ | grep -E "(avatar|badge|textarea|scroll-area|tooltip|sheet)" | wc -l
```

### Level 2: Component Tests

```bash
# Test component creation
find src/components/chat -name "*.tsx" | wc -l  # Should be 9+ files

# Test type definitions
grep -r "interface.*Props" src/types/chat.ts | wc -l  # Should have multiple interfaces

# Test barrel exports
grep -c "export" src/components/chat/index.ts  # Should export all components
```

### Level 3: Integration Tests

```bash
# Test main chat page integration
grep -r "AppSidebar\|ChatArea\|VideoPanel" src/pages/Chat.tsx | wc -l  # Should be 3+

# Test responsive imports
grep -r "Sheet\|ScrollArea" src/components/chat/ | wc -l  # Should have multiple uses

# Test icon imports
grep -r "lucide-react" src/components/chat/ | wc -l  # Should have icon imports
```

### Level 4: Manual Validation

1. **Desktop Layout**: Open chat page on desktop (>1024px) and verify three-column layout
2. **Mobile Layout**: Test on mobile (<640px) and verify sidebar becomes drawer
3. **Creator Selection**: Click creator cards and verify chat area updates
4. **Message Display**: Verify user and AI message bubbles display correctly
5. **Video Panel**: Click source citations and verify video panel opens
6. **Responsive Behavior**: Test sidebar collapse and video panel modal on different screen sizes

### Level 5: Accessibility Validation

```bash
# Check for accessibility attributes
grep -r "aria-\|role=" src/components/chat/ | wc -l  # Should have accessibility attributes

# Check for semantic HTML
grep -r "<button\|<nav\|<main\|<aside" src/components/chat/ | wc -l  # Should use semantic elements
```

---

## ACCEPTANCE CRITERIA

- [ ] Complete chat dashboard with three-column layout implemented
- [ ] Sidebar shows creator list with avatars, names, and status badges
- [ ] Chat area displays messages with proper user/AI alignment
- [ ] Confidence indicators show with appropriate colors and tooltips
- [ ] Source citations display as clickable cards with video information
- [ ] Video panel opens with YouTube embed and timestamp seeking
- [ ] Responsive behavior works on mobile (sidebar as drawer, video as modal)
- [ ] Empty states display with suggested prompts
- [ ] Typing indicator animates smoothly
- [ ] All shadcn/ui components installed and working
- [ ] TypeScript types defined for all chat functionality
- [ ] Component exports organized with barrel files
- [ ] Styling follows design system with teal accents and dark theme
- [ ] Accessibility attributes present for screen readers
- [ ] No TypeScript errors or linting issues

---

## COMPLETION CHECKLIST

- [ ] All 15+ tasks completed in order
- [ ] Each component renders without errors
- [ ] All validation commands executed successfully
- [ ] TypeScript compilation passes
- [ ] ESLint checks pass
- [ ] Manual testing confirms responsive behavior
- [ ] Accessibility testing completed
- [ ] All acceptance criteria met
- [ ] Code follows project conventions
- [ ] Components properly exported and importable

---

## NOTES

### Design Decisions

- **Dark Theme**: Following the mockup with dark backgrounds and teal accents
- **Three-Column Layout**: Sidebar, chat area, and conditional video panel
- **Responsive Strategy**: Mobile-first with drawer overlays for small screens
- **Component Architecture**: Modular components with clear separation of concerns

### Performance Considerations

- **Lazy Loading**: Video panel only renders when opened
- **Virtual Scrolling**: Consider for large message lists (future enhancement)
- **Memoization**: Use React.memo for expensive components like MessageBubble

### Accessibility Features

- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Proper focus handling in modals and drawers
- **Color Contrast**: Ensure sufficient contrast for all text elements

### Future Enhancements

- **Animation Library**: Consider Framer Motion for advanced animations
- **Virtual Scrolling**: For performance with large message lists
- **Drag & Drop**: For file uploads in chat
- **Voice Input**: Integration with Web Speech API
