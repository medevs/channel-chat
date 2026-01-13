# Feature: Implement Critical Unit Tests

## Feature Description

Add comprehensive unit tests for the most critical business logic components in the ChannelChat application, focusing on backend Edge Functions and frontend hooks that handle complex state management, API interactions, and data processing. This will improve code reliability, catch regressions early, and ensure data integrity across the application.

## User Story

As a developer maintaining the ChannelChat application
I want comprehensive unit tests for critical business logic
So that I can confidently deploy changes without breaking core functionality and catch bugs before they reach users

## Problem Statement

The application currently lacks unit tests for several critical components:
- Complex custom React hooks with business logic (useCreators, usePersistentChat, useRagChat, etc.)
- Backend Edge Functions with complex processing (rag-chat, run-pipeline, ingest-youtube-channel)
- Utility functions with validation logic and edge cases
- Shared modules used across multiple functions

This creates risk of regressions and makes refactoring dangerous.

## Solution Statement

Implement focused unit tests for the highest-risk, most complex components identified through codebase analysis. Prioritize backend business logic and frontend hooks over simple presentational components. Use existing test patterns and frameworks already established in the project.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: High
**Primary Systems Affected**: Testing infrastructure, Backend Edge Functions, Frontend hooks
**Dependencies**: Vitest, React Testing Library, MSW (for API mocking)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

**Existing Test Patterns:**
- `tests/validation.test.ts` - Pattern for utility function testing
- `tests/useRefreshCreator.test.ts` - Pattern for hook testing with mocks
- `tests/edge-functions/rag-chat.test.ts` - Pattern for Edge Function testing
- `tests/setup-tests.ts` - Test configuration and global setup

**Target Files for Testing:**
- `src/lib/validation.ts` - Email validation functions (already has some tests)
- `src/lib/utils.ts` - CSS utility functions
- `src/hooks/useCreators.ts` - Complex creator management hook
- `src/hooks/usePersistentChat.ts` - Chat persistence logic
- `src/hooks/useRagChat.ts` - AI chat functionality
- `src/hooks/useSavedAnswers.ts` - Saved answers CRUD operations
- `src/hooks/useIngestChannel.ts` - Channel ingestion logic
- `supabase/functions/_shared/rag/confidence-calculator.ts` - Confidence scoring
- `supabase/functions/_shared/rag/question-classifier.ts` - Question classification
- `supabase/functions/_shared/abuse-protection.ts` - Rate limiting logic
- `supabase/functions/_shared/youtube/video-fetcher.ts` - YouTube API integration

### New Files to Create

**Frontend Unit Tests:**
- `src/lib/utils.test.ts` - CSS utility function tests
- `src/hooks/useCreators.test.ts` - Creator management hook tests
- `src/hooks/usePersistentChat.test.ts` - Chat persistence tests
- `src/hooks/useRagChat.test.ts` - AI chat functionality tests
- `src/hooks/useSavedAnswers.test.ts` - Saved answers CRUD tests
- `src/hooks/useIngestChannel.test.ts` - Channel ingestion tests

**Backend Unit Tests:**
- `tests/edge-functions/shared/confidence-calculator.test.ts` - Confidence scoring tests
- `tests/edge-functions/shared/question-classifier.test.ts` - Question classification tests
- `tests/edge-functions/shared/video-fetcher.test.ts` - YouTube API integration tests

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Vitest Documentation](https://vitest.dev/guide/)
  - Specific section: Mocking and testing async functions
  - Why: Project uses Vitest for unit testing
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
  - Specific section: Testing custom hooks
  - Why: For testing React hooks with renderHook
- [MSW Documentation](https://mswjs.io/docs/)
  - Specific section: Mocking REST API calls
  - Why: For mocking Supabase and external API calls

### Patterns to Follow

**Hook Testing Pattern** (from existing tests):
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({ data: [], error: null }))
  }))
};
```

**Edge Function Testing Pattern** (from existing tests):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('some-external-lib', () => ({
  default: vi.fn()
}));
```

