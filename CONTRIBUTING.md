# Contributing to School Management System (SMS)

First off, thank you for considering contributing to the **School Management System**!

We are building an open-source, production-ready school management platform tailored for modern educational workflows and the Kenyan Competency-Based Curriculum (CBC). Volunteers like you make this project possible.

Whether you're fixing a bug, adding a new role feature, polishing UI components, or improving documentation, your help is warmly welcomed.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Get Started](#how-to-get-started)
  - [Finding or Claiming an Issue](#finding-or-claiming-an-issue)
  - [Proposing New Features or Reporting Bugs](#proposing-new-features-or-reporting-bugs)
- [Local Development Setup](#local-development-setup)
  - [1. Fork and Clone](#1-fork-and-clone)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Set Up the Database](#4-set-up-the-database)
  - [5. Seed Initial Data](#5-seed-initial-data)
  - [6. Start Development Servers](#6-start-development-servers)
- [Monorepo Structure](#monorepo-structure)
- [Development Workflow](#development-workflow)
  - [Branch Naming](#branch-naming)
  - [Commit Message Guidelines](#commit-message-guidelines)
  - [Coding Standards](#coding-standards)
- [Submitting a Pull Request (PR)](#submitting-a-pull-request-pr)
- [Getting Help & Community](#getting-help--community)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please keep conversations respectful, collaborative, and inclusive.

---

## How to Get Started

### Finding or Claiming an Issue

1. Visit our [GitHub Issues](https://github.com/Moha-abshir/School-Management-System/issues) and [ROADMAP.md](ROADMAP.md).
2. Look for issues labeled:
   - `good first issue` — Great for newcomers getting familiar with the repository.
   - `help wanted` — High-priority tasks ready to be built.
   - `role/headteacher`, `role/deputy`, `role/dos`, `role/bursar`, `role/secretary`, `role/teacher` — Domain-specific role modules.
   - `area/frontend`, `area/backend`, `area/schema` — Architecture layers.
3. **Claim the issue before you begin**: Leave a comment on the issue saying you'd like to work on it (e.g., *"I'd like to work on this issue, please assign me"*). A maintainer will assign it to you so work isn't duplicated.

### Proposing New Features or Reporting Bugs

- **Found a bug?** Submit an issue using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
- **Have an idea?** Submit an issue using our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md) or start a discussion.

---

## Local Development Setup

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Docker & Docker Compose** (Recommended for local database) OR an active [Neon PostgreSQL](https://neon.tech) database.
- **Git**

### 1. Fork and Clone
```bash
# Fork the repo on GitHub, then clone your fork:
git clone https://github.com/<your-username>/School-Management-System.git
cd School-Management-System

# Add upstream remote
git remote add upstream https://github.com/Moha-abshir/School-Management-System.git
```

### 2. Install Dependencies
This project uses **npm workspaces**. Install all root and subpackage dependencies with:
```bash
npm install
```

### 3. Configure Environment Variables

Create environment configuration files for both the backend API and frontend:

```bash
# Backend environment
cp apps/api/.env.example apps/api/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env
```

Review `apps/api/.env`:
- If you're using Docker, the default database connection string in `.env.example` will work directly:
  ```env
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/school_sms?sslmode=disable
  ```
- If you're using a free [Neon](https://neon.tech) PostgreSQL instance, paste your pooled connection string into `DATABASE_URL`.
- The `BREVO_API_KEY` and `AFRICAS_TALKING_API_KEY` are optional in local development and fallback safely if left as sandbox placeholders.

### 4. Set Up the Database

If using Docker, start the local PostgreSQL container in the background:
```bash
docker compose up -d
```

Push all Drizzle schema tables into the database:
```bash
npm run db:push
```

### 5. Seed Initial Data

Populate default system roles, permissions, and test accounts:
```bash
npm --workspace=@school/api run db:seed
```

This creates test accounts for every school role with default password `Password123!`:
- **Head Teacher (Admin)**: `moabshir06@gmail.com`
- **Teacher**: `teacher@school.test`
- **Bursar**: `bursar@school.test`
- **Deputy Head**: `deputy@school.test`

### 6. Start Development Servers

Run the full stack concurrently:
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173) (Vite HMR)
- **Backend API**: [http://localhost:5000](http://localhost:5000) (tsx auto-reloading)

---

## Monorepo Structure

```
School-Management-System/
├── apps/
│   ├── api/          # Express API server (Node.js, Drizzle, Zod, Pino)
│   └── web/          # React 18 frontend (Vite, Tailwind CSS, TanStack Query)
└── packages/
    └── shared/       # Shared TypeScript models, Drizzle schemas & Zod validators
```

When modifying data models or adding new database tables:
1. Define the schema in `packages/shared/src/db/schema/`.
2. Export your schema and types in `packages/shared/src/index.ts`.
3. Run `npm run db:push` to apply changes to your database.
4. Both `apps/api` and `apps/web` can import directly from `@school/shared`.

---

## Development Workflow

### Branch Naming

Create a descriptive feature branch from `main`:
```bash
git checkout -b <type>/<short-description>
```

Examples:
- `feat/fee-payment-recording`
- `feat/student-admission-form`
- `fix/timetable-period-loop`
- `docs/contributing-guide`
- `refactor/attendance-table`

### Commit Message Guidelines

We follow the **[Conventional Commits](https://www.conventionalcommits.org/)** specification:

```
<type>(<scope>): <short description in present tense>
```

#### Types:
- `feat`: A new user-facing feature or API endpoint
- `fix`: A bug fix
- `docs`: Documentation updates or additions
- `style`: Formatting, missing semicolons, CSS tweaks (no code logic changes)
- `refactor`: Code refactoring that neither fixes a bug nor adds a feature
- `test`: Adding or correcting tests
- `chore`: Build tasks, package updates, configuration adjustments

#### Examples:
- `feat(admissions): add guardian search per keystroke on student admit`
- `fix(timetable): prevent infinite period grid generation when break time exceeds bounds`
- `docs(readme): add docker compose local database instructions`
- `chore(deps): update drizzle-orm to v0.30.10`

### Coding Standards

#### TypeScript & Code Quality
- Strict typing: Avoid using `any`. Use TypeScript types defined in `@school/shared` or create specific interfaces.
- Unused variables: Keep code clean and remove unused imports and variables.
- Run typecheck before committing:
  ```bash
  npm run build
  ```

#### Backend (`apps/api`)
- **Validation**: Every request body, query parameter, and route param must be validated using **Zod** schemas.
- **Logging**: Use the structured `pino` logger (`req.log.info`, `req.log.error`) rather than raw `console.log`.
- **Error Handling**: Return standard JSON error responses: `{ success: false, error: "Human-readable message" }`.
- **Database Queries**: Use Drizzle ORM query builders (`db.select()`, `db.insert()`, etc.) and ensure transactions are used for multi-table writes.

#### Frontend (`apps/web`)
- **Styling**: Use Tailwind CSS utility classes. Maintain consistent color palettes (Slate / Blue) and dark mode compatibility where applicable.
- **Server State**: Use **TanStack Query** (`useQuery`, `useMutation`) with appropriate query invalidation and optimistic updates.
- **Icons**: Use icons from `lucide-react`.
- **Notifications**: Provide clear user feedback using `react-toastify`.

---

## Submitting a Pull Request (PR)

1. **Verify your build passes locally**:
   ```bash
   npm run build
   ```
2. **Push your branch to your GitHub fork**:
   ```bash
   git push origin <your-branch-name>
   ```
3. **Open a Pull Request**:
   - Navigate to the upstream repository [Pull Requests](https://github.com/Moha-abshir/School-Management-System/pulls).
   - Fill in all sections of the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
   - Link the relevant issue (e.g., `Fixes #42` or `Resolves #15`).
4. **Code Review**:
   - A maintainer will review your pull request.
   - We aim to provide timely, friendly, and constructive reviews. Feel free to ask questions or discuss alternative approaches in the PR thread.
   - Once approved, your PR will be merged into `main`!

---

## Getting Help & Community

Have questions or need assistance setting up?
- **GitHub Discussions**: Post your question in [Discussions](https://github.com/Moha-abshir/School-Management-System/discussions).
- **Maintainer Contact**:
  - Lead: **Mohamed Abshir**
  - Email: [moabshir06@gmail.com](mailto:moabshir06@gmail.com)
  - Phone / WhatsApp: `+254 714 731 331`
  - GitHub: [@Moha-abshir](https://github.com/Moha-abshir)

Thank you for contributing to open-source educational technology! 🚀
