# School Management System — Complete Implementation Guide

> **Purpose**: This document is a self-contained, exhaustive blueprint derived from the headteacher's requirements (`requirement_analysis.txt`). It tells the implementing agent **what** to build, **when** to build it, **why** each decision was made, **how** to implement it, and what **already exists** so nothing gets duplicated or broken.
>
> **Source of truth**: [requirement_analysis.txt](file:///home/moha/Projects/School-Management-System/requirement_analysis.txt) — every section below traces directly back to this file.

---

## Table of Contents

1. [Current System State — What Already Exists](#1-current-system-state)
2. [Execution Order — The Role-by-Role Build Sequence](#2-execution-order)
3. [Critical Architecture Decisions](#3-critical-architecture-decisions)
4. [Schema Changes Required](#4-schema-changes-required)
5. [Module 1: Complete the Head Teacher](#5-module-1-head-teacher)
6. [Module 2: Deputy Head Teacher](#6-module-2-deputy-head-teacher)
7. [Module 3: Director of Studies (DoS)](#7-module-3-director-of-studies)
8. [Module 4: Bursar](#8-module-4-bursar)
9. [Module 5: Secretary](#9-module-5-secretary)
10. [Module 6: Teachers (Class + Subject)](#10-module-6-teachers)
11. [Cross-Cutting Concerns](#11-cross-cutting-concerns)
12. [Verification & Testing Strategy](#12-verification--testing-strategy)

---

## 1. Current System State

### 1.1 What is Built and Working

| Layer | What Exists | Files |
|-------|------------|-------|
| **Auth** | Login, JWT (single 7-day token), 2FA OTP, password reset, email change verification, 2FA admin reset | [auth module](file:///home/moha/Projects/School-Management-System/apps/api/src/modules/auth/) (8 files) |
| **Staff Management** | Invite staff via email (24h token expiry), accept invitation, staff directory (active + pending), edit/deactivate staff, role dropdown | [staff module](file:///home/moha/Projects/School-Management-System/apps/api/src/modules/staff/) (5 files), [StaffManagementView.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/staff/StaffManagementView.tsx) |
| **Employment Contract** | A4 printable contract modal, pre-filled from staff/invite data, integrated into invite flow | [EmploymentContractModal.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/staff/EmploymentContractModal.tsx) |
| **Subject Management** | Subject CRUD (code, name, levelCategory: PRIMARY/JUNIOR/PPE), teacher-subject qualification mapping via `user_subjects` and `invitation_subjects` | [subjects module](file:///home/moha/Projects/School-Management-System/apps/api/src/modules/subjects/), [SubjectManagementModal.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/staff/SubjectManagementModal.tsx) |
| **Middleware** | `authenticate` (JWT + session cache), `authorizePermission` (permission code check, HEAD_TEACHER bypass) | [auth.ts](file:///home/moha/Projects/School-Management-System/apps/api/src/middleware/auth.ts) |
| **Services** | `email.service.ts` (Brevo), `sms.service.ts` (Africa's Talking), `audit.service.ts` | [services/](file:///home/moha/Projects/School-Management-System/apps/api/src/services/) |
| **Dashboard** | Single `DashboardPage` with 7 tabs, only `overview` and `staff` render real content; remaining 5 tabs are placeholder skeletons | [DashboardPage.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/dashboard/DashboardPage.tsx) |

### 1.2 DB Schema Files — Exist but NOT Pushed to Neon DB

The following schema files exist in `packages/shared/src/db/schema/` but their tables have **NOT been pushed** to the production Neon database (only `users`, `roles`, `permissions`, `role_permissions`, `invitations`, `subjects`, `user_subjects`, `invitation_subjects`, `refresh_tokens`, `password_reset_tokens`, `email_change_tokens` are confirmed live):

| Schema File | Tables Defined | Status |
|------------|---------------|--------|
| [admissions.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/admissions.ts) | `guardians`, `classes`, `students`, `secondaryGuardians`, `subjects`, `teacherSubjectAllocations` | `subjects` is live; rest needs push |
| [academics.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/academics.ts) | `academicTerms`, `catAssessments`, `catScores`, `examinations`, `examScores`, `reportCardLocks`, `reportUnlockRequests` | Needs push |
| [attendance.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/attendance.ts) | `attendanceRegisters`, `attendanceRecords`, `absenceSmsLogs` | Needs push |
| [finance.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/finance.ts) | `expenseCategories`, `feeStructures`, `feeStructureItems`, `studentBills`, `feePayments`, `expenses` | Needs push |
| [audit.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/audit.ts) | `auditLogs`, `systemSettings` | Needs push |

### 1.3 What is NOT Built At All (No Schema, No API, No Frontend)

- Inventory management (Deputy)
- Teacher leave-out management (Deputy)
- Invigilator allocation (DoS)
- Marking allocation (DoS)
- Official letter generator (Head Teacher)
- School calendar & meetings (Secretary)
- Meeting minutes (Secretary)
- Parent communication / SMS broadcasts
- Student transfer workflow
- Bulk student/parent CSV import
- Role-based dashboard routing (everyone currently sees HEAD_TEACHER dashboard)

---

## 2. Execution Order

> **The user explicitly mandated**: finish everything one role does, then move to the next. The order is: **Head Teacher → Deputy → DoS → Bursar → Secretary → Teachers**.

### Build Sequence

```
ROUND 0: Foundational Work (Pre-requisite for ALL roles)
├── Push all existing schema tables to Neon DB
├── Add missing schema tables (inventory, leave-outs, calendar, meetings, letters, etc.)
├── Implement role-based dashboard routing
└── Seed permissions for all roles

ROUND 1: HEAD TEACHER (finish what's remaining)
├── School Settings page
├── Student Admission (Head Teacher can admit directly)
├── Fee Structure Management (ONLY Head Teacher can edit fee amounts)
├── Academic Term Management
├── Official Letter Generator
├── Head Teacher Overview Dashboard (real data, not hardcoded)
├── Approve student transfers
└── Financial oversight (read-only view of Bursar data)

ROUND 2: DEPUTY HEAD TEACHER
├── Teacher/Class Allocation interface
├── Teacher Leave-out Management + printed document
├── Inventory Management
├── Class Attendance oversight (school-wide view)
├── Parent Absentee SMS Notification
├── Examination Mark Review + Correction workflow
├── Whole-school academic analysis dashboard
└── Deputy dashboard

ROUND 3: DIRECTOR OF STUDIES (DoS)
├── Examination Management (create exams, set dates/schedules)
├── Invigilator Allocation
├── Marking Allocation (assign markers by subject qualification)
├── Examination Analysis (drill-down: School → Grade → Class → Subject → Learner)
├── Academic Insights section (trends, alerts, comparisons)
├── Curriculum oversight (coverage tracking, workload review)
└── DoS dashboard

ROUND 4: BURSAR
├── Fee Management (view balances, record payments, partial payments)
├── Receipt Generation (printable, with school header)
├── Fee Statements (per-learner ledger)
├── Expense Management (categories, recording, attachments)
├── Outstanding Fees / Defaulters list with filters
├── Financial Reports (daily/monthly/term collections, income vs expenses)
├── Financial Dashboard (today's collections, term totals, outstanding)
├── Payment Correction/Reversal workflow (with audit trail)
└── Bursar dashboard

ROUND 5: SECRETARY
├── Student Admission (data entry → Head Teacher approval)
├── Parent/Guardian Records management
├── School Calendar & Events
├── Meeting Minutes (create, record attendees, agenda, action items)
├── Staff Directory (read-only limited view)
├── Attendance admin view (read-only summary/reports)
├── Parent Communication (general announcements, meeting reminders)
├── Student Transfer admin preparation
└── Secretary dashboard

ROUND 6: TEACHERS (Class Teacher + Subject Teacher)
├── Dynamic teacher dashboard (constructed from assignments)
├── Class Teacher: Daily Register (mobile-first, simple flow)
├── Class Teacher: Class profile, learner list, guardian info
├── Class Teacher: Grades 1–3 mark entry (all subjects)
├── Subject Teacher: Subject-specific mark entry for assigned classes
├── Mark submission workflow (DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → LOCKED)
├── Correction Request workflow
├── Class/Subject performance analysis
├── Individual learner performance view
└── Parent/Guardian contact (controlled, not bulk)
```

---

## 3. Critical Architecture Decisions

### 3.1 Role-Based Dashboard Routing

> **Current problem**: [DashboardPage.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/dashboard/DashboardPage.tsx) renders the same 7 tabs for every user. A Deputy and a Subject Teacher would see identical navigation.

**Solution**: The `DashboardPage` must read `user.roleName` and render **only the tabs relevant to that role**. The tab configuration should be a mapping:

```
HEAD_TEACHER     → Overview, Staff, Admissions, Academics, Finance, Audit, Settings
DEPUTY_HEAD      → Overview, Allocation, Leave-outs, Inventory, Attendance, Academics
DOS              → Overview, Examinations, Invigilators, Marking, Analysis
BURSAR           → Overview, Fee Management, Expenses, Outstanding, Reports
SECRETARY        → Overview, Admissions, Calendar, Minutes, Communication
CLASS_TEACHER    → My Class, Attendance, Academics, Reports
SUBJECT_TEACHER  → My Subjects, Assessments, Performance
```

A teacher who is BOTH a class teacher AND subject teacher should see a merged dashboard — not two separate logins. This is achieved through **assignments**, not role duplication.

### 3.2 The CBC Grade Distinction (Grades 1–3 vs 4–9)

This is the single most important architectural rule from the requirements:

| Grade Range | Class Teacher | Subject Teachers | Who Enters Marks |
|------------|--------------|-----------------|-----------------|
| **PPE** (Playgroup, PP1, PP2) | One teacher owns the class | Same teacher teaches all areas | Class Teacher enters all |
| **Grades 1–3** | One teacher owns the class | Same teacher teaches all learning areas | Class Teacher enters all marks |
| **Grades 4–9** | One teacher owns the class | **Different** teachers teach different subjects | **Subject Teachers** enter their own subject marks; Class Teacher reviews/compiles |

> **Implementation rule**: Do NOT hard-code "one teacher = one role." A single teacher can be a Class Teacher for Grade 6A while simultaneously being a Mathematics Subject Teacher for Grade 7A and 8A. The `teacherSubjectAllocations` table already supports this — use it.

### 3.3 Examination Mark Workflow (State Machine)

The requirements define a strict state machine for examination marks:

```
DRAFT → SUBMITTED → UNDER_REVIEW → CORRECTION_REQUESTED → RESUBMITTED → APPROVED → LOCKED
```

- **Teachers** can only edit marks in `DRAFT` or `CORRECTION_REQUESTED` state.
- **Teachers** submit (transitions to `SUBMITTED`).
- **Deputy** reviews (transitions to `UNDER_REVIEW`).
- **Deputy** can approve (`APPROVED`) or request correction (`CORRECTION_REQUESTED`).
- **Deputy** locks (`LOCKED`) — marks are permanently frozen.
- **Head Teacher** has final lock authority for the overall exam report.
- Nobody can delete or directly edit marks after `SUBMITTED` without going through correction.

> **Schema impact**: The existing `examinations.status` enum is `['DRAFT', 'MARKS_ENTRY', 'PENDING_DEPUTY_APPROVAL', 'LOCKED']`. This needs to be updated to match the full workflow: `['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED', 'RESUBMITTED', 'APPROVED', 'LOCKED']`.

### 3.4 Fee Structure Model

From `requirement_analysis.txt` lines 28–32:

```
PrePrimary (Playgroup, PP1, PP2):  Term 1 = 6000, Term 2 = 6000, Term 3 = 6000
Lower Primary (Grades 1–3):       Term 1 = 7000, Term 2 = 7000, Term 3 = 7000
Upper Primary (Grades 4–6):       Term 1 = 7500, Term 2 = 7500, Term 3 = 7500
Junior Secondary (Grades 7–9):    Term 1 = 11000, Term 2 = 11000, Term 3 = 11000
```

These are the **default** values. Only the Head Teacher can modify them. The existing `feeStructures` table maps `termId + classId → totalAmount`. This works, but the requirements group fees by **level category** (PPE, Lower Primary, Upper Primary, Junior Secondary), not individual classes. 

> **Schema adjustment needed**: Add a `levelGroup` enum or use the existing `levelCategory` with an additional `UPPER_PRIMARY` / `LOWER_PRIMARY` distinction. The current enum is `['PRIMARY', 'JUNIOR', 'PPE']` which lumps Grades 1–3 and 4–6 together, but their fees differ (7000 vs 7500). Add `LOWER_PRIMARY` and `UPPER_PRIMARY` to replace the single `PRIMARY`.

### 3.5 Student Admission Workflow

```
Secretary enters student + guardian info
    ↓
Submission (status = PENDING)
    ↓
Head Teacher reviews
    ↓
APPROVED → student officially admitted, assigned admission number
    or
REJECTED → with reason
```

The Head Teacher can also admit directly (bypasses the pending step).

> **Key guardian rule** (lines 46–51): One parent can have multiple children. When admitting a new student, the system must search existing guardians by keystroke (autocomplete on name/ID/phone) to avoid duplicating guardian records. If the guardian exists, link the new student to the existing guardian.

### 3.6 Payment Integrity — No Deletion, Only Reversal

From lines 608–621:

```
Payment
   ↓
Correction / Reversal
   ↓
Reason required
   ↓
Authorized approval (Head Teacher)
   ↓
Audit log
```

> **Neither Bursar nor Head Teacher can delete financial transactions.** Corrections are done via reversal entries that require a reason and produce an audit trail.

### 3.7 SMS Integration

The system uses **Africa's Talking** for SMS (API key already obtained per line 135). SMS is used for:

1. **Deputy → Parent**: Absence notification ("Your child [Name] was marked absent today").
2. **Secretary → Parents**: General announcements, meeting reminders.
3. **Bursar → Parents**: Fee balance notifications (potentially).

The existing [sms.service.ts](file:///home/moha/Projects/School-Management-System/apps/api/src/services/sms.service.ts) provides the infrastructure.

---

## 4. Schema Changes Required

### 4.1 Modify Existing Schemas

#### [admissions.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/admissions.ts)

1. **Update `levelCategoryEnum`**: Change from `['PRIMARY', 'JUNIOR', 'PPE']` to `['PPE', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR']` to reflect the 4-tier fee structure.
2. **Add `students.status` value**: Add `'PENDING'` to `studentStatusEnum` → `['PENDING', 'ACTIVE', 'TRANSFERRED', 'EXPELLED', 'GRADUATED']` to support the admission approval workflow.
3. **Add `students.approvedById`**: UUID reference to users table, nullable. Set when Head Teacher approves.
4. **Add `guardians.address`**: Text field, since requirements mention guardian address/emergency contact.
5. **Add `guardians.emergencyContact`**: varchar(20), an alternative phone number.
6. **Add `guardians.relationship`**: varchar(50) — e.g. "Father", "Mother", "Uncle". This exists on `secondaryGuardians` but is needed on the primary link too. Consider adding a `studentGuardians` junction table with a `relationship` and `isPrimary` flag, replacing the direct FK on `students`.

#### [academics.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/academics.ts)

1. **Update `examStatusEnum`**: Change to `['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED', 'RESUBMITTED', 'APPROVED', 'LOCKED']`.
2. **Add per-class-subject mark status tracking**: The current `examinations.status` is exam-wide, but the workflow requires per-class-per-subject status tracking (Math teacher submits Grade 6 Math marks independently of English teacher). Add a `markSubmissions` table:

```
markSubmissions:
  id, examId, classId, subjectId, teacherId,
  status (the 7-state enum),
  submittedAt, reviewedById, reviewedAt, correctionReason,
  createdAt, updatedAt, deletedAt
```

3. **Add `examScores.assessmentType`**: To distinguish CAT, Assignment, Project, Practical, Quiz, Examination (as per lines 1265–1272). Or keep `catAssessments`/`catScores` for CATs and `examinations`/`examScores` for end-of-term. The requirements say to start simple — keep the split but add an `assessmentType` enum for future flexibility.

#### [finance.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/finance.ts)

1. **Add `paymentMethodEnum` value**: Add `'CHEQUE'` → `['CASH', 'MANUAL_MPESA', 'MPESA_STK_PUSH', 'BANK_DEPOSIT', 'CHEQUE', 'OTHER']`.
2. **Add `feePayments.academicYear`**: integer, to make payments year-aware.
3. **Add `feePayments.termNumber`**: integer (1, 2, 3), to make payments term-aware.
4. **Add `feePayments.notes`**: text, for recording additional context.
5. **Add `feePayments.isReversed`**: boolean, default false.
6. **Add `paymentReversals` table**:

```
paymentReversals:
  id, originalPaymentId (FK → feePayments),
  reason (text, required),
  reversedById (FK → users),
  approvedById (FK → users, nullable — Head Teacher approval),
  createdAt, updatedAt
```

7. **Add `expenses.attachmentUrl`**: text, for receipt/invoice upload (line 521).

### 4.2 New Schema Tables Required

#### New file: `packages/shared/src/db/schema/operations.ts`

This file covers Deputy-owned operational modules.

```
inventory_items:
  id, name, category (varchar), description,
  totalQuantity (integer), availableQuantity (integer),
  createdAt, updatedAt, deletedAt

inventory_checkouts:
  id, itemId (FK → inventory_items),
  checkedOutTo (varchar — could be teacher name or class),
  checkedOutById (FK → users — the Deputy recording it),
  quantity (integer),
  checkoutDate (date),
  expectedReturnDate (date, nullable),
  actualReturnDate (date, nullable),
  status ('CHECKED_OUT', 'RETURNED', 'OVERDUE', 'LOST'),
  notes (text),
  createdAt, updatedAt, deletedAt

teacher_leave_requests:
  id, teacherId (FK → users),
  leaveType ('PERSONAL', 'MEDICAL', 'OFFICIAL', 'OTHER'),
  startDate (date),
  endDate (date),
  reason (text),
  status ('PENDING', 'APPROVED', 'REJECTED'),
  approvedById (FK → users — the Deputy),
  approvedAt (timestamp),
  documentUrl (text — generated leave-out document),
  notes (text),
  createdAt, updatedAt, deletedAt
```

#### New file or add to `audit.ts`: School Calendar & Meetings (Secretary)

```
school_events:
  id, title (varchar),
  description (text),
  eventType ('PARENT_MEETING', 'STAFF_MEETING', 'ACADEMIC_MEETING', 'SCHOOL_EVENT', 'DEADLINE', 'OTHER'),
  eventDate (date),
  startTime (varchar — e.g. "14:00"),
  endTime (varchar),
  location (varchar),
  createdById (FK → users),
  createdAt, updatedAt, deletedAt

meeting_records:
  id, eventId (FK → school_events, nullable),
  title (varchar),
  meetingDate (date),
  agenda (text),
  minutes (text),
  decisions (text),
  createdById (FK → users),
  createdAt, updatedAt, deletedAt

meeting_attendees:
  id, meetingId (FK → meeting_records),
  userId (FK → users),
  attended (boolean),
  createdAt

meeting_action_items:
  id, meetingId (FK → meeting_records),
  assignedToId (FK → users),
  description (text),
  dueDate (date, nullable),
  isCompleted (boolean, default false),
  createdAt, updatedAt

official_letters:
  id, title (varchar),
  body (text — the editable content),
  letterDate (date),
  createdById (FK → users),
  recipientName (varchar, nullable),
  recipientAddress (text, nullable),
  status ('DRAFT', 'FINALIZED'),
  createdAt, updatedAt, deletedAt
```

#### Add to `academics.ts`: Invigilator & Marking Allocation (DoS)

```
exam_sessions:
  id, examId (FK → examinations),
  sessionDate (date),
  sessionTime (varchar — e.g. "08:00–10:00"),
  subjectId (FK → subjects),
  createdAt, updatedAt, deletedAt

invigilator_allocations:
  id, examSessionId (FK → exam_sessions),
  classId (FK → classes),
  teacherId (FK → users),
  createdAt, updatedAt, deletedAt
  UNIQUE(examSessionId, teacherId) — prevent double-booking

marking_allocations:
  id, examId (FK → examinations),
  subjectId (FK → subjects),
  classId (FK → classes),
  teacherId (FK → users),
  createdAt, updatedAt, deletedAt
```

### 4.3 How to Push Schema

After all schema modifications are complete:

```bash
cd /home/moha/Projects/School-Management-System
npx drizzle-kit push
```

> **IMPORTANT**: Do ALL schema changes in ONE batch, then push ONCE. Do not push after every individual table change. Verify the migration output carefully — Drizzle will show you what it's creating/altering.

### 4.4 Update `packages/shared/src/db/schema/index.ts`

Add the new operations schema export:
```typescript
export * from './operations.js';
```

---

## 5. Module 1: Head Teacher

> **What's already done**: Staff management, subject management, employment contracts, auth/security.
> **What's remaining**: Everything below.

### 5.1 School Settings Page

**Requirement** (line 73): "A dedicated settings page where the headteacher can configure the general info of the school."

**What to build**:
- API: `GET /api/settings`, `PUT /api/settings` (HEAD_TEACHER only)
- Frontend: New `SettingsView.tsx` component rendered under a "Settings" tab
- Fields: School name, motto, contact phone, contact email, logo upload, absence SMS threshold
- The `systemSettings` table already exists in [audit.ts](file:///home/moha/Projects/School-Management-System/packages/shared/src/db/schema/audit.ts)
- Add to `systemSettings`: `address` (text), `poBox` (varchar), `county` (varchar) — needed for official letter headers and receipts

### 5.2 Academic Term Management

**Requirement** (line 32): Fee structure is term-based (Term 1, 2, 3 per year).

**What to build**:
- API: CRUD for `academicTerms` — `GET /api/academic-terms`, `POST`, `PUT`, `DELETE`
- Only HEAD_TEACHER can create/edit terms
- UI: Part of the Settings page or a dedicated "Academic Year" section
- When creating a term, set `isCurrent = true` and unset the previous current term
- The academic year and current term are referenced by almost every other module (fees, exams, attendance)

### 5.3 Fee Structure Management

**Requirement** (lines 27–32): Head Teacher is the ONLY one who can change fees.

**What to build**:
- API: `GET /api/fee-structures`, `PUT /api/fee-structures/:id` (HEAD_TEACHER only)
- UI: A "Fee Structure" section showing a table:

```
Level              | Term 1  | Term 2  | Term 3
PPE                | 6,000   | 6,000   | 6,000
Lower Primary 1–3  | 7,000   | 7,000   | 7,000
Upper Primary 4–6  | 7,500   | 7,500   | 7,500
Junior Sec 7–9     | 11,000  | 11,000  | 11,000
```

- Each cell is editable inline (only by HEAD_TEACHER)
- On save, update `feeStructures` records for the current academic year
- Seed these default values during initial setup

### 5.4 Student Admission (Direct by Head Teacher)

**Requirement** (lines 15, 34–67, 695–709): Head Teacher can admit students directly (bypasses Secretary approval step).

**What to build**:
- API: `POST /api/students` with `status: 'ACTIVE'` when HEAD_TEACHER creates directly
- The Admissions tab in the dashboard becomes functional
- Student form collects: full name, grade placement, assessment number (KNEC), previous grade (if transfer)
- Guardian form below student form: full name, phone, ID number
- **Guardian autocomplete**: As the user types in the guardian name/ID/phone, search existing guardians. If found, link to existing guardian instead of creating a duplicate. This is critical (lines 46–51).
- **Bulk import**: Support CSV upload for mass-importing students + parents (line 66). Format: one row = one student + one parent. Columns: student_first_name, student_last_name, gender, grade, assessment_number, guardian_name, guardian_phone, guardian_id_number.

### 5.5 Student Transfer Approval

**Requirement** (lines 15, 888–906): Head Teacher approves transfers.

**What to build**:
- API: `PUT /api/students/:id/transfer` — sets `status = 'TRANSFERRED'`, records reason and date
- UI: Action button in student profile → modal with reason field → confirms transfer
- Only HEAD_TEACHER can finalize

### 5.6 Official Letter Generator

**Requirement** (lines 22–23): Pre-formatted official letter with school header, editable body.

**What to build**:
- API: CRUD for `official_letters` table
- UI: A rich-text or markdown editor for the letter body
- Header auto-populated from `systemSettings` (school name, logo, address, phone, email, PO Box)
- Footer area for signature line ("Head Teacher" + printed name)
- Print button that produces clean A4 output (similar to employment contract modal)
- Letters are saved in DB for record-keeping
- Accessible from Head Teacher's dashboard under a "Letters" or "Documents" section

### 5.7 Head Teacher Overview Dashboard (Real Data)

**Requirement** (lines 19, 25–26): High-level summaries of the entire school.

**What to build**:
- Replace the hardcoded placeholder stats in [OverviewView.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/dashboard/OverviewView.tsx) with real API data
- API: `GET /api/dashboard/head-teacher` returns:
  - Total active learners (count from `students` where status = 'ACTIVE')
  - Today's attendance percentage (from `attendanceRegisters` + `attendanceRecords`)
  - Total staff count
  - Fee collection rate for current term (total paid / total expected)
  - Outstanding fee total
  - Recent payments (last 5)
  - Academic performance summary (overall school average from most recent exam)
- This endpoint aggregates across all modules — build it AFTER the other modules have data

### 5.8 Financial Oversight (Read-Only)

**Requirement** (lines 583–606): Head Teacher can view everything the Bursar sees, plus record payments.

**What to build**:
- The Finance tab in the Head Teacher's dashboard renders the same views as the Bursar but with limited write actions
- HEAD_TEACHER can: record payments, view balances, generate receipts, view statements, view reports
- HEAD_TEACHER cannot: record expenses (the requirements say "Maybe" — default to no for now)
- HEAD_TEACHER can: approve payment reversals that the Bursar initiates

### 5.9 Performance Visibility

**Requirement** (lines 25–26): "anything regarding performance, the headteacher should see it"

**What to build**:
- The Academics tab renders the same analysis dashboards as the Deputy/DoS
- Head Teacher gets read-only access to ALL academic data
- Specific views: grade performance, top/lowest performers per grade, subject performance, individual student performance
- Build these views in the DoS module (Module 3) and share them with the Head Teacher via permissions

---

## 6. Module 2: Deputy Head Teacher

### 6.1 Teacher/Class Allocation Interface

**Requirement** (lines 81–91):

**What to build**:
- API: `POST /api/allocations/class-teacher` — assign a teacher as class teacher for a class
- API: `POST /api/allocations/subject-teacher` — uses existing `teacherSubjectAllocations` table
- API: `GET /api/allocations?academicYear=2026` — list all allocations
- UI: An "Allocation" tab with two sections:
  1. **Class Teacher Assignment**: Table showing all classes → dropdown to assign a class teacher
  2. **Subject Teacher Assignment**: For each class, show subjects → assign qualified teachers (filter by `user_subjects`)

**CBC Rule** (lines 85–86):
- Grades 1–3: The class teacher teaches ALL learning areas. When a teacher is assigned as class teacher for Grade 2A, automatically create `teacherSubjectAllocations` for ALL subjects in the `LOWER_PRIMARY` level category.
- Grades 4–9: Subject teachers are assigned individually per subject.

**Important**: The `classes` table needs to be seeded with all school classes before this can work. Classes must be created before students can be admitted. Build a "Class Management" sub-section where the Deputy (or Head Teacher) can create classes: Playgroup, PP1, PP2, Grade 1–Grade 9. Each class has a `name`, `levelCategory`, and `numericOrder`.

### 6.2 Teacher Leave-Out Management

**Requirement** (lines 93–103):

**What to build**:
- API: CRUD for `teacher_leave_requests`
- UI: A "Leave-outs" tab
  - Deputy sees list of all leave requests (filterable by status, date)
  - Deputy can create a new leave record (after teacher comes to office)
  - On approval, system generates a printable leave-out document
  - **The document format is school-specific** — the user says "MAKE SURE TO ASK ME FOR THE FORMAT WHEN WE GET TO DESIGN THIS PHASE" (line 103). **When implementing this, ask the user for the leave-out document template before building the print layout.**

### 6.3 Inventory Management

**Requirement** (lines 105–117):

**What to build**:
- API: CRUD for `inventory_items` and `inventory_checkouts`
- UI: An "Inventory" tab with:
  - Item catalog (add items: textbooks, brooms, dustbins, etc.)
  - Checkout form: select item → who took it → quantity → date → expected return
  - Return form: mark items as returned
  - Dashboard: "Who currently has what?" — list all active checkouts
  - Overdue items highlighted
  - History: all past checkouts/returns

### 6.4 Class Attendance Oversight

**Requirement** (lines 119–130):

**What to build**:
- API: `GET /api/attendance/school-wide?date=2026-08-13` — aggregate all class registers for the day
- UI: A "Class Attendance" tab showing:
  - Per-class attendance summary for today
  - Drill-down into any class to see individual records
  - Deputy can view but NOT take attendance (that's the class teacher's job)
  - Historical trends: attendance rates over time per class

### 6.5 Parent Absentee SMS Notification

**Requirement** (lines 132–136):

**What to build**:
- Workflow: Class Teacher marks learner absent → Deputy sees absence list → clicks "Notify Parent" → SMS sent via Africa's Talking
- API: `POST /api/attendance/notify-parent` — takes `studentId`, looks up guardian phone, sends SMS
- Template: "Dear Parent, your child [Name] was marked absent from school today. Please contact the school if necessary."
- Log the SMS in `absenceSmsLogs` table (already defined)
- The `systemSettings.absenceSmsThreshold` (default 3) could trigger automatic notification after N consecutive absences

### 6.6 Examination Mark Review

**Requirement** (lines 156–201):

**What to build**:
- API: `GET /api/marks/submissions?status=SUBMITTED` — Deputy sees all pending submissions
- API: `PUT /api/marks/submissions/:id/approve` — transitions to APPROVED
- API: `PUT /api/marks/submissions/:id/request-correction` — transitions to CORRECTION_REQUESTED, requires reason
- API: `PUT /api/marks/submissions/:id/lock` — transitions to LOCKED (final)
- UI: A "Mark Review" section under Academics tab
  - List of all submitted marksheets, grouped by class and subject
  - Deputy can view marks, approve, or request corrections
  - Status badges showing the current workflow state
  - Correction requests show the reason and allow teacher to resubmit

### 6.7 Whole-School Academic Analysis

**Requirement** (lines 137–154):

**What to build**:
- API: `GET /api/analytics/school-performance?examId=xxx`
- Returns: performance by grade, by subject, by class, average marks, highest/lowest classes, learners requiring attention, performance trends between exams
- UI: A rich analytics dashboard with:
  - Summary cards (school average, best grade, worst grade)
  - Bar charts: subject performance comparison
  - Tables: class-by-class ranking
  - Lists: learners improving/declining
  - Filters: by exam, by term, by academic year

---

## 7. Module 3: Director of Studies

### 7.1 Examination Management

**Requirement** (lines 209–219):

**What to build**:
- API: CRUD for `examinations` and `exam_sessions`
- UI: An "Examinations" tab
  - Create exam: title, term, status
  - Add exam sessions: date, time, subject
  - Monitor examination progress (which classes have submitted marks, which haven't)
  - Exam calendar view

### 7.2 Invigilator Allocation

**Requirement** (lines 221–243):

**What to build**:
- API: CRUD for `invigilator_allocations`
- UI: Workflow-based interface:
  1. Select examination
  2. Select date/session
  3. System shows classes needing invigilators
  4. System suggests eligible teachers (those not already assigned to another room at the same time)
  5. DoS reviews/adjusts
  6. Publish allocation
- **Conflict detection**: Prevent assigning a teacher to two rooms at the same time (unique constraint on `examSessionId + teacherId` per time slot)

### 7.3 Marking Allocation

**Requirement** (lines 245–263):

**What to build**:
- API: CRUD for `marking_allocations`
- UI: Subject-driven interface:
  1. Select exam
  2. Select subject (e.g., "English")
  3. System shows only teachers assigned to teach English (from `user_subjects` + `teacherSubjectAllocations`)
  4. DoS allocates eligible teachers to mark specific classes
- Teachers who teach a subject are the ones who should mark it

### 7.4 Examination Analysis

**Requirement** (lines 265–304):

**What to build**:
- API: `GET /api/analytics/exam-analysis?examId=xxx`
- Drill-down capability: School → Grade → Class → Subject → Learner
- Metrics: overall performance, by grade, by class, by subject, averages, highest/lowest, pass rates, learners requiring intervention, struggling areas
- UI: Interactive dashboard with expandable sections
- Example display (lines 289–300):

```
Grade 6
────────────────────
Mathematics       58%
English           74%
Science           67%
Kiswahili         71%

Overall Average   67.5%
⚠ Mathematics requires attention
```

### 7.5 Academic Insights Section

**Requirement** (lines 306–322):

**What to build**:
- API: `GET /api/analytics/insights` — computed comparison between current and previous exams
- Auto-generated insights like:
  - "Grade 6 Mathematics performance declined by 8% compared with the previous examination"
  - "14 learners in Grade 5 are below the school's defined performance threshold"
  - "Grade 4A improved by 12% compared with the previous assessment"
- UI: A dedicated "Insights" card on the DoS dashboard with alert-style notifications

### 7.6 Curriculum Oversight

**Requirement** (lines 324–363):

**What to build**:
- Read-only views of:
  - Subject allocations (who teaches what)
  - Teacher-subject assignments
  - Teacher academic workload (how many classes/subjects per teacher)
  - Assessment completion status (which exams are done, which are pending)
- The key distinction: **Deputy = "Who teaches what, where, and when?"** vs **DoS = "How is the academic program performing?"**

---

## 8. Module 4: Bursar

### 8.1 Fee Management

**Requirement** (lines 372–395):

**What to build**:
- API: `GET /api/finance/learner-balances` — list all learners with their fee balance
- API: `GET /api/finance/learner-balances/:studentId` — detailed balance for one learner
- UI: Searchable table of all learners showing: name, grade, expected fees, paid, balance
- Filters: by grade, by class, by balance range

### 8.2 Payment Recording

**Requirement** (lines 396–417):

**What to build**:
- API: `POST /api/finance/payments` — record a payment
- Required fields: studentId, amount, paymentMethod, referenceNumber (for M-Pesa/bank), termNumber, academicYear, notes
- Payment methods: M-Pesa, Bank, Cash, Cheque, Other
- For M-Pesa, the transaction reference is required
- Auto-generate receipt number: `REC-{YEAR}-{SEQUENCE}` (e.g., `REC-2026-00421`)
- Update `studentBills.paidAmount` and `studentBills.balance` after recording
- Record `receivedById` from the authenticated user (Bursar or Head Teacher)

### 8.3 Receipt Generation

**Requirement** (lines 419–440):

**What to build**:
- API: `GET /api/finance/receipts/:paymentId` — returns receipt data
- UI: Printable receipt modal (similar architecture to employment contract modal) with:
  - School header (from `systemSettings`: name, logo, address, phone)
  - Receipt number
  - Student name, admission number
  - Amount paid, payment method, reference
  - Received by, date
- Print button for hardware printing

### 8.4 Fee Statements

**Requirement** (lines 442–456):

**What to build**:
- API: `GET /api/finance/statements/:studentId` — returns chronological ledger
- UI: Table showing date, description, debit, credit, running balance
- Printable version with school header
- Useful for when parents ask "How much do I still owe?"

### 8.5 Expense Management

**Requirement** (lines 490–521):

**What to build**:
- API: CRUD for `expenses` and `expenseCategories`
- Pre-seeded categories: Stationery, Food, Electricity, Water, Repairs, Salaries, Transport, Teaching Materials, Maintenance
- Expense record: category, description, amount, payment method, date, recipient/supplier, reference, attachment (file upload), notes
- Auto-generate voucher number: `VCH-{YEAR}-{SEQUENCE}`
- UI: Expense recording form + expense history table

### 8.6 Outstanding Fees / Defaulters

**Requirement** (lines 543–563):

**What to build**:
- API: `GET /api/finance/defaulters` — learners with outstanding balances
- Filters: grade, class, amount range, term, academic year
- Sortable by balance amount (highest first)
- Exportable/printable report

### 8.7 Financial Reports

**Requirement** (lines 565–580):

**What to build**:
- API: `GET /api/finance/reports/:type?period=daily|weekly|monthly|term|year`
- Report types: collections, expenses, income-vs-expenses, outstanding-fees, payment-method-breakdown, transaction-history
- UI: Report viewer with date range selector, auto-generated summaries, printable output

### 8.8 Financial Dashboard

**Requirement** (lines 458–489):

**What to build**:
- API: `GET /api/dashboard/bursar` — aggregated financial KPIs
- Metrics: today's collections, this week's, this month's, this term's, total outstanding, learners with balance, recent payments, recent expenses
- UI: KPI cards at top + recent activity feed below

### 8.9 Payment Reversal Workflow

**Requirement** (lines 608–621):

**What to build**:
- API: `POST /api/finance/payments/:id/reverse` — Bursar initiates, requires reason
- API: `PUT /api/finance/reversals/:id/approve` — Head Teacher approves
- On approval: create reversing entry, update student balance, log in audit trail
- UI: Reversal request form + approval queue for Head Teacher

---

## 9. Module 5: Secretary

### 9.1 Student Admission (Data Entry → Head Teacher Approval)

**Requirement** (lines 684–709):

**What to build**:
- API: `POST /api/students` with `status: 'PENDING'` when SECRETARY creates
- API: `GET /api/students/pending` — Head Teacher sees pending admissions
- API: `PUT /api/students/:id/approve` — Head Teacher approves → status = 'ACTIVE'
- UI: Same admission form as Head Teacher but submission goes to pending state
- Guardian autocomplete (same as Head Teacher's version)

### 9.2 Parent/Guardian Records

**Requirement** (lines 711–738):

**What to build**:
- API: CRUD for `guardians`
- API: `GET /api/guardians/:id/children` — see all students linked to a guardian
- UI: Guardian directory with search, showing linked children
- Editable fields: phone, email, address, emergency contact, relationship
- Secretary CANNOT view financial information

### 9.3 School Calendar & Events

**Requirement** (lines 740–764):

**What to build**:
- API: CRUD for `school_events`
- Event types: parent meeting, staff meeting, academic meeting, school event, deadline, other
- UI: Calendar view (month view with event dots) + list view
- Create event form: title, description, type, date, time, location
- Notifications: Option to send SMS/email notification to relevant staff

### 9.4 Meeting Minutes

**Requirement** (lines 766–807):

**What to build**:
- API: CRUD for `meeting_records`, `meeting_attendees`, `meeting_action_items`
- UI: Meeting record form:
  - Title, date, link to calendar event (optional)
  - Attendee checklist (pull from staff directory)
  - Agenda text area
  - Minutes text area
  - Decisions text area
  - Action items: assignee (from staff), description, due date, completion status
- Export/download as formatted document
- History of all meetings, searchable by date/title

### 9.5 Staff Directory (Read-Only)

**Requirement** (lines 809–830):

**What to build**:
- API: `GET /api/staff/directory` — limited fields only
- Returns: name, phone, email, job title, department, employment status
- Secretary CANNOT: create accounts, change roles, reset passwords, reset 2FA, suspend staff

### 9.6 Attendance Admin View

**Requirement** (lines 832–857):

**What to build**:
- Read-only aggregate views:
  - Student attendance summary
  - Staff attendance summary
  - Absence records
  - Attendance reports
- Secretary cannot take attendance or modify records

### 9.7 Parent Communication

**Requirement** (lines 859–886):

**What to build**:
- API: `POST /api/communication/announcement` — send general SMS to parents
- Types: meeting reminders, school event notifications, general announcements
- Template: "Reminder: Parents' meeting will be held on [date] at [time]."
- Secretary handles GENERAL communication only
- Deputy handles absence-related SMS
- Bursar handles fee-related SMS
- UI: Compose announcement → select recipients (all parents, specific grade, specific class) → send

### 9.8 Student Transfer Preparation

**Requirement** (lines 888–906):

**What to build**:
- API: `POST /api/students/:id/transfer-request` — Secretary records request
- API: `PUT /api/students/:id/transfer-approve` — Head Teacher reviews and approves/rejects
- UI: Transfer request form with: reason, destination school, documents
- On approval: student status → 'TRANSFERRED'

---

## 10. Module 6: Teachers

### 10.1 Dynamic Teacher Dashboard

**Requirement** (lines 1355–1402):

**What to build**:
- The teacher dashboard is NOT a static layout — it's dynamically constructed from the teacher's assignments
- API: `GET /api/teacher/my-dashboard` — returns:
  - `classAssignment`: the class this teacher is assigned as class teacher for (if any)
  - `subjectAssignments`: array of `{ classId, className, subjectId, subjectName }`
  - `isClassTeacher`: boolean
- UI renders tabs based on what comes back:
  - If `isClassTeacher`: show "My Class", "Attendance", "Class Performance"
  - Always show: "My Subjects" (from `subjectAssignments`), "Assessments", "Performance"
  - For Grades 1–3 class teachers: "My Subjects" shows ALL learning areas for their class

### 10.2 Daily Class Register (Mobile-First)

**Requirement** (lines 981–1004):

**What to build**:
- API: `POST /api/attendance/register` — submit daily register
- API: `GET /api/attendance/register?classId=xxx&date=2026-08-13` — get today's register (pre-populated with student list)
- UI: **Extremely simple** mobile-first interface:
  1. Open → automatically shows assigned class
  2. Student list with toggle buttons (Present ✓ / Absent ✕)
  3. Save button
- Do NOT make teachers navigate 5 screens
- Goal: **Open → Mark → Save**

### 10.3 Mark Entry & Institutional Grading Methodology

**Requirement** (lines 1079–1133, 1449–1475):

All examination subjects across all grades are scored out of 100 marks. The grading system strictly divides into two distinct methodologies:

1. **Pre-Primary to Grade 6 (below Grade 7)** — **CBC Rubrics**:
   - Level 4: **E.E** (Exceeding Expectations)   -> `75 – 100%`
   - Level 3: **M.E** (Meeting Expectations)     -> `50 – 74%`
   - Level 2: **A.E** (Approaching Expectations) -> `25 – 49%`
   - Level 1: **B.E** (Below Expectations)       -> `0 – 24%`
   - *UI Rule*: Only display CBC Rubric levels (EE, ME, AE, BE). Omit Junior Secondary points.

2. **Junior Secondary (Grades 7 to 9)** — **Points System (1 to 8)**:
   - **8 points**: `90 – 100%`
   - **7 points**: `75 – 89%`
   - **6 points**: `58 – 74%`
   - **5 points**: `41 – 57%`
   - **4 points**: `31 – 40%`
   - **3 points**: `21 – 30%`
   - **2 points**: `11 – 20%`
   - **1 point**:  `0 – 10%`
   - *UI Rule*: Only display Points (1–8 pts). Omit Primary rubrics.

**Role-Based Entry Workflow**:
**Grades 1–3**:
- Class teacher enters marks for ALL subjects
- API: `POST /api/marks/entry` — body: `{ examId, classId, subjectId, scores: [{ studentId, marksObtained }] }`
- UI: Select subject → spreadsheet-style grid of students → enter marks → Save as Draft → Submit

**Grades 4–9**:
- Subject teacher enters marks ONLY for their assigned subject
- Same API, but the system validates that the teacher is assigned to teach that subject in that class
- Class teacher can REVIEW (read-only) but not enter marks for subjects they don't teach

### 10.4 Mark Submission Workflow

**Requirement** (lines 1097–1163):

**What to build**:
- Status transitions on `markSubmissions`:
  - Teacher saves → `DRAFT`
  - Teacher submits → `SUBMITTED` (marks become read-only for teacher)
  - Deputy reviews → `UNDER_REVIEW`
  - Deputy approves → `APPROVED`
  - Deputy requests correction → `CORRECTION_REQUESTED` (marks become editable again for teacher)
  - Teacher fixes and resubmits → `RESUBMITTED`
  - Deputy locks → `LOCKED` (permanent)
- API endpoints for each transition
- UI: Status badge on each marksheet, action buttons change based on current state

### 10.5 Correction Request

**Requirement** (lines 1135–1163):

**What to build**:
- API: `POST /api/marks/correction-request` — teacher requests to correct submitted marks
- Deputy sees correction requests in their review queue
- Deputy approves → marks transition to `CORRECTION_REQUESTED` → teacher can edit → resubmit
- Audit trail: log who requested, when, what changed

### 10.6 Class/Subject Performance Analysis

**Requirement** (lines 1165–1191, 1278–1291):

**What to build**:
- **Class Teacher** sees:
  - Class average, subject averages, top 5 learners, subjects requiring attention, learners below threshold
- **Subject Teacher** sees:
  - Subject average per assigned class, highest/lowest marks, learners below threshold
- API: `GET /api/analytics/class-performance?classId=xxx&examId=xxx`
- API: `GET /api/analytics/subject-performance?subjectId=xxx&classId=xxx&examId=xxx`

### 10.7 Individual Learner Performance

**Requirement** (lines 1052–1077):

**What to build**:
- API: `GET /api/students/:id/performance` — returns marks across terms/exams
- UI: Learner profile showing term-by-term performance, trends (improving/declining)
- Class Teacher sees full academic profile
- Subject Teacher sees only their subject's marks for the learner

### 10.8 Parent/Guardian Contact

**Requirement** (lines 1193–1213):

**What to build**:
- Class Teacher can view guardian name, phone, emergency contact for their class's learners
- Controlled contact: "Contact Parent" button → sends a pre-defined template SMS (not free-form bulk SMS)
- Do NOT give teachers unrestricted bulk SMS capability

---

## 11. Cross-Cutting Concerns

### 11.1 Permission Seeding

The existing `permissions` table needs to be seeded with codes for every action. Suggested structure:

```
staff:manage, staff:view
students:create, students:approve, students:view, students:transfer
attendance:take, attendance:view, attendance:notify
marks:enter, marks:submit, marks:review, marks:approve, marks:lock, marks:correction
exams:manage, exams:view
fees:record, fees:view, fees:structure-edit
expenses:record, expenses:view
reports:financial, reports:academic
settings:manage
inventory:manage, inventory:view
leave:manage, leave:view
calendar:manage, calendar:view
minutes:manage, minutes:view
communication:send, communication:view
letters:manage
analytics:school-wide, analytics:class, analytics:subject
```

Map each permission to roles via `role_permissions`.

### 11.2 Audit Logging

Every write operation (create, update, delete, approve, reject, reverse) must log to `auditLogs`:
- `actorId`: who did it
- `action`: what they did (e.g., "PAYMENT_RECORDED", "MARKS_SUBMITTED", "STUDENT_ADMITTED")
- `entityName`: which table
- `entityId`: which record
- `oldValues` / `newValues`: JSON snapshots

Use the existing [audit.service.ts](file:///home/moha/Projects/School-Management-System/apps/api/src/services/audit.service.ts).

### 11.3 Dark/Light Mode Consistency

Every new component MUST use paired Tailwind classes:
```
bg-white dark:bg-slate-900
border-slate-200 dark:border-slate-800
text-slate-900 dark:text-white
bg-slate-50 dark:bg-slate-900  (for form containers)
bg-white dark:bg-slate-950     (for inputs)
```

Reference the existing [Modal.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/components/Modal.tsx) for the standard pattern.

### 11.4 Print Layouts

Several modules require printable output (receipts, fee statements, letters, leave-out documents, attendance reports). Use the same approach as [EmploymentContractModal.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/staff/EmploymentContractModal.tsx):
- Inline styles on the printable canvas (not Tailwind dark mode classes)
- `@media print` CSS to hide non-printable elements
- School header populated from `systemSettings`

### 11.5 API Module Pattern

Every new module should follow the established pattern:

```
apps/api/src/modules/{module}/
├── {module}.service.ts     ← business logic
├── {module}.controller.ts  ← request handlers
└── {module}.routes.ts      ← Express router
```

Register routes in [app.ts](file:///home/moha/Projects/School-Management-System/apps/api/src/app.ts):
```typescript
app.use('/api/{module}', {module}Routes);
```

### 11.6 Frontend Module Pattern

```
apps/web/src/modules/{module}/
├── {Module}View.tsx          ← main tab content
├── {SubFeature}Modal.tsx     ← modals for forms/details
└── {SubFeature}Table.tsx     ← reusable table components (if needed)
```

Wire into [DashboardPage.tsx](file:///home/moha/Projects/School-Management-System/apps/web/src/modules/dashboard/DashboardPage.tsx) under the appropriate tab, filtered by role.

---

## 12. Verification & Testing Strategy

### After Each Module

1. **Build check**: `cd apps/api && npm run build` and `cd apps/web && npm run build` — must pass with 0 errors.
2. **Schema push**: If schema was modified, run `npx drizzle-kit push` and verify table creation.
3. **API smoke test**: Use `curl` or the running dev server to hit each new endpoint.
4. **Git commit**: One commit per completed module (not per file). Use format: `feat({module}): {description}`.

### End-to-End Flows to Verify

| Flow | Steps |
|------|-------|
| **Admission** | Secretary enters student + guardian → Head Teacher approves → student appears in class roster |
| **Attendance** | Class teacher takes register → Deputy sees school-wide view → Deputy sends SMS to absent learner's parent |
| **Exam Marks** | Subject teacher enters marks → submits → Deputy reviews → approves OR requests correction → teacher fixes → Deputy locks |
| **Fee Payment** | Bursar records payment → receipt generated → student balance updated → shows in financial dashboard |
| **Payment Reversal** | Bursar initiates reversal with reason → Head Teacher approves → balance adjusted → audit log created |

---

> [!IMPORTANT]
> **Build order is non-negotiable**: Head Teacher → Deputy → DoS → Bursar → Secretary → Teachers. Each role's module may depend on tables/APIs created by earlier modules.

> [!IMPORTANT]
> **Schema changes should be batched**: Do ALL schema modifications across ALL files before running `npx drizzle-kit push`. Do not push after every individual table.

> [!IMPORTANT]
> **The user has the leave-out document format** and will provide it when the Deputy module is being built. Ask for it before implementing the print layout.

> [!IMPORTANT]
> **Guardian deduplication is critical**: The autocomplete-on-keystroke search for existing guardians during student admission is one of the hardest and most important features. Do not skip it.

> [!IMPORTANT]
> **A teacher can hold multiple assignments simultaneously**: Class teacher for Grade 6A + Subject teacher for Mathematics in Grade 7A and 8A. The system must support this from day one. Do not create separate user accounts for the same person.
