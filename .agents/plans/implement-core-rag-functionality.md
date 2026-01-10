# Feature: Core RAG (Retrieval Augmented Generation) Functionality

Implementation plan for complete RAG system that enables AI-powered chat with YouTube creator content using vector similarity search and grounded responses.

## Feature Description

Implement a complete RAG system that allows users to chat with AI mentors based on YouTube creators' video transcripts. The system uses OpenAI embeddings for semantic search, PostgreSQL with pgvector for storage, and sophisticated prompt engineering for grounded responses with confidence indicators and timestamp citations.

## User Story

As a user
I want to chat with an AI mentor based on a YouTube creator's content
So that I can get personalized advice and insights directly from their video transcripts with verifiable sources

## Problem Statement

The current ChannelChat application has basic UI components but lacks the core RAG functionality that enables AI-powered conversations based on creator content. Users need to be able to ask questions and receive accurate, grounded responses with proper citations and confidence indicators.

## Solution Statement

Implement the complete RAG pipeline including: vector embeddings generation, semantic search, conversation context management, sophisticated prompt engineering, and response generation with citations and confidence scoring.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Backend (Supabase Edge Functions), Database (PostgreSQL + pgvector), Frontend (Chat hooks and components)
**Dependencies**: OpenAI API, Supabase, pgvector extension

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/types/chat.ts` (lines 1-50) - Why: Current chat types need to be updated to match RAG types
- `src/hooks/useChat.ts` - Why: Current chat hook needs to be replaced with RAG implementation
- `src/lib/supabase.ts` - Why: Supabase client configuration pattern
- `supabase/config.toml` - Why: Supabase configuration for Edge Functions

### New Files to Create

- `src/hooks/useRagChat.ts` - RAG chat hook for basic chat functionality
- `src/hooks/usePersistentChat.ts` - Persistent chat with database storage
- `src/lib/types.ts` - Complete type definitions for RAG functionality
- `supabase/functions/rag-chat/index.ts` - Main RAG Edge Function
- `supabase/functions/_shared/abuse-protection.ts` - Rate limiting and security
- `supabase/migrations/` - Database schema for RAG functionality

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
  - Specific section: Deno runtime and function deployment
  - Why: Required for implementing RAG backend functions
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
  - Specific section: text-embedding-3-small model usage
  - Why: Core to vector similarity search implementation
- [pgvector Extension](https://github.com/pgvector/pgvector)
  - Specific section: Vector similarity search functions
  - Why: Database-level vector operations for RAG

### Patterns to Follow

**Type Definitions Pattern:**
```typescript
export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  sources?: VideoSource[];
  timestamp: Date;
  confidence?: AnswerConfidence;
  evidence?: AnswerEvidence;
}
```

**Hook Pattern:**
```typescript
export function useRagChat({ channelId }: UseRagChatOptions) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  // ... implementation
}
```

**Edge Function Pattern:**
```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // ... RAG implementation
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Schema & Types

Set up the database foundation and type definitions for RAG functionality.

**Tasks:**

- Create database schema for channels, videos, transcript_chunks, chat_sessions, chat_messages
- Set up pgvector extension for vector similarity search
- Generate TypeScript types from database schema
- Create comprehensive type definitions

### Phase 2: Backend RAG Implementation

Implement the core RAG Edge Functions and supporting utilities.

**Tasks:**

- Create abuse protection and rate limiting utilities
- Implement main rag-chat Edge Function with question classification
- Add vector embedding generation and similarity search
- Implement sophisticated prompt engineering with confidence scoring
- Add conversation context management and query expansion

### Phase 3: Frontend RAG Hooks

Build React hooks for RAG chat functionality.

**Tasks:**

- Create useRagChat hook for basic RAG functionality
- Implement usePersistentChat hook with database storage
- Add conversation history management
- Integrate with existing authentication context

### Phase 4: Integration & Testing

Connect RAG functionality to existing UI components and test thoroughly.

**Tasks:**

- Update existing chat components to use RAG hooks
- Test vector similarity search with real data
- Validate confidence scoring and citation generation
- Ensure proper error handling and rate limiting

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE supabase/migrations/20240101000001_create_rag_schema.sql

- **IMPLEMENT**: Complete database schema for RAG functionality
- **PATTERN**: PostgreSQL schema with pgvector extension
- **IMPORTS**: pgvector extension, UUID functions, timestamp functions
- **GOTCHA**: Ensure pgvector extension is enabled before creating vector columns
- **VALIDATE**: `supabase db reset && supabase db push`

### UPDATE src/lib/types.ts

- **IMPLEMENT**: Complete type definitions for RAG functionality
- **PATTERN**: TypeScript interfaces with proper exports
- **IMPORTS**: No external imports needed for types
- **GOTCHA**: Ensure VideoImportMode and AnswerConfidence types match exactly
- **VALIDATE**: `pnpm run build` (TypeScript compilation check)

### CREATE supabase/functions/_shared/abuse-protection.ts

- **IMPLEMENT**: Rate limiting, CORS headers, and security utilities
- **PATTERN**: Deno Edge Function utilities
- **IMPORTS**: Deno standard library for HTTP and crypto
- **GOTCHA**: Use Deno imports, not Node.js imports
- **VALIDATE**: `supabase functions deploy _shared --no-verify-jwt`

### CREATE supabase/functions/rag-chat/index.ts

- **IMPLEMENT**: Complete RAG Edge Function with all features
- **PATTERN**: Sophisticated RAG implementation
- **IMPORTS**: Supabase client, OpenAI API, abuse protection utilities
- **GOTCHA**: Question classification and query expansion are critical for quality
- **VALIDATE**: `supabase functions deploy rag-chat`

