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
- Supabase CLI for local development
- TypeScript 5.0+
- Vite for frontend development
- Deno for Edge Functions development
- Context7 MCP server for documentation lookup

**CLI-First Setup (2026 Best Practices)**:
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

# 5. Initialize Supabase project structure
supabase init

# 6. Install development tools
pnpm add -D eslint @typescript-eslint/eslint-plugin eslint-plugin-react
pnpm add -D prettier @trivago/prettier-plugin-sort-imports

# 7. Install Supabase client
pnpm add @supabase/supabase-js

# 8. Start development
supabase start
pnpm run dev
```

## Code Standards
**Documentation-First**: Always use Context7 MCP server to lookup official documentation and best practices before implementing any feature or library integration
**CLI-First Approach**: Always use official CLI tools for initialization and setup (Vite, Supabase, shadcn/ui, etc.) rather than manual file creation
**Package Manager**: Always use pnpm over npm for consistency and performance
**TypeScript**: Strict mode enabled, explicit types preferred
**React**: Functional components with hooks, custom hooks for business logic
**Styling**: Tailwind CSS with shadcn/ui components, consistent design system
**Database**: SQL-first approach with typed database functions
**API**: RESTful patterns for Supabase integration, typed responses

## Testing Strategy
**Unit Tests**: Utilities, chunking algorithms, prompt construction logic
**Integration Tests**: Supabase Edge Functions, database operations, external API interactions
**End-to-End Tests**: Full user flows using Playwright MCP server (no local Playwright installation)
**Test Coverage**: Focus on critical paths - ingestion, chat, and citation accuracy

## Deployment Process
**Development**: Local Supabase + Vite dev server
**Staging**: Supabase staging project + Vercel preview deployments
**Production**: Supabase production + Vercel production deployment
**Database Migrations**: Supabase migration system with version control

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
