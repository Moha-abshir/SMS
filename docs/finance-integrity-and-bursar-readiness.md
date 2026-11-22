# Finance safeguards before expanding the bursar portal

Implemented 22 November 2026. These changes are local until explicitly pushed and deployed. Validation used disposable local databases and synthetic accounts; the configured school database was not modified.

## How the workflow now works

1. In **Fee Structures**, select an academic year with configured terms. Enter explicit rates and save them. Reading this page does not create terms, fee rates or bills, and missing rates are not replaced with preset amounts. Enter `0` explicitly for a free rate.
2. The head teacher reviews the saved amounts and approves each term. Bursars can prepare changes but cannot approve them. Approval verifies the exact reviewed rates; a concurrent fee change requires another review. Saving a different amount removes its approval.
3. In **Financial Management**, select the year and term, then review **Term billing**. It shows eligible learners, existing bills, proposed new bills and missing/unapproved fees. Confirmation creates all missing bills in batches, or fails without partially billing the cohort. An approved class-specific rate takes precedence over a level rate.
4. As confirmed by the project owner, new bills can only be generated for the school's configured **current academic year**, using current class placements. Only active, undeleted learners admitted on or before the selected term's end date are eligible. Historical charges require a separately reviewed import. Existing older bills remain payable, including bills belonging to former learners.
5. Rerunning generation adds missing learners without duplicating or repricing existing bills. Fee changes apply to subsequently generated bills. Changing existing invoices, waivers, credit transfers and arrears allocation are separate business workflows, not automatic side effects of editing rates.
6. Record a payment against an existing bill for an explicit year/term. Missing bills, unconfigured terms and malformed amounts are rejected. An invalid term never falls back to another term. Manual M-Pesa requires a reference; bank/cheque payments require the corresponding reference. This manual endpoint cannot declare an unverified STK transaction successful.
7. The bursar requests a reversal with a reason. A head teacher other than the requester approves or rejects it. Rejection requires a decision reason and preserves the request. Head-only checks remain effective even if an older bursar token still contains a reversal-approval permission.

The payment ledger, summaries, pending reversal pages, decision history and selected learner statements use the selected year/term. Ledger searches and pagination run on the server. Pending requests and history are paginated too. Existing-bill credits are displayed separately from positive outstanding balances; no automatic credit carry-forward has been introduced.

## Payment and audit integrity

- Every payment attempt has a UUID request key and canonical payload fingerprint. Concurrent identical requests return the original receipt; changing details or the actor under the same key is rejected. Provider-reference retries are also linked to their request keys. Distinct cash payments use distinct keys, even if their amounts match.
- The browser retains an unresolved attempt's key in session storage, storing its fingerprint rather than the payment details. Network failures, unverified responses and unconfirmed server/database outcomes keep that key. Unexpected payment infrastructure errors return a retryable 503; only explicit validation errors return 400. A matching retry uses it again. Before starting a different payment, the user must check the ledger and explicitly resolve the previous attempt. Clearing a browser session cannot itself recover the original form details; the ledger remains the place to verify an uncertain payment.
- Monetary updates use integer minor units and decimal strings. Bill rows and reversal rows are locked in transactions. A request key cannot resurrect a reversed payment.
- A bill whose stored totals disagree with its unreversed payments cannot accept a new payment or reversal until it is reconciled. The code never silently clips a negative discrepancy or invents a correction.
- Fee changes, fee approvals, bill generation, payments and reversal requests/decisions write audit records in the same transaction. Audit failure rolls back the financial change. Previously deleted reversal requests cannot be reconstructed by this change.
- **Internal balance checks** compare bills with the recorded payment ledger and identify missing/inconsistent bill links. They do not establish that physical cash, bank statements or M-Pesa records match the system. External reconciliation remains a separate task.

## Schema and deployment

The dated, rerunnable startup migration is in `apps/api/src/config/financeMigration.ts`. The API awaits it before accepting requests. It adds fee approval fields, payment request identity, the `payment_request_keys` table, retained reversal decision fields, and unique indexes for active learner/term bills and fee configuration scopes. Existing payments keep nullable request identities. Existing rates require explicit head teacher approval before generating new bills; existing bill amounts are preserved.

Duplicate active bills or duplicate fee scopes stop migration with `FINANCE_DUPLICATES`. The migration never picks a winner, merges payments or deletes historical records. Existing duplicates need reviewed resolution before deployment. Additive columns may already exist after a failed attempt; rerunning is safe once the underlying issue is resolved. Startup migration is still the project's existing deployment approach, not a complete versioned-migration platform.

Before deploying, use the read-only preflight against the intended database:

```bash
AUDIT_DATABASE_URL='<database connection URL>' \
  node --import tsx apps/api/scripts/audit-finance.ts
```

It reports duplicate active bill/fee groups, unlinked payments and inconsistent bill totals, without changing records. A nonzero exit status means review is needed. TLS is required by default; `AUDIT_LOCAL=true` is only for an explicitly chosen local disposable database. Never put a connection URL into a commit or shared output.

For the deployed environment, verify the provider's actual backup retention and access, retain a pre-migration backup, and test recovery in a separate database. The local restore drill below does **not** establish that Railway backups are enabled or recoverable. No hosted backup settings were changed or inspected in this work.

## Validation

- Workspace production build passed; the API was rebuilt after the final consistency guard.
- All **15 API tests** passed without skips. Finance coverage includes concurrency beyond the pool size, cash and provider-reference retries, request-key conflicts, precision validation, audit-failure rollback, self-approval denial, approval/rejection races, retained decisions, stale fee approval, atomic fee batches, read-only fee queries, late-admission billing, idempotent generation, current-year-only generation, older-bill payment, statement/ledger filters and HTTP denial for bursars carrying old approval permissions.
- All **32 browser tests** passed. New finance scenarios cover 390, 768 and 1366 pixel widths, server-side search/page filters, bursar review restrictions, cash network/server-failure retries, exact-rate approval, explicit billing confirmation, and retry states that do not invent zero balances or missing fee rates. The phone screenshot was visually reviewed. These are browser checks, not physical-device tests.
- A PostgreSQL custom-format dump was restored into a separate disposable database. Payment, bill, reversal and audit counts and financial totals matched. The read-only audit then reported zero duplicate groups, unlinked payments and inconsistent bills.
- The configured development database also passed the read-only preflight: zero duplicate bill/fee groups, unlinked payments and inconsistent bills. This was a snapshot, not a write or a certification of external cash/bank records.
- A restored copy was reduced to the old finance columns and upgraded twice. Payment/bill counts and balances were preserved. An injected duplicate fee configuration correctly blocked initialization without merging or deleting financial records.

## Remaining bursar design decisions

Define credit transfers/carry-forward, allocation across older debts, waivers, refunds, expenses and cash closing before implementing those workflows. Neither automatic bank/M-Pesa settlement reconciliation nor a verified STK integration is included. Receipt learner names/class labels still come from the learner record; immutable historical enrollment/class snapshots and a dedicated former-learner lookup deserve attention in the bursar portal design. Sustained production load, physical-device behavior and hosted restore capability remain unverified.
