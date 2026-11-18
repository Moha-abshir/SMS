# Security and performance implementation record

Baseline: merged main `0af4e66`. Changes remain local on `codex/security-performance`.

## Implemented

- Authentication fails closed with HTTP 503 on session database failures, preserving client login state. Explicit integer token-version checks reject version zero mismatches and missing versions. JWT verification accepts HS256 only.
- Session cache capped at 1,000 users; expired entries are not accepted. Cross-instance revocation can still lag up to 60 seconds.
- Enabled Helmet and redacted authorization/cookie headers in HTTP logs.
- Removed OTP console output; login/resend OTP generation now uses cryptographic randomness.
- Production startup requires a JWT secret of at least 32 characters and rejects the historical fallback. Operators must provision this before deployment; changing the secret signs everyone out.
- Normalized account rate-limit keys and used the library IPv6 key helper.
- Attendance writes now use a roster validation query plus two batch statements, rather than two SQL operations per learner. Existing IDs, creation timestamps, partial-submission semantics, and transaction rollback are preserved. Existing register rows are locked during submission; simultaneous creation relies on the existing class/date unique constraint.
- CAT allocation subject fetches are bounded to one query rather than one per eligible class; composite Set membership replaces repeated allocation scans.
- Pages load through React lazy route chunks with a loading fallback. Simultaneous public-branding requests share one promise; no persistent settings cache was introduced.

## Verification

`npm --workspace=@school/api test`: authentication middleware tests use a database stub; attendance integration tests require TEST_DATABASE_URL pointing to an **empty disposable database**. They create and drop test tables/types. Never point this at application data.

Attendance integration checks ran on temporary local PostgreSQL, independent of configured application credentials. Covered saved values, stable record IDs on updates, locked resubmission, invalid roster rejection and rollback. Authentication checks cover valid access, revoked zero-version tokens, missing versions, and database outages.

Initial route splitting build reduced the main JavaScript asset from approximately 1.49 MB / 340 KB gzip to 453 KB / 143 KB gzip. This is a build artifact measurement, not a measured phone speedup. PWA precaching still fetches route assets in the background; total installation transfer is not reduced.

## Outstanding work — broader plan is not complete

1. **High: CAT object authorization.** Routes require login but read endpoints do not pass caller identity into services; save/delete signatures include unused user IDs. Add assignment-scoped service checks and adversarial integration tests, including class-wide responses that could reveal other subjects. Do not treat frontend role guards as enforcement.
2. **High: mark/report lock audit.** Verify every CAT/exam mutation and concurrent transition against report locks; add isolated database regression fixtures before changes.
3. **High: dependency advisories.** Initial npm audit reported 45 (1 critical, 30 high, 13 moderate, 1 low), including a critical proxy-addr advisory. Compatible lockfile updates reduced this to 27 (16 high, 11 moderate), with no critical advisories remaining. Remaining recommendations include breaking upgrades (for example Zod 4). Counts include transitive/development dependencies and do not establish exploitability. Review those upgrades separately.
4. **High: database schema drift and finance consistency.** Compare actual constraints/indexes with shared schema and startup DDL. Attendance detail rows lack a declared register/student uniqueness constraint; do not add it without checking duplicates and migration recovery. Audit payments/reversals for concurrency and idempotency.
5. **Medium: session policy.** Role/permission changes and revocation across instances need explicit freshness guarantees. Browser tokens remain in localStorage; cookie migration requires CSRF/deployment design.
6. **Medium: baseline measurements.** Request/SQL counts, p95 latency, cold starts, peak heap, timetable CPU profiles, real query plans and production pool capacity remain unmeasured. Do not add speculative indexes or claim capacity improvements from static inspection.
7. **Medium: frontend/runtime coverage.** Exercise lazy chunk failures, role routes, mobile navigation, stale requests and request loops in a browser. Add a recovery boundary for failed chunk downloads. Existing changes have build coverage, not fresh browser QA.
8. **Medium: endpoint mismatch.** Previously observed allocation subject route mismatch needs a dedicated regression check.

No application data migration, business-record writes against the configured database, deployment, or push was performed. This is an initial hardening batch with explicitly incomplete follow-up work, not a security certification.
