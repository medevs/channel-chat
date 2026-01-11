# Feature: Database Schema Redesign and Optimization

## Feature Description

Redesign the ChannelChat database schema to prepare for production scale and add missing enterprise features. Focus purely on database structure improvements: fixing schema inconsistencies, adding missing indexes, implementing proper foreign key relationships, and optimizing for performance and data integrity.

### Current Database Issues

**Existing Limited Structure:**
- `channels` - Basic YouTube creator metadata
- `videos` - Video metadata with inconsistent foreign keys (TEXT vs UUID)
- `transcript_chunks` - RAG chunks but missing parent `transcripts` table
- `chat_sessions` - Basic chat without user isolation
- `chat_messages` - Messages without proper user scoping
- `user_usage` - Minimal usage tracking, missing enterprise features
- `user_creators` - Missing many-to-many user relationships
- `public_chat_limits` - Basic rate limiting
- `error_logs` - Simple error storage

**Missing Critical Components:**
- User profiles and authentication integration
- Role-based access control system
- Admin analytics and monitoring functions
- Concurrency control and operation locking
- Request deduplication and idempotency
- Proper cascade delete policies
- Performance indexes on critical queries

### Target Database Architecture

**Enhanced Production-Ready Structure:**
- Complete user management system with profiles and roles
- Proper foreign key relationships with UUID consistency
- Full chat system with user isolation and saved answers
- Enterprise monitoring with structured error logs and analytics
- Concurrency control with operation locks and idempotency
- Performance-optimized indexes and RLS policies

## User Story

As a platform administrator
I want a properly designed, optimized database schema
So that the application performs efficiently, maintains data integrity, and scales reliably

## Problem Statement

The current database schema has several critical issues:
1. **Inconsistent foreign key relationships** - channels.id (uuid) vs videos.channel_id (text)
2. **Missing critical indexes** - Performance bottlenecks on common queries
3. **No cascade delete policies** - Risk of orphaned data
4. **Schema gaps identified during analysis** - Missing user management and admin features
5. **Suboptimal RLS policies** - Security and performance concerns

## Solution Statement

Implement a database-only redesign that:
- Standardizes foreign key relationships and data types
- Adds performance-critical indexes
- Implements proper cascade delete policies
- Applies enterprise-grade database design patterns
- Optimizes RLS policies for security and performance

## Feature Metadata

**Feature Type**: Refactor
**Estimated Complexity**: Medium
**Primary Systems Affected**: Database schema only
**Dependencies**: PostgreSQL, Supabase CLI, pgvector extension

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `/mnt/c/Users/ahmed/OneDrive/Documents/apps/ChannelChat/supabase/migrations/20240101000001_create_rag_schema.sql` - Current main schema

### New Files to Create

- `supabase/migrations/20260111120000_redesign_database_schema.sql` - Comprehensive schema redesign
- `supabase/migrations/20260111120001_add_performance_indexes.sql` - Performance optimization indexes
- `supabase/migrations/20260111120002_update_rls_policies.sql` - Optimized RLS policies

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

### Patterns to Follow

**Migration Naming**: `YYYYMMDDHHMMSS_descriptive_name.sql`
**Foreign Key Pattern**: Always use UUID primary keys with proper CASCADE policies
**Index Naming**: `idx_{table}_{column(s)}` for regular indexes, `idx_{table}_{column}_partial` for partial indexes
**RLS Policy Naming**: Descriptive names like "Users can view their own data"

---

## IMPLEMENTATION PLAN

### Phase 1: Schema Analysis and Preparation

**Tasks:**
- Analyze current schema limitations and missing features
- Document all foreign key relationship issues
- Identify missing indexes from performance analysis
- Plan data migration strategy for breaking changes

### Phase 2: Core Schema Redesign

**Tasks:**
- Standardize all foreign key relationships to use UUIDs consistently
- Add proper CASCADE DELETE policies
- Implement missing indexes for performance
- Apply enterprise-grade database design patterns

### Phase 3: RLS Policy Optimization

**Tasks:**
- Review and optimize all RLS policies
- Add missing security policies
- Implement performance-optimized policy patterns
- Add admin access patterns

---

## STEP-BY-STEP TASKS

### CREATE supabase/migrations/20260111120000_redesign_database_schema.sql

