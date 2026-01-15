# Feature: Streaming Chat Responses with Markdown Formatting and Real Search

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement streaming chat responses from OpenAI API with real-time display, proper markdown rendering in the UI (converting markdown syntax to formatted HTML), and fix the chat search functionality to query actual database records instead of showing mock data.

## User Story

As a user chatting with a creator AI
I want to see responses stream in real-time with proper formatting (bold, lists, etc.)
So that I get immediate feedback and can read well-formatted answers instead of raw markdown syntax

As a user searching chat history
I want to find my actual past conversations
So that I can quickly reference previous answers and discussions

## Problem Statement

**Current Issues:**
1. **No Streaming**: Chat responses appear all at once after full generation, creating perceived latency
2. **Raw Markdown Display**: Responses show markdown syntax (e.g., `**bold**`, `1. item`) instead of formatted text
3. **Broken Search**: ChatSearchDialog shows only mock data, not real database queries

**Impact:**
- Poor UX with long wait times for responses
- Unprofessional appearance with unformatted text
- Search feature is non-functional

## Solution Statement

1. **Streaming Implementation**: Modify `rag-chat` Edge Function to use OpenAI streaming API and implement Server-Sent Events (SSE) for real-time token delivery
2. **Markdown Rendering**: Add `react-markdown` library and create a markdown renderer component for AI messages
3. **Real Search**: Implement database query in search functionality to fetch actual chat messages from `chat_messages` table

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: 
- Edge Functions (rag-chat)
- Frontend hooks (useRagChat, usePersistentChat)
- UI Components (ChatArea, MessageBubble, ChatSearchDialog)
- Database queries (chat search)

**Dependencies**: 
- react-markdown (^9.0.0)
- remark-gfm (^4.0.0) - GitHub Flavored Markdown support
- OpenAI streaming API
- Supabase real-time or polling for SSE

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `supabase/functions/rag-chat/index.ts` (lines 1-400) - Current non-streaming chat implementation, needs streaming
- `src/hooks/useRagChat.ts` (lines 1-150) - Chat hook that calls Edge Function, needs streaming support
- `src/hooks/usePersistentChat.ts` - Manages chat persistence, may need streaming integration
- `src/components/chat/ChatArea.tsx` (lines 200-350) - Message rendering, needs markdown component
- `src/components/chat/MessageBubble.tsx` (lines 1-100) - Message bubble component, needs markdown
- `src/components/chat/ChatSearchDialog.tsx` (lines 40-80) - Mock search implementation, needs real query
- `src/types/chat.ts` - Chat message types
- `supabase/migrations/20260111121000_consolidated_schema_redesign.sql` (lines 50-100) - chat_messages table schema

### New Files to Create

