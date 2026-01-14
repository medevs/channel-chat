-- ============================================
-- RLS POLICIES FOR TRANSCRIPTS TABLE
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Transcripts are publicly readable" ON transcripts;
DROP POLICY IF EXISTS "Service role can manage transcripts" ON transcripts;

-- Public can read all transcripts (needed for RAG chat)
CREATE POLICY "Transcripts are publicly readable" 
ON transcripts FOR SELECT 
USING (true);

-- Service role can manage all transcripts
CREATE POLICY "Service role can manage transcripts" 
ON transcripts FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- RLS POLICIES FOR USER_ROLES TABLE
-- ============================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage user roles" ON user_roles;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage roles" 
ON user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Service role can manage all roles
CREATE POLICY "Service role can manage user roles" 
ON user_roles FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- RLS POLICIES FOR OPERATION_LOCKS TABLE
-- ============================================

ALTER TABLE operation_locks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own locks" ON operation_locks;
DROP POLICY IF EXISTS "Service role can manage operation locks" ON operation_locks;

-- Users can view their own locks
CREATE POLICY "Users can view their own locks" 
ON operation_locks FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Service role can manage all locks
CREATE POLICY "Service role can manage operation locks" 
ON operation_locks FOR ALL 
USING (auth.role() = 'service_role');

-- ============================================
-- RLS POLICIES FOR REQUEST_IDEMPOTENCY TABLE
-- ============================================

ALTER TABLE request_idempotency ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own idempotency records" ON request_idempotency;
DROP POLICY IF EXISTS "Service role can manage idempotency" ON request_idempotency;

-- Users can view their own idempotency records
CREATE POLICY "Users can view their own idempotency records" 
ON request_idempotency FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Service role can manage all idempotency records
CREATE POLICY "Service role can manage idempotency" 
ON request_idempotency FOR ALL 
USING (auth.role() = 'service_role');
