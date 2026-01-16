# Feature: Real-Time Voice Chat with Creators

## Feature Description

Implement real-time voice communication functionality that allows users to have live voice conversations with AI mentors based on creator content. The system uses OpenAI's Realtime API with GPT-4o-mini-realtime for cost-effective voice interactions, grounded in the creator's video transcripts through RAG context retrieval.

## User Story

As a ChannelChat user
I want to have real-time voice conversations with my favorite creators
So that I can get mentorship through natural voice interaction while maintaining accuracy through transcript-based grounding

## Problem Statement

Users currently interact with creators only through text-based chat. Voice interaction provides a more natural, accessible, and engaging way to receive mentorship, especially for users who prefer speaking over typing or want hands-free interaction while multitasking.

## Solution Statement

Implement a complete voice chat system that:
1. Enables real-time voice conversations using OpenAI Realtime API
2. Grounds AI responses in creator video transcripts through RAG retrieval
3. Saves conversation transcripts for future reference
4. Provides a dedicated page to view conversation history
5. Uses GPT-4o-mini-realtime for 90% cost savings compared to GPT-4o-realtime

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Frontend (React components, hooks), Backend (Edge Functions), Database (new tables)
**Dependencies**: OpenAI Realtime API, WebRTC, Supabase Edge Functions

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

**From Creator Insights Hub (Reference Implementation):**
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/creator-insights-hub/src/components/VoiceChat.tsx` - Complete voice chat UI component with modal, transcript display, and waveform visualization
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/creator-insights-hub/src/hooks/useVoiceSession.ts` - Voice session management hook with WebRTC, ephemeral token handling, and transcript tracking
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/creator-insights-hub/supabase/functions/voice-realtime/index.ts` - Edge Function for OpenAI Realtime API integration with RAG context
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/creator-insights-hub/supabase/migrations/20260114111432_1f5cd732-2408-45a8-aaa4-8d6ac2a51665.sql` - Database schema reference

**Existing ChannelChat Files to Integrate With:**
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/src/components/chat/ChatArea.tsx` - Main chat interface where voice trigger will be added
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/src/components/chat/AppSidebar.tsx` - Sidebar where voice conversations link will be added
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/src/hooks/useRagChat.ts` - Existing RAG chat hook for pattern reference
- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/supabase/functions/_shared/abuse-protection.ts` - Shared utilities for rate limiting

### New Files to Create

**Frontend Components:**
- `src/components/chat/VoiceChat.tsx` - Voice chat modal component
- `src/components/chat/VoiceChatTrigger.tsx` - Trigger button for voice chat
- `src/pages/VoiceConversations.tsx` - Page to view all voice conversation history

**Frontend Hooks:**
- `src/hooks/useVoiceSession.ts` - Voice session management with WebRTC
- `src/hooks/useVoiceConversations.ts` - Hook to fetch and manage voice conversation history

**Backend Edge Functions:**
- `supabase/functions/voice-realtime/index.ts` - OpenAI Realtime API integration

**Database Migrations:**
- `supabase/migrations/YYYYMMDDHHMMSS_add_voice_conversations.sql` - Voice conversations table and RLS policies

### Relevant Documentation - YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
  - Specific section: Ephemeral token creation and WebRTC setup
  - Why: Required for implementing voice session management
- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
  - Specific section: RTCPeerConnection and data channels
  - Why: Core technology for real-time audio streaming
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
  - Specific section: Deno runtime and environment variables
  - Why: Backend implementation patterns

### Patterns to Follow

**Naming Conventions:**
- Components: PascalCase (e.g., `VoiceChat.tsx`, `VoiceChatTrigger.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useVoiceSession.ts`)
- Edge Functions: kebab-case (e.g., `voice-realtime`)
- Database tables: snake_case (e.g., `voice_conversations`)

