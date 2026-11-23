# SkillForge: fairness, privacy, and production boundaries

## Scope

SkillForge is a human-reviewed technical assessment platform. Scores, proctoring events, file evidence, and any future model-assisted signal are **review context only**. No automated signal may accept, reject, rank, or silently exclude a candidate.

## Candidate rights

Before starting an assessment, the candidate sees the assessment version, duration, scoring explanation, review model, proctoring mode, retention summary, accommodation path, technical-issue path, and appeal guidance. A candidate may request an accommodation before starting, report a technical issue during an open attempt, and open an appeal only after a final human decision. These requests are stored as workflow records and are not themselves negative integrity signals.

## Human decisions

A company reviewer must submit an explicit decision and a rationale. The server accepts only `accepted`, `rejected`, or `under review`. A score or integrity flag cannot write a final decision by itself. Review ordering is chronological; the displayed triage value is not a hiring ranking. Proctoring events remain contextual evidence for a reviewer and must be interpreted with technical circumstances and candidate explanations.

## Immutable assessment content

Starting an attempt records the test version and copies sections and questions into attempt snapshot tables. Candidate reads, company review reads, and automatic multiple-choice scoring prefer the snapshot. Older attempts created before snapshots exist use a documented compatibility fallback to their test content; this fallback is a remaining migration concern and must not be used to claim historical immutability.

## Proctoring and alternatives

Camera and screen access are browser permissions and never begin before explicit candidate consent. Optional monitoring may be declined. A specifically approved `no_camera` accommodation suppresses the camera/screen control for that attempt. The application does not claim that a browser session is an infallible anti-cheating system; provider availability, browser permissions, connectivity, and technical issues can affect evidence quality.

## Files and retention

Uploaded evidence is stored through the configured object-storage path, with an owner, category, SHA-256 hash, security status, signed access checks, and an expiry timestamp. The upload boundary now checks the binary signature against the declared MIME type for PDF, PNG, JPEG, WebP, WebM, MP4, and plain text, so a client cannot make arbitrary content look like an allowed type. This is format validation, not malware scanning: production must connect an approved scanner/quarantine workflow before treating an uploaded asset as safe. Assets with `pending`, `quarantined`, or `rejected` status must remain unavailable through signed access. The current candidate disclosure describes a default maximum retention of 30 days for temporary attachments. Production operators must configure and verify the deletion worker or provider lifecycle rule before making a legal retention commitment.

Notification titles and previews intentionally remain generic and avoid candidate answers, integrity details, appeal reasons, recording links, or other sensitive assessment content. Full details remain behind the same authenticated, role-scoped pages and audit paths.

## Environments

Mock authentication and seeded fixtures are development-only and must be disabled in production. The mock dataset is not customer data. The code runner and proctoring integration are provider-dependent; production deployment must verify isolation, quotas, network policy, and media-storage lifecycle with the selected provider rather than relying on local development behavior.

## Access control and audit

Candidate queries are restricted to the authenticated candidate. Company queries are restricted to attempts and annotations belonging to that company. Supervisor access is explicit. Review decisions, technical issues, appeals, accommodation requests, and relevant file actions write audit records. Authorization is enforced server-side; frontend role gates are only an experience layer.

## Appeals and accommodations

Appeals are candidate-owned, scoped to the candidate's own attempt, and open only after a final decision. Accommodation requests are candidate-owned and may be attached to an attempt or requested before one exists. An approved no-camera request is respected by the candidate attempt read path; other accommodation types remain workflow records until an operator or company policy fulfills them.

## Production checklist

Before enabling real hiring use, verify: OAuth-only authentication in production; database migration state; snapshot coverage for all legacy attempts; object-storage lifecycle deletion; malware/content scanning policy; sandbox isolation for every enabled code language; rate limits; audit-log retention; email sender verification; export redaction; accessibility review; incident response; and a human review policy approved by the operating organization.
