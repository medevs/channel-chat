// Modern JWT verification middleware for Supabase Edge Functions
import * as jose from "https://deno.land/x/jose@v5.9.6/index.ts";
import { ErrorCodes, createErrorResponse } from "./abuse-protection.ts";

// JWT verification configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_JWT_KEYS = jose.createRemoteJWKSet(
  new URL(SUPABASE_URL + "/auth/v1/.well-known/jwks.json")
);

// JWT payload interface
export interface JWTPayload {
  sub: string; // user ID
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

// Authentication result
export interface AuthResult {
  success: boolean;
  user?: JWTPayload;
  error?: string;
}

// Verify JWT token using JWKS
export async function verifyJWT(token: string): Promise<AuthResult> {
  try {
    const { payload } = await jose.jwtVerify(token, SUPABASE_JWT_KEYS, {
      issuer: SUPABASE_URL + "/auth/v1",
      audience: "authenticated",
    });
    
    return {
      success: true,
      user: payload as JWTPayload,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

// Extract and verify JWT from request
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      success: false,
      error: 'Missing Authorization header',
    };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Invalid Authorization header format',
    };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  return await verifyJWT(token);
}

// Authentication middleware for Edge Functions
export async function requireAuth(req: Request): Promise<Response | JWTPayload> {
  const authResult = await authenticateRequest(req);
  
  if (!authResult.success) {
    return createErrorResponse(
      authResult.error || 'Authentication failed',
      ErrorCodes.UNAUTHORIZED,
      401
    );
  }
  
  return authResult.user!;
}

// Optional authentication middleware (allows anonymous access)
export async function optionalAuth(req: Request): Promise<JWTPayload | null> {
  const authResult = await authenticateRequest(req);
  return authResult.success ? authResult.user! : null;
}
