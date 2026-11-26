# Bursar workspace: requirements and review guide

This implementation follows the full bursar section of `REQUIREMENT_ANALYSIS.txt` (approximately lines 368–672), implementation guide sections 3.6, 5.8 and 8.1–8.9, and the earlier decision to generate new bills only for the configured current academic year. Both root documents were read in full. The implementation guide's description of the old application is historical: existing payment integrity and approval workflows are retained.

## What to review

| Requirement | Workspace / behavior |
| --- | --- |
| Financial dashboard | Bursar Overview shows today's, this week's and this month's fee collections; selected period collections; outstanding fees; credits; debtor count; income less expenses; recent receipts and expenses. Calendar dates use Africa/Nairobi. |
| Learner balances | Learner Balances includes active learners and former learners with bills; class, level, learner/guardian/KNEC/phone search and outstanding amount filters. Unbilled learners are labelled. Debts and credits remain separate. |
| Partial payments, payment history | Existing Financial Management retains atomic payments, partial payments, billing preview, reviewed fee rates, reference validation, duplicate protection and reversal queues. Manual cash, M-Pesa, bank, cheque and other methods are now available in the payment form. Payment history has date filters and receipt reprints. |
| Receipts | Fee receipts use school branding, KNEC number, payer, receiver, academic period, method and reference. Existing receipts can be reopened. Reversed receipts are labelled. Print supports the browser's Save as PDF. Numbers remain collision-resistant; the previous receipt numbering algorithm is preserved. |
| Statements | Open a learner's statement from Learner Balances or Outstanding Fees. It includes chronological charges, payments and approved reversals, with debit, credit and running balance, and printable school branding. The selected academic period starts at zero; this is not an all-time opening balance. |
| Expenses | Record category, description, exact amount, method, payment date, recipient/supplier, reference, academic year/term and notes. Vouchers are printable. Categories can be created, renamed or archived without deleting expense history. |
| Supporting documents | Optional PDF/PNG/JPEG invoice or receipt, up to 2 MB. Content signatures and MIME type are checked. Files are stored privately with the expense and served through an authenticated finance endpoint as downloads, never public URLs. Attachments, audit and expense commit together. |
| Outstanding fees | Highest balances appear first, with class/level/amount/period filters. Print/export the visible page or export all matching learners (bounded at 10,000; narrow filters above this). Current class labels reflect the learner's present placement. |
| Income and expenses | Other Income records non-fee income separately, with payer/source, method, reference, date, academic period, notes and printable receipt. It never changes a learner's bill. Reports show collections, other income, total income, expenses, net position, fee-method breakdown and expense categories. |
| Financial reports | Choose year/term and dates, or Today / This week / This month. Group fee collections by day or month; print/save PDF and export collection/category totals. Detailed payments and expense histories remain linked from their workspaces. |
| Corrections | Fee payments retain bursar request → independent Head Teacher decision → audited balance correction. Expenses and other income are immutable after recording: bursar can void with a required reason and record a replacement. Original records and private supporting documents remain available. |
| Financial audit | Bursar and Head Teacher can inspect finance events, actors, dates, records and before/after values. Audit filters use the event's calendar year, not its accounting term. |
| Head Teacher oversight | Read balances, receipts, statements, expenses, other income, audit and reports. Record fee payments and approve reversals through existing workflows. Expense/income/category writes remain bursar-only, including server checks against stale wildcard claims. |

## Financial behavior and limits

