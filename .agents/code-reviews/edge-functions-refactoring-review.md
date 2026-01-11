# Edge Functions Refactoring Code Review

**Date**: 2026-01-11  
**Reviewer**: Technical Code Review Agent  
**Scope**: Edge function refactoring into modular components

## Stats

- Files Modified: 2
- Files Added: 12
- Files Deleted: 0
- New lines: 79
- Deleted lines: 2138

## Summary

Major refactoring of Edge Functions from monolithic implementations to modular, reusable components. The changes extract common functionality into shared modules with proper dependency injection and error handling patterns.

## Issues Found

### Critical Issues

**severity: critical**  
**file: supabase/functions/_shared/types/common.ts**  
**line: 130**  
**issue: Missing ConfidenceLevel type definition**  
**detail: The ConfidenceLevel type is imported and used in confidence-calculator.ts but not defined in common.ts. This will cause TypeScript compilation errors.**  
**suggestion: Add `export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'not_covered';` to the RAG TYPES section**

### High Severity Issues

**severity: high**  
**file: supabase/functions/_shared/rag/prompt-builder.ts**  
**line: 25**  
**issue: Accessing undefined properties on TranscriptChunk**  
**detail: The code accesses `chunk.video_title` and `chunk.content` properties that don't exist in the TranscriptChunk interface. The interface only has `text` property.**  
**suggestion: Change `chunk.video_title` to get title from video details map, and `chunk.content` to `chunk.text`**

**severity: high**  
**file: supabase/functions/_shared/rag/prompt-builder.ts**  
**line: 67**  
**issue: Incorrect timestamp parameter type**  
**detail: formatTimestamp function expects number but receives number | null from chunk.start_time**  
**suggestion: Add null check: `const timestamp = chunk.start_time ? formatTimestamp(chunk.start_time) : 'N/A';`**

**severity: high**  
**file: supabase/functions/rag-chat/index.ts**  
**line: 59**  
**issue: Unused dependencies variable**  
**detail: Dependencies object is created but never used, indicating incomplete refactoring**  
**suggestion: Either use the dependencies object in function calls or remove it if not needed for this testing phase**

**severity: high**  
**file: supabase/functions/rag-chat/index.ts**  
**line: 18**  
**issue: Unused imports**  
**detail: Several imported functions (getUserUsage, checkMessageLimit, incrementMessageCount, getConfidenceMessage) are not used**  
**suggestion: Remove unused imports or implement the missing functionality**

### Medium Severity Issues

**severity: medium**  
**file: supabase/functions/_shared/ingestion/user-limits.ts**  
**line: 78**  
**issue: Inconsistent error handling pattern**  
**detail: Function uses both count from query and usage.creators_added as fallback, which could lead to inconsistent behavior**  
**suggestion: Standardize on one source of truth or add clear documentation about the fallback logic**

**severity: medium**  
**file: supabase/functions/_shared/youtube/channel-resolver.ts**  
**line: 45**  
**issue: Potential API key exposure in logs**  
**detail: The endpoint URL containing the API key might be logged in error scenarios**  
**suggestion: Sanitize URLs in error logs to remove API keys**

**severity: medium**  
**file: supabase/functions/_shared/rag/confidence-calculator.ts**  
**line: 21**  
**issue: Hardcoded confidence thresholds**  
**detail: Confidence score thresholds (0.8, 0.6) are hardcoded and not configurable**  
**suggestion: Move thresholds to configuration constants or make them configurable parameters**

### Low Severity Issues

**severity: low**  
**file: supabase/functions/_shared/types/common.ts**  
**line: 1**  
**issue: Overly broad deno-lint-ignore directive**  
**detail: Using `no-explicit-any` ignore for entire file when it might only be needed in specific places**  
**suggestion: Apply lint ignores more specifically to individual lines where needed**

**severity: low**  
**file: supabase/functions/_shared/youtube/content-filter.ts**  
**line: 11**  
**issue: Magic number without clear constant**  
**detail: SHORTS_MAX_DURATION_SECONDS is 61 but comment says 60 seconds max**  
**suggestion: Either use 60 or update comment to explain why 61 is used**

## Positive Observations

1. **Excellent Modular Design**: The refactoring properly separates concerns into logical modules
2. **Consistent Error Handling**: Good use of Result<T> pattern for error handling
3. **Proper Dependency Injection**: Clean Dependencies interface for testability
4. **Type Safety**: Strong TypeScript typing throughout the modules
5. **Clear Documentation**: Good inline comments explaining complex logic
6. **Testable Architecture**: Functions are pure and easily testable

## Recommendations

1. **Fix Critical Type Issues**: Address the missing ConfidenceLevel type and property access issues immediately
2. **Complete the Refactoring**: The main functions are currently in testing mode - complete the integration
3. **Add Integration Tests**: Create tests for the new modular architecture
4. **Configuration Management**: Move hardcoded values to configuration files
5. **Error Logging**: Implement consistent error logging patterns across all modules

## Overall Assessment

The refactoring demonstrates excellent software engineering practices with proper separation of concerns, dependency injection, and type safety. However, there are several critical type issues that need immediate attention before the code can be deployed. The modular architecture will significantly improve maintainability and testability once the integration is completed.