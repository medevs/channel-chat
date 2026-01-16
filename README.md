# ChannelChat - AI Creator Mentorship Platform

> Transform YouTube creators into AI mentors. Chat with creators based on their video content, get answers backed by exact timestamps, and verify every insight directly in the source videos.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2017-3ECF8E)](https://supabase.com/)

## 🎯 What is ChannelChat?

ChannelChat is an AI-powered platform that lets you have conversations with YouTube creators based on their actual video content. Unlike generic AI chatbots, ChannelChat:

- **Only answers from creator content** - No hallucinations or made-up information
- **Provides video timestamps** - Every answer links to exact moments in videos (when asking location-based questions)
- **Shows confidence levels** - Transparent about answer quality (high, medium, low, not covered)
- **Enables verification** - Click timestamps to watch the exact video moment
- **Supports voice chat** - Real-time voice conversations with AI mentors
- **Saves insights** - Bookmark valuable answers for later reference

### Key Features

✅ **Smart Citation System** - Timestamps appear when you ask "where" or "which video" questions  
✅ **Question Classification** - Automatically detects question type (moment, conceptual, general, follow-up)  
✅ **Streaming Responses** - Real-time AI responses with markdown formatting  
✅ **Voice Conversations** - Real-time voice chat with AI mentors  
✅ **Multi-Creator Support** - Follow and chat with multiple YouTube creators  
✅ **Chat Search** - Full-text search across conversation history  
✅ **Saved Answers** - Bookmark and organize valuable insights  
✅ **Responsive Design** - Full light/dark mode support  
✅ **Secure Authentication** - Supabase Auth with Row-Level Security  

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Edge Functions](#-edge-functions)
- [Development](#-development)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Citation System](#-citation-system)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🏗️ Architecture Overview

ChannelChat uses a **RAG (Retrieval-Augmented Generation)** architecture with PostgreSQL as the single source of truth:

```
┌─────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│  YouTube API → Transcript Extraction → Text Chunking →          │
│  OpenAI Embeddings → pgvector Storage                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         RAG CHAT SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│  User Query → Question Classification → Vector Search →         │
│  Confidence Filtering → OpenAI Response → Citation Generation   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND UI                             │
├─────────────────────────────────────────────────────────────────┤
│  React 19 + TypeScript + Tailwind CSS + shadcn/ui              │
│  Streaming Responses + Video Player + Voice Chat                │
└─────────────────────────────────────────────────────────────────┘
```

### Core Design Principles

1. **Database-First Architecture** - PostgreSQL as single source of truth
2. **Global Data Sharing** - Creators, videos, transcripts shared globally to minimize duplication
3. **User Data Isolation** - Subscriptions, chats, saved answers isolated with RLS
4. **Automatic Orchestration** - Background processing without manual triggers
5. **Citation-Backed Responses** - Every AI answer includes verifiable sources

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2 with TypeScript 5.9 (strict mode)
- **Build Tool**: Vite 6.0
- **Styling**: Tailwind CSS 4.1 + shadcn/ui components
- **Routing**: React Router DOM 7.12
- **State Management**: React hooks + Supabase client
- **Forms**: React Hook Form 7.71 with Zod validation
- **Markdown**: react-markdown 10.1 with remark-gfm
- **Theme**: next-themes 0.4 (light/dark mode)

### Backend
- **Database**: PostgreSQL 17 (Supabase)
- **Runtime**: Deno 2 (Edge Functions)
- **Auth**: Supabase Auth with JWT
- **Vector Search**: pgvector extension
- **API**: Supabase client 2.90

### AI/ML
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Chat**: OpenAI gpt-4o-mini
- **Vector Database**: pgvector for similarity search

### External APIs
- **YouTube**: YouTube Data API v3
- **Transcripts**: TranscriptAPI.com

### Development Tools
- **Package Manager**: pnpm (always, never npm)
- **Testing**: Vitest 4.0 with jsdom
- **Linting**: ESLint 9.39 with TypeScript support
- **Formatting**: Prettier 3.7

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **pnpm** package manager (`npm install -g pnpm`)
- **Supabase account** (free tier works)
- **OpenAI API key** (for embeddings and chat)
- **YouTube Data API key** (from Google Cloud Console)
- **TranscriptAPI.com account** (for transcript extraction - 100 free credits)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/medevs/channel-chat.git
cd channel-chat
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials (see [Environment Variables](#-environment-variables) section below).

---

## ⚙️ Environment Variables

### Frontend Environment Variables (`.env.local`)

```env
# Supabase Configuration
# Get from: https://supabase.com/dashboard/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here

# YouTube Data API v3
# Get from: https://console.cloud.google.com/apis/credentials
YOUTUBE_API_KEY=your-youtube-api-key

# OpenAI API
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key

# TranscriptAPI.com
# Get from: https://transcriptapi.com
TRANSCRIPT_API_KEY=your-transcript-api-key

# Development
VITE_APP_ENV=development

# Testing (optional)
TEST_USER_ID=your-test-user-id
```

### Edge Function Secrets (Supabase Dashboard)

Configure these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```
OPENAI_API_KEY=your-openai-api-key
YOUTUBE_API_KEY=your-youtube-api-key
TRANSCRIPT_API_KEY=your-transcript-api-key
```

**Note**: Edge Functions need these secrets configured separately in the Supabase Dashboard, not in `.env.local`.

---

## 🗄️ Database Setup

### 1. Create Supabase Project

- Go to [supabase.com](https://supabase.com)
- Create a new project
- Note your project URL and anon key

### 2. Link to Supabase Project

```bash
# Login to Supabase
pnpm dlx supabase login

# Link to your project
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Apply Database Migrations

```bash
# Apply all migrations to remote database
pnpm dlx supabase db push
```

### 4. Generate TypeScript Types

```bash
# Generate types from remote database schema
pnpm dlx supabase gen types typescript --remote > src/types/database.ts
```

### Database Schema Overview

The database consists of 15 tables organized into logical groups:

#### Core Tables
- **channels** - YouTube channel metadata and ingestion status
- **videos** - Video metadata with duration, views, likes
- **transcripts** - Full transcript text and segments
- **transcript_chunks** - Chunked text with embeddings for vector search

#### User Tables
- **profiles** - User profile information
- **user_usage** - Usage tracking and limits
- **user_creators** - User-creator subscriptions
- **user_roles** - Role-based access control

#### Chat Tables
- **chat_sessions** - Chat conversation sessions
- **chat_messages** - Individual messages with role and content
- **saved_answers** - Bookmarked AI responses
- **voice_conversations** - Voice chat transcripts

#### System Tables
- **error_logs** - Error tracking and debugging
- **operation_locks** - Distributed locking for concurrent operations
- **request_idempotency** - Idempotency for API requests

---

## 🔧 Edge Functions

ChannelChat uses 6 Supabase Edge Functions running on Deno 2.

| Function | Purpose |
|----------|----------|
| `ingest-youtube-channel` | Ingests YouTube channel data and video metadata |
| `extract-transcripts` | Extracts transcripts using TranscriptAPI.com |
| `run-pipeline` | Generates embeddings and processes transcripts |
| `rag-chat` | Handles AI chat with RAG and streaming responses |
| `voice-realtime` | Real-time voice chat with AI mentors |
| `retry-video-processing` | Retries failed video processing |

**Authentication**: All functions use `verify_jwt = false` and handle authentication internally using Supabase's `auth.getUser()` method for flexible authentication logic and better error handling.

### Deploy Edge Functions

```bash
# Deploy single function
pnpm dlx supabase functions deploy function_name

# Deploy all functions
pnpm dlx supabase functions deploy

# View function logs
pnpm dlx supabase functions logs function_name
```

---

## 💻 Development

### Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (always in background)
pnpm run dev

# Run tests
pnpm test

# Run linter
pnpm lint
```

### Database Operations

```bash
# Create new migration
pnpm dlx supabase migration new migration_name

# Apply migrations to remote database
pnpm dlx supabase db push

# Generate TypeScript types
pnpm dlx supabase gen types typescript --remote > src/types/database.ts
```

### Edge Function Deployment

```bash
# Deploy single function
pnpm dlx supabase functions deploy function_name

# Deploy all functions
pnpm dlx supabase functions deploy

# View function logs
pnpm dlx supabase functions logs function_name
```

---

## 🚀 Deployment

### Frontend (Vercel)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository

2. **Configure Environment Variables**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. **Build Settings**
   - Framework: Vite
   - Build Command: `pnpm run build`
   - Output Directory: `dist`
   - Install Command: `pnpm install`

4. **Deploy**
   ```bash
   # Vercel will automatically deploy on push to main
   # Or deploy manually:
   vercel --prod
   ```

### Backend (Supabase)

1. **Apply Database Migrations**
   ```bash
   pnpm dlx supabase db push
   ```

2. **Deploy Edge Functions**
   ```bash
   # Deploy all functions
   pnpm dlx supabase functions deploy
   
   # Or deploy individually
   pnpm dlx supabase functions deploy ingest-youtube-channel
   pnpm dlx supabase functions deploy extract-transcripts
   pnpm dlx supabase functions deploy run-pipeline
   pnpm dlx supabase functions deploy rag-chat
   pnpm dlx supabase functions deploy voice-realtime
   pnpm dlx supabase functions deploy retry-video-processing
   ```

3. **Configure Secrets**
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Add: `OPENAI_API_KEY`, `YOUTUBE_API_KEY`, `TRANSCRIPT_API_KEY`

4. **Configure Authentication**
   - Go to Supabase Dashboard → Authentication → Settings
   - Enable Email authentication
   - Set password requirements (minimum 12 characters)
   - Configure redirect URLs for your production domain
   - **Important**: Email confirmations are enabled by default. Confirmation emails from Supabase's default service (`noreply@mail.app.supabase.io`) often land in spam folders. Check spam/junk if you don't receive the confirmation email within a few minutes.

---

## 📁 Project Structure

```
ChannelChat/
├── src/                          # Frontend React application
│   ├── components/               # React components
│   │   ├── chat/                # Chat-related components
│   │   └── ui/                  # shadcn/ui components
│   ├── hooks/                   # Custom React hooks
│   │   ├── useRagChat.ts       # RAG chat logic
│   │   ├── useCreators.ts      # Creator management
│   │   └── useVoiceSession.ts  # Voice chat
│   ├── pages/                   # Page components
│   │   ├── Landing.tsx         # Landing page
│   │   ├── Auth.tsx            # Authentication
│   │   ├── Chat.tsx            # Main chat interface
│   │   └── VoiceConversations.tsx
│   ├── lib/                     # Utilities and shared code
│   │   ├── supabase.ts         # Supabase client
│   │   ├── types.ts            # TypeScript types
│   │   └── utils.ts            # Helper functions
│   └── types/                   # Type definitions
│       ├── database.ts         # Generated from Supabase
│       ├── chat.ts             # Chat-related types
│       └── auth.ts             # Auth-related types
├── supabase/                    # Backend configuration
│   ├── functions/               # Edge Functions (Deno)
│   │   ├── _shared/            # Shared components
│   │   │   ├── abuse-protection.ts
│   │   │   ├── auth-middleware.ts
│   │   │   ├── ingestion/      # Ingestion logic
│   │   │   ├── rag/            # RAG logic
│   │   │   ├── types/          # Shared types
│   │   │   └── youtube/        # YouTube API logic
│   │   ├── ingest-youtube-channel/
│   │   ├── extract-transcripts/
│   │   ├── run-pipeline/
│   │   ├── rag-chat/
│   │   ├── voice-realtime/
│   │   └── retry-video-processing/
│   ├── migrations/              # Database migrations
│   └── config.toml              # Supabase configuration
├── tests/                       # Test files
│   ├── edge-functions/         # Edge Function tests
│   ├── integration/            # Integration tests
│   └── *.test.ts               # Unit tests
└── .kiro/                       # Kiro CLI configuration
    ├── steering/               # Project context
    └── agents/                 # Custom agents
```

---

## 🔍 How It Works

### Ingestion Pipeline

```
1. User adds YouTube channel
   ↓
2. ingest-youtube-channel
   - Fetches channel metadata
   - Fetches video list (configurable limit)
   - Stores in database
   ↓
3. extract-transcripts (background)
   - Calls TranscriptAPI.com
   - Stores transcript with timestamps
   ↓
4. run-pipeline (background)
   - Chunks transcript (500 tokens, 50 overlap)
   - Generates embeddings (OpenAI)
   - Stores in pgvector
   ↓
5. Channel ready for chat!
```

### Chat Flow with Smart Citations

```
1. User sends message
   ↓
2. Question Classification
   - moment: "Where does he talk about X?"
   - conceptual: "What is X?"
   - general: "Tell me about X"
   - follow-up: Short contextual questions
   ↓
3. Vector Similarity Search
   - Generate query embedding
   - Search pgvector (cosine similarity)
   - Filter by confidence threshold
   ↓
4. Response Generation
   - Construct prompt with context
   - Stream OpenAI response
   ↓
5. Citation Generation (conditional)
   - ONLY for 'moment' questions or location keywords
   - Include video title, timestamp, thumbnail
   ↓
6. Response sent to user
```

### Citation System

**Citations with timestamps appear ONLY when:**

✅ Question type is 'moment' (asking for specific location)  
✅ Query contains location keywords: "where", "which video", "when did", "timestamp"

**Examples that GET citations:**
- "Where does he talk about React hooks?"
- "Which video covers TypeScript?"
- "When did he mention Next.js?"

**Examples that DON'T get citations:**
- "What is React?" (conceptual)
- "How do I use hooks?" (general)
- "Tell me about TypeScript" (overview)

This smart citation system ensures timestamps are shown when relevant, avoiding clutter for conceptual questions.

---

## 🐛 Troubleshooting

### Common Issues

#### Citations not appearing
**Cause**: Question not classified as 'moment'  
**Solution**: Rephrase with location keywords: "Where does he talk about X?"

#### "No timestamp data" warning
**Cause**: Video doesn't have captions or extraction failed  
**Solution**: Check if video has captions on YouTube, retry processing

#### "I haven't covered that topic"
**Cause**: No relevant content found  
**Solution**: Ensure channel is fully indexed, try more general questions

#### Slow ingestion
**Cause**: Large number of videos or API rate limits  
**Solution**: Reduce video import limit, wait for background processing

### Debug Mode

Enable detailed logging:

```env
VITE_DEBUG_MODE=true
```

Shows: chunks found, similarity scores, question classification, citation logic

### Checking Logs

```bash
# View Edge Function logs
pnpm dlx supabase functions logs rag-chat
pnpm dlx supabase functions logs ingest-youtube-channel
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

Built with:
- [Supabase](https://supabase.com) - Backend infrastructure
- [OpenAI](https://openai.com) - AI embeddings and chat
- [Vite](https://vitejs.dev) - Frontend build tool
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Kiro CLI](https://kiro.dev) - AI-assisted development

---

**Built in 25 hours using advanced Kiro CLI workflows** 🚀
