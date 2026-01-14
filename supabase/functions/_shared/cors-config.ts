// Centralized CORS configuration for Edge Functions
// Restricts access to specific origins to prevent CSRF attacks

const ALLOWED_ORIGINS = [
  'https://channelchat.app',
  'https://www.channelchat.app',
  // Add development origin only in non-production
  ...(Deno.env.get('SUPABASE_URL')?.includes('localhost') ? ['http://localhost:5173'] : []),
];

export function getCorsHeaders(requestOrigin: string | null): HeadersInit {
  // Check if origin is allowed
  const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin || '') 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0]; // Default to production origin
    
  return {
    'Access-Control-Allow-Origin': allowedOrigin!,
    'Access-Control-Allow-Headers': 'authorization, content-type, x-idempotency-key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