**Validation Testing Pattern** (from existing validation.test.ts):
```typescript
describe('validation function', () => {
  it('should handle valid cases', () => {
    expect(validationFunction(validInput)).toBe(expectedOutput);
  });
  
  it('should handle edge cases', () => {
    expect(validationFunction(edgeCase)).toBe(expectedEdgeOutput);
  });
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Utility Functions

Start with simple, pure functions to establish testing patterns and build confidence.

**Tasks:**
- Enhance existing validation tests with edge cases
- Add comprehensive tests for CSS utility functions
- Set up shared test utilities and mocks

### Phase 2: Backend Shared Modules

Test critical shared modules used across multiple Edge Functions.

**Tasks:**
- Test confidence calculation algorithms
- Test question classification logic
- Test YouTube API integration functions
- Test abuse protection mechanisms

### Phase 3: Frontend Hooks - Data Management

Test hooks that manage data and state with complex business logic.

**Tasks:**
- Test creator management operations
- Test chat persistence logic
- Test saved answers CRUD operations
- Test channel ingestion workflows

### Phase 4: Frontend Hooks - AI Integration

Test hooks that integrate with AI services and handle complex responses.

**Tasks:**
- Test RAG chat functionality
- Test conversation history management
- Test citation processing

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/lib/utils.test.ts

- **IMPLEMENT**: Comprehensive tests for `cn()` function with various input combinations
- **PATTERN**: Follow validation.test.ts structure for utility testing
- **IMPORTS**: `import { describe, it, expect } from 'vitest'; import { cn } from './utils';`
- **GOTCHA**: Test with undefined, null, empty arrays, and mixed class types
- **VALIDATE**: `pnpm test src/lib/utils.test.ts`

### ENHANCE tests/validation.test.ts

- **IMPLEMENT**: Add edge cases for email validation (consecutive dots, spaces, unicode, very long emails)
- **PATTERN**: Extend existing test structure with additional test cases
- **IMPORTS**: No new imports needed
- **GOTCHA**: Test international domain names and edge cases from RFC 5322
- **VALIDATE**: `pnpm test tests/validation.test.ts`

### CREATE tests/edge-functions/shared/confidence-calculator.test.ts

- **IMPLEMENT**: Test confidence scoring algorithms with various similarity scores and source counts
- **PATTERN**: Mirror existing edge-function test structure
- **IMPORTS**: Import confidence calculator functions and mock dependencies
- **GOTCHA**: Test boundary conditions (0, 1, very small numbers) and ensure scores are between 0-1
- **VALIDATE**: `pnpm test tests/edge-functions/shared/confidence-calculator.test.ts`

### CREATE tests/edge-functions/shared/question-classifier.test.ts

- **IMPLEMENT**: Test question classification patterns and edge cases
- **PATTERN**: Use describe/it structure with various question types
- **IMPORTS**: Import classifier functions and test data
- **GOTCHA**: Test ambiguous questions, non-questions, and multilingual input
- **VALIDATE**: `pnpm test tests/edge-functions/shared/question-classifier.test.ts`

### CREATE tests/edge-functions/shared/video-fetcher.test.ts

- **IMPLEMENT**: Test YouTube API integration with mocked responses
- **PATTERN**: Mock external API calls using vi.mock
- **IMPORTS**: Import video fetcher and mock YouTube API responses
- **GOTCHA**: Test API failures, rate limiting, and malformed responses
- **VALIDATE**: `pnpm test tests/edge-functions/shared/video-fetcher.test.ts`

### CREATE src/hooks/useCreators.test.ts

- **IMPLEMENT**: Test creator CRUD operations, polling logic, and error handling
- **PATTERN**: Use renderHook from React Testing Library, mock Supabase client
- **IMPORTS**: `import { renderHook, waitFor } from '@testing-library/react'; import { vi } from 'vitest';`
- **GOTCHA**: Test async operations with proper waiting, mock all Supabase methods used
- **VALIDATE**: `pnpm test src/hooks/useCreators.test.ts`

### CREATE src/hooks/usePersistentChat.test.ts

- **IMPLEMENT**: Test chat session management, message persistence, and history loading
- **PATTERN**: Mock localStorage and Supabase, test state transitions
- **IMPORTS**: Mock storage APIs and database operations
- **GOTCHA**: Test session restoration, concurrent updates, and storage failures
- **VALIDATE**: `pnpm test src/hooks/usePersistentChat.test.ts`

### CREATE src/hooks/useRagChat.test.ts

- **IMPLEMENT**: Test AI chat functionality, message flow, and citation processing
- **PATTERN**: Mock AI service responses and database operations
- **IMPORTS**: Mock external AI APIs and internal chat services
- **GOTCHA**: Test streaming responses, timeout handling, and malformed AI responses
- **VALIDATE**: `pnpm test src/hooks/useRagChat.test.ts`

### CREATE src/hooks/useSavedAnswers.test.ts

- **IMPLEMENT**: Test save/unsave operations, optimistic updates, and data synchronization
- **PATTERN**: Mock database operations and test state consistency
- **IMPORTS**: Mock Supabase CRUD operations and user context
- **GOTCHA**: Test race conditions, duplicate saves, and network failures
- **VALIDATE**: `pnpm test src/hooks/useSavedAnswers.test.ts`

### CREATE src/hooks/useIngestChannel.test.ts

- **IMPLEMENT**: Test channel ingestion workflow, timeout handling, and progress tracking
- **PATTERN**: Mock ingestion API calls and test async state management
- **IMPORTS**: Mock ingestion services and progress tracking
- **GOTCHA**: Test timeout scenarios, API failures, and progress updates
- **VALIDATE**: `pnpm test src/hooks/useIngestChannel.test.ts`

---

## TESTING STRATEGY

### Unit Tests

**Scope**: Focus on business logic, edge cases, and error handling for critical components

**Framework**: Vitest with React Testing Library for hooks

**Mocking Strategy**:
- Mock Supabase client for all database operations
- Mock external APIs (YouTube, OpenAI, TranscriptAPI)
- Mock browser APIs (localStorage, fetch) where needed
- Use MSW for complex API mocking scenarios

**Coverage Requirements**: Aim for 90%+ coverage on tested functions, focus on branch coverage

### Test Categories

**Pure Functions** (utils, validation):
- Test all input/output combinations
- Focus on edge cases and boundary conditions
- Test error conditions and invalid inputs

**Async Functions** (API calls, database operations):
- Test success and failure scenarios
- Test timeout and retry logic
- Test concurrent operations and race conditions

**React Hooks** (state management, effects):
- Test initial state and state transitions
- Test cleanup and unmounting scenarios
- Test dependency changes and re-renders

**Business Logic** (algorithms, calculations):
- Test mathematical edge cases (0, negative, infinity)
- Test data transformation accuracy
- Test performance with large datasets

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm run lint
pnpm run type-check
```

