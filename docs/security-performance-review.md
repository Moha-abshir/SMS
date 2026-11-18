# Security and performance hardening — implementation record

18 November 2026. Baseline: merged main `0af4e66`. Work is local on `codex/security-performance`; nothing has been pushed or deployed.

## Delivered behavior

### Authentication, recovery and logging

- Session validation fails closed with a retryable 503 when the database check fails. A database outage does not clear browser login state. Missing/inconsistent token versions are rejected, including the previous zero-version bypass.
- Verification codes use cryptographic randomness, are consumed atomically, and are absent from responses and logs. Concurrent verification of one code admits one request. Failed email delivery returns failure instead of claiming success.
- Recovery/invitation links use trusted frontend destinations. A forged Origin/Referer cannot select an attacker site. SMTP certificate verification uses secure defaults; email/SMS network calls and SMTP waits are bounded.
- Role or email changes increment token versions and invalidate the local session cache. Unchanged staff identity does not force reauthentication. The cache holds at most 1,000 users and accepts entries for at most 60 seconds.
- Helmet is active. HTTP authorization/cookie headers are redacted. Controllers return generic database failures and log error classification instead of dumping SQL parameters, credential hashes or school records. Production logs use structured JSON without a pretty-print worker.
- Account throttles normalize emails and handle IPv6. An aggregate IP throttle also covers account rotation. Railway defaults to one trusted proxy hop; other topologies can set `TRUST_PROXY_HOPS` explicitly (0–5).

### Server-side access boundaries

- Staff mutations require staff-management permission. Non-head managers can manage teaching accounts, but cannot assign privileged roles or change privileged accounts. Only the head teacher manages those accounts. Staff update/status responses omit credential fields.
- DoS/exam reviewers retain a teaching directory for allocations without payroll/national-ID fields. Ordinary teachers cannot use the management directory or mutate staff accounts directly.
- CAT creation, scores, deletion, marksheets and class analysis check the caller's assignment. Subject teachers access assigned subjects; class-wide analysis requires the class teacher or leadership. Effective stand-ins are supported.
- Learner profiles, class directories and guardian messages require the effective class teacher or leadership. Attendance reads/writes enforce class scope; school-wide oversight and bulk notification require an oversight role. SMS destinations are obtained from the learner's stored guardian, not client-supplied phone/name fields.
- Guardian searches, school-wide student directories, inventory and leave management have role/permission checks. Finance retains its student-directory access.
- Stand-in authority starts when approved leave begins (Nairobi date) and ends on reported return. Delegation lookup batches class resolution rather than querying inside the leave loop.

### Marks and financial integrity

- Draft saving and resubmission cannot overwrite reviewed, submitted, correction-requested or locked sheets. An explicit authorized unlock is required, matching the existing UI workflow.
- Class/exam advisory transaction locks serialize entry and review/lock transitions across application instances. Authorization reads within those transactions reuse the same connection; bursts larger than the connection pool are tested.
- Mark payloads reject duplicate learners, learners outside the active class, non-finite values and invalid maxima. Missing/blank draft marks keep their existing behavior; zero remains a recorded score. CAT blanks still remove that CAT score.
- Payments serialize receipt allocation/bill creation, lock bill rows and preserve simultaneous payments. Bills must belong to the submitted learner and term. Amounts must be positive, finite and have at most two decimal places.
- Reference-bearing payment retries return the existing receipt when the details match; conflicting or reversed references are rejected. Cash payments without a provider reference remain distinct transactions.
- Reversal approval locks the request, payment and bill. Concurrent approval succeeds once. Rejection cannot delete an already-approved reversal. Financial summaries now respect the selected year/term and aggregate in SQL.
- Regenerating an exam timetable replaces its sessions/invigilators atomically and does not clear other exams' invigilators. Invalid generation no longer leaves partial replacements.

### Query, CPU and loading changes

- Attendance uses roster validation and batch writes instead of per-learner lookup/write pairs, retaining existing record IDs and transaction rollback.
- Exam/CAT score writes, guardian/student imports, self-contained teacher assignments and exam sessions are batched. Subject-link restoration is atomic. Timetable persistence uses bounded batches of 500 rows.
- Learner history is fetched for all relevant exams in one query. CAT analysis groups scores by assessment/subject using request-local maps; allocation membership uses composite-key sets.
- Timetable conflict tracking already used suitable sets/maps. That algorithm was retained; malformed or excessive time grids/lesson demands are rejected before excessive work is allocated.
- Routes load lazily with a recoverable error boundary. Simultaneous branding reads share one request. Obsolete guardian searches are cancelled so old responses cannot replace a newer query.
- The PWA precaches the shell, then caches same-origin scripts when visited (100-entry / seven-day bound). API responses are not runtime-cached. Shared-package tree shaking excludes unused validators from browser helper imports.
- The allocation page now calls the existing `/allocations/subject-teacher` endpoints.

## Measurements and acceptance checks

