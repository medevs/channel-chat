// User authentication and context utilities for Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JWTPayload, optionalAuth, requireAuth } from "./auth-middleware.ts";
import { ErrorCodes, createErrorResponse } from "./abuse-protection.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// User context interface
export interface UserContext {
  userId: string;
  email?: string;
  role?: string;
  isAuthenticated: boolean;
  supabase: ReturnType<typeof createClient>;
}

// Service context for system operations
export interface ServiceContext {
  isService: true;
  supabase: ReturnType<typeof createClient>;
}

// Create authenticated Supabase client with user context
export function createAuthenticatedClient(req: Request, _user: JWTPayload) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization')!,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Create service client for system operations
export function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Get user context from request (requires authentication)
export async function getUserContext(req: Request): Promise<Response | UserContext> {
  const authResult = await requireAuth(req);
  
  if (authResult instanceof Response) {
    return authResult; // Authentication failed
  }
  
  const user = authResult as JWTPayload;
  const supabase = createAuthenticatedClient(req, user);
  
  return {
    userId: user.sub,
    email: user.email,
    role: user.role,
    isAuthenticated: true,
    supabase,
  };
}

// Get optional user context (allows anonymous access)
export async function getOptionalUserContext(req: Request): Promise<UserContext | null> {
  const user = await optionalAuth(req);
  
  if (!user) {
    return null;
  }
  
  const supabase = createAuthenticatedClient(req, user);
  
  return {
    userId: user.sub,
    email: user.email,
    role: user.role,
    isAuthenticated: true,
    supabase,
  };
}

// Get service context for system operations
export function getServiceContext(): ServiceContext {
  return {
    isService: true,
    supabase: createServiceClient(),
  };
}

// Dual-mode context: authenticated user or service
export async function getDualModeContext(
  req: Request,
  allowService: boolean = false
): Promise<Response | UserContext | ServiceContext> {
  // Try to get user context first
  const user = await optionalAuth(req);
  
  if (user) {
    const supabase = createAuthenticatedClient(req, user);
    return {
      userId: user.sub,
      email: user.email,
      role: user.role,
      isAuthenticated: true,
      supabase,
    };
  }
  
  // If no user and service is allowed, return service context
  if (allowService) {
    return getServiceContext();
  }
  
  // No authentication and service not allowed
  return createErrorResponse(
    'Authentication required',
    ErrorCodes.UNAUTHORIZED,
    401
  );
}
