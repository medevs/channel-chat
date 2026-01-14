You are a senior staff-level engineer, security auditor, and systems architect. Perform a **comprehensive, end-to-end audit of this entire codebase**.

First, analyze the full repository, including **all application code, configuration, infrastructure, tests, and documentation**, and **also audit any files located in `.agents/audit`**, treating them as first-class inputs to this review.

Use **multiple specialized sub-agents** to complete the work (for example: architecture, backend, frontend, security, AI/RAG, database, testing, and operations). Each sub-agent should independently analyze its area and report findings, which you then consolidate into a single coherent assessment.

Identify what is fully implemented, partially implemented, missing, deprecated, or unused. Clearly separate finished features from stubs or experimental code.

Evaluate **code quality and maintainability**: TypeScript safety, abstractions, naming, structure, error handling, logging, consistency, duplication, technical debt, and long-term scalability risks.

Conduct a **deep security audit** across all layers: authentication, authorization, Supabase usage, Row-Level Security policies, Edge Functions, APIs, request validation, secrets handling, environment variables, CORS, rate limiting, dependency risks, client/server trust boundaries, and any exposed or insufficiently protected surfaces.

Assess **backend reliability and safety**: database schema and migrations, constraints and indexes, vector search usage, concurrency and idempotency, ingestion flows, background work, failure handling, data integrity risks, and cost-explosion scenarios.

Assess **frontend quality and safety**: auth flow handling, data fetching, state management, error and loading states, UX pitfalls, accessibility concerns, and client-side security risks.

Audit **AI and RAG-specific logic**: prompt construction, retrieval grounding, hallucination prevention, citation correctness, confidence scoring, abuse vectors, and cost controls.

Review **testing strategy and coverage**: unit, integration, end-to-end tests, Playwright usage, mocking strategy, gaps, and false confidence risks.

Review **observability and production readiness**: logging, monitoring, alerting, environment separation, feature flags, kill switches, and deployment safety.

Review **dependencies and tooling**: outdated or risky libraries, unnecessary dependencies, version pinning, and maintenance concerns.

After completing all analyses, produce a **single comprehensive Markdown report** that includes:

* Executive summary
* Architecture overview
* Implementation status (complete vs incomplete)
* Code quality assessment
* Security findings (critical / high / medium / low)
* AI-specific risks
* Performance and cost risks
* Testing gaps
* Operational readiness
* Prioritized, actionable recommendations

Be direct, critical, and specific. Assume this system is intended for real users in production. The final output must be a polished Markdown file suitable for saving as **`AUDIT_REPORT.md`**.
