# Feature: Fix Edge Function Authentication Failures

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Fix critical authentication failures in `ingest-youtube-channel` and `rag-chat` Edge Functions that worked in Supabase versions 10-15 but fail in versions 16+ with 401/400/500 errors. The issue stems from Supabase's architectural shift from symmetric JWT secrets to asymmetric JWT Signing Keys, deprecation of the `verify_jwt` flag, and incompatibility between new API keys and Edge Functions' built-in JWT verification.

## User Story

As a developer maintaining ChannelChat
I want Edge Functions to authenticate properly in Supabase v16+
So that users can ingest YouTube channels and chat with AI without authentication failures

## Problem Statement

Both `ingest-youtube-channel` and `rag-chat` Edge Functions experience authentication failures despite implementing service-to-service authentication patterns. The functions worked in Supabase versions 10-15 but fail in versions 16+ due to:

1. **JWT Algorithm Transition**: Legacy HS256 symmetric secrets vs new ES256/RS256 asymmetric keys
2. **API Key Incompatibility**: New `sb_publishable_*` and `sb_secret_*` keys are not JWT-based and incompatible with Edge Functions
3. **verify_jwt Flag Deprecation**: Still supported but deprecated, causing inconsistent behavior
4. **Service Role Security Issues**: Functions use service role keys without proper authentication, bypassing RLS

## Solution Statement

Implement modern Supabase authentication patterns by:
1. Migrating to asymmetric JWT verification using JWKS endpoints
2. Implementing custom authentication middleware for proper user context
3. Replacing service role usage with authenticated user context and RLS
4. Standardizing authentication approach across all Edge Functions
5. Adding proper error handling and security validation

## Feature Metadata

**Feature Type**: Bug Fix / Security Enhancement
**Estimated Complexity**: High
**Primary Systems Affected**: Edge Functions, Authentication, Database Security
**Dependencies**: Supabase JWT Signing Keys, jose library, RLS policies

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `supabase/functions/ingest-youtube-channel/index.ts` - Current implementation with service role auth
- `supabase/functions/rag-chat/index.ts` - Current implementation with disabled JWT verification
- `supabase/functions/_shared/abuse-protection.ts` - Shared utilities for rate limiting and error handling
- `supabase/config.toml` - Edge Functions configuration with JWT settings
- `src/lib/supabase.ts` - Frontend Supabase client configuration
- `src/hooks/useIngestChannel.ts` - Frontend hook calling ingest function
- `src/hooks/useRagChat.ts` - Frontend hook calling rag-chat function

### New Files to Create

