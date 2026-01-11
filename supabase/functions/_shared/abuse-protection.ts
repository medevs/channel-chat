// Shared abuse protection utilities for edge functions
// Note: This module uses generic supabase client type to work with custom RPCs
// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// CONFIGURATION
// ============================================
export const RATE_LIMITS = {
  chat: {
    authenticated: { requests: 60, windowMinutes: 1 },
    public: { requests: 10, windowMinutes: 1 },
  },
  ingest: {
    authenticated: { requests: 5, windowMinutes: 5 },
  },
  pipeline: {
    concurrent: 1, // Max concurrent pipeline runs per channel
    ttlSeconds: 600, // 10 minute lock timeout
  },
};

export const COST_GUARDS = {
  maxEmbeddingsPerRequest: 100,
  maxChunksPerChannel: 5000,
  maxVideosPerIngestion: 100,
  maxTokensPerChat: 4000,
};

// ============================================
// STRUCTURED LOGGING
// ============================================
export interface LogEntry {
  timestamp: string;
  function: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

export function createLogger(functionName: string, requestId?: string) {
  const startTime = Date.now();
  
  const log = (level: LogEntry['level'], message: string, metadata?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      function: functionName,
      level,
      message,
      requestId,
      durationMs: Date.now() - startTime,
      metadata,
    };
    
    const logLine = JSON.stringify(entry);
    
    switch (level) {
      case 'error':
        console.error(logLine);
        break;
      case 'warn':
        console.warn(logLine);
        break;
      default:
        console.log(logLine);
    }
  };
  
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  };
}

// ============================================
// REQUEST DEDUPLICATION
// ============================================
export function generateRequestHash(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export async function checkDuplicateRequest(
  supabase: any,
  idempotencyKey: string,
  userId: string | null,
  operationType: string,
  requestHash: string
): Promise<{ isDuplicate: boolean; existingResponse?: unknown; existingStatus?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_idempotency', {
      p_idempotency_key: idempotencyKey,
      p_user_id: userId,
      p_operation_type: operationType,
      p_request_hash: requestHash,
    });
    
    if (error) {
      console.error('Idempotency check error:', error);
      return { isDuplicate: false };
    }
    
    if (data && Array.isArray(data) && data.length > 0 && data[0].is_duplicate) {
      return {
        isDuplicate: true,
        existingResponse: data[0].existing_response,
        existingStatus: data[0].existing_status,
      };
    }
    
    return { isDuplicate: false };
  } catch (err) {
    console.error('Idempotency check exception:', err);
    return { isDuplicate: false };
  }
}

export async function completeRequest(
  supabase: any,
  idempotencyKey: string,
  response: unknown,
  status: string = 'completed'
): Promise<void> {
  try {
    await supabase.rpc('complete_idempotency', {
      p_idempotency_key: idempotencyKey,
      p_response_data: response,
      p_status: status,
    });
  } catch (err) {
    console.error('Complete idempotency error:', err);
  }
}

// ============================================
// CONCURRENCY LOCKS
// ============================================
export async function acquireLock(
  supabase: any,
  lockKey: string,
  userId: string | null,
  operationType: string,
  ttlSeconds: number = 300
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('acquire_operation_lock', {
      p_lock_key: lockKey,
      p_user_id: userId,
      p_operation_type: operationType,
      p_ttl_seconds: ttlSeconds,
    });
    
    if (error) {
      console.error('Lock acquisition error:', error);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('Lock acquisition exception:', err);
    return false;
  }
}

export async function releaseLock(
  supabase: any,
  lockKey: string
): Promise<void> {
  try {
    await supabase.rpc('release_operation_lock', {
      p_lock_key: lockKey,
    });
  } catch (err) {
    console.error('Lock release error:', err);
  }
}

// ============================================
// ERROR LOGGING TO DATABASE
// ============================================
export async function logError(
  supabase: any,
  functionName: string,
  error: Error | string,
  userId?: string,
  requestData?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
  severity: 'info' | 'warn' | 'error' = 'error'
): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await supabase.rpc('log_error', {
      p_function_name: functionName,
      p_error_message: errorMessage,
      p_error_code: null,
      p_error_stack: errorStack || null,
      p_user_id: userId || null,
      p_request_data: requestData || null,
      p_metadata: metadata || {},
      p_severity: severity,
    });
  } catch (err) {
    console.error('Error logging to database failed:', err);
  }
}

// ============================================
// RATE LIMITING (In-memory for edge, with DB fallback)
// ============================================
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMinutes: number
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  
  const existing = rateLimitCache.get(key);
  
  if (!existing || existing.resetAt <= now) {
    // New window
    rateLimitCache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: new Date(now + windowMs) };
  }
  
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(existing.resetAt) };
  }
  
  existing.count++;
  return { allowed: true, remaining: limit - existing.count, resetAt: new Date(existing.resetAt) };
}

// ============================================
// STRUCTURED ERROR RESPONSES
// ============================================
export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  retryAfterMs?: number;
}

export function createErrorResponse(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>,
  retryable: boolean = false,
  retryAfterMs?: number
): Response {
  const body: ErrorResponse = {
    error: message,
    code,
    details,
    retryable,
    retryAfterMs,
  };
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  if (retryAfterMs) {
    headers['Retry-After'] = Math.ceil(retryAfterMs / 1000).toString();
  }
  
  return new Response(JSON.stringify(body), { status, headers });
}

// Common error responses
export const ErrorCodes = {
  RATE_LIMITED: 'RATE_LIMITED',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  CONCURRENT_OPERATION: 'CONCURRENT_OPERATION',
  COST_LIMIT_EXCEEDED: 'COST_LIMIT_EXCEEDED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
} as const;

// ============================================
// REQUEST VALIDATION
// ============================================
export function validateRequest(
  body: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

// ============================================
// SAFE OPERATION WRAPPER
// ============================================
export async function safeOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorContext?: string
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    console.error(`Safe operation failed${errorContext ? ` (${errorContext})` : ''}:`, err);
    return fallback;
  }
}

// ============================================
// CORS HEADERS
// ============================================
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};