### CREATE src/hooks/useRagChat.ts

- **IMPLEMENT**: Basic RAG chat hook without persistence
- **PATTERN**: React hook with async operations
- **IMPORTS**: React hooks, Supabase client, auth context, types
- **GOTCHA**: Handle conversation history for context in follow-up questions
- **VALIDATE**: Test hook in isolation with mock data

### CREATE src/hooks/usePersistentChat.ts

- **IMPLEMENT**: RAG chat hook with database persistence
- **PATTERN**: Database-backed chat sessions
- **IMPORTS**: React hooks, Supabase client, auth context, RAG types
- **GOTCHA**: Session management and message persistence must be atomic
- **VALIDATE**: Test chat persistence across page reloads

### UPDATE src/types/chat.ts

- **IMPLEMENT**: Replace existing types with RAG-compatible types
- **PATTERN**: Import from lib/types.ts
- **IMPORTS**: Import all types from @/lib/types
- **GOTCHA**: Ensure backward compatibility with existing components
- **VALIDATE**: `pnpm run build` and check for type errors

### UPDATE src/hooks/useChat.ts

- **IMPLEMENT**: Replace mock implementation with usePersistentChat
- **PATTERN**: Hook composition pattern
- **IMPORTS**: usePersistentChat hook, existing auth context
- **GOTCHA**: Maintain same interface for existing components
- **VALIDATE**: Test existing chat components still work

### UPDATE src/pages/Chat.tsx

- **IMPLEMENT**: Connect to RAG functionality with proper creator selection
- **PATTERN**: Creator-based chat sessions
- **IMPORTS**: Updated hooks, RAG types, existing UI components
- **GOTCHA**: Handle creator selection and channel ID mapping
- **VALIDATE**: Test full chat flow with mock creator data

---

## TESTING STRATEGY

### Unit Tests

**Scope**: Individual functions and utilities
- Test question classification logic
- Test query expansion algorithms
- Test confidence scoring calculations
- Test timestamp formatting utilities

### Integration Tests

**Scope**: RAG pipeline end-to-end
- Test vector embedding generation
- Test similarity search with known data
- Test prompt engineering with various question types
- Test conversation context management

### Edge Cases

**Critical edge cases for RAG functionality:**
- Empty or very short queries
- Questions with no relevant content
- Follow-up questions without context
- Rate limiting and error scenarios
- Invalid creator/channel IDs

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# TypeScript compilation
pnpm run build

# ESLint validation
pnpm run lint

# Type checking
pnpm exec tsc --noEmit
```

### Level 2: Database & Functions

```bash
# Database schema validation
supabase db reset
supabase db push

# Edge Functions deployment
supabase functions deploy rag-chat
supabase functions deploy _shared --no-verify-jwt

# Test function locally
supabase functions serve
```

### Level 3: Integration Tests

```bash
# React component tests
pnpm run test

# Hook testing with React Testing Library
pnpm exec vitest run src/hooks/

# Type generation from database
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Level 4: Manual Validation

**RAG Chat Flow Testing:**
1. Start local Supabase: `supabase start`
2. Start frontend: `pnpm run dev`
3. Test chat with mock creator data
4. Verify vector search returns relevant results
5. Check confidence indicators and citations
6. Test conversation context in follow-up questions

### Level 5: Performance Validation

```bash
# Check Edge Function response times
curl -X POST http://localhost:54321/functions/v1/rag-chat \
  -H "Content-Type: application/json" \
  -d '{"query": "test question", "channel_id": "test"}'

# Monitor database query performance
# Check pgvector similarity search performance
```

---

## ACCEPTANCE CRITERIA

- [ ] RAG chat functionality works with vector similarity search
- [ ] Question classification correctly identifies query types (general, conceptual, moment, etc.)
- [ ] Confidence indicators accurately reflect answer quality
- [ ] Citations include proper video timestamps and sources
- [ ] Conversation context enhances follow-up question understanding
- [ ] Rate limiting prevents abuse while allowing normal usage
- [ ] Chat persistence works across browser sessions
- [ ] Error handling gracefully manages API failures and edge cases
- [ ] All validation commands pass with zero errors
- [ ] Performance meets requirements (< 3s response time)
- [ ] Security measures prevent prompt injection and abuse
- [ ] TypeScript types are comprehensive and accurate

---

## COMPLETION CHECKLIST

- [ ] Database schema created with pgvector support
- [ ] All RAG types defined and exported properly
- [ ] Abuse protection utilities implemented
- [ ] RAG Edge Function deployed and functional
- [ ] useRagChat hook created and tested
- [ ] usePersistentChat hook with database integration
- [ ] Existing chat components updated to use RAG
- [ ] All validation commands executed successfully
- [ ] Manual testing confirms RAG functionality works
- [ ] Performance benchmarks meet requirements
- [ ] Security testing validates protection measures
- [ ] Documentation updated with RAG implementation details

---

## NOTES

**Critical Implementation Details:**
- Question classification is essential for proper retrieval configuration
- Query expansion improves follow-up question understanding significantly
- Confidence scoring must be based on similarity thresholds and chunk quality
- Prompt engineering requires strict grounding to prevent hallucination
- Rate limiting must balance user experience with cost control
- Vector similarity search thresholds are tuned for quality over quantity

**Performance Considerations:**
- OpenAI embedding API calls are the primary latency bottleneck
- pgvector similarity search is optimized with proper indexing
- Conversation history is limited to prevent context window overflow
- Response caching could be added for frequently asked questions

**Security Measures:**
- Rate limiting prevents API abuse and cost overruns
- Input validation prevents prompt injection attacks
- User authentication ensures proper access control
- CORS headers restrict cross-origin requests appropriately