- `supabase/functions/_shared/auth-middleware.ts` - Modern JWT verification middleware
- `supabase/functions/_shared/user-context.ts` - User authentication and context utilities
- `supabase/migrations/[timestamp]_add_rls_policies.sql` - Row Level Security policies

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Supabase Edge Functions Auth](https://supabase.com/docs/guides/functions/auth)
  - Specific section: JWT verification and user context
  - Why: Required for implementing proper authentication
- [Supabase JWT Signing Keys](https://supabase.com/docs/guides/auth/server-side/nextjs#jwt-signing-keys)
  - Specific section: Asymmetric JWT verification
  - Why: Shows modern JWT verification patterns
- [jose Library Documentation](https://github.com/panva/jose)
  - Specific section: JWT verification with JWKS
  - Why: Required for implementing asymmetric JWT verification

### Patterns to Follow

**Authentication Pattern** (from Supabase docs):
```typescript
import * as jose from "jsr:@panva/jose@6";

const SUPABASE_JWT_KEYS = jose.createRemoteJWKSet(
  new URL(Deno.env.get("SUPABASE_URL")! + "/auth/v1/.well-known/jwks.json")
);

export async function verifyJWT(token: string) {
  const { payload } = await jose.jwtVerify(token, SUPABASE_JWT_KEYS);
  return payload;
}
```

**User Context Pattern** (from existing codebase):
```typescript
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! },
    },
  }
);
```

**Error Handling Pattern** (from abuse-protection.ts):
```typescript
return createErrorResponse(
  'Authentication failed',
  ErrorCodes.UNAUTHORIZED,
  401
);
```

---

## IMPLEMENTATION PLAN

### Phase 1: Authentication Infrastructure

Set up modern JWT verification and authentication middleware that works with Supabase v16+.

**Tasks:**
- Create shared authentication middleware using jose library
- Implement JWKS-based JWT verification
- Add user context extraction utilities
- Create standardized error responses for auth failures

### Phase 2: Function Migration

Update both Edge Functions to use modern authentication patterns while maintaining backward compatibility.

**Tasks:**
- Migrate ingest-youtube-channel to authenticated user context
- Update rag-chat to use proper JWT verification
- Replace service role usage with user-scoped database access
- Add authentication validation to all endpoints

### Phase 3: Database Security

Implement Row Level Security policies to ensure proper data isolation and security.

**Tasks:**
- Create RLS policies for channels and videos tables
- Update database queries to work with user context
- Test data access with authenticated users
- Validate security isolation between users

### Phase 4: Testing & Validation

Comprehensive testing to ensure authentication works correctly across all scenarios.

**Tasks:**
- Test authenticated user flows
- Validate JWT verification with different token types
- Test error handling for invalid/expired tokens
- Verify RLS policies work correctly

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE supabase/functions/_shared/auth-middleware.ts

- **IMPLEMENT**: Modern JWT verification middleware using jose library
- **PATTERN**: JWKS-based asymmetric JWT verification
- **IMPORTS**: `import * as jose from "jsr:@panva/jose@6"`
- **GOTCHA**: Handle both legacy and new JWT formats during transition
- **VALIDATE**: `deno check supabase/functions/_shared/auth-middleware.ts`

### CREATE supabase/functions/_shared/user-context.ts

- **IMPLEMENT**: User authentication and context extraction utilities
- **PATTERN**: Extract user ID and metadata from JWT payload
- **IMPORTS**: Import from auth-middleware.ts and abuse-protection.ts
- **GOTCHA**: Handle anonymous users and service-to-service calls
- **VALIDATE**: `deno check supabase/functions/_shared/user-context.ts`

### UPDATE supabase/functions/ingest-youtube-channel/index.ts

- **IMPLEMENT**: Replace service role auth with user context authentication
- **PATTERN**: Use authenticated Supabase client with user context
- **IMPORTS**: Import AuthMiddleware and UserContext from _shared
- **GOTCHA**: Maintain backward compatibility during migration
- **VALIDATE**: `pnpm dlx supabase functions deploy ingest-youtube-channel --no-verify-jwt`

### UPDATE supabase/functions/rag-chat/index.ts

- **IMPLEMENT**: Add proper JWT verification while maintaining public mode
- **PATTERN**: Dual-mode authentication (public vs authenticated)
- **IMPORTS**: Import AuthMiddleware and UserContext from _shared
- **GOTCHA**: Keep public mode functionality for unauthenticated users
- **VALIDATE**: `pnpm dlx supabase functions deploy rag-chat --no-verify-jwt`

### CREATE supabase/migrations/[timestamp]_add_rls_policies.sql

- **IMPLEMENT**: Row Level Security policies for channels and videos tables
- **PATTERN**: User-scoped access policies with proper isolation
- **IMPORTS**: N/A (SQL migration)
- **GOTCHA**: Ensure service role can still access data for system operations
- **VALIDATE**: `pnpm dlx supabase db push`

### UPDATE supabase/config.toml

- **IMPLEMENT**: Configure Edge Functions with proper JWT settings
- **PATTERN**: Disable verify_jwt flag and use custom middleware
- **IMPORTS**: N/A (configuration file)
- **GOTCHA**: Ensure all functions use consistent authentication approach
- **VALIDATE**: `pnpm dlx supabase functions list`

### UPDATE src/hooks/useIngestChannel.ts

- **IMPLEMENT**: Add proper authentication headers to function calls
- **PATTERN**: Include Authorization header with user JWT
- **IMPORTS**: Import from existing auth context
- **GOTCHA**: Handle authentication errors gracefully
- **VALIDATE**: Test channel ingestion with authenticated user

### UPDATE src/hooks/useRagChat.ts

- **IMPLEMENT**: Add authentication headers while maintaining public mode
- **PATTERN**: Conditional authentication based on user state
- **IMPORTS**: Import from existing auth context
- **GOTCHA**: Maintain public mode functionality for unauthenticated users
- **VALIDATE**: Test chat functionality in both authenticated and public modes

---

## TESTING STRATEGY

### Unit Tests

**Authentication Middleware Tests:**
- Valid JWT verification with JWKS
- Invalid/expired JWT handling
- Missing authorization header scenarios
- Legacy JWT format compatibility

**User Context Tests:**
- User ID extraction from JWT payload
- Anonymous user handling
- Service role detection
- Error scenarios

### Integration Tests

**Edge Function Authentication:**
- Authenticated user can access functions
- Unauthenticated requests are properly rejected
- Public mode still works for rag-chat
- Service role operations work correctly

**Database Security:**
- RLS policies enforce user isolation
- Authenticated users can only access their data
- Service role can access all data
- Anonymous users have appropriate restrictions

### Edge Cases

**JWT Verification Edge Cases:**
- Malformed JWT tokens
- Expired tokens
- Tokens with invalid signatures
- Missing JWKS endpoint

**Authentication Flow Edge Cases:**
- Network failures during JWT verification
- JWKS endpoint unavailable
- Mixed authentication modes
- Token refresh scenarios

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# Check TypeScript syntax
deno check supabase/functions/_shared/auth-middleware.ts
deno check supabase/functions/_shared/user-context.ts
deno check supabase/functions/ingest-youtube-channel/index.ts
deno check supabase/functions/rag-chat/index.ts

# Lint frontend code
pnpm run lint
```

### Level 2: Database & Migrations

```bash
# Apply database migrations
pnpm dlx supabase db push

# Verify RLS policies
pnpm dlx supabase db diff

# Check database schema
pnpm dlx supabase gen types typescript --remote > src/types/database.ts
```

### Level 3: Edge Function Deployment

```bash
# Deploy functions with new authentication
pnpm dlx supabase functions deploy ingest-youtube-channel --no-verify-jwt
pnpm dlx supabase functions deploy rag-chat --no-verify-jwt
pnpm dlx supabase functions deploy extract-transcripts --no-verify-jwt
pnpm dlx supabase functions deploy run-pipeline --no-verify-jwt

# Verify deployment status
pnpm dlx supabase functions list
```

### Level 4: Manual Validation

```bash
# Test authenticated channel ingestion
curl -X POST "https://your-project.supabase.co/functions/v1/ingest-youtube-channel" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channelUrl": "https://youtube.com/@test"}'

# Test authenticated chat
curl -X POST "https://your-project.supabase.co/functions/v1/rag-chat" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test question", "channel_id": "test"}'

# Test public chat mode
curl -X POST "https://your-project.supabase.co/functions/v1/rag-chat" \
  -H "Content-Type: application/json" \
  -d '{"query": "test question", "public_mode": true, "client_identifier": "test"}'
```

### Level 5: Frontend Integration

```bash
# Start development server
pnpm run dev &

# Test authentication flows in browser
# - Sign in and test channel ingestion
# - Test chat functionality
# - Verify error handling for auth failures
```

---

## ACCEPTANCE CRITERIA

- [ ] Both Edge Functions authenticate properly with Supabase v16+
- [ ] JWT verification works with asymmetric signing keys
- [ ] Service role usage replaced with proper user context
- [ ] RLS policies enforce proper data isolation
- [ ] Public mode still works for rag-chat function
- [ ] All validation commands pass with zero errors
- [ ] Frontend integration works without authentication errors
- [ ] Error handling provides clear feedback for auth failures
- [ ] Security vulnerabilities are resolved
- [ ] Backward compatibility maintained during transition

---

## COMPLETION CHECKLIST

- [ ] Authentication middleware implemented with jose library
- [ ] User context utilities created and tested
- [ ] Both Edge Functions migrated to new auth patterns
- [ ] RLS policies created and applied
- [ ] Configuration updated for consistent auth approach
- [ ] Frontend hooks updated with proper auth headers
- [ ] All functions deployed successfully
- [ ] Manual testing confirms auth works correctly
- [ ] Security audit passes
- [ ] Documentation updated with new auth patterns

---

## NOTES

**Security Considerations:**
- Service role keys should only be used for system operations, not user-facing functions
- RLS policies are critical for data isolation between users
- JWT verification must handle both legacy and new token formats during transition

**Performance Considerations:**
- JWKS endpoint caching to avoid repeated requests
- Efficient JWT verification without blocking function execution
- Rate limiting to prevent abuse of authentication endpoints

**Migration Strategy:**
- Deploy with --no-verify-jwt flag to use custom middleware
- Maintain backward compatibility during transition period
- Monitor authentication errors and adjust as needed
- Gradual rollout to ensure stability

**Monitoring:**
- Track authentication success/failure rates
- Monitor JWT verification performance
- Alert on unusual authentication patterns
- Log security-related events for audit
