# Edge Functions Architecture Upgrade Plan

## Overview
This plan outlines the systematic upgrade of our Edge Functions to implement a robust, production-ready architecture. The upgraded implementation will provide superior reliability, performance, and maintainability through proven patterns and best practices.

## Current State Analysis

### Issues Identified
1. **JWT Authentication Inconsistency**: Main project has JWT verification enabled by default, causing 401 errors for anonymous users
2. **Database Schema Gaps**: Missing or incorrectly implemented database functions for user usage tracking
3. **Error Handling Deficiencies**: Non-Error objects being thrown, resulting in "[object Object]" serialization issues
4. **Function Signature Mismatches**: Database RPC functions have different return types than expected
5. **Missing Helper Functions**: Lack of proper NULL user ID handling in database operations

### Target Architecture Benefits
- Proper NULL user ID handling in all database functions
- Consistent JWT verification configuration across all functions
- Robust error handling with proper Error object serialization
- Complete database schema with all required tables and functions
- Production-ready reliability and performance

## Implementation Plan

### Phase 1: Database Schema Enhancement
**Objective**: Implement comprehensive database schema for production use

**Tasks**:
1. **User Usage Functions**
   - Implement `get_usage_with_limits` with proper NULL handling
   - Add `get_or_create_user_usage` helper function
   - Add `reset_daily_usage_if_needed` function
   - Add increment functions for creators and videos

2. **Core Tables**
   - Ensure `user_creators` table exists with proper constraints
   - Verify `profiles` table with correct RLS policies
   - Add performance-optimized indexes

3. **Database Function Architecture**
   - Update return types to match application interface
   - Add comprehensive error handling in all RPC functions
   - Implement security definer functions for proper access control

**Migration Files**:
- `20260111154100_fix_user_usage_functions.sql`
- `20260111155000_add_missing_tables.sql`

### Phase 2: Edge Function Configuration
**Objective**: Standardize Edge Function configuration for production

**Tasks**:
1. **Authentication Configuration**
   - Set `verify_jwt = false` for all public-facing functions
   - Update `supabase/config.toml` with consistent settings
   - Verify configuration applies to all deployed functions

2. **Function Deployment**
   - Redeploy all functions with updated configuration
   - Test authentication flow for both authenticated and anonymous users
   - Verify CORS headers are properly configured

### Phase 3: Error Handling Architecture
**Objective**: Implement production-grade error handling patterns

**Tasks**:
1. **Error Serialization**
   - Ensure all catch blocks properly serialize Error objects
   - Add structured debugging logs for error tracking
   - Implement consistent error response formatting

2. **Database Error Handling**
   - Add try-catch blocks around all database operations
   - Implement proper fallback values for failed operations
   - Add error logging to database for monitoring

### Phase 4: Business Logic Implementation
**Objective**: Implement robust business logic patterns

**Tasks**:
1. **User Usage Tracking**
   - Implement conditional user usage calls (only when userId exists)
   - Add proper default value handling for anonymous users
   - Ensure atomic operations for usage increments

2. **Channel Ingestion Logic**
   - Optimize YouTube API integration patterns
   - Implement proper lock management
   - Add comprehensive logging for debugging

3. **Request Processing**
   - Implement request deduplication
   - Add proper rate limiting
   - Ensure idempotent operations

## Testing Strategy

### Phase 1 Testing: Database Functions
```sql
-- Test NULL user ID handling
SELECT get_usage_with_limits(NULL);

-- Test authenticated user handling
SELECT get_usage_with_limits('550e8400-e29b-41d4-a716-446655440000');

-- Test increment functions
SELECT increment_creator_count('550e8400-e29b-41d4-a716-446655440000');
```

### Phase 2 Testing: Edge Functions
```bash
# Test anonymous ingestion
curl -X POST "https://project.supabase.co/functions/v1/ingest-youtube-channel" \
  -H "apikey: anon_key" \
  -H "Content-Type: application/json" \
  -d '{"channelUrl": "https://www.youtube.com/@test", "userId": null}'

# Test authenticated ingestion
curl -X POST "https://project.supabase.co/functions/v1/ingest-youtube-channel" \
  -H "Authorization: Bearer jwt_token" \
  -H "apikey: anon_key" \
  -d '{"channelUrl": "https://www.youtube.com/@test", "userId": "uuid"}'
```

### Phase 3 Testing: Error Scenarios
- Test with invalid channel URLs
- Test with malformed request bodies
- Test with database connection failures
- Verify proper error messages are returned

## Success Criteria

### Database Schema
- [ ] All RPC functions handle NULL user IDs properly
- [ ] User usage tracking works for both authenticated and anonymous users
- [ ] All required tables exist with proper constraints and indexes
- [ ] Database functions return consistent, expected data types

### Edge Functions
- [ ] JWT authentication works correctly for all user types
- [ ] Functions deploy without configuration errors
- [ ] CORS headers allow proper frontend integration
- [ ] All functions return proper JSON responses

### Error Handling
- [ ] No "[object Object]" errors in responses
- [ ] All errors are properly serialized as strings
- [ ] Error logs contain sufficient debugging information
- [ ] Graceful degradation for non-critical failures

### Performance
- [ ] Function response times under 3 seconds
- [ ] Database queries optimized with proper indexes
- [ ] No memory leaks or resource exhaustion
- [ ] Proper connection pooling and cleanup

## Risk Mitigation

### Database Changes
- **Risk**: Schema changes could break existing functionality
- **Mitigation**: Use IF NOT EXISTS clauses and test migrations on staging first

### Function Deployment
- **Risk**: Deployment could cause temporary service interruption
- **Mitigation**: Deploy during low-traffic periods and have rollback plan ready

### Configuration Changes
- **Risk**: JWT configuration changes could affect authentication
- **Mitigation**: Test authentication flows thoroughly before production deployment

## Rollback Plan

### Database Rollback
1. Revert to previous migration state using Supabase CLI
2. Restore function definitions from backup
3. Verify all existing functionality works

### Function Rollback
1. Redeploy previous function versions
2. Revert configuration changes in `supabase/config.toml`
3. Test critical user flows

## Timeline

### Week 1: Database Schema (Completed)
- ✅ Create and apply database migrations
- ✅ Test database functions with NULL user IDs
- ✅ Verify all required tables exist

### Week 1: Edge Function Configuration (In Progress)
- ✅ Update JWT configuration
- ✅ Deploy functions with new configuration
- 🔄 Test authentication flows

### Week 2: Error Handling & Testing
- Implement comprehensive error handling
- Conduct thorough testing of all scenarios
- Performance optimization and monitoring setup

### Week 2: Production Deployment
- Deploy to production environment
- Monitor for issues and performance
- Document lessons learned and best practices

## Monitoring & Observability

### Metrics to Track
- Function execution times and success rates
- Database query performance and error rates
- User authentication success/failure rates
- Error frequency and types

### Alerting
- Set up alerts for function failures
- Monitor database connection issues
- Track unusual error patterns
- Alert on performance degradation

### Logging
- Structured logging for all function executions
- Database query logging for performance analysis
- Error tracking with stack traces
- User action logging for debugging

## Documentation Updates

### Technical Documentation
- Update API documentation with new error formats
- Document database schema changes
- Create troubleshooting guides for common issues

### Team Knowledge
- Share lessons learned from architecture implementation
- Document best practices for future development
- Create runbooks for common operational tasks

This upgrade plan ensures systematic improvement of our Edge Functions infrastructure while maintaining reliability and performance standards for production deployment.