- `src/components/chat/MarkdownMessage.tsx` - Markdown renderer component with styling
- `src/hooks/useStreamingChat.ts` - Hook to handle SSE streaming from Edge Function
- `supabase/functions/rag-chat-stream/index.ts` - New streaming version of rag-chat (or modify existing)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenAI Streaming API](https://platform.openai.com/docs/api-reference/streaming)
  - Specific section: Chat Completions with stream=true
  - Why: Required for implementing streaming responses
  
- [react-markdown Documentation](https://github.com/remarkjs/react-markdown)
  - Specific section: Basic usage and component customization
  - Why: Needed for rendering markdown in React components
  
- [Supabase Edge Functions Streaming](https://supabase.com/docs/guides/functions/streaming)
  - Specific section: Server-Sent Events (SSE) implementation
  - Why: Shows how to stream responses from Edge Functions
  
- [Supabase Database Queries](https://supabase.com/docs/reference/javascript/select)
  - Specific section: Text search and filtering
  - Why: Needed for implementing real chat search

### Patterns to Follow

**Supabase Function Invocation Pattern** (from useRagChat.ts):
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* params */ }
});
```

**Message Display Pattern** (from ChatArea.tsx lines 300-350):
```typescript
<p className="whitespace-pre-wrap break-words">{message.content}</p>
```

**Database Query Pattern** (from useCreators.ts):
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('columns')
  .eq('column', value)
  .order('created_at', { ascending: false });
```

**Error Handling Pattern** (from useRagChat.ts):
```typescript
try {
  // operation
} catch (err) {
  console.error('[Context] Error:', err);
  setError(err instanceof Error ? err.message : 'Failed');
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Add Markdown Rendering

Install markdown library and create rendering component for AI messages.

**Tasks:**
- Install react-markdown and remark-gfm packages
- Create MarkdownMessage component with custom styling
- Integrate markdown rendering into ChatArea and MessageBubble
- Test markdown rendering with various formats

### Phase 2: Implement Streaming Backend

Modify rag-chat Edge Function to support streaming responses via SSE.

**Tasks:**
- Update rag-chat to use OpenAI streaming API
- Implement Server-Sent Events (SSE) response format
- Handle streaming errors and connection issues
- Test streaming with various query types

### Phase 3: Implement Streaming Frontend

Create frontend hook to consume SSE stream and update UI in real-time.

**Tasks:**
- Create useStreamingChat hook for SSE consumption
- Update usePersistentChat to support streaming
- Add streaming state management (partial messages)
- Implement smooth UI updates during streaming

### Phase 4: Fix Chat Search

Replace mock search with real database queries.

**Tasks:**
- Create database query for chat message search
- Update ChatSearchDialog to use real data
- Add text search with proper filtering
- Test search across multiple creators

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### INSTALL Dependencies

- **IMPLEMENT**: Add react-markdown and remark-gfm to package.json
- **COMMAND**: `pnpm add react-markdown remark-gfm`
- **VALIDATE**: `pnpm list react-markdown remark-gfm`

### CREATE src/components/chat/MarkdownMessage.tsx

- **IMPLEMENT**: Markdown renderer component with custom styling for code blocks, lists, headings
- **PATTERN**: Use react-markdown with remark-gfm plugin
- **IMPORTS**: `import ReactMarkdown from 'react-markdown'; import remarkGfm from 'remark-gfm';`
- **STYLING**: Match existing chat bubble styling from ChatArea.tsx
- **GOTCHA**: Ensure code blocks have proper syntax highlighting classes
- **VALIDATE**: Create test file with markdown samples and verify rendering

### UPDATE src/components/chat/ChatArea.tsx

- **IMPLEMENT**: Replace plain text message rendering with MarkdownMessage component
- **PATTERN**: Replace `<p className="whitespace-pre-wrap">{message.content}</p>` with `<MarkdownMessage content={message.content} />`
- **IMPORTS**: `import { MarkdownMessage } from './MarkdownMessage';`
- **LOCATION**: Lines 300-350 where AI messages are rendered
- **GOTCHA**: Only apply to AI messages, keep user messages as plain text
- **VALIDATE**: Send test message with markdown and verify formatting

### UPDATE src/components/chat/MessageBubble.tsx

- **IMPLEMENT**: Add markdown rendering support for reusable message component
- **PATTERN**: Same as ChatArea - conditional rendering based on message role
- **IMPORTS**: `import { MarkdownMessage } from './MarkdownMessage';`
- **GOTCHA**: Maintain existing styling and layout
- **VALIDATE**: Check that MessageBubble renders markdown correctly

### UPDATE supabase/functions/rag-chat/index.ts - Add Streaming

- **IMPLEMENT**: Modify OpenAI API call to use `stream: true` parameter
- **PATTERN**: Replace `await fetch('https://api.openai.com/v1/chat/completions')` with streaming version
- **IMPORTS**: No new imports needed
- **RESPONSE**: Change from `return new Response(JSON.stringify(data))` to SSE format
- **SSE FORMAT**: 
```typescript
return new Response(
  new ReadableStream({
    async start(controller) {
      // Stream tokens here
      controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
      controller.close();
    }
  }),
  {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  }
);
```
- **GOTCHA**: Handle OpenAI stream errors gracefully
- **VALIDATE**: Test with curl: `curl -N https://your-function-url`

### CREATE src/hooks/useStreamingChat.ts

- **IMPLEMENT**: Hook to consume SSE stream from Edge Function
- **PATTERN**: Use EventSource or fetch with ReadableStream
- **STATE**: Manage partial message state, streaming status, errors
- **EXAMPLE**:
```typescript
const [streamingMessage, setStreamingMessage] = useState('');
const [isStreaming, setIsStreaming] = useState(false);

// Use fetch with ReadableStream
const response = await fetch(url);
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  setStreamingMessage(prev => prev + chunk);
}
```
- **GOTCHA**: Handle connection drops and reconnection
- **VALIDATE**: Log streaming chunks to console

### UPDATE src/hooks/usePersistentChat.ts

- **IMPLEMENT**: Integrate streaming support into persistent chat
- **PATTERN**: Use useStreamingChat hook internally
- **FLOW**: Show streaming message → Complete → Save to database
- **STATE**: Add `streamingContent` state for partial messages
- **GOTCHA**: Don't save partial messages to database
- **VALIDATE**: Verify messages save correctly after streaming completes

### UPDATE src/hooks/useRagChat.ts

- **IMPLEMENT**: Add streaming mode support
- **PATTERN**: Check if streaming is enabled, use appropriate endpoint
- **FALLBACK**: Keep non-streaming as fallback for errors
- **GOTCHA**: Maintain conversation history correctly with streaming
- **VALIDATE**: Test both streaming and non-streaming modes

### UPDATE src/components/chat/ChatSearchDialog.tsx - Real Search

- **IMPLEMENT**: Replace mock search with real Supabase query
- **PATTERN**: Query chat_messages table with text search
- **QUERY**:
```typescript
const { data, error } = await supabase
  .from('chat_messages')
  .select(`
    id,
    content,
    role,
    created_at,
    session_id,
    chat_sessions!inner(channel_id)
  `)
  .ilike('content', `%${searchQuery}%`)
  .order('created_at', { ascending: false })
  .limit(20);
```
- **IMPORTS**: `import { supabase } from '@/lib/supabase';`
- **GOTCHA**: Filter by current user's sessions only (RLS should handle this)
- **VALIDATE**: Search for known message content and verify results

### ADD Search Optimization

- **IMPLEMENT**: Add database index for text search if not exists
- **MIGRATION**: Create new migration file
- **SQL**: `CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search ON chat_messages USING gin(to_tsvector('english', content));`
- **GOTCHA**: Use GIN index for full-text search performance
- **VALIDATE**: `pnpm dlx supabase db push`

---

## TESTING STRATEGY

### Unit Tests

**Markdown Rendering Tests** (`tests/MarkdownMessage.test.tsx`):
- Test bold, italic, lists, code blocks render correctly
- Test that user messages don't get markdown rendering
- Test edge cases (empty content, special characters)

**Streaming Hook Tests** (`tests/useStreamingChat.test.ts`):
- Test SSE connection and disconnection
- Test partial message accumulation
- Test error handling and reconnection
- Mock fetch responses for testing

### Integration Tests

**Streaming End-to-End** (`tests/integration/streaming-chat.test.ts`):
- Send message and verify streaming starts
- Verify partial updates appear in UI
- Verify final message saves to database
- Test streaming interruption and recovery

**Search Integration** (`tests/integration/chat-search.test.ts`):
- Create test messages in database
- Search for known content
- Verify results match expectations
- Test search across multiple sessions

### Edge Cases

- **Streaming Interruption**: User navigates away mid-stream
- **Network Failure**: Connection drops during streaming
- **Markdown Edge Cases**: Nested formatting, code blocks with backticks
- **Search Edge Cases**: Special characters, empty queries, no results
- **Concurrent Streams**: Multiple messages streaming simultaneously

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# TypeScript compilation
pnpm run build

# Linting
pnpm run lint

# Format check
pnpm exec prettier --check "src/**/*.{ts,tsx}"
```

### Level 2: Unit Tests

```bash
# Run all unit tests
pnpm test

# Run specific test files
pnpm test MarkdownMessage
pnpm test useStreamingChat
```

### Level 3: Integration Tests

```bash
# Run integration tests
pnpm test:integration

# Run with coverage
pnpm test:coverage
```

### Level 4: Manual Validation

**Markdown Rendering:**
1. Send message: "Test **bold** and *italic* and `code`"
2. Verify bold, italic, and code render with proper styling
3. Send message with list: "Steps:\n1. First\n2. Second"
4. Verify numbered list renders correctly

**Streaming:**
1. Send a long question requiring detailed answer
2. Verify response appears word-by-word in real-time
3. Verify final message matches streamed content
4. Check database has complete message saved

**Search:**
1. Send several test messages
2. Open search dialog (Cmd/Ctrl+K)
3. Search for keyword from previous message
4. Verify actual messages appear (not mock data)
5. Click result and verify navigation to message

### Level 5: Edge Function Testing

```bash
# Test streaming endpoint locally
curl -N -X POST https://your-project.supabase.co/functions/v1/rag-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"test streaming","channel_id":"test"}'

# Should see SSE stream output
```

---

## ACCEPTANCE CRITERIA

- [ ] Markdown formatting renders correctly (bold, italic, lists, code blocks)
- [ ] User messages remain plain text (no markdown rendering)
- [ ] Chat responses stream in real-time with visible token-by-token updates
- [ ] Streaming works reliably without connection issues
- [ ] Final streamed message saves correctly to database
- [ ] Search queries actual chat_messages table (not mock data)
- [ ] Search returns relevant results with proper filtering
- [ ] Search works across all user's chat sessions
- [ ] All validation commands pass with zero errors
- [ ] No regressions in existing chat functionality
- [ ] Performance remains acceptable (streaming doesn't slow UI)
- [ ] Error handling works for streaming failures

---

## COMPLETION CHECKLIST

- [ ] react-markdown and remark-gfm installed
- [ ] MarkdownMessage component created and styled
- [ ] ChatArea updated to use markdown rendering
- [ ] MessageBubble updated to use markdown rendering
- [ ] rag-chat Edge Function supports streaming
- [ ] useStreamingChat hook implemented
- [ ] usePersistentChat integrated with streaming
- [ ] useRagChat supports streaming mode
- [ ] ChatSearchDialog queries real database
- [ ] Database index added for search optimization
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual validation completed successfully
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code reviewed for quality

---

## NOTES

### Design Decisions

**Why react-markdown over other libraries:**
- Most popular and well-maintained
- Excellent TypeScript support
- Easy to customize styling
- Good performance with large documents

**Why SSE over WebSockets:**
- Simpler implementation for one-way streaming
- Better compatibility with Supabase Edge Functions
- Automatic reconnection handling
- Lower overhead for this use case

**Why GIN index for search:**
- Optimized for full-text search in PostgreSQL
- Better performance than LIKE queries
- Supports advanced text search features

### Trade-offs

**Streaming Complexity:**
- Adds complexity to error handling
- Requires careful state management
- Worth it for improved UX

**Markdown Rendering:**
- Slight performance overhead
- Potential XSS risks (mitigated by react-markdown's sanitization)
- Greatly improves readability

### Future Enhancements

- Add syntax highlighting for code blocks (highlight.js)
- Implement search result highlighting
- Add search filters (date range, creator, etc.)
- Cache search results for performance
- Add streaming progress indicator
- Support markdown in user messages (optional)