### Level 2: Unit Tests

```bash
# Run all new unit tests
pnpm test src/lib/utils.test.ts
pnpm test tests/validation.test.ts
pnpm test tests/edge-functions/shared/
pnpm test src/hooks/

# Run with coverage
pnpm test --coverage
```

### Level 3: Integration Tests

```bash
# Ensure existing integration tests still pass
pnpm test tests/integration/
pnpm test tests/edge-functions/
```

### Level 4: Manual Validation

```bash
# Test that application still works end-to-end
pnpm run dev
# Manually test: login, add creator, chat functionality, save answers
```

### Level 5: Performance Validation

```bash
# Ensure tests run quickly
pnpm test --reporter=verbose
# All unit tests should complete in < 30 seconds
```

---

## ACCEPTANCE CRITERIA

- [ ] All utility functions have comprehensive unit tests with edge cases
- [ ] Critical backend shared modules have 90%+ test coverage
- [ ] All complex React hooks have unit tests covering main workflows
- [ ] All tests pass consistently without flakiness
- [ ] Test suite runs in under 30 seconds
- [ ] No regressions in existing functionality
- [ ] Code coverage increases by at least 40% for tested modules
- [ ] All validation commands pass with zero errors
- [ ] Tests follow established patterns and conventions
- [ ] Mock strategies are consistent and maintainable

---

## COMPLETION CHECKLIST

- [ ] All utility function tests implemented and passing
- [ ] Backend shared module tests implemented and passing
- [ ] All critical React hook tests implemented and passing
- [ ] Test coverage meets requirements (90%+ for tested modules)
- [ ] All validation commands executed successfully
- [ ] No test flakiness or intermittent failures
- [ ] Test performance is acceptable (< 30s total runtime)
- [ ] Code follows project testing conventions
- [ ] Mock strategies are properly implemented
- [ ] Documentation updated with testing guidelines

---

## NOTES

**Priority Order**: Start with utility functions and shared modules as they're used across the application. Then move to hooks in order of complexity and business impact.

**Testing Philosophy**: Focus on behavior over implementation. Test what the function does, not how it does it. This makes tests more resilient to refactoring.

**Mock Strategy**: Mock at the boundary - mock external services and APIs, but test internal business logic without mocking internal functions.

**Performance Considerations**: Keep tests fast by avoiding unnecessary async operations and using minimal test data. Use `vi.useFakeTimers()` for time-dependent tests.

**Maintenance**: Regularly review and update tests when business logic changes. Remove or update tests for deprecated functionality.