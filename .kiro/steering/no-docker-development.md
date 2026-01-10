---
name: no-docker-development
description: Development workflow without Docker, using remote Supabase database and background processes for optimal development experience.
---

# Docker-Free Development Workflow

## Core Principles
- **Remote-First**: Always use remote Supabase database, never local Docker containers
- **Background Processes**: Always run development server in background with `&`
- **CLI-Only**: Use Supabase CLI with `pnpm dlx` for all operations
- **Direct Deployment**: Deploy Edge Functions and migrations directly to remote

## Development Setup

### Initial Project Setup
```bash
# 1. Project initialization
pnpm create vite@latest . -- --template react-ts
pnpm install

# 2. Supabase setup (remote only)
pnpm dlx supabase init
pnpm dlx supabase login
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF

# 3. Start development server in background
pnpm run dev &
```

### Daily Development Workflow
```bash
# 1. Always start dev server in background
pnpm run dev &

# 2. Work on features, make changes

# 3. Apply database changes directly to remote
pnpm dlx supabase db push

# 4. Deploy Edge Functions directly
pnpm dlx supabase functions deploy function_name

# 5. Generate types from remote database
pnpm dlx supabase gen types typescript --remote > src/types/database.ts
```

## Database Operations

### Migration Management
```bash
# Create new migration
pnpm dlx supabase migration new migration_name

# Apply to remote database immediately
pnpm dlx supabase db push

# Check migration status
pnpm dlx supabase migration list
```

### Edge Function Deployment
```bash
# Deploy single function
pnpm dlx supabase functions deploy function_name

# Deploy all functions
pnpm dlx supabase functions deploy

# Check function logs
pnpm dlx supabase functions logs function_name
```

## Testing Strategy

### Local Testing
- Frontend: Test against remote Supabase database
- Edge Functions: Deploy to remote and test with real API calls
- Database: Use remote database for all testing

### Background Process Management
```bash
# Start dev server in background
pnpm run dev &

# Check if running
curl -s http://localhost:5173 | head -5

# Kill background processes if needed
pkill -f "vite"
```

## Environment Configuration

### Required Environment Variables
```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENV=development
```

### Supabase CLI Configuration
```bash
# Link to remote project
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF

# Verify connection
pnpm dlx supabase projects list
```

## Advantages of Docker-Free Approach

1. **Faster Setup**: No Docker installation or container management
2. **Real Environment**: Test against actual production-like database
3. **Simplified Workflow**: Direct deployment without local/remote sync
4. **Resource Efficient**: No local containers consuming system resources
5. **Team Consistency**: Everyone works against same remote database

## Troubleshooting

### Common Issues
- **CLI Not Found**: Use `pnpm dlx supabase` instead of global install
- **Permission Errors**: Ensure proper Supabase authentication
- **Migration Conflicts**: Use `pnpm dlx supabase db pull` to sync schema

### Background Process Management
```bash
# Check what's running on port 5173
lsof -i :5173

# Kill specific process
kill -9 PID

# Restart dev server in background
pnpm run dev &
```

## Best Practices

1. **Always Background**: Never run `pnpm run dev` in foreground
2. **Remote First**: Never attempt local Supabase setup
3. **Direct Deploy**: Deploy functions and migrations immediately
4. **Type Generation**: Regenerate types after schema changes
5. **Environment Sync**: Keep .env.local updated with remote credentials

This approach eliminates Docker complexity while maintaining full development capabilities through remote Supabase integration.
