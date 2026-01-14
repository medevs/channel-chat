# Security Fixes Deployment Guide

## Prerequisites

- Supabase CLI installed
- Authenticated with Supabase (`pnpm dlx supabase login`)
- Linked to remote project (`pnpm dlx supabase link --project-ref YOUR_PROJECT_REF`)

## Deployment Steps

### Step 1: Deploy Database Migrations

Apply RLS policies and password requirements:

```bash
cd /mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat
pnpm dlx supabase db push
```

**Expected Output**:
- Migration `20260114_add_missing_rls_policies.sql` applied
- Migration `20260114_strengthen_password_requirements.sql` applied
- RLS enabled on 4 tables
- Password validation function created

**Verification**:
```bash
# Check RLS is enabled
pnpm dlx supabase db remote exec "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('transcripts', 'user_roles', 'operation_locks', 'request_idempotency');
"
```

Expected: All tables show `rowsecurity = true`

### Step 2: Deploy Edge Functions

Deploy all Edge Functions with JWT verification enabled:

```bash
# Deploy all functions
pnpm dlx supabase functions deploy

# Or deploy individually
pnpm dlx supabase functions deploy rag-chat
pnpm dlx supabase functions deploy ingest-youtube-channel
pnpm dlx supabase functions deploy extract-transcripts
pnpm dlx supabase functions deploy run-pipeline
```

**Expected Output**:
- Functions deployed successfully
- JWT verification enabled (from config.toml)
- Auth middleware integrated

### Step 3: Test Authentication

Test that unauthenticated requests are blocked:

```bash
# Get your function URL
FUNCTION_URL="https://YOUR_PROJECT_REF.supabase.co/functions/v1/rag-chat"

# Test without auth (should fail with 401)
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "channel_id": "some-channel"}' | jq

# Expected: {"error": "Missing Authorization header", "code": "UNAUTHORIZED"}
```

### Step 4: Test Authenticated Request

Get a JWT token and test authenticated request:

```bash
# Get JWT token from Supabase Auth (use your frontend or Supabase dashboard)
JWT_TOKEN="your-jwt-token-here"

# Test with auth (should succeed)
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": "test", "channel_id": "some-channel"}' | jq

# Expected: Valid response with answer and citations
```

### Step 5: Test Rate Limiting

Test that rate limits are enforced:

```bash
# Make 70 rapid requests (limit is 60/min)
for i in {1..70}; do
  curl -X POST $FUNCTION_URL \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "test"}' &
done
wait

# Expected: First 60 succeed, remaining fail with 429 Rate Limit Exceeded
```

### Step 6: Verify RLS Policies

Test RLS policies are working:

```bash
# Test as authenticated user (should only see own data)
pnpm dlx supabase db remote exec "
SET request.jwt.claims = '{\"sub\": \"user-id-here\"}';
SELECT * FROM user_roles WHERE user_id = 'user-id-here';
"

# Expected: Only returns rows for that user

# Test as service role (should see all data)
# Service role automatically bypasses RLS
```

### Step 7: Update Frontend

Update frontend to send JWT tokens with all requests:

```typescript
// Example: Update Supabase client calls
const { data, error } = await supabase.functions.invoke('rag-chat', {
  body: {
    query: userQuery,
    channel_id: channelId,
  },
  // JWT token automatically included by Supabase client
});
```

**Note**: Supabase client automatically includes JWT token in Authorization header.

### Step 8: Monitor Deployment

Monitor for 48 hours after deployment:

1. **Check Error Logs**:
   ```bash
   pnpm dlx supabase functions logs rag-chat
   pnpm dlx supabase functions logs ingest-youtube-channel
   ```

2. **Monitor Metrics**:
   - 401 errors (should be minimal - only invalid tokens)
   - 429 errors (should only be abusive users)
   - RLS policy violations (should be zero)
   - OpenAI API costs (should remain stable or decrease)

3. **User Feedback**:
   - Monitor support channels for auth issues
   - Check user complaints about access denied
   - Verify legitimate users can access their data

## Rollback Procedure

If critical issues arise:

### Quick Rollback (Disable JWT Verification)

```bash
# Edit supabase/config.toml
# Change verify_jwt = true to verify_jwt = false for affected functions

# Redeploy functions
pnpm dlx supabase functions deploy
```

### Full Rollback (Revert All Changes)

```bash
# Revert code changes
git checkout HEAD~1 supabase/

# Redeploy functions
pnpm dlx supabase functions deploy

# Disable RLS (if needed)
pnpm dlx supabase db remote exec "
ALTER TABLE transcripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE operation_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_idempotency DISABLE ROW LEVEL SECURITY;
"
```

## Troubleshooting

### Issue: 401 Unauthorized for Legitimate Users

**Cause**: Frontend not sending JWT token
**Fix**: Ensure Supabase client is authenticated:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
}
```

### Issue: 429 Rate Limit for Normal Usage

**Cause**: Rate limits too strict
**Fix**: Adjust rate limits in `abuse-protection.ts`:
```typescript
export const RATE_LIMITS = {
  chat: {
    authenticated: { requests: 120, windowMinutes: 1 }, // Increased from 60
  },
};
```

### Issue: RLS Blocking Legitimate Access

**Cause**: Policy too restrictive
**Fix**: Review and update policy:
```sql
-- Example: Allow users to read public data
CREATE POLICY "Public data readable"
ON table_name FOR SELECT
USING (is_public = true OR auth.uid() = user_id);
```

### Issue: Service Role Calls Failing

**Cause**: Service role should bypass RLS
**Fix**: Ensure using service role key:
```typescript
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY // Not anon key
);
```

## Success Criteria

- ✅ All migrations applied successfully
- ✅ All Edge Functions deployed successfully
- ✅ Unauthenticated requests return 401
- ✅ Authenticated requests succeed
- ✅ Rate limits enforced correctly
- ✅ RLS policies prevent unauthorized access
- ✅ No regressions in existing functionality
- ✅ User complaints < 1% of active users
- ✅ OpenAI API costs stable or decreased

## Post-Deployment Checklist

- [ ] Migrations applied and verified
- [ ] Edge Functions deployed and tested
- [ ] Authentication working for all functions
- [ ] Rate limiting enforced correctly
- [ ] RLS policies tested and working
- [ ] Frontend updated to handle auth
- [ ] Monitoring dashboards configured
- [ ] Team notified of changes
- [ ] Documentation updated
- [ ] Rollback plan tested and ready

## Support

If you encounter issues during deployment:

1. Check function logs: `pnpm dlx supabase functions logs <function-name>`
2. Check database logs: `pnpm dlx supabase db remote logs`
3. Review error messages in Supabase dashboard
4. Test with curl commands above
5. Rollback if critical issues persist

---

**Deployment Guide Version**: 1.0
**Last Updated**: 2026-01-14
