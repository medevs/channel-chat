# Feature: Refactor Edge Functions into Smaller Components

## Feature Description

Refactor the two large Edge Functions (`ingest-youtube-channel/index.ts` and `rag-chat/index.ts`) into smaller, modular components without breaking functionality. This will improve maintainability, testability, and code organization while preserving all existing behavior.

## User Story

As a developer maintaining the ChannelChat codebase
I want the Edge Functions to be broken down into smaller, focused modules
So that the code is easier to understand, test, and maintain without losing any functionality

## Problem Statement

The current Edge Functions are monolithic files with 1000+ lines each, containing multiple responsibilities:
- **ingest-youtube-channel/index.ts**: 1000+ lines handling YouTube API integration, channel resolution, video processing, user management, and database operations
- **rag-chat/index.ts**: 1000+ lines handling RAG pipeline, question classification, prompt engineering, LLM integration, and response generation

This makes the code difficult to:
- Test individual components in isolation
- Understand specific functionality
- Maintain and debug issues
- Reuse components across functions

## Solution Statement

Break down each Edge Function into focused, single-responsibility modules while maintaining the exact same external API and behavior. Create a clean separation of concerns with proper TypeScript interfaces and error handling.

## Feature Metadata

**Feature Type**: Refactor
**Estimated Complexity**: Medium
**Primary Systems Affected**: Edge Functions, Shared utilities
**Dependencies**: Existing _shared utilities, Supabase client patterns

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `supabase/functions/ingest-youtube-channel/index.ts` - Main ingestion function to refactor
- `supabase/functions/rag-chat/index.ts` - Main RAG chat function to refactor  
- `supabase/functions/_shared/abuse-protection.ts` - Existing shared utilities pattern
- `supabase/functions/_shared/auth-middleware.ts` - Authentication patterns
- `supabase/functions/_shared/user-context.ts` - User context patterns

### New Files to Create

**Ingestion Function Components:**
- `supabase/functions/_shared/youtube/channel-resolver.ts` - Channel URL parsing and resolution
- `supabase/functions/_shared/youtube/video-fetcher.ts` - Video metadata and playlist fetching
- `supabase/functions/_shared/youtube/content-filter.ts` - Content type filtering and sorting
- `supabase/functions/_shared/ingestion/user-limits.ts` - User plan limits and validation
- `supabase/functions/_shared/ingestion/channel-manager.ts` - Channel database operations
- `supabase/functions/_shared/ingestion/video-processor.ts` - Video processing and storage

**RAG Chat Function Components:**
- `supabase/functions/_shared/rag/question-classifier.ts` - Question type classification
- `supabase/functions/_shared/rag/query-expander.ts` - Follow-up query enhancement
- `supabase/functions/_shared/rag/embedding-service.ts` - OpenAI embedding generation
- `supabase/functions/_shared/rag/chunk-searcher.ts` - Vector similarity search
- `supabase/functions/_shared/rag/prompt-builder.ts` - System prompt construction
- `supabase/functions/_shared/rag/response-generator.ts` - LLM response generation
- `supabase/functions/_shared/rag/citation-builder.ts` - Citation formatting

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
  - Specific section: TypeScript patterns and module organization
  - Why: Shows proper module structure for Edge Functions
