# UI loading, drawers, and responsive review

Reviewed on 20 November 2026. Changes are local; deployment and a push are separate actions.

## Findings and fixes

| Finding | Resulting behavior |
| --- | --- |
| A single Suspense boundary surrounded the router, so a first visit to a lazy page could leave the preceding page visible while its JavaScript downloaded. The layout also waited for an exit animation. | Each protected destination has a loading boundary inside the persistent sidebar/layout. Its loading state appears immediately. A failed destination can be reloaded, or the user can select another page. |
| The exam marksheet drawer never set `readyToShow` after its first request completed. It could remain a skeleton until the same sheet was reopened. | The first response now renders the learner rows. Failed or malformed responses show a retry action and keep editing controls unavailable. Reopening refreshes the server state while preserving supported local drafts. |
| Several drawers could accept an older selection's response or retain previous data after a request failed. | Shared request handling cancels replaced/closed requests and hides data belonging to another URL. Learner profiles, learner diagnostics, grade diagnostics, CAT subject details, examiner eligibility, and mark-review scores use it. Exam and CAT editors also validate record identities and cancel requests. Attendance inspection and fee statements clear previous records and reject replaced responses. |
| GET requests had no timeout and unexpected HTML could be interpreted as API data. | Requests have a 30-second timeout and reject non-JSON-shaped API responses. Critical timetable/list/editor payloads have additional checks. Exam generation has an explicit 120-second budget. There are no automatic retry loops. |
| The marking-allocation drawer could turn a failed batch request into a request for every subject. | It uses the batch endpoint and offers a manual retry on failure. The parent allocation view also reports failed metadata requests instead of displaying them as an empty allocation list. |
| The teaching timetable initially requested Term 1 and fetched its schedule again after the initial prefetch. | Metadata resolves the current year/term from `/api/timetable/config`; one schedule request follows. Filter changes cancel prior schedule requests and show errors with retry controls. |
| Every GET acquired a timestamp and extra anti-cache request headers. | GET URLs remain stable, allowing CORS preflight permission reuse. Freshness still comes from the API's existing `Cache-Control: no-store` responses, disabled ETags, and exclusion of API responses from service-worker caches. |
| The bursar's visible Fee Structures link led to a route that only admitted head teachers. | The route now admits both roles, matching the existing server fee permissions. |
| Some mobile loading placeholders, DoS exam filters, and the tablet CAT search/create row could overflow the viewport. | Those controls now wrap or scroll within their own container. The CAT header stays stacked until the wider layout has enough room. |

## Redesigned workspaces

**Class Exam Progress:** compact heading, examination selection, four summary figures, a submission progress bar, a clear forwarding action, subject/teacher search, and status filtering. Learning-area rows stack on phones. Locked, approved, under-review, and unlock-requested papers have distinct labels. Inspection, lock/unlock, and forwarding workflows remain available through the existing API.

**Exam Timetabling:** compact filters and summary figures followed by a day-by-day schedule. Paper cards stack on phones and use more columns as space permits. Empty examination days remain visible. Generate, archive, print, move, swap, publish/draft, and conclude/reactivate controls are retained. Generation metadata errors are recoverable rather than silently becoming empty lists. Both workspaces include dark-mode styling.

## Verification

The production build and browser checks exercise the actual frontend code. An isolated PostgreSQL database supplies synthetic roles, learners, guardians, examinations, scores, CATs, attendance, inventory, leave, qualifications, and teaching timetable fixtures. Tests do not require a real user's password.

- 150 role/page/viewport combinations across head teacher, deputy, DoS, teacher, bursar, and secretary roles, at 390, 768, and 1366 pixels: no API errors, pending API requests at completion, or document-level horizontal overflow.
- 99 drawer/modal scenarios across those widths, including first-open exam and CAT marksheets, class and learner diagnostics, allocation drawers, attendance inspection, admission/staff/inventory/leave forms, examination generation, archives, move dialogs, and print previews. A tablet CAT-header overflow discovered during this pass was fixed and rechecked.
- 18 additional checks cover public authentication screens without a token and direct class-workspace URLs; six more visual checks cover the redesigned workspaces in dark mode.
- Controlled failures cover a delayed route chunk, a failed chunk, a failed marksheet request followed by retry, an unexpected HTML response, replaced class and learner requests, a failed eligibility batch, and a request that never answers. The unanswered drawer reaches its error/retry state after the 30-second client timeout.
- Three idle-page checks observed no API polling over the observation window. This verifies those paths; it is not a claim that every background operation in the application was exhaustively profiled.
- With the destination chunk held back, navigation feedback appeared in approximately 503 ms on the phone viewport and 271 ms on desktop in the measured local run. These measure navigation feedback, not the time needed to obtain all page data.

The committed browser suite covers phone/desktop cold navigation, first-open marksheets and retry, malformed timetable responses, active-term resolution without duplicate schedule requests, allocation metadata failures, and the tablet CAT controls. CI installs Chromium and runs these after the production build. The hosted workflow has not been executed for these local commits. Local checks used the installed Node 26 runtime and Brave; CI selects Node 24.

## Development-data observations and remaining work

A separate temporary preview read the configured development database. It did not run database initialization, blocked mutating HTTP methods and database write methods, and used temporary local sessions. No school records, passwords, examinations, or allocations were changed and no emails or SMS messages were sent.

The review visited 43 role/page combinations against development data. Some requests were still pending after the first short observation window, so six affected paths were checked again with a longer window; they all settled without API errors. Pages unavailable to an unassigned class teacher are distinguished from authorized class workflows. Bursar and secretary coverage used isolated fixtures because those accounts were not present in this development-data sample.

Twelve representative drawers were also visited against development data. Ten opened successfully on the first pass. Attendance had no submitted register available for the selected day, and one marking-allocation metadata request encountered a staff-directory HTTP 500; the server logged `ETIMEDOUT`. These are recorded separately from the successful isolated-fixture coverage.

Development-data page loads varied materially, with slow-path rechecks taking approximately 6–20 seconds. The frontend now responds to navigation immediately and has bounded, recoverable loading states, but that does not remove server/database/network latency. Follow-up work should capture per-endpoint SQL counts and timings, connection establishment time, pool wait time, and database/application region placement before deciding whether query changes or infrastructure changes are appropriate. Do not infer a SQL loop merely from a slow response.

Phone and tablet checks use browser viewport emulation. A physical-device check after deployment remains useful. Real-data verification covered reads and opening forms/previews; it did not submit payments, publish/regenerate examinations, send outreach, or change staff records.

## Running the regression suite

From the repository root:

```sh
npm ci
npm --workspace=@school/web run build
npx playwright install --with-deps chromium
npm --workspace=@school/web run test:browser
```

The suite starts its own production preview on `127.0.0.1:4174`, intercepts API requests with synthetic responses, and closes the preview/browser when finished. No database environment is needed. An existing compatible Chromium browser can be used through `BROWSER_EXECUTABLE_PATH` instead of installing a bundled browser. Run the build before the tests; they verify the generated frontend assets.