- **IMPLEMENT**: Comprehensive schema redesign migration
- **PATTERN**: Follow PostgreSQL optimization patterns for consistency
- **CRITICAL**: Fix channels.id/videos.channel_id relationship inconsistency
- **GOTCHA**: Must handle existing data during foreign key changes
- **VALIDATE**: `pnpm dlx supabase db push`

**Key Changes:**
1. **Standardize Foreign Keys**: Change videos.channel_id to reference channels.id (UUID)
2. **Add CASCADE Policies**: Proper cleanup when channels are deleted
3. **Add Missing Tables**: User management, admin analytics, and concurrency control
4. **Fix Data Types**: Ensure consistency across all related tables

### CREATE supabase/migrations/20260111120001_add_performance_indexes.sql

- **IMPLEMENT**: Add all missing performance-critical indexes
- **PATTERN**: Use industry best practices for index design
- **INDEXES**: videos.channel_id, transcripts.extraction_status, transcript_chunks.video_id, chat_sessions.channel_id
- **GOTCHA**: Add partial indexes for status columns to optimize filtered queries
- **VALIDATE**: `EXPLAIN ANALYZE` on common queries

### CREATE supabase/migrations/20260111120002_update_rls_policies.sql

- **IMPLEMENT**: Optimized RLS policies based on production-ready patterns
- **PATTERN**: Security definer functions for admin access
- **SECURITY**: Proper user isolation while maintaining performance
- **GOTCHA**: Avoid RLS recursion in security definer functions
- **VALIDATE**: Test with different user roles

### UPDATE src/types/database.ts

- **IMPLEMENT**: Regenerate types from new schema
- **PATTERN**: Use Supabase CLI type generation
- **GOTCHA**: Breaking changes may require application updates later
- **VALIDATE**: `pnpm dlx supabase gen types typescript --remote > src/types/database.ts`

---

## TESTING STRATEGY

### Schema Validation Tests
- Verify all foreign key constraints work correctly
- Test cascade delete behavior
- Validate index performance improvements
- Confirm RLS policies work as expected

### Data Integrity Tests
- Ensure no data loss during migration
- Verify all relationships are properly maintained
- Test edge cases with orphaned data

### Performance Tests
- Benchmark query performance before/after
- Validate index usage with EXPLAIN ANALYZE
- Test under load conditions

---

## VALIDATION COMMANDS

### Level 1: Schema Validation
```bash
pnpm dlx supabase db push
pnpm dlx supabase db diff
```

### Level 2: Type Generation
```bash
pnpm dlx supabase gen types typescript --remote > src/types/database.ts
```

### Level 3: Integration Tests
```bash
pnpm test
```

### Level 5: Performance Validation
```sql
-- Test key queries with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM videos WHERE channel_id = 'uuid-here';
EXPLAIN ANALYZE SELECT * FROM transcript_chunks WHERE video_id = 'video-id' ORDER BY embedding <-> '[...]';
```

---

## ACCEPTANCE CRITERIA

- [ ] All foreign key relationships use consistent UUID types
- [ ] Proper CASCADE DELETE policies prevent orphaned data
- [ ] All performance-critical indexes are implemented
- [ ] RLS policies provide proper security without performance issues
- [ ] TypeScript types are regenerated and consistent
- [ ] No data loss during migration
- [ ] Query performance improved measurably
- [ ] Database schema is consistent and optimized

---

## COMPLETION CHECKLIST

- [ ] Schema redesign migration created and tested
- [ ] Performance indexes migration created
- [ ] RLS policies migration created
- [ ] All migrations applied successfully
- [ ] TypeScript types regenerated
- [ ] Integration tests pass
- [ ] Performance benchmarks show improvement
- [ ] No regressions in database functionality
- [ ] Documentation updated

---

## NOTES

**Critical Breaking Changes:**
- videos.channel_id changes from TEXT to UUID
- Requires careful data migration to maintain relationships
- Application code may need updates later for new relationship patterns

**Performance Impact:**
- New indexes will improve query performance significantly
- RLS policy optimization will reduce auth overhead
- Proper foreign keys enable query planner optimizations

**Security Improvements:**
- Consistent RLS policies across all tables
- Admin access patterns properly implemented
- User data isolation maintained