- [Deno Module System](https://deno.land/manual/concepts/modules)
  - Specific section: ES modules and imports
  - Why: Required for proper module organization in Deno runtime

### Patterns to Follow

**Module Organization Pattern:**
```typescript
// Each module exports a focused interface
export interface ModuleConfig {
  // Configuration options
}

export interface ModuleResult {
  // Return type
}

export async function moduleFunction(
  config: ModuleConfig,
  dependencies: Dependencies
): Promise<ModuleResult> {
  // Implementation
}
```

**Error Handling Pattern:**
```typescript
// Consistent error handling across modules
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error('Module error:', error);
  return { success: false, error: error.message };
}
```

**Dependency Injection Pattern:**
```typescript
// Pass dependencies explicitly for testability
interface Dependencies {
  supabase: SupabaseClient;
  logger: Logger;
  apiKey?: string;
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Create Shared Module Structure

Set up the foundation for modular components with proper TypeScript interfaces and error handling.

**Tasks:**
- Create module directory structure under `_shared/`
- Define common interfaces and types
- Set up dependency injection patterns

### Phase 2: Extract YouTube Integration Components

Break down YouTube API integration into focused modules.

**Tasks:**
- Extract channel resolution logic
- Extract video fetching and metadata processing
- Extract content filtering and sorting
- Create comprehensive tests for each module

### Phase 3: Extract RAG Pipeline Components

Break down RAG functionality into focused modules.

**Tasks:**
- Extract question classification logic
- Extract embedding and search functionality
- Extract prompt building and response generation
- Create comprehensive tests for each module

### Phase 4: Refactor Main Functions

Update the main Edge Function files to use the new modular components.

**Tasks:**
- Refactor ingest-youtube-channel to use new modules
- Refactor rag-chat to use new modules
- Ensure identical external behavior
- Add integration tests

---

## STEP-BY-STEP TASKS

### CREATE supabase/functions/_shared/types/common.ts

- **IMPLEMENT**: Common TypeScript interfaces used across modules
- **PATTERN**: Mirror existing type definitions from main functions
- **IMPORTS**: None (base types file)
- **GOTCHA**: Keep interfaces compatible with existing function signatures
- **VALIDATE**: `deno check supabase/functions/_shared/types/common.ts`

### CREATE supabase/functions/_shared/youtube/channel-resolver.ts

- **IMPLEMENT**: Channel URL parsing and YouTube API resolution logic
- **PATTERN**: Extract `parseChannelUrl` and `resolveChannelId` functions from ingest function
- **IMPORTS**: Common types, YouTube API types
- **GOTCHA**: Maintain exact same URL parsing behavior and error handling
- **VALIDATE**: `deno check supabase/functions/_shared/youtube/channel-resolver.ts`

### CREATE supabase/functions/_shared/youtube/video-fetcher.ts

- **IMPLEMENT**: Video metadata fetching and playlist processing
- **PATTERN**: Extract `fetchPlaylistVideoIds`, `fetchVideoMetadata`, `fetchVideosFallback` functions
- **IMPORTS**: Common types, YouTube API integration
- **GOTCHA**: Preserve pagination logic and API quota handling
- **VALIDATE**: `deno check supabase/functions/_shared/youtube/video-fetcher.ts`

### CREATE supabase/functions/_shared/youtube/content-filter.ts

- **IMPLEMENT**: Content type detection, filtering, and sorting logic
- **PATTERN**: Extract `getVideoContentType`, `filterVideosByContentType`, `sortVideosByImportMode` functions
- **IMPORTS**: Common types, video metadata types
- **GOTCHA**: Keep exact same content type detection thresholds
- **VALIDATE**: `deno check supabase/functions/_shared/youtube/content-filter.ts`

### CREATE supabase/functions/_shared/ingestion/user-limits.ts

- **IMPLEMENT**: User plan limits, creator limits, and usage tracking
- **PATTERN**: Extract `getUserUsage`, `checkCreatorLimit`, `checkMessageLimit` functions
- **IMPORTS**: Supabase client, common types
- **GOTCHA**: Maintain exact same limit calculation logic
- **VALIDATE**: `deno check supabase/functions/_shared/ingestion/user-limits.ts`

### CREATE supabase/functions/_shared/ingestion/channel-manager.ts

- **IMPLEMENT**: Channel database operations and user linking
- **PATTERN**: Extract `checkUserHasChannel`, `linkUserToChannel`, `incrementUsageCounts` functions
- **IMPORTS**: Supabase client, common types
- **GOTCHA**: Preserve database transaction patterns and error handling
- **VALIDATE**: `deno check supabase/functions/_shared/ingestion/channel-manager.ts`

### CREATE supabase/functions/_shared/ingestion/video-processor.ts

- **IMPLEMENT**: Video processing, deduplication, and database storage
- **PATTERN**: Extract `getExistingVideoIds` and video upsert logic
- **IMPORTS**: Supabase client, common types
- **GOTCHA**: Maintain exact same deduplication and upsert behavior
- **VALIDATE**: `deno check supabase/functions/_shared/ingestion/video-processor.ts`

### CREATE supabase/functions/_shared/rag/question-classifier.ts

- **IMPLEMENT**: Question type classification and pattern matching
- **PATTERN**: Extract `classifyQuestion` function and related patterns
- **IMPORTS**: Common types, question type definitions
- **GOTCHA**: Keep exact same regex patterns and classification logic
- **VALIDATE**: `deno check supabase/functions/_shared/rag/question-classifier.ts`

### CREATE supabase/functions/_shared/rag/query-expander.ts

- **IMPLEMENT**: Follow-up query enhancement using conversation context
- **PATTERN**: Extract `expandFollowUpQuery` function
- **IMPORTS**: Common types, conversation types
- **GOTCHA**: Preserve keyword extraction and context expansion logic
- **VALIDATE**: `deno check supabase/functions/_shared/rag/query-expander.ts`

### CREATE supabase/functions/_shared/rag/embedding-service.ts

- **IMPLEMENT**: OpenAI embedding generation and vector operations
- **PATTERN**: Extract `generateQueryEmbedding` function
- **IMPORTS**: OpenAI API integration
- **GOTCHA**: Maintain exact same embedding model and error handling
- **VALIDATE**: `deno check supabase/functions/_shared/rag/embedding-service.ts`

### CREATE supabase/functions/_shared/rag/chunk-searcher.ts

- **IMPLEMENT**: Vector similarity search and chunk retrieval
- **PATTERN**: Extract `searchChunks`, `checkChannelIndexStatus` functions
- **IMPORTS**: Supabase client, embedding types
- **GOTCHA**: Keep exact same search thresholds and filtering logic
- **VALIDATE**: `deno check supabase/functions/_shared/rag/chunk-searcher.ts`

### CREATE supabase/functions/_shared/rag/prompt-builder.ts

- **IMPLEMENT**: System prompt construction and context building
- **PATTERN**: Extract `buildSystemPrompt`, `buildContextBlock`, `buildHistoryBlock` functions
- **IMPORTS**: Common types, prompt templates
- **GOTCHA**: Preserve exact prompt templates and formatting
- **VALIDATE**: `deno check supabase/functions/_shared/rag/prompt-builder.ts`

### CREATE supabase/functions/_shared/rag/response-generator.ts

- **IMPLEMENT**: LLM response generation and citation building
- **PATTERN**: Extract `generateResponse`, `generateWithOpenAI` functions
- **IMPORTS**: LLM API integration, citation types
- **GOTCHA**: Maintain exact same LLM parameters and fallback logic
- **VALIDATE**: `deno check supabase/functions/_shared/rag/response-generator.ts`

### CREATE supabase/functions/_shared/rag/citation-builder.ts

- **IMPLEMENT**: Citation formatting and video detail retrieval
- **PATTERN**: Extract `getVideoDetails`, `formatTimestamp`, citation building logic
- **IMPORTS**: Supabase client, citation types
- **GOTCHA**: Keep exact same citation format and deduplication
- **VALIDATE**: `deno check supabase/functions/_shared/rag/citation-builder.ts`

### UPDATE supabase/functions/ingest-youtube-channel/index.ts

- **IMPLEMENT**: Refactor main function to use new modular components
- **PATTERN**: Replace inline logic with module function calls
- **IMPORTS**: All new ingestion and YouTube modules
- **GOTCHA**: Ensure identical external API and error responses
- **VALIDATE**: `deno check supabase/functions/ingest-youtube-channel/index.ts`

### UPDATE supabase/functions/rag-chat/index.ts

- **IMPLEMENT**: Refactor main function to use new modular components
- **PATTERN**: Replace inline logic with module function calls
- **IMPORTS**: All new RAG modules
- **GOTCHA**: Ensure identical external API and response format
- **VALIDATE**: `deno check supabase/functions/rag-chat/index.ts`

---

## TESTING STRATEGY

### Unit Tests

Create focused unit tests for each extracted module:
- Test individual functions in isolation
- Mock dependencies using dependency injection
- Verify exact same behavior as original inline code
- Test error conditions and edge cases

### Integration Tests

Test module interactions and main function behavior:
- Test complete ingestion workflow with new modules
- Test complete RAG chat workflow with new modules
- Verify identical API responses before and after refactoring
- Test error propagation through module chain

### Edge Cases

Test specific scenarios that must work identically:
- YouTube API quota exceeded handling
- Rate limiting and concurrency locks
- Database transaction failures
- Invalid input validation
- Authentication edge cases

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
# Check TypeScript compilation for all new modules
deno check supabase/functions/_shared/types/common.ts
deno check supabase/functions/_shared/youtube/*.ts
deno check supabase/functions/_shared/ingestion/*.ts
deno check supabase/functions/_shared/rag/*.ts

# Check main functions still compile
deno check supabase/functions/ingest-youtube-channel/index.ts
deno check supabase/functions/rag-chat/index.ts
```

### Level 2: Unit Tests

```bash
# Run unit tests for extracted modules
pnpm run test:edge-functions tests/edge-functions/modules/
```

### Level 3: Integration Tests

```bash
# Test complete Edge Function workflows
pnpm run test:edge-functions tests/edge-functions/ingest-youtube-channel.test.ts
pnpm run test:edge-functions tests/edge-functions/rag-chat.test.ts
```

### Level 4: Manual Validation

```bash
# Test ingestion function with real YouTube channel
curl -X POST "http://localhost:54321/functions/v1/ingest-youtube-channel" \
  -H "Content-Type: application/json" \
  -d '{"channelUrl": "https://youtube.com/@test", "userId": "test-user"}'

# Test RAG chat function with real query
curl -X POST "http://localhost:54321/functions/v1/rag-chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "test question", "channel_id": "test-channel"}'
```

### Level 5: Additional Validation

```bash
# Run full test suite to ensure no regressions
pnpm run test:ci
```

---

## ACCEPTANCE CRITERIA

- [ ] All functionality extracted into focused, single-responsibility modules
- [ ] Main Edge Functions use new modular components exclusively
- [ ] External API behavior remains 100% identical
- [ ] All validation commands pass with zero errors
- [ ] Unit test coverage for all extracted modules (80%+)
- [ ] Integration tests verify end-to-end workflows
- [ ] No performance degradation in function execution
- [ ] Code is more maintainable and testable
- [ ] TypeScript interfaces provide clear contracts
- [ ] Error handling is consistent across modules
- [ ] Documentation updated for new module structure

---

## COMPLETION CHECKLIST

- [ ] All module files created with proper TypeScript interfaces
- [ ] Each module has single responsibility and clear purpose
- [ ] Main functions refactored to use new modules
- [ ] All validation commands executed successfully
- [ ] Unit tests created for each extracted module
- [ ] Integration tests verify identical behavior
- [ ] No regressions in existing functionality
- [ ] Code review confirms improved maintainability
- [ ] Performance benchmarks show no degradation
- [ ] Documentation reflects new modular structure

---

## NOTES

**Design Decisions:**
- Use dependency injection for testability and flexibility
- Maintain exact same external APIs to avoid breaking changes
- Create focused modules with single responsibilities
- Use TypeScript interfaces for clear contracts between modules
- Preserve all existing error handling and logging patterns

**Trade-offs:**
- Slightly more complex import structure vs. much better maintainability
- Additional files to manage vs. easier testing and debugging
- Initial refactoring effort vs. long-term development velocity

**Future Benefits:**
- Easier to add new features to specific components
- Better test coverage and debugging capabilities
- Reusable components across different Edge Functions
- Clearer separation of concerns and responsibilities
