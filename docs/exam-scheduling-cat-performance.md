# Examination scheduling and CAT performance

## Changing a paper's date or time

The DoS can open **Exam Timetabling**, select an examination and class, and choose **Change date / time** on a paper. Choose a date and a start time, including a different time on the same day. The end time follows the paper's full duration. Nothing moves until **Save** is selected.

**Hours & breaks** controls the examination's daily opening and closing times and named breaks. Existing timetables did not retain these rules. For those records, review the proposed settings and explicitly confirm them once before editing papers; the application does not assume that the suggested breaks are correct. New timetable generation saves the rules automatically.

Both the browser and API validate the examination dates, weekdays, full duration and breaks. The API additionally checks other papers for the class and assigned invigilators, including other unconcluded examinations. Papers may meet at a boundary but cannot overlap. Concurrent scheduling changes are serialized inside database transactions so that two requests cannot both claim the same slot.

Published examinations must remain valid when their rules change. If new hours would invalidate existing papers, return the examination to draft, adjust its rules and papers, then publish again. Generation fits complete papers into the available intervals and fails without replacing the existing timetable if the period cannot accommodate them. It rejects clashes with other examinations rather than silently moving their papers.

**Conclude examination** is available only after publication and after every scheduled class has forwarded all its scheduled papers to the Deputy Head. It closes the selected examination permanently. A generic marksheet lock is not a forwarding record. Unlocking a paper invalidates its forwarding record, and the class teacher must forward the completed class again. A concluded examination remains available for viewing and printing, but cannot be reactivated, edited, deleted or regenerated through the scheduling API. Use **New examination** for another series. The legacy activation endpoint also rejects reactivation.

## Reading CAT performance

**CAT Performance** is available to the DoS and assigned teachers. The DoS sees all CAT cohorts; class teachers see all subjects in their own classes plus any subjects they teach elsewhere; subject teachers see only their allocated class–subject pairs. The page and reporting endpoint are unavailable to head and deputy head accounts. The page covers the existing CAT cohorts: Grades 3, 6 and 9. Filter by term, grade, subject and CAT number. The results include grade averages, individual CAT results, subject comparisons, coverage and learners needing support. **View learners** opens a read-only assessment drawer with search and support/missing-score filters.

- All means use recorded marks normalized to percentages, so CATs with different maximum marks can be compared. Each recorded score contributes equally to the combined mean.
- A recorded zero counts as zero. Missing marks are excluded from averages and shown separately; they are never converted into zero.
- The support indicator means **at least one selected CAT score below 50%**. It counts each learner once and lists the relevant subjects and CATs. This is an operational indicator, not a diagnosis or a new official grading policy.
- Subject comparisons show recorded means and score coverage. A high mean with many missing scores needs interpretation.
- Enrollment and coverage use the **current active class roster**, even when viewing an older term. They are not historical enrollment snapshots. Subject-only views exclude grades where that subject is not assessed.
- Invalid, duplicate and out-of-range scores are excluded and flagged. Learners outside an assessment's class cannot contribute to its results.

The reporting endpoint enforces assignment scopes independently of the sidebar, including filter options and learner drilldowns. The DoS report uses five batch queries when assessments exist. Teacher reports add a bounded set of ownership/delegation queries; they do not query once per learner or CAT. Aggregation uses maps and sets; the browser paginates result cards and support lists and cancels outdated requests when filters change.

## Deployment and validation

Schema changes include nullable JSONB `examinations.schedule_config`, nullable timestamp `mark_submissions.forwarded_to_deputy_at`, and allowing null values in `students.assessment_number` while retaining uniqueness for assigned numbers. API startup applies these changes idempotently and waits for initialization before accepting requests. Existing examinations retain null scheduling rules until they are confirmed or regenerated. Existing locked papers are not retroactively marked as forwarded; active classes need to use the explicit forwarding action. Concluded archives remain read-only. The deployment database user needs permission for this additive schema change; initialization failure prevents the API from serving incompatible queries.

Validation used disposable local PostgreSQL databases and synthetic accounts, without changing the configured development database or sending email/SMS:

- The production build and all 14 API tests passed, with no skipped tests. Coverage includes concurrent conflicts, duration/break boundaries, atomic generation, terminal lifecycle, HTTP role restrictions and the five-query CAT budget.
- All 24 browser tests passed, covering the scheduling editor, legacy-rule confirmation, concluded records, CAT filters and role restrictions, learner drawers, selected-exam warnings, conditional admission identifiers, self-contained class forwarding, and mobile Subject Performance at three viewport widths.
- An additional browser run against the actual local API confirmed that a Friday paper could move from 14:30 to 08:00, survive reload, then reject edits after publication and conclusion.
- CAT views and drawers were checked at 390, 768 and 1366 pixel widths, including zero/missing marks, with no horizontal page overflow or browser exceptions in those scenarios. These are browser viewport checks, not physical-device testing.
- Startup was exercised against a disposable database lacking the new column; it restored the column before accepting requests.

No push, deployment or live-data migration was performed for this change.

## Teaching results, draft visibility and admission identifiers

Subject Performance is a personal teaching view for every role, including the DoS and deputy. It uses active teaching allocations and self-contained class ownership, not historical marking duties or a leadership fallback to an arbitrary class. A user with no teaching allocations receives an explicit empty-access explanation. Targets use the same ownership check. Mobile views use learner cards and wrapped summary metrics; wider views retain the table.

Only the DoS timetable catalog includes draft examinations. Teaching catalogs, class review, workstations and performance chronologies exclude them; guessed draft IDs are rejected on protected reads and marksheet operations. Entry and review writes require the selected examination to be published and unconcluded. Shared lifecycle locks allow writes in parallel while preventing publication/conclusion from racing with them. The marksheet warning follows the selected examination, not another exam's state.

Learner results show KNEC assessment numbers. The admission field is hidden through Grade 3 and required from Grade 4 onward. The API applies the same class rule to individual admission and CSV/JSON import. Unassigned assessment numbers are stored as null, so younger learners do not need fabricated identifiers and multiple learners can remain unassigned.

The nullable-identifier and forwarding-column startup changes were also tested against a disposable database with the old constraints. Archived concluded records retain read access even if they predate explicit forwarding timestamps.

Class Exam Progress is available to all assigned class teachers, including PP1–Grade 3. Self-contained teachers still record their learning areas in Marksheet Entry, then use Class Exam Progress to forward the completed class to the deputy.
