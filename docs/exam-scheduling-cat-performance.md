# Examination scheduling and CAT performance

## Changing a paper's date or time

Academic leadership can open **Exam Timetabling**, select an examination and class, and choose **Change date / time** on a paper. Choose a date and a start time, including a different time on the same day. The end time follows the paper's full duration. Nothing moves until **Save** is selected.

**Hours & breaks** controls the examination's daily opening and closing times and named breaks. Existing timetables did not retain these rules. For those records, review the proposed settings and explicitly confirm them once before editing papers; the application does not assume that the suggested breaks are correct. New timetable generation saves the rules automatically.

Both the browser and API validate the examination dates, weekdays, full duration and breaks. The API additionally checks other papers for the class and assigned invigilators, including other unconcluded examinations. Papers may meet at a boundary but cannot overlap. Concurrent scheduling changes are serialized inside database transactions so that two requests cannot both claim the same slot.

Published examinations must remain valid when their rules change. If new hours would invalidate existing papers, return the examination to draft, adjust its rules and papers, then publish again. Generation fits complete papers into the available intervals and fails without replacing the existing timetable if the period cannot accommodate them. It rejects clashes with other examinations rather than silently moving their papers.

**Conclude examination** closes the selected examination permanently. A concluded examination remains available for viewing and printing, but cannot be reactivated, edited, deleted or regenerated through the scheduling API. Use **New examination** for another series. The legacy activation endpoint also rejects reactivation.

## Reading CAT performance

Head teachers, deputy head teachers and the DoS can open **CAT Performance** from the sidebar. The page covers the existing CAT cohorts: Grades 3, 6 and 9. Filter by term, grade, subject and CAT number. The results include grade averages, individual CAT results, subject comparisons, coverage and learners needing support. **View learners** opens a read-only assessment drawer with search and support/missing-score filters.

- All means use recorded marks normalized to percentages, so CATs with different maximum marks can be compared. Each recorded score contributes equally to the combined mean.
- A recorded zero counts as zero. Missing marks are excluded from averages and shown separately; they are never converted into zero.
- The support indicator means **at least one selected CAT score below 50%**. It counts each learner once and lists the relevant subjects and CATs. This is an operational indicator, not a diagnosis or a new official grading policy.
- Subject comparisons show recorded means and score coverage. A high mean with many missing scores needs interpretation.
- Enrollment and coverage use the **current active class roster**, even when viewing an older term. They are not historical enrollment snapshots. Subject-only views exclude grades where that subject is not assessed.
- Invalid, duplicate and out-of-range scores are excluded and flagged. Learners outside an assessment's class cannot contribute to its results.

The schoolwide endpoint enforces leadership permissions independently of the sidebar. It uses five batch queries when assessments exist, rather than querying once per learner or CAT. Aggregation uses maps and sets; the browser paginates result cards and support lists and cancels outdated requests when filters change.

## Deployment and validation

The only schema addition is nullable JSONB `examinations.schedule_config`. API startup creates it idempotently and waits for initialization before accepting requests. Existing examinations retain a null value until their rules are confirmed or regenerated. The deployment database user needs permission for this additive schema change; initialization failure prevents the API from serving incompatible queries.

Validation used disposable local PostgreSQL databases and synthetic accounts, without changing the configured development database or sending email/SMS:

- The production build and all 14 API tests passed, with no skipped tests. Coverage includes concurrent conflicts, duration/break boundaries, atomic generation, terminal lifecycle, HTTP role restrictions and the five-query CAT budget.
- All 14 browser tests passed, covering the scheduling editor, legacy-rule confirmation, concluded records, CAT filters, drawers and error/retry behavior.
- An additional browser run against the actual local API confirmed that a Friday paper could move from 14:30 to 08:00, survive reload, then reject edits after publication and conclusion.
- CAT views and drawers were checked at 390, 768 and 1366 pixel widths, including zero/missing marks, with no horizontal page overflow or browser exceptions in those scenarios. These are browser viewport checks, not physical-device testing.
- Startup was exercised against a disposable database lacking the new column; it restored the column before accepting requests.

No push, deployment or live-data migration was performed for this change.
