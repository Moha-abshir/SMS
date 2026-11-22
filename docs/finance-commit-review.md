# Finance changes: commit-by-commit review

The original three unpushed commits were split into **12 review commits**. The application code, tests and original rollout notes are unchanged. This review guide is the only additional file.

**Review in order and deploy the complete series.** These commits separate a connected feature for review; intermediate commits are not separate supported releases. API and client contracts are completed across the series.

## Suggested review order

| Order | Commit | Area | What to inspect |
| --- | --- | --- | --- |
| 1 | `15b1c50` | Formatting only | Six existing finance files. Line wrapping, indentation and quote formatting were isolated so they can be skipped when reviewing business logic. |
| 2 | `04b4788` | Database safeguards | Fee approval metadata, payment request identities, retained reversal decisions and unique indexes. Startup waits for the finance migration. |
| 3 | `a41cd54` | Money and term rules | Integer minor-unit calculations, decimal validation, explicit year/term lookup, typed validation errors and transactional audit helpers. |
| 4 | `9a74903` | Fee preparation and approval | Fee API and Fee Structures page: no automatically created default charges, atomic saves and exact-rate head teacher approval. |
| 5 | `f2bf17c` | Term billing | Billing preview, eligible-roster calculation, generation API and confirmation-panel component. |
| 6 | `0447b32` | Payment recording and retries | Request keys, payload fingerprints, provider-reference retries, receipt identity, bill consistency checks and payment search/pagination. |
| 7 | `e841f0c` | Reversal decisions | Bursar permissions, independent head review, retained rejection reasons, pending-queue pagination and transactional reversal updates. |
| 8 | `18bd5a2` | Reports and reconciliation | Year/term filtering, separate credit balances, learner statements, decision-history API and internal balance checks. |
| 9 | `3a83040` | Finance workspace integration | Financial Management page and review panels connect the API contracts, period filters, approval controls, retry journal and error states. |
| 10 | `a9e1de3` | API regression coverage | Disposable-database scenarios and fixture updates for payments, bills, fees, approval boundaries and simulated connection loss. |
| 11 | `b92ec4a` | Browser regression coverage | Phone/tablet/desktop finance checks, exact-rate review, explicit bill confirmation, pagination/search and network/server error recovery. |
| 12 | This documentation commit | Preflight and review notes | Read-only integrity script, workflow/deployment notes and this guide. |

## Checks for each review step

### 1. Formatting only — `15b1c50`

No new financial behavior belongs in this commit.

Main files: `apps/api/src/modules/finance/finance.service.ts`, `apps/api/src/modules/finance/finance.controller.ts`, `apps/api/src/modules/fee-structures/feeStructures.service.ts`, `apps/api/src/modules/fee-structures/feeStructures.controller.ts`, `apps/web/src/modules/finance/FinancialManagementView.tsx`, `apps/web/src/modules/finance/FeeStructureView.tsx`.

### 2. Database safeguards — `04b4788`

Existing balances stay unchanged; duplicate active bills or fee scopes stop migration for review.

Main files: `packages/shared/src/db/schema/finance.ts`, `apps/api/src/config/financeMigration.ts`, `apps/api/src/config/initDb.ts`.

### 3. Money and term rules — `a41cd54`

Invalid money or a missing term must fail rather than round or select a fallback term.

Main files: `apps/api/src/modules/finance/financeRules.ts`, `apps/api/tests/finance-money.test.ts`.

### 4. Fee preparation and approval — `9a74903`

A bursar can prepare rates; a changed or concurrently edited rate needs another head review. Existing bills are not repriced.

Main files: `apps/api/src/modules/fee-structures/feeStructures.service.ts`, `apps/api/src/modules/fee-structures/feeStructures.controller.ts`, `apps/api/src/modules/fee-structures/feeStructures.routes.ts`, `apps/web/src/modules/finance/FeeStructureView.tsx`.

### 5. Term billing — `f2bf17c`

Generate only for the configured current academic year; preserve existing bills; create missing bills atomically from approved rates.

Main files: `apps/api/src/modules/finance/finance.service.ts`, `apps/api/src/modules/finance/finance.controller.ts`, `apps/api/src/modules/finance/finance.routes.ts`, `apps/api/src/middleware/auth.ts`, `apps/web/src/modules/finance/TermBillingPanel.tsx`.

### 6. Payment recording and retries — `0447b32`

Repeated attempts must return one receipt. Unconfirmed infrastructure outcomes return 503 so the browser keeps the retry key.

Main files: `apps/api/src/modules/finance/finance.service.ts`, `apps/api/src/modules/finance/finance.controller.ts`.

### 7. Reversal decisions — `e841f0c`

Bursars cannot approve, the requester cannot decide their own request, and competing decisions must apply once.

Main files: `apps/api/src/modules/finance/finance.service.ts`, `apps/api/src/modules/finance/finance.controller.ts`, `apps/api/src/modules/finance/finance.routes.ts`, `apps/api/src/middleware/auth.ts`.

### 8. Reports and reconciliation — `18bd5a2`

Reports must respect the selected period and identify discrepancies without silently rewriting balances. External bank/cash reconciliation remains separate.

Main files: `apps/api/src/modules/finance/finance.service.ts`, `apps/api/src/modules/finance/finance.controller.ts`, `apps/api/src/modules/finance/finance.routes.ts`.

### 9. Finance workspace integration — `3a83040`

Check the visible workflow, retry behavior after a lost response, and that failed reads do not display invented zero balances.

Main files: `apps/web/src/modules/finance/FinancialManagementView.tsx`, `apps/web/src/modules/finance/FinanceReviewPanels.tsx`.

### 10. API regression coverage — `a9e1de3`

Review assertions for one receipt, unchanged existing bills, atomic rollback, independent decisions and payment of older bills.

Main files: `apps/api/tests/academic-security.test.ts`, `apps/api/tests/helpers/financeChecks.ts`.

### 11. Browser regression coverage — `b92ec4a`

These cover browser behavior with synthetic responses; they are not proof of physical-device or external-provider behavior.

Main files: `apps/web/tests/workspace.browser.test.mjs`.

### 12. Preflight and deployment notes

`apps/api/scripts/audit-finance.ts` performs read-only checks. `docs/finance-integrity-and-bursar-readiness.md` explains the actual workflow, schema requirements, validation evidence and remaining business decisions.

## Commands to inspect the changes

Run these from the repository root:

```bash
# Inspect one review commit, including its explanation and diff
git show 0447b32
# See all application changes after formatting was isolated
git diff 15b1c50 HEAD -- apps packages
# Focus on payment and billing logic
git diff 15b1c50 HEAD -- apps/api/src/modules/finance/finance.service.ts
# Focus on the finance screen's behavior changes
git diff 15b1c50 HEAD -- apps/web/src/modules/finance/FinancialManagementView.tsx
```

## History safety and verification

- Original base: `0e0912e`. Earlier project commits, including the requirements update, were preserved.
- Original three-commit result: `32fcc9a`, retained on local branch `codex/finance-before-review-split`.
- Every original changed file was compared with the saved final version. No application behavior, schema definition or test was added or removed during this split.
- The formatting commit was checked against the original emitted JavaScript structure, accounting for equivalent JSX text spacing.
- The previous production build, 15 API tests and 32 browser tests apply to the unchanged final application code. They were not rerun just to change commit history.
- Nothing was pushed during this reorganization.
