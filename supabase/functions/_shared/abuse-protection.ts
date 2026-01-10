// Rate limiting and abuse protection utilities for Supabase Edge Functions
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Error codes for consistent error handling
export const ErrorCodes = {
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  chat: {
    authenticated: {
      requests: 100, // requests per window
      windowMinutes: 60, // 1 hour window
    },
    public: {
      requests: 20, // requests per window
      windowMinutes: 60, // 1 hour window
    },
  },
  ingestion: {
    authenticated: {
      requests: 10, // requests per window
      windowMinutes: 60, // 1 hour window
    },
  },
} as const;

// In-memory rate limiting store (simple implementation)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limiting check
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMinutes: number
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const resetAt = new Date(Math.ceil(now / windowMs) * windowMs);
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetAt <= now) {
    // New window or expired window
    rateLimitStore.set(key, { count: 1, resetAt: resetAt.getTime() });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt };
  }
  
  // Increment count
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true, remaining: maxRequests - current.count, resetAt };
}

// Simple lock mechanism for preventing concurrent operations
const lockStore = new Map<string, { lockedAt: number; ttlMs: number; userId?: string; operation?: string }>();

export async function acquireLock(
  supabase: SupabaseClient,
  key: string, 
  userId?: string, 
  operation?: string, 
  ttlSeconds: number = 600
): Promise<boolean> {
  const now = Date.now();
  const ttlMs = ttlSeconds * 1000;
  const existing = lockStore.get(key);
  
  if (existing && (existing.lockedAt + existing.ttlMs) > now) {
    return false; // Lock is still active
  }
  
  lockStore.set(key, { lockedAt: now, ttlMs, userId, operation });
  return true;
}

export async function releaseLock(supabase: SupabaseClient, key: string): Promise<void> {
  lockStore.delete(key);
}

// Logger utility for structured logging
export function createLogger(service: string, requestId: string) {
  return {
    info: (message: string, data?: unknown) => {
      console.log(JSON.stringify({
        level: 'info',
        service,
        requestId,
        message,
        data,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (message: string, data?: unknown) => {
      console.warn(JSON.stringify({
        level: 'warn',
        service,
        requestId,
        message,
        data,
        timestamp: new Date().toISOString(),
      }));
    },
    error: (message: string, data?: unknown) => {
      console.error(JSON.stringify({
        level: 'error',
        service,
        requestId,
        message,
        data,
        timestamp: new Date().toISOString(),
      }));
    },
  };
}

// Error logging to database
export async function logError(
  supabase: SupabaseClient,
  service: string,
  error: Error,
  details?: unknown
): Promise<void> {
  try {
    await supabase
      .from('error_logs')
      .insert({
        service,
        error_message: error.message,
        error_details: {
          stack: error.stack,
          name: error.name,
          ...details,
        },
      });
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }
}

// Create standardized error response
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 400,
  details?: unknown,
  includeRetryAfter: boolean = false,
  retryAfterMs?: number
): Response {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
  
  if (includeRetryAfter && retryAfterMs) {
    headers['Retry-After'] = Math.ceil(retryAfterMs / 1000).toString();
  }
  
  return new Response(
    JSON.stringify({
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
    }),
    { status, headers }
  );
}

// Input validation utilities
export function validateRequired(obj: unknown, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 1000
): string | null {
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  if (value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`;
  }
  return null;
}

// Clean up expired entries periodically (simple cleanup)
setInterval(() => {
  const now = Date.now();
  
  // Clean up rate limit store
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
  
  // Clean up lock store
  for (const [key, value] of lockStore.entries()) {
    if ((value.lockedAt + value.ttlMs) <= now) {
      lockStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Request deduplication utilities
const requestStore = new Map<string, { 
  status: 'pending' | 'completed' | 'failed';
  response?: unknown;
  createdAt: number;
}>();

export async function checkDuplicateRequest(
  supabase: SupabaseClient,
  idempotencyKey: string,
  _userId?: string,
  _operation?: string,
  _requestHash?: string
): Promise<{
  isDuplicate: boolean;
  existingStatus?: string;
  existingResponse?: unknown;
}> {
  const existing = requestStore.get(idempotencyKey);
  
  if (!existing) {
    // Mark as pending
    requestStore.set(idempotencyKey, {
      status: 'pending',
      createdAt: Date.now(),
    });
    return { isDuplicate: false };
  }
  
  return {
    isDuplicate: true,
    existingStatus: existing.status,
    existingResponse: existing.response,
  };
}

export async function completeRequest(
  supabase: SupabaseClient,
  idempotencyKey: string,
  response: unknown,
  status: 'completed' | 'failed'
): Promise<void> {
  requestStore.set(idempotencyKey, {
    status,
    response,
    createdAt: Date.now(),
  });
}

export function generateRequestHash(data: unknown): string {
  return JSON.stringify(data);
}
