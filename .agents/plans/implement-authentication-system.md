# Feature: Authentication System with Chat Redirect

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a complete authentication system using Supabase Auth with email/password and OAuth providers (Google/Facebook). After successful authentication, users are redirected to a simple chat page placeholder. The system includes form validation, error handling, loading states, session management, and protected routes.

## User Story

As a user
I want to create an account or sign in to ChannelChat
So that I can access the AI creator mentorship platform and start chatting with my favorite creators

## Problem Statement

The current authentication UI is complete but non-functional. Forms have no event handlers, no validation, no error states, and no integration with Supabase Auth. Users cannot actually authenticate or access protected areas of the application.

## Solution Statement

Implement complete Supabase authentication integration with React hooks for session management, form validation with error handling, protected route components, and post-authentication redirect to a chat page placeholder. Focus on email/password authentication first, with OAuth as enhancement.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Authentication, Routing, State Management
**Dependencies**: @supabase/supabase-js, react-router-dom, React hooks

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/pages/SignIn.tsx` - Complete UI form that needs authentication logic
- `src/pages/SignUp.tsx` - Complete UI form that needs authentication logic  
- `src/lib/supabase.ts` - Supabase client configuration
- `src/App.tsx` - Current routing structure to extend
- `src/lib/utils.ts` - Utility functions including `cn` for class merging
- `supabase/config.toml` - Supabase configuration with auth settings
- `components.json` - shadcn/ui configuration for component paths

### New Files to Create

- `src/hooks/useAuth.ts` - Authentication hook for session management
- `src/contexts/AuthContext.tsx` - Authentication context provider
- `src/components/ProtectedRoute.tsx` - Protected route wrapper component
- `src/pages/Chat.tsx` - Simple chat page placeholder
- `src/types/auth.ts` - TypeScript types for authentication

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Supabase Auth with React](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
  - Specific section: React Auth Helpers
  - Why: Shows proper React integration patterns
- [Supabase signUp](https://supabase.com/docs/reference/javascript/auth-signup)
  - Specific section: Email signup
  - Why: Required for user registration
- [Supabase signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
  - Specific section: Email/password signin
  - Why: Required for user login
- [Supabase onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
  - Specific section: Auth state listener
  - Why: Required for session management

### Patterns to Follow

**Naming Conventions:**
- React components: PascalCase (e.g., `AuthContext`, `ProtectedRoute`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth`)
- Files: PascalCase for components, camelCase for hooks
- Types: PascalCase interfaces (e.g., `AuthUser`, `AuthState`)

**Error Handling Pattern:**
```typescript
// Based on existing Supabase client pattern
try {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Handle success
} catch (error) {
  // Handle error with user-friendly message
}
```

**Component Structure Pattern:**
```typescript
// Following existing page component pattern from SignIn.tsx
export function ComponentName() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      {/* Component content */}
    </div>
  );
}
```

