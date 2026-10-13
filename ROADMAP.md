# Contributor Roadmap & Master Task Board

Welcome to the public roadmap for the **School Management System (SMS)**! 

This roadmap translates the system's exhaustive technical architecture and requirement blueprint into structured, claimable tasks for volunteer contributors. Tasks are organized sequentially by role and domain area.

> **Want to contribute?** Find an open task below with status `Ready for Volunteers`, check our [Contributing Guide](CONTRIBUTING.md), and comment on the corresponding GitHub Issue (or open one referencing the Task ID) to claim it!

---

## Milestone Overview

```
Milestone 0: Foundational Schema & Role Routing (In Progress)
    │
    ├── Milestone 1: Head Teacher Operations
    │
    ├── Milestone 2: Deputy Head Teacher Operations
    │
    ├── Milestone 3: Director of Studies (DoS) Operations
    │
    ├── Milestone 4: Bursar / Financial Ledger Operations
    │
    ├── Milestone 5: Front-Desk Secretary Operations
    │
    └── Milestone 6: Teacher Class & Subject Operations
```

---

## Milestone 0: Foundational Work (Pre-requisite for All Roles)

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `M0-01` | Push remaining Drizzle schemas (`admissions`, `academics`, `attendance`, `finance`, `audit`) to database | Schema / DB | `area/schema`, `help wanted` | Ready for Volunteers |
| `M0-02` | Add missing schema tables: `inventory_items`, `teacher_leave_outs`, `official_letters`, `school_calendar_events`, `meeting_minutes` | Schema / Shared | `area/schema`, `help wanted` | Ready for Volunteers |
| `M0-03` | Role-based dashboard router: Dynamically render role-specific dashboard views based on user JWT permissions/role | Frontend | `area/frontend`, `good first issue` | Ready for Volunteers |
| `M0-04` | Expand seed script in `apps/api/src/scripts/seed.ts` to include sample classes, terms, and subject allocations | Backend | `area/backend`, `good first issue` | Ready for Volunteers |

---

## Milestone 1: Head Teacher Module

*The administrative authority responsible for school policy, staffing, fee structures, terms, and high-level summaries.*

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `HT-01` | **Authentication & Staff Invitation Flow** (JWT, 2FA OTP, 24h invite links, staff directory) | Fullstack | `role/headteacher` | ✅ Completed |
| `HT-02` | **Printable Employment Contract Modal** (A4 PDF/print view generated from invite data) | Frontend | `role/headteacher` | ✅ Completed |
| `HT-03` | **School Settings View** (School name, logo upload to S3/local, contact info, letterhead configuration) | Fullstack | `role/headteacher`, `help wanted` | Ready for Volunteers |
| `HT-04` | **Academic Term Management** (Create, edit, activate Term 1/2/3 for current academic year) | Fullstack | `role/headteacher`, `good first issue` | Ready for Volunteers |
| `HT-05` | **Fee Structure Management** (Set and update CBC grade fees: Pre-Primary, Lower Primary, Upper Primary, Junior Secondary) | Fullstack | `role/headteacher`, `help wanted` | Ready for Volunteers |
| `HT-06` | **Official Letter Generator** (Standard letterhead template generator with editable body, print layout, and document archiving) | Fullstack | `role/headteacher`, `help wanted` | Ready for Volunteers |
| `HT-07` | **Head Teacher Overview Dashboard** (Replace placeholder metrics with real live aggregates: total students, fee collections, staff count, attendance rate) | Fullstack | `role/headteacher`, `help wanted` | Ready for Volunteers |
| `HT-08` | **Student Transfer Approval Workflow** (Review and approve outward/inward student transfer requests) | Fullstack | `role/headteacher`, `help wanted` | Ready for Volunteers |

---

## Milestone 2: Deputy Head Teacher Module

