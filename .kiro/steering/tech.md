# Technical Architecture

## Technology Stack
**Frontend**: TypeScript, Vite, React, Tailwind CSS, shadcn/ui
**Backend**: Supabase (PostgreSQL, Auth, Edge Functions on Deno)
**Database**: PostgreSQL with Row-Level Security, pgvector for vector similarity search
**AI/ML**: OpenAI API (embeddings and chat responses)
**External APIs**: YouTube Data API, TranscriptAPI.com
**Payments**: Polar (final phase implementation)
**Testing**: Playwright MCP server for E2E testing

## Architecture Overview
**Database-First Architecture**: PostgreSQL as single source of truth with global data sharing for creators, videos, transcripts, and embeddings to minimize duplication and cost. User-specific data (subscriptions, chats, saved answers) isolated with Row-Level Security.

**Core Components**:
- **Ingestion Pipeline**: YouTube Data API → TranscriptAPI.com → Transcript Processing → Embedding Generation → pgvector Storage
- **Chat System**: Vector Similarity Search → Confidence Filtering → Constrained Prompt Construction → OpenAI Response → Citation Generation
- **UI Layer**: Creator Sidebar, Chat Interface, Video Player Integration, Search & Saved Answers

## Development Environment
**Required Tools**:
- Node.js 18+ with pnpm (always use pnpm over npm)
- Supabase CLI for remote database management (**NEVER USE DOCKER**)
- TypeScript 5.0+
- Vite for frontend development
- Context7 MCP server for documentation lookup

**CLI-First Setup (2026 Best Practices - Docker-Free)**:
```bash
# 1. Initialize Vite React TypeScript project
pnpm create vite@latest . -- --template react-ts
pnpm install

# 2. Install Tailwind CSS 4.0 with Vite plugin
pnpm add tailwindcss @tailwindcss/vite
pnpm add -D @types/node

# 3. Replace CSS with single Tailwind import
echo '@import "tailwindcss";' > src/index.css

# 4. Initialize shadcn/ui (interactive setup)
pnpm dlx shadcn@latest init

# 5. Initialize Supabase project structure (remote only)
pnpm dlx supabase init

# 6. Install development tools
pnpm add -D eslint @typescript-eslint/eslint-plugin eslint-plugin-react
pnpm add -D prettier @trivago/prettier-plugin-sort-imports

# 7. Install Supabase client
pnpm add @supabase/supabase-js

# 8. Configure remote Supabase connection
# Set up .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 9. Link to remote project and deploy
pnpm dlx supabase login
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase db push  # Apply migrations to remote DB
pnpm dlx supabase functions deploy  # Deploy Edge Functions

# 10. Start development (always in background)
pnpm run dev &
```

## Code Standards
**Documentation-First**: Always use Context7 MCP server to lookup official documentation and best practices before implementing any feature or library integration
**CLI-First Approach**: Always use official CLI tools for initialization and setup (Vite, Supabase, shadcn/ui, etc.) rather than manual file creation
**Package Manager**: Always use pnpm over npm for consistency and performance
**Comments & Documentation**: Always add clear, meaningful, and well-placed comments throughout code to improve understanding and long-term maintainability. Comments should explain WHY certain decisions were made, clarify non-obvious logic, document assumptions, edge cases, and important constraints, and provide context where the intent is not immediately clear from the code itself. Avoid redundant comments that merely restate what the code already expresses; focus on explaining complex behavior, tricky conditions, and reasoning that may not be obvious to future readers.
**TypeScript**: Strict mode enabled, explicit types preferred
**React**: Functional components with hooks, custom hooks for business logic
**Styling**: Tailwind CSS with shadcn/ui components, consistent design system. Always use defined CSS variables and color tokens from the design system (e.g., `bg-background`, `text-foreground`, `border`) rather than hardcoded colors. Never introduce new color values - always reference existing CSS variables defined in `src/index.css`.
**Database**: SQL-first approach with typed database functions
**API**: RESTful patterns for Supabase integration, typed responses

## Testing Strategy
**Unit Tests**: Utilities, chunking algorithms, prompt construction logic
**Integration Tests**: Supabase Edge Functions, database operations, external API interactions
**End-to-End Tests**: Full user flows using Playwright MCP server (no local Playwright installation)
**Test Coverage**: Focus on critical paths - ingestion, chat, and citation accuracy
**Test Data**: Always use small datasets (< 5 videos) for testing to minimize costs and processing time

## Deployment Process
**Development**: Remote Supabase + Vite dev server (always run in background with `&`)
**Staging**: Supabase staging project + Vercel preview deployments
**Production**: Supabase production + Vercel production deployment
**Database Migrations**: Supabase CLI with remote database (no Docker required)

## Migration Workflow (Docker-Free)
```bash
# 1. Login and link to remote project
pnpm dlx supabase login
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF

# 2. Create new migration
pnpm dlx supabase migration new migration_name

# 3. Apply migration to remote database
pnpm dlx supabase db push

# 4. Deploy Edge Functions
pnpm dlx supabase functions deploy function_name

# 5. Generate TypeScript types
pnpm dlx supabase gen types typescript --remote > src/types/database.ts
```

## Performance Requirements
**Response Time**: Chat responses < 3 seconds, UI interactions < 200ms
**Scalability**: Designed for concurrent users with database connection pooling
**Cost Control**: Token limits, rate limiting, efficient vector search
**Reliability**: Graceful degradation, comprehensive error handling

## Security Considerations
**Authentication**: Supabase Auth with social providers
**Authorization**: Row-Level Security for data isolation
**API Security**: Server-side rate limiting, input validation
**Data Protection**: Encrypted connections, secure API key management
**Content Safety**: Transcript content filtering, usage monitoring