**Import Pattern:**
```typescript
// Following existing import pattern from SignIn.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up authentication types, context, and core hooks for session management.

**Tasks:**
- Create TypeScript interfaces for authentication state
- Implement authentication context with React Context API
- Create useAuth hook for session management and auth operations
- Set up auth state persistence and initialization

### Phase 2: Core Implementation

Implement authentication logic in existing forms and create protected route system.

**Tasks:**
- Add form handlers to SignIn and SignUp pages
- Implement form validation and error handling
- Add loading states and user feedback
- Create protected route wrapper component

### Phase 3: Integration

Connect authentication to routing system and create chat page placeholder.

**Tasks:**
- Update App.tsx with authentication context provider
- Add protected route for chat page
- Create simple chat page placeholder
- Implement post-authentication redirect logic

### Phase 4: Testing & Validation

Ensure authentication flows work correctly with proper error handling.

**Tasks:**
- Test sign up flow with email/password
- Test sign in flow with existing users
- Validate protected route access control
- Test session persistence across page refreshes

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/types/auth.ts

- **IMPLEMENT**: TypeScript interfaces for authentication state and user data
- **PATTERN**: Follow existing type patterns in codebase
- **IMPORTS**: No external imports needed
- **GOTCHA**: Keep interfaces simple and focused on auth needs
- **VALIDATE**: `npx tsc --noEmit`

### CREATE src/contexts/AuthContext.tsx

- **IMPLEMENT**: React context for authentication state management
- **PATTERN**: Standard React Context pattern with provider and hook
- **IMPORTS**: React, supabase client, auth types
- **GOTCHA**: Initialize with loading state to prevent flash of unauthenticated content
- **VALIDATE**: `npx tsc --noEmit`

### CREATE src/hooks/useAuth.ts

- **IMPLEMENT**: Custom hook for authentication operations and session management
- **PATTERN**: Custom hook pattern returning state and methods
- **IMPORTS**: React hooks, supabase client, auth context
- **GOTCHA**: Handle auth state changes with useEffect cleanup
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/App.tsx

- **IMPLEMENT**: Wrap app with AuthContext provider
- **PATTERN**: Context provider wrapper pattern from existing App structure
- **IMPORTS**: AuthContext provider
- **GOTCHA**: Provider must wrap BrowserRouter to access routing
- **VALIDATE**: `pnpm run dev` (check no errors in console)

### UPDATE src/pages/SignUp.tsx

- **IMPLEMENT**: Add form state, validation, and Supabase auth integration
- **PATTERN**: React useState for form state, async form handlers
- **IMPORTS**: React hooks, useAuth hook, react-router-dom navigate
- **GOTCHA**: Handle password confirmation validation before API call
- **VALIDATE**: `pnpm run dev` and test form submission

### UPDATE src/pages/SignIn.tsx

- **IMPLEMENT**: Add form state, validation, and Supabase auth integration
- **PATTERN**: Mirror SignUp form handling pattern
- **IMPORTS**: React hooks, useAuth hook, react-router-dom navigate
- **GOTCHA**: Handle "remember me" functionality with session persistence
- **VALIDATE**: `pnpm run dev` and test form submission

### CREATE src/components/ProtectedRoute.tsx

- **IMPLEMENT**: Route wrapper that requires authentication
- **PATTERN**: Higher-order component pattern for route protection
- **IMPORTS**: React, useAuth hook, react-router-dom Navigate
- **GOTCHA**: Show loading state while checking auth, redirect to signin if not authenticated
- **VALIDATE**: `npx tsc --noEmit`

### CREATE src/pages/Chat.tsx

- **IMPLEMENT**: Simple placeholder page for authenticated users
- **PATTERN**: Follow existing page component structure from Landing.tsx
- **IMPORTS**: Navigation component, useAuth hook for user display
- **GOTCHA**: Include sign out functionality for testing
- **VALIDATE**: `pnpm run dev` and check page renders

### UPDATE src/App.tsx

- **IMPLEMENT**: Add protected chat route with ProtectedRoute wrapper
- **PATTERN**: Follow existing Route pattern in App.tsx
- **IMPORTS**: Chat component, ProtectedRoute component
- **GOTCHA**: Ensure route path matches redirect logic in auth forms
- **VALIDATE**: `pnpm run dev` and test route protection

### UPDATE src/pages/index.ts

- **IMPLEMENT**: Export new Chat page component
- **PATTERN**: Follow existing export pattern in index.ts
- **IMPORTS**: Chat component
- **GOTCHA**: Maintain alphabetical order of exports
- **VALIDATE**: `npx tsc --noEmit`

---

## TESTING STRATEGY

### Unit Tests

Focus on authentication logic and form validation:
- useAuth hook state management
- Form validation functions
- Error handling scenarios
- Protected route logic

### Integration Tests

Test complete authentication flows:
- Sign up with email/password
- Sign in with existing credentials
- Session persistence across page refresh
- Protected route access control
- Sign out functionality

### Edge Cases

- Invalid email formats
- Weak passwords
- Network errors during auth
- Expired sessions
- Concurrent auth state changes
- Browser back/forward navigation

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
pnpm run lint
```

### Level 2: Build Validation

```bash
pnpm run build
```

### Level 3: Development Server

```bash
pnpm run dev
```

### Level 4: Manual Validation

**Sign Up Flow:**
1. Navigate to `/signup`
2. Fill form with valid email/password
3. Submit form
4. Verify redirect to `/chat`
5. Verify user is authenticated

**Sign In Flow:**
1. Navigate to `/signin`
2. Use credentials from sign up
3. Submit form
4. Verify redirect to `/chat`
5. Verify session persistence on refresh

**Protected Route:**
1. Navigate directly to `/chat` without auth
2. Verify redirect to `/signin`
3. Sign in and verify access granted

**Sign Out:**
1. From authenticated state in `/chat`
2. Click sign out
3. Verify redirect to landing page
4. Verify cannot access `/chat`

### Level 5: Additional Validation (Optional)

```bash
# Check Supabase local instance
supabase status
# Verify auth users in Supabase dashboard
```

---

## ACCEPTANCE CRITERIA

- [ ] Users can create accounts with email/password
- [ ] Users can sign in with existing credentials
- [ ] Form validation prevents invalid submissions
- [ ] Error messages display for auth failures
- [ ] Loading states show during auth operations
- [ ] Successful auth redirects to chat page
- [ ] Chat page is protected and requires authentication
- [ ] Unauthenticated users redirect to sign in
- [ ] Sessions persist across page refreshes
- [ ] Users can sign out and lose access to protected routes
- [ ] All validation commands pass with zero errors
- [ ] No TypeScript errors or warnings
- [ ] No console errors during auth flows
- [ ] UI remains responsive during auth operations

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full authentication flow tested manually
- [ ] No linting or type checking errors
- [ ] Protected routes work correctly
- [ ] Session management functions properly
- [ ] Error handling provides user feedback
- [ ] Loading states improve user experience
- [ ] Code follows project conventions

---

## NOTES

**Design Decisions:**
- Email/password authentication prioritized over OAuth for MVP
- Context API chosen over Redux for simplicity
- Protected routes use redirect pattern for better UX
- Form validation happens client-side before API calls
- Session state managed with Supabase auth state listener

**Security Considerations:**
- Passwords validated on both client and server
- Auth tokens handled automatically by Supabase client
- Protected routes check authentication server-side
- No sensitive data stored in localStorage

**Performance Considerations:**
- Auth context only re-renders when auth state changes
- Form validation debounced to prevent excessive API calls
- Loading states prevent duplicate submissions
- Session checks optimized with Supabase built-in caching