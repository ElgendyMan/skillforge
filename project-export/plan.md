# SkillForge Fair Hiring + Lovable Export Plan

## Goal
Create a secret-free, path-preserving `project-export/` workspace and `project-export.zip` that preserves the existing SkillForge application while documenting the migration from the current Manus Forge + MySQL runtime to Lovable + Supabase/Postgres.

## Non-negotiable product boundaries
- Hiring decisions remain explicit human decisions only: accepted, rejected, or under review.
- Scores, proctoring events, recordings, integrity flags, and future model signals are contextual evidence only.
- Attempts read immutable snapshots/version references; later test edits must not change active or historical attempts.
- Candidate disclosure, consent/alternative accommodation, technical-issue pause, appeals, retention, and secure file access remain visible and auditable.
- Mock authentication and seeded data remain development-only.

## Work phases
1. Inventory the repository, tracked files, environment references, migrations, tests, and production boundaries.
2. Confirm current fairness/privacy implementation and document any provider-dependent gaps without claiming them as complete.
3. Build a path-preserving export containing source, tests, docs, migrations, and configuration examples, excluding secrets, local state, build output, and Manus runtime metadata.
4. Add `LOVABLE_MIGRATION.md` with a staged React/Supabase/Postgres migration map, SQL conversion notes, RLS requirements, storage policies, Edge Function boundaries, and test parity expectations.
5. Add `MANUS_DEPENDENCIES.md` listing every current Manus-specific dependency and its production/Lovable replacement or required decision.
6. Add a secret-scan manifest and export verification script; generate `project-export.zip`.
7. Run TypeScript, Vitest, Playwright where available, production build/chunk assertions, export integrity, and secret checks. Record exact results.

## Export rules
- Preserve repository-relative paths under `project-export/`.
- Exclude `.project-config.json`, `.env*`, private keys, logs, node_modules, dist/build/coverage, `.git`, Manus debug/version artifacts, and database dumps.
- Include `.env.example` with names only and safe placeholders.
- Include the original MySQL/Drizzle source as the reference implementation; include a separate Supabase SQL baseline and mark it as migration input requiring review.
- Do not include real user data, seeded database exports, OAuth tokens, API keys, or storage URLs that act as credentials.