**Error Handling Pattern:**
```typescript
try {
  // Operation
  const result = await operation();
  toast.success('Operation successful');
} catch (error) {
  console.error('[Context] Operation failed:', error);
  const errorMessage = error instanceof Error ? error.message : 'Operation failed';
  toast.error(errorMessage);
}
```

**Supabase Client Pattern:**
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

if (error) {
  console.error('Database error:', error);
  throw error;
}
```

**React Hook Pattern:**
```typescript
export function useCustomHook(params: Params) {
  const [state, setState] = useState<State>(initialState);
  const ref = useRef<Type | null>(null);
  
  const cleanup = useCallback(async () => {
    // Cleanup logic
  }, [dependencies]);
  
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
  return { state, actions };
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Schema Setup

Create database tables and policies for storing voice conversation history.

**Tasks:**
- Create `voice_conversations` table with user_id, channel_id, duration, transcript data
- Add Row-Level Security policies for user data isolation
- Create indexes for efficient querying

### Phase 2: Backend Edge Function

Implement the OpenAI Realtime API integration with RAG context retrieval.

**Tasks:**
- Create `voice-realtime` Edge Function
- Implement ephemeral token generation
- Add RAG context retrieval for grounding
- Implement rate limiting and usage tracking
- Add conversation persistence logic

### Phase 3: Frontend Voice Session Hook

Build the core voice session management hook with WebRTC.

**Tasks:**
- Create `useVoiceSession` hook
- Implement WebRTC peer connection setup
- Handle audio streaming and data channels
- Manage session lifecycle (start, stop, cleanup)
- Track transcripts and duration

### Phase 4: Voice Chat UI Components

Create the user interface for voice interactions.

**Tasks:**
- Build `VoiceChat` modal component
- Create `VoiceChatTrigger` button
- Implement transcript display with bubbles
- Add waveform visualization
- Create status indicators and error handling

### Phase 5: Voice Conversations History Page

Build a dedicated page to view past voice conversations.

**Tasks:**
- Create `VoiceConversations` page component
- Implement `useVoiceConversations` hook
- Build conversation list with playback controls
- Add search and filtering capabilities
- Integrate with sidebar navigation

### Phase 6: Integration & Testing

Integrate voice chat into existing chat interface and test thoroughly.

**Tasks:**
- Add voice trigger to ChatArea header
- Update sidebar with voice conversations link
- Test voice session lifecycle
- Verify transcript persistence
- Test rate limiting and error handling

---

## STEP-BY-STEP TASKS

### Task 1: CREATE Database Migration for Voice Conversations

- **IMPLEMENT**: Voice conversations table schema
- **PATTERN**: Follow existing migration patterns in `supabase/migrations/`
- **IMPORTS**: None (SQL migration)
- **GOTCHA**: Ensure RLS policies match existing patterns for user data isolation
- **VALIDATE**: `pnpm dlx supabase db push`

```sql
-- Create voice_conversations table
CREATE TABLE IF NOT EXISTS public.voice_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_voice_conversations_user_id ON public.voice_conversations(user_id);
CREATE INDEX idx_voice_conversations_channel_id ON public.voice_conversations(channel_id);
CREATE INDEX idx_voice_conversations_created_at ON public.voice_conversations(created_at DESC);

-- Enable RLS
ALTER TABLE public.voice_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own voice conversations"
  ON public.voice_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice conversations"
  ON public.voice_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice conversations"
  ON public.voice_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice conversations"
  ON public.voice_conversations FOR DELETE
  USING (auth.uid() = user_id);
```

### Task 2: CREATE Voice Realtime Edge Function

- **IMPLEMENT**: OpenAI Realtime API integration with RAG context
- **PATTERN**: Mirror `creator-insights-hub/supabase/functions/voice-realtime/index.ts`
- **IMPORTS**: `@supabase/supabase-js`, abuse-protection utilities
- **GOTCHA**: Use `gpt-4o-mini-realtime-preview-2024-12-17` model for cost savings
- **VALIDATE**: `pnpm dlx supabase functions deploy voice-realtime`

Create file: `supabase/functions/voice-realtime/index.ts`

Key implementation points:
- Handle 4 actions: `create_session`, `get_context`, `check_access`, `track_usage`
- Use ephemeral token approach for OpenAI Realtime API
- Retrieve RAG context using existing `search_transcript_chunks` RPC
- Implement rate limiting (10 requests per 5 minutes)
- Build voice system prompt with creator context
- Track usage in `user_usage` table

### Task 3: CREATE useVoiceSession Hook

- **IMPLEMENT**: Voice session management with WebRTC
- **PATTERN**: Mirror `creator-insights-hub/src/hooks/useVoiceSession.ts`
- **IMPORTS**: `@/lib/supabase`, `@/contexts/AuthContext`, `sonner`
- **GOTCHA**: Proper cleanup of WebRTC connections and media streams
- **VALIDATE**: Test in browser console with `console.log` statements

Create file: `src/hooks/useVoiceSession.ts`

Key implementation points:
- Manage session state: idle, connecting, connected, speaking, listening, error
- Handle microphone permissions
- Create RTCPeerConnection with OpenAI
- Manage data channel for realtime events
- Track user and AI transcripts
- Implement cleanup function for all resources
- Track session duration

### Task 4: CREATE VoiceChat Component

- **IMPLEMENT**: Voice chat modal UI with transcript display
- **PATTERN**: Mirror `creator-insights-hub/src/components/VoiceChat.tsx`
- **IMPORTS**: shadcn/ui components, `useVoiceSession` hook, lucide-react icons
- **GOTCHA**: Auto-scroll transcript area as new messages arrive
- **VALIDATE**: Visual inspection in browser

Create file: `src/components/chat/VoiceChat.tsx`

Key implementation points:
- VoiceChatModal component with Dialog wrapper
- TranscriptBubble component for message display
- MicrophoneWaveform component for visual feedback
- VoiceChatTrigger button component
- Auto-start session when modal opens
- Track transcript history for display
- Format duration display (MM:SS)
- Handle session cleanup on close

### Task 5: CREATE VoiceConversations Page

- **IMPLEMENT**: Page to view voice conversation history
- **PATTERN**: Follow existing page patterns in `src/pages/`
- **IMPORTS**: `@/lib/supabase`, shadcn/ui components
- **GOTCHA**: Implement pagination for large conversation lists
- **VALIDATE**: Navigate to `/voice-conversations` in browser

Create file: `src/pages/VoiceConversations.tsx`

Key implementation points:
- Fetch conversations from `voice_conversations` table
- Display conversation cards with metadata
- Show transcript preview
- Add search/filter functionality
- Implement pagination
- Add delete conversation action

### Task 6: CREATE useVoiceConversations Hook

- **IMPLEMENT**: Hook to fetch and manage voice conversations
- **PATTERN**: Follow `src/hooks/useSavedAnswers.ts` pattern
- **IMPORTS**: `@/lib/supabase`, `@/contexts/AuthContext`
- **GOTCHA**: Handle real-time updates with Supabase subscriptions
- **VALIDATE**: Test with `console.log` in component

Create file: `src/hooks/useVoiceConversations.ts`

Key implementation points:
- Fetch conversations with pagination
- Subscribe to real-time updates
- Implement delete conversation
- Handle loading and error states
- Filter by channel_id if provided

### Task 7: UPDATE ChatArea to Add Voice Trigger

- **IMPLEMENT**: Add voice chat trigger button to chat header
- **PATTERN**: Follow existing header button patterns in ChatArea
- **IMPORTS**: `VoiceChatTrigger` component
- **GOTCHA**: Only show when creator is selected
- **VALIDATE**: Visual inspection in chat interface

Update file: `src/components/chat/ChatArea.tsx`

Add VoiceChatTrigger next to existing header actions:
```typescript
import { VoiceChatTrigger } from './VoiceChat';

// In header section
{selectedCreator && (
  <VoiceChatTrigger
    channelId={selectedCreator.channel_id}
    creatorName={selectedCreator.channel_name}
  />
)}
```

### Task 8: UPDATE AppSidebar to Add Voice Conversations Link

- **IMPLEMENT**: Add navigation link to voice conversations page
- **PATTERN**: Follow existing sidebar link patterns
- **IMPORTS**: lucide-react icons (Mic icon)
- **GOTCHA**: Highlight active state when on voice conversations page
- **VALIDATE**: Click link and verify navigation

Update file: `src/components/chat/AppSidebar.tsx`

Add link in sidebar navigation:
```typescript
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link to="/voice-conversations">
      <Mic className="w-4 h-4" />
      <span>Voice Conversations</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

### Task 9: UPDATE App Routing

- **IMPLEMENT**: Add route for voice conversations page
- **PATTERN**: Follow existing route patterns in App.tsx
- **IMPORTS**: `VoiceConversations` page component
- **GOTCHA**: Wrap with AuthenticatedRoute for protection
- **VALIDATE**: Navigate to route in browser

Update file: `src/App.tsx`

Add route:
```typescript
<Route
  path="/voice-conversations"
  element={
    <AuthenticatedRoute>
      <VoiceConversations />
    </AuthenticatedRoute>
  }
/>
```

### Task 10: ADD Voice Animations to CSS

- **IMPLEMENT**: CSS animations for voice waveform
- **PATTERN**: Add to existing `src/index.css`
- **IMPORTS**: None
- **GOTCHA**: Use CSS variables for theme compatibility
- **VALIDATE**: Visual inspection of waveform animation

Update file: `src/index.css`

Add animations:
```css
@keyframes voice-wave-active {
  0%, 100% { height: 4px; }
  50% { height: 24px; }
}

@keyframes voice-wave-idle {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}

.animate-voice-wave-active {
  animation: voice-wave-active 0.6s ease-in-out infinite;
}

.animate-voice-wave-idle {
  animation: voice-wave-idle 1.2s ease-in-out infinite;
}
```

---

## TESTING STRATEGY

### Unit Tests

Test individual components and hooks in isolation.

**Voice Session Hook Tests:**
- Test session lifecycle (start, stop, cleanup)
- Test error handling for microphone permissions
- Test transcript tracking
- Test duration tracking

**Voice Conversations Hook Tests:**
- Test fetching conversations
- Test pagination
- Test delete functionality
- Test real-time updates

### Integration Tests

Test complete voice chat workflow.

**Voice Chat Flow:**
1. User clicks voice trigger button
2. Modal opens and session starts
3. Microphone permission granted
4. WebRTC connection established
5. User speaks and transcript appears
6. AI responds with audio and transcript
7. Session ends and conversation saved

**Voice Conversations Page:**
1. Navigate to voice conversations page
2. Conversations list loads
3. Click conversation to view details
4. Delete conversation works
5. Search/filter works

### Edge Cases

**Voice Session Edge Cases:**
- Microphone permission denied
- Network disconnection during session
- OpenAI API rate limit reached
- Invalid channel_id provided
- Session cleanup on page navigation

**Voice Conversations Edge Cases:**
- Empty conversation list
- Very long transcripts
- Pagination with many conversations
- Concurrent conversation updates

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
# TypeScript type checking
pnpm tsc --noEmit

# ESLint
pnpm eslint src/components/chat/VoiceChat.tsx src/hooks/useVoiceSession.ts src/pages/VoiceConversations.tsx
```

### Level 2: Database Migration

```bash
# Apply migration
pnpm dlx supabase db push

# Verify tables created
pnpm dlx supabase db remote exec "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_conversations';"
```

### Level 3: Edge Function Deployment

```bash
# Deploy voice-realtime function
pnpm dlx supabase functions deploy voice-realtime

# Test function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/voice-realtime \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "check_access", "user_id": "test-user-id"}'
```

### Level 4: Manual Validation

**Voice Chat Testing:**
1. Open chat interface with a creator selected
2. Click voice chat trigger button
3. Grant microphone permission when prompted
4. Speak a question and verify transcript appears
5. Listen to AI response and verify transcript appears
6. End session and verify conversation saved
7. Navigate to voice conversations page
8. Verify conversation appears in list

**Voice Conversations Page Testing:**
1. Navigate to `/voice-conversations`
2. Verify conversations list loads
3. Click on a conversation to view details
4. Test search/filter functionality
5. Delete a conversation and verify it's removed
6. Verify pagination works with many conversations

### Level 5: Performance Validation

```bash
# Check bundle size impact
pnpm run build
# Verify voice components don't significantly increase bundle size

# Test WebRTC connection latency
# Open browser DevTools Network tab
# Start voice session and monitor WebSocket connections
# Verify low latency (<500ms) for audio streaming
```

---

## ACCEPTANCE CRITERIA

- [ ] Voice chat trigger button appears in chat interface header
- [ ] Clicking trigger opens voice chat modal
- [ ] Microphone permission request works correctly
- [ ] Voice session connects to OpenAI Realtime API
- [ ] User speech is transcribed in real-time
- [ ] AI responses are grounded in creator transcripts
- [ ] AI audio plays back correctly
- [ ] Transcripts display in chat bubbles
- [ ] Session duration is tracked and displayed
- [ ] Ending session saves conversation to database
- [ ] Voice conversations page shows conversation history
- [ ] Conversations can be searched and filtered
- [ ] Conversations can be deleted
- [ ] Rate limiting prevents abuse
- [ ] All validation commands pass
- [ ] No regressions in existing chat functionality
- [ ] Mobile responsive design works
- [ ] Error handling provides clear user feedback

---

## COMPLETION CHECKLIST

- [ ] Database migration created and applied
- [ ] Voice realtime Edge Function deployed
- [ ] useVoiceSession hook implemented
- [ ] VoiceChat component created
- [ ] VoiceConversations page created
- [ ] useVoiceConversations hook implemented
- [ ] ChatArea updated with voice trigger
- [ ] AppSidebar updated with voice link
- [ ] App routing updated
- [ ] CSS animations added
- [ ] All validation commands pass
- [ ] Manual testing completed
- [ ] Performance validated
- [ ] Documentation updated
- [ ] Code reviewed for quality

---

## NOTES

### Design Decisions

**Model Selection:** Using `gpt-4o-mini-realtime-preview-2024-12-17` for 90% cost savings compared to `gpt-4o-realtime-preview`. Audio costs: $10/$20 per 1M tokens vs $40/$80.

**Ephemeral Token Approach:** Using OpenAI's ephemeral token system for secure, temporary access to Realtime API without exposing main API key to frontend.

**WebRTC Architecture:** Direct browser-to-OpenAI WebRTC connection for low-latency audio streaming. Backend only handles token generation and context retrieval.

**Transcript Storage:** Storing full conversation transcripts in JSONB format for flexible querying and display.

**Rate Limiting:** 10 voice sessions per 5 minutes per user to prevent abuse while allowing reasonable usage.

### Trade-offs

**Cost vs Quality:** Using GPT-4o-mini-realtime saves 90% on costs but may have slightly lower quality responses compared to GPT-4o-realtime. For most use cases, the quality difference is minimal.

**Storage vs Performance:** Storing full transcripts in database increases storage but enables rich conversation history features without additional API calls.

**Real-time vs Batch:** Real-time voice requires WebRTC and continuous connection, which is more complex than batch processing but provides better user experience.

### Future Enhancements

- Add voice conversation sharing functionality
- Implement voice conversation export (PDF, text)
- Add voice conversation analytics (duration, frequency)
- Support multiple voice models (different voices, languages)
- Add voice conversation bookmarking
- Implement voice conversation search by content
- Add voice conversation playback controls
- Support voice conversation editing (delete specific messages)
