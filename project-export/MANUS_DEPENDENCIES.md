# SkillForge Manus dependencies and replacement map

This document is part of the secret-free export. It identifies runtime coupling so a Lovable maintainer does not mistake local Manus behavior for a portable production dependency.

| Current dependency | Where it appears | Purpose | Lovable/Supabase replacement | Boundary |
|---|---|---|---|---|
| Manus OAuth | `server/_core/oauth.ts`, `server/_core/sdk.ts`, client auth hook | User authentication/session | Supabase Auth providers and server session claims | Replace before production; keep role checks server-side/RLS |
| Manus Forge API | `server/_core/dataApi.ts`, `llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `map.ts` | Optional platform APIs | Supabase Edge Functions calling an approved provider, or remove unused feature | Server-only credentials; provider availability is not guaranteed |
| Manus object storage proxy | `server/storage.ts`, `server/_core/storageProxy.ts` | Uploads and signed delivery | Private Supabase Storage buckets + signed URLs | Preserve pending/quarantine workflow and audit events |
| Manus project environment | `.project-config.json` (excluded) and `server/_core/env.ts` | Managed environment variables | Lovable/Supabase project secrets and local `.env` | No credentials are included in this export |
| Manus dev mock auth | `server/_core/mockAuth.ts`, development middleware/tests | Repeatable local role fixtures | Local-only Supabase seed/users or test headers | Must remain disabled in production |
| Manus preview/runtime | `server/_core/vite.ts`, `server/_core/index.ts` | Express/Vite development and deployment shell | Lovable preview/build plus Supabase Edge Functions | UI can be ported; backend routes need replacement |
| Manus notifications | `server/_core/notification.ts` | Owner/platform alerts | Supabase-triggered Edge Function, email provider, or app notifications | Do not put sensitive answers or recordings in previews |
| Resend | `server/routers/hiring.ts` | Optional status email delivery | Keep Resend via Edge Function or use Supabase provider | Verify sender/domain and idempotency before enabling |
| Code runner provider | Runner UI and documented production boundary | Execute candidate code | Dedicated isolated sandbox service | Supabase is not a sandbox; enforce quotas/network policy |
| Proctoring/media provider | Runner and recording metadata | Candidate-consented context evidence | Browser APIs + approved media storage/provider | Never describe it as infallible anti-cheating |
| MySQL/TiDB + Drizzle | `drizzle/schema.ts`, `server/db.ts`, migrations | Source persistence | Supabase Postgres + SQL/RLS/Edge Functions | `supabase/migrations` is a reviewed starting point, not an automatic conversion |

## Secrets excluded from the package

The export intentionally excludes `.project-config.json`, `.env*`, database URLs, JWT/session secrets, Forge keys, OAuth credentials, Resend keys, provider tokens, and real user data. Configure equivalents in the destination project secret manager. `.env.example` contains names only.

## Production decisions that require explicit confirmation

1. Which Supabase Auth providers and sender domain will be used?
2. Which isolated code-execution provider will run each enabled language, and what network policy applies?
3. Which malware scanner and object-storage lifecycle worker will transition/delete file assets?
4. Which proctoring/recording provider is approved, and what consent/retention policy governs it?
5. Which ATS, email, analytics, and export destinations are approved for candidate data?

Until these are answered and tested, the system should remain in development/staging mode and must not be presented as a production hiring decision engine.
