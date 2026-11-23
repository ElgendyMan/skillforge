# SkillForge export contents and API catalog

## Package contract

`project-export.zip` contains one top-level directory, `project-export/`, so repository-relative paths remain stable after extraction. The package is source-only and migration-ready; it is not a production database dump and it does not contain customer records.

Excluded by design: `.project-config.json`, all `.env` variants, credentials, private keys, database URLs, database dumps, `node_modules`, `dist`, `build`, coverage, Playwright results, logs, `.git`, Manus debug/version assets, and the generated export directory itself. Development fixture generators and tests are source code only; they do not include a seeded database.

`EXPORT_MANIFEST.json` is the authoritative file list generated during export. Every included path is listed there with the source commit and exclusion policy.

## Root configuration and documentation

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`: dependency and command definitions.
- `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `components.json`, `patches/`: build, test, UI component, and compatibility configuration.
- `ENVIRONMENT_VARIABLES.example`: variable names with placeholders only.
- `LOVABLE_MIGRATION.md`: staged Manus-to-Lovable/Supabase conversion, Postgres/RLS, Storage, Auth, Edge Function, testing, and production checklist.
- `MANUS_DEPENDENCIES.md`: dependency-by-dependency replacement map and unresolved provider decisions.
- `docs/fairness-privacy-production.md`: candidate rights, human decisions, snapshots, proctoring limits, file quarantine, retention, appeals, and production boundaries.
- `fairness-security-gap-audit.md`, `production-audit-notes.md`, `plan.md`, `todo.md`, `.audit-fairness-notes.md`: audit evidence, implementation plan, completed task history, and known gaps.
- `supabase/migrations/00000000000000_skillforge_baseline.sql`: reviewed Postgres/RLS starting point. It must be reviewed and extended before production.
- `drizzle/`, `drizzle.config.ts`: current verified MySQL/Drizzle reference migrations and schema; retain during migration for behavior comparison.

## Frontend paths

- `client/index.html`, `client/src/main.tsx`, `client/src/index.css`: document shell, React entry, RTL/dark visual system.
- `client/src/App.tsx`: route registry, lazy page chunks, authentication gate, role mismatch state, and fallback recovery route.
- `client/src/pages/Platform.tsx`: candidate discovery/dashboard, candidate profile, company dashboard, company tests, test creator, review/attempt views, public company page, supervisor workspace, secure files, notifications, and related platform screens.
- `client/src/pages/AssessmentEnhancers.tsx`: candidate status, test runner, disclosure, timer/autosave, technical issue, appeals/accommodations, code editor, and review experience.
- `client/src/pages/CompanyComparisonExperience.tsx`: company-scoped comparison, filters, notes/tags, comments, templates, and CSV/PDF export.
- `client/src/pages/Home.tsx`, `NotFound.tsx`, `ComponentShowcase.tsx`: public landing, recovery state, and component reference.
- `client/src/components/`: layout, portal shell, auth/loading/error boundaries, chat/map/dialogs, and reusable UI primitives.
- `client/src/lib/`: tRPC client, assessment safety helpers, export helpers, and shared utilities.
- `client/src/_core/hooks/useAuth.ts`, `contexts/`, `hooks/`, `const.ts`: auth, theme, responsive behavior, composition, persistence, and constants.
- `client/public/`: only small public configuration placeholders; no media or secrets.

## Server paths

- `server/_core/`: framework integration, request context, session/OAuth, cookies, environment access, Vite/Express runtime, storage proxy, Forge API adapters, notifications, LLM/image/map/transcription adapters, mock auth, and production hardening.
- `server/routers.ts`: tRPC root router and `auth.me`/`auth.logout`.
- `server/routers/hiring.ts`: catalog, candidate, account, company, proctoring, files, notifications, and supervisor procedures.
- `server/routers/reviewTools.ts`: comparison, notes/tags, filter templates, and code review comments.
- `server/db.ts`, `server/storage.ts`: database and object-storage helpers.
- `server/*.test.ts`, `server/routers/*.test.ts`, `server/_core/*.test.ts`: authorization, isolation, snapshot, file-security, notification, routing, and production-hardening regression tests.

## Route map

Public: `/`, `/discover`, `/companies/:slug`, `/404`.

Candidate: `/candidate`, `/candidate/profile`, `/candidate/status`, `/candidate/notifications`, `/candidate/files`.

Company: `/company`, `/company/create-test`, `/company/attempts`, `/company/compare`, `/company/tests`, `/company/profile`, `/company/notifications`, `/company/files`, `/company/review/:id`.

Supervisor: `/supervisor`, `/supervisor/attempts`.

Assessment: `/attempt/:id`. Compatibility redirects: `/candidate/dashboard → /candidate`, `/company/dashboard → /company`.

Every role route is protected by a frontend gate for UX and by server-side authorization/RLS for security. The gate intentionally shows a permission explanation instead of silently redirecting a mismatched role.

## tRPC API catalog

Root namespaces: `auth`, `system`, `catalog`, `account`, `candidate`, `company`, `proctoring`, `files`, `notifications`, `supervisor`, `reviewTools`.

- `auth.me` query; `auth.logout` mutation.
- `catalog.list`, `catalog.detail`, `catalog.companyPage` public queries.
- `account.activateCompany` protected mutation.
- `candidate.profile.get/save`; `candidate.attempts.start/get/saveAnswer/reportTechnicalIssue/submit`; `candidate.attempts.list`; `candidate.feedback.listPublished`; `candidate.appeals.list/create`; `candidate.accommodations.list/request`.
- `company.profile.get/create/update/uploadLogo`; `company.dashboard`; `company.tests.create/mine`; `company.attempts.list/review/detail`.
- `proctoring.start/logEvent/finish` consented protected mutations.
- `files.listMine/upload/reviewSecurity/secureAccess`; security review is supervisor-scoped and signed access rejects pending/quarantined/rejected assets.
- `notifications.list/markRead`.
- `supervisor.overview/attempts` supervisor-only queries.
- `reviewTools.comparisonFilters`, `comparisonCandidates`, `comparison`; `candidateAnnotations.upsert`; `templates.list/create/remove`; `comments.list/create/remove`.

When migrating to Lovable, map read-only catalog/profile/list procedures to typed Supabase queries, and map review decisions, file status changes, signed access, appeals, audit writes, email dispatch, and export generation to Edge Functions with RLS-backed authorization.

## Verification commands

```bash
pnpm check
pnpm test
pnpm test:e2e
pnpm build
pnpm export:project
```

The export command regenerates the folder and ZIP, writes the authoritative manifest, rejects secret-like literals, and reports the included file count. It must be run after any source change before delivery.
