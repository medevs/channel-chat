# Project Structure

## Directory Layout
```
ChannelChat/
├── src/                          # Frontend TypeScript/React source
│   ├── components/               # React components (shadcn/ui based)
│   ├── hooks/                    # Custom React hooks for business logic
│   ├── lib/                      # Utilities and shared functions
│   ├── types/                    # TypeScript type definitions
│   └── pages/                    # Page components and routing
├── supabase/                     # Supabase backend configuration
│   ├── functions/                # Edge Functions (Deno/TypeScript)
│   ├── migrations/               # Database schema migrations
│   └── config.toml               # Supabase project configuration
├── tests/                        # Test files (unit, integration, E2E)
├── docs/                         # Project documentation
├── .kiro/                        # Kiro CLI configuration
│   ├── steering/                 # Project context documents
│   └── prompts/                  # Custom development prompts
└── public/                       # Static assets and favicon
```

## File Naming Conventions
**Components**: PascalCase (e.g., `CreatorSidebar.tsx`, `ChatInterface.tsx`)
**Hooks**: camelCase with `use` prefix (e.g., `useCreatorChat.ts`, `useVideoPlayer.ts`)
**Utilities**: camelCase (e.g., `transcriptChunker.ts`, `confidenceCalculator.ts`)
**Types**: PascalCase with descriptive names (e.g., `Creator.ts`, `ChatMessage.ts`)
**Edge Functions**: kebab-case (e.g., `ingest-creator.ts`, `chat-with-creator.ts`)

## Module Organization
**Frontend**: Feature-based organization with shared components and utilities
**Backend**: Function-based organization with shared database utilities
**Database**: Schema-first with typed functions and Row-Level Security policies
**Types**: Shared between frontend and backend via generated Supabase types

## Configuration Files
**Frontend**: `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`
**Backend**: `supabase/config.toml`, `deno.json` for Edge Functions
**Database**: Migration files in `supabase/migrations/`
**Testing**: Playwright MCP server configuration (no local Playwright)

## Documentation Structure
**README.md**: Project overview, setup instructions, and architecture
**DEVLOG.md**: Development timeline, decisions, and hackathon documentation
**docs/**: API documentation, deployment guides, and technical specifications

## Asset Organization
**Static Assets**: Stored in `public/` directory
**Component Assets**: Co-located with components when component-specific
**Icons**: shadcn/ui icon system with Lucide React icons

## Build Artifacts
**Frontend**: `dist/` directory for Vite build output
**Backend**: Edge Functions deployed directly to Supabase
**Database**: Migrations applied via Supabase CLI

## Environment-Specific Files
**Development**: `.env.local` for local development secrets
**Production**: Environment variables configured in Supabase dashboard
**Testing**: Separate test database configuration via Supabase CLI