*Responsible for daily academic discipline, staff allocations, leave-outs, inventory, and parent communications.*

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `DH-01` | **Teacher-Subject & Class Allocation Slide-over** (Assign qualified teachers to classes and subjects with conflict prevention) | Fullstack | `role/deputy` | ✅ Completed |
| `DH-02` | **Teacher Leave-Out Management** (Issue leave-out permits, track absence reasons, generate printable leave slips) | Fullstack | `role/deputy`, `help wanted` | Ready for Volunteers |
| `DH-03` | **School Inventory Management** (Track institutional assets, quantities, conditions, allocations, and replenishment alerts) | Fullstack | `role/deputy`, `help wanted` | Ready for Volunteers |
| `DH-04` | **Whole-School Attendance Oversight** (Real-time view of daily morning/afternoon attendance rates across all classes) | Fullstack | `role/deputy`, `good first issue` | Ready for Volunteers |
| `DH-05` | **Parent Absentee SMS Dispatch** (Trigger automated SMS via Africa's Talking API to parents of absent students) | Fullstack | `role/deputy`, `help wanted` | Ready for Volunteers |
| `DH-06` | **Examination Mark Review & Correction** (Review teacher score submissions, approve score adjustments with audit trail) | Fullstack | `role/deputy`, `help wanted` | Ready for Volunteers |
| `DH-07` | **Whole-School Academic Analytics** (Class vs. class performance comparison charts, subject averages, grade distributions) | Frontend | `role/deputy`, `help wanted` | Ready for Volunteers |

---

## Milestone 3: Director of Studies (DoS) Module

*Coordinates the academic engine: curriculum schedules, examination cycles, invigilation, and grading.*

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `DOS-01` | **Interactive Timetable Wizard** (Period grid generation, break intervals, conflict detection) | Fullstack | `role/dos` | 🟡 In Progress |
| `DOS-02` | **Exam & CAT Assessment Scheduling** (Create exam timetables, define assessment windows for Term 1, 2, 3) | Fullstack | `role/dos`, `good first issue` | Ready for Volunteers |
| `DOS-03` | **Invigilation & Marking Allocation** (Assign teachers to exam rooms and subject marking panels without schedule conflicts) | Fullstack | `role/dos`, `help wanted` | Ready for Volunteers |
| `DOS-04` | **Report Card Lock & Unlock Request Flow** (Mechanism to lock exam results after grading deadline, request unlocking from Head Teacher) | Fullstack | `role/dos`, `help wanted` | Ready for Volunteers |
| `DOS-05` | **Printable Class Ranking & Broadsheets** (Tabular summary of student marks per subject with automated CBC ranking) | Frontend | `role/dos`, `help wanted` | Ready for Volunteers |

---

## Milestone 4: Bursar / Finance Module

*Handles school accounting: term invoicing, fee collections, payment methods, receipts, and operational expenses.*

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `BUR-01` | **Student Fee Invoicing** (Automated term fee billing generated from grade fee structure) | Backend | `role/bursar`, `help wanted` | Ready for Volunteers |
| `BUR-02` | **Fee Payment Recording** (Record payments via Cash, Bank Deposit, or M-Pesa reference code) | Fullstack | `role/bursar`, `help wanted` | Ready for Volunteers |
| `BUR-03` | **A4 / Thermal Printable Fee Receipts** (Generate clean printable receipts with school letterhead and payment balance) | Frontend | `role/bursar`, `good first issue` | Ready for Volunteers |
| `BUR-04` | **Student Fee Statement / Ledger View** (Per-student breakdown of billed terms, payments made, and current balance) | Frontend | `role/bursar`, `good first issue` | Ready for Volunteers |
| `BUR-05` | **School Expense Tracker** (Record expenses categorized into utilities, supplies, repairs, maintenance) | Fullstack | `role/bursar`, `help wanted` | Ready for Volunteers |
| `BUR-06` | **Term Financial Summary Report** (Total fees billed vs. collected vs. outstanding arrears, total expenses) | Fullstack | `role/bursar`, `help wanted` | Ready for Volunteers |

---

## Milestone 5: Front-Desk Secretary Module

*Front-office operations: student admissions, parent records, visitors, and official meeting minutes.*

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `SEC-01` | **Student Admission Form** (Full student details, KNEC assessment number, previous school, grade placement) | Fullstack | `role/secretary`, `help wanted` | Ready for Volunteers |
| `SEC-02` | **Guardian Keystroke Search & Sibling Linking** (Search existing parents live on keystroke to avoid duplicate parent records for siblings) | Fullstack | `role/secretary`, `help wanted` | Ready for Volunteers |
| `SEC-03` | **Visitor Logbook** (Record visitor name, phone, purpose of visit, person visited, time in/out) | Fullstack | `role/secretary`, `good first issue` | Ready for Volunteers |
| `SEC-04` | **School Calendar & Events Diary** (Add upcoming parent meetings, sports days, mid-term breaks) | Fullstack | `role/secretary`, `good first issue` | Ready for Volunteers |
| `SEC-05` | **Meeting Minutes Archive** (Record staff/board meeting minutes, upload attachments, search historical records) | Fullstack | `role/secretary`, `good first issue` | Ready for Volunteers |

---

## Milestone 6: Teachers (Class & Subject) Module

*Class teachers managing daily roll calls and subject teachers entering academic marks.*

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `TCH-01` | **Daily Attendance Register** (One-click Present / Absent / Late roll call for morning and afternoon sessions) | Fullstack | `role/teacher`, `help wanted` | Ready for Volunteers |
| `TCH-02` | **Subject CAT Score Entry Grid** (Keyboard-friendly spreadsheet-style mark entry for continuous assessment tests) | Fullstack | `role/teacher`, `help wanted` | Ready for Volunteers |
| `TCH-03` | **Term Examination Score Entry** (Final term exam score recording with validation against maximum possible marks) | Fullstack | `role/teacher`, `help wanted` | Ready for Volunteers |
| `TCH-04` | **Student Term Remarks & Conduct Notes** (Class teacher qualitative comments for student end-of-term report cards) | Fullstack | `role/teacher`, `good first issue` | Ready for Volunteers |
| `TCH-05` | **Teacher Personal Timetable View** (Personalized weekly timetable showing assigned periods, rooms, and subjects) | Frontend | `role/teacher`, `good first issue` | Ready for Volunteers |

---

## Cross-Cutting & Technical Enhancements

| Task ID | Task Description | Area | Labels | Status |
|---------|------------------|------|--------|--------|
| `XC-01` | **Comprehensive CBC Report Card PDF Generator** (End-of-term printable report cards with grades, remarks, attendance summary) | Fullstack | `area/reporting`, `help wanted` | Ready for Volunteers |
| `XC-02` | **Bulk CSV Student & Parent Import** (Upload CSV to batch-create students, classes, and guardians) | Fullstack | `area/admissions`, `help wanted` | Ready for Volunteers |
| `XC-03` | **PWA Offline Sync Enhancement** (IndexDB caching of attendance registers for offline classroom roll call) | Frontend | `area/pwa`, `help wanted` | Ready for Volunteers |
| `XC-04` | **End-to-End & Integration Test Suite** (Playwright / Vitest test coverage for auth and admission flows) | Testing | `area/testing`, `good first issue` | Ready for Volunteers |

---

## How to Claim a Task

1. Note the **Task ID** (e.g. `M0-03` or `BUR-03`).
2. Search [GitHub Issues](https://github.com/Moha-abshir/School-Management-System/issues) for that task. If an issue does not exist yet, open one titled `[Task]: <Task ID> - <Task Description>`.
3. Post a comment stating you are claiming the task.
4. A maintainer will assign the issue to you.
5. Create your branch, implement the feature, and submit a PR!