| Check | Result |
| --- | --- |
| Main JavaScript, before UI hardening to final build | approximately 340 KB → 140.40 KB gzip (427.58 KB raw final) |
| PWA precache after full route splitting, before/after cache policy | approximately 1,663 KiB / 79 entries → 552 KiB / 6 entries |
| Draft-save statements, one versus 30 learners | 6 versus 6 Drizzle-logged statements; driver transaction-control commands excluded |
| Synthetic CAT analysis: 240 assessments / 24,000 scores, 20 runs | repeated scans p50 148.8 ms / p95 218.9 ms; grouped lookup p50 1.46 ms / p95 3.99 ms; equivalent totals checked |
| Synthetic timetable: six classes / eight teachers / 192 requested lessons, ten runs | p50 18.0 ms / p95 39.7 ms; no teacher/class slot collisions |
| Browser role/viewport pass | 18 routes × 390/768/1366px = 54 checks; no API/JavaScript errors, unexpected redirects, recovery screens or document overflow |
| Idle API checks | settings, review and learner pages: zero additional requests during each three-second observation |
| Offline/cache check | visited settings workspace loads with network/API requests blocked; no API URLs in browser caches |
| Chunk failure | blocked staff-page chunk presents an explicit reload action |
| Dependency audits | production: 0 advisories; full tree: 21 (14 high, 7 moderate), all remaining findings in development/build tooling |

Timing results describe local synthetic workloads, not production capacity or a guaranteed phone speedup. Heap/RSS were recorded by the profiling script with explicit GC; the grouped calculation trades a small request-local index for substantially less scanning. These short runs do not establish the absence of memory leaks.

Regression coverage includes object-access denials through HTTP, privilege escalation, redacted staff directories/errors/logs, single-use OTPs, role-change revocation, roster rejection, zero marks, correction/lock bypasses, concurrency above pool capacity, simultaneous payments, reference retries, duplicate reversal approval, import rollback, subject restoration, unrelated exam preservation and future/returned stand-ins.

The full workspace build and all eight regression groups pass, including the additional logging regression. A clean source copy without `.env` files also installs, produces a production build, and passes all eight groups with disposable databases. GitHub Actions now repeats the build/schema/test sequence and rejects high/critical production advisories. The hosted workflow itself has not run because this branch has not been pushed.

## Database inspection and migration choice

The connected read-only snapshot reviewed during the work showed all 51 expected tables, no missing columns, and six extra legacy leave columns created by startup extensions. It showed no duplicate attendance register/student groups or active learner/term bill groups. A representative read returned 3,250 exam scores in about 0.8 ms inside PostgreSQL; a sequential scan was appropriate because almost every row matched. No speculative index was added.

The final attempt to recheck the configured remote database timed out on its PostgreSQL connection. The checked-in read-only audit script was verified against the local disposable database (51 tables, no column drift). Earlier remote observations are a snapshot, not a guarantee of current deployment state.

No application schema migration or business-record write was performed against the configured database. All write/concurrency fixtures use separate local PostgreSQL databases. No SMS or security email was sent during verification.

## Running the checks

From the repository root:

```bash
npm run build
npm --workspace=@school/api test
npm audit --omit=dev
node --expose-gc --import tsx apps/api/scripts/profile-workloads.ts
./node_modules/.bin/tsx apps/api/scripts/audit-database.ts
```

Without integration environment variables, the two database integration groups are explicitly skipped. For the complete suite, provision **two disposable databases**; never use the school database. Initialize the security database from `packages/shared` using `DATABASE_URL=<disposable-security-url> .../drizzle-kit push --force`, then run:

```bash
TEST_DATABASE_URL=<empty-disposable-attendance-url> \
SECURITY_TEST_DATABASE_URL=<disposable-security-url-with-shared-schema> \
npm --workspace=@school/api test
```

The attendance fixture creates and drops its tables/types. The academic/security fixture inserts synthetic records and must target a disposable database. The CI workflow contains a complete isolated setup. `AUDIT_DATABASE_URL` optionally redirects the read-only audit to another database; remote audit connections require TLS.

## Remaining risks and rollout limits

- **Build tooling:** the 21 remaining advisories require coordinated Vite/PWA/Tailwind/Drizzle Kit upgrades. Do not expose development/preview servers publicly. These major build/CSS migrations were not forced into this application-hardening pass. Production dependencies were updated and independently audited; that does not certify the application's security.
- **Session architecture:** cross-instance revocation can lag up to 60 seconds. Access tokens remain in localStorage with the existing configured lifetime. An HttpOnly-cookie/refresh-token migration needs a separate CSRF and deployment design, as specified in the plan.
- **Cash retry identity:** identical cash submissions have no server idempotency key; the system cannot safely infer whether they are retries or distinct payments. Provider-reference retries are protected. A general cash request-key contract needs an additive schema/client change.
- **Operations:** startup DDL/auto-seeding remains legacy behavior, not a versioned migration system. The health endpoint is process liveness, not database readiness. Production pool sizing, cold-start/p95 latency and sustained load still need deployment-side measurement; no load test targeted school data.
- **Coverage:** browser checks use synthetic sessions/records, not physical iOS/Android devices or live-role sign-ins. Extremely large datasets, long-duration memory behavior and every external provider failure are not exhaustively established.

Before deployment, use a supported Node runtime (CI uses Node 24), retain the configured strong JWT secret, and verify the frontend URL/proxy topology. Review the permission tightening for secretaries/deputies managing privileged accounts and the explicit-unlock rule. Monitor 403/429/503 rates, payment conflicts and response latency after release; rollback is by focused commits. No push or deployment was performed.

Dependency migration references: [Zod migration guide](https://zod.dev/v4/changelog), [React Router compatibility exports](https://api.reactrouter.com/v7/modules/react-router-dom.html), [Drizzle identifier-escaping advisory](https://github.com/advisories/GHSA-gpj5-g38j-94v9).