- Existing fee-payment approvals and ledger consistency checks are preserved. New expense/income writes use exact minor units and a unique request key. Concurrent retries return the original voucher/receipt. A changed or voided request cannot be reused.
- The browser retains only request fingerprints and keys in its tab session, not supplier names, notes, amounts or attachment contents. An uncertain response offers retry of the same transaction. A reopened form must use the same fields and attachment to match the pending fingerprint.
- Expense/income corrections retain the original and correction reason; no delete endpoint exists. The requirements specify Head Teacher approval for **fee payment** reversals, not a separate expense approval process.
- Vouchers and other-income receipts use a year plus a random suffix to avoid concurrent sequence races. Fee receipts keep the existing numbering scheme. These are unique record identifiers, not a statutory sequential-invoice integration.
- Reports use recorded receipts and expenses, excluding voided/reversed transactions. Net position is income less expenses for those records. It is not proof of bank, M-Pesa or physical cash reconciliation, nor a complete accrual accounting system.
- Outstanding balances are current balances for bills in the selected academic period, not historical balances as of a report date. Reports label this distinction. Overpayments are shown as credits and do not automatically offset another term's debt.
- Legacy expenses without year/term metadata appear under All terms using their calendar year. No accounting term or payment method is invented for them.
- Attachments are private base64 data in PostgreSQL, bounded to 2 MB per expense. This avoids a public file bucket and makes backups atomic with the ledger. Storage volume should be monitored; a future private object store can replace this without changing the permission boundary.
- Fee-balance SMS is described as potential/future work in the source documents. No messages are sent by this implementation. Payroll calculations, refunds, credit transfers, external payment-provider integration and external bank reconciliation are separate workflows beyond these bursar requirements. Salaries can be recorded as an expense category.

## Local verification and deployment

The configured development database was read to create a local snapshot. Mutation tests, schema changes and browser checks use separate local PostgreSQL databases. No test expenses, income or fee payments are added to the configured development database.

The additive `initializeBursarSchema` migration runs before API startup. It adds nullable metadata to existing expenses, a separate other-income table, indexes and default categories. It neither rewrites nor removes old financial transactions. Include private attachments in database backup/restore procedures.

Before deployment, back up the target database and review these changes. This work does not push or deploy the branch. Verification results and commit review order are recorded below after checks finish.

## Review commits in order

1. `d788553` — Additive database schema, private attachment fields and startup migration.
2. `56008e0` — Bursar API: validation, expense/income recording, retry keys, correction history, categories, balances, reports and audit permissions.
3. `ee63b1d` — Fee workflow additions: payment channels/date filters, bounded learner search, receipt reopening and running statements.
4. `fde7fec` — Shared presentation, financial dashboard, learner balances and printable statements.
5. `6148a9f` — Expense and other-income forms, category management, vouchers, attachments and safe retries.
6. `b21c9e9` — Financial reports, exports and finance audit screens.
7. `8007467` — Role routing, bursar overview and sidebar links; Head Teacher read access.
8. `328b843` — API tests using a disposable database, including concurrency, mandatory-audit rollback, attachments, balance aggregation, approved reversal statements, archived categories and role restrictions.
9. `ed83aa9` — Browser tests using the real login role property, three viewport widths and an uncertain expense outcome.
10. `54a8153` — Keep receipt identifiers separate from the new reprint button and select the expense category through its accessible combobox name in tests.
11. Documentation — This requirements map, limitations and verification record.

## Verification record

- API and frontend production builds passed. The shared package also compiled successfully. Local tools used the installed runtime; production remains configured for the project's supported Node runtime.
- The API regression run passed **22 checks, with no skips**, using separate disposable databases for academic/security, attendance and bursar tests. A subsequent focused bursar run passed **8 checks, with no skips**, including the additional category-archive test.
- The browser regression run passed the **24 navigation, academic and admissions checks** before reaching a finance receipt-label regression. The receipt label was corrected and the finance/bursar checks were rerun against the rebuilt frontend. See the final result below.
- Browser tests use synthetic responses; financial integration tests use real PostgreSQL transactions. Separate manual browser checks signed in using the supplied bursar account and the normal OTP flow against an isolated copy of development data. The dashboard, expense controls/form, learner search, balances, learner statement drawer, outstanding fees, other income, reports and audit pages were opened successfully.
- The copied development records have unbilled learners and no approved term charges. Zero balances are accompanied by an **Unbilled** label. Financial mutation tests supply their own fixtures rather than generating school charges.
- The configured development database was not migrated by these checks. Its schema will receive the additive migration only when the new API is deliberately started against it.

Final browser result: **37 unique checks passed across runs** — 24 navigation/academic/admissions checks, 12 finance/bursar checks, and the final expense-retry check after correcting its category selector. Finance/bursar layouts were checked at **390, 768 and 1366 px**. The final retry test verified reuse of the original request key and absence of supplier details in the retry journal. These are browser viewport checks, not physical-device certification.
