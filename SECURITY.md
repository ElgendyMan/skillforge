# Security Policy

## Supported versions

The `main` branch is the supported development line. This project is a production-hardening reference and must be independently reviewed before handling real candidate data.

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability. Use GitHub's private vulnerability reporting feature for this repository when available, or contact the repository owner privately through GitHub.

Include:

- affected commit, route, procedure, or file;
- reproducible steps or a minimal proof of concept;
- security impact and affected role/data boundary;
- suggested mitigation, if known.

Do not include real candidate data, credentials, session cookies, recordings, or database exports in a report.

## Security boundaries

- Mock authentication headers are development-only and must not be enabled in production.
- Server-side authorization is the source of truth; frontend route gates are UX protection only.
- Candidate files remain pending until a supervisor security review makes them available.
- Proctoring signals are contextual and must not be used as an automated hiring decision.
- The code execution provider, malware scanner, and storage lifecycle worker must be configured before production use.
