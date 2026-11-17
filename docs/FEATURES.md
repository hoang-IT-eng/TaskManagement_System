# Task Management — feature spec (v1 upgrade)

This spec covers the `feat/layers-upgrade` branch. It lists what the app had, what was missing or broken,
and what this branch targets and ships. It stays on the existing stack (ASP.NET Core + EF Core + React)
rather than rewriting it. "Layers" is the internal codename used in tokens, cookies and demo emails; the
product name shown in the UI is **Task Management**.

Legend: ✅ shipped and covered by tests · 🟡 partial · ⏭️ out of scope for this PR

## 1. What existed before

| Area | Before | Problems found |
|---|---|---|
| Auth | Register/login, one long-lived JWT kept in `localStorage`, forgot/reset password | **Reset password did not check the token: anyone could reset anyone's password.** No refresh or revocation. Tokens readable by any XSS. |
| Projects | CRUD, members with roles | Role rules spread across controllers; no consistent 403/404 behaviour |
| Tasks | CRUD, status and priority fields, a flat list | No board ordering, no keys (e.g. `ATL-12`), no labels, no concurrency control (last write silently wins) |
| Comments / activity | Basic endpoints | Activity rows written outside the change's transaction, so they could disagree |
| Reports | `ReportController` with ad-hoc counts | Duplicated what a dashboard should show |
| Teams / positions / attachments / admin | Endpoints present | Not used by the React app |
| Errors | Mixed shapes (`{ success, message }`, plain strings, 500s for validation) | Clients could not rely on any contract |
| Data | SQL Server only, `GETDATE()` defaults, `nvarchar(max)` everywhere, few indexes | Couldn't run locally without SQL Server; no seed data |
| Frontend (CRA) | Purple gradient navbar, emoji stat cards, a task list. No kanban, no drag and drop, no empty/error states, not responsive | See `docs/screenshots/before/` |
| Tests | None | — |

## 2. Target and status

### Accounts and sessions
- ✅ Register, login, logout, `GET/PATCH /auth/me`.
- ✅ 15-minute access JWT kept in memory by the SPA; 14-day refresh token in an httpOnly `layers_rt` cookie scoped to `/api/v1/auth`.
- ✅ Refresh tokens stored as SHA-256 hashes, rotated on every use; reusing a rotated token revokes the whole family (theft detection).
- ✅ Auth endpoints rate-limited (fixed window, configurable).
- ✅ The insecure reset-password endpoint is **removed**. ⏭️ A proper emailed, single-use reset flow needs an email provider.

### Projects, people and labels
- ✅ Projects with a short key (`ATL`), colour, description, archive (soft delete), search and pagination.
- ✅ Roles Owner > Admin > Member > Viewer, enforced in one place (`ProjectPermissions`). Non-members get 404, not 403, so project ids don't leak.
- ✅ Add a member by email, change role, remove (their open tasks are unassigned in the same transaction).
- ✅ Per-project labels (unique names), 4 starter labels on create.
- ✅ People directory search for the add-member picker.

### Tasks and the board
- ✅ Per-project task numbers (`ATL-12`) allocated safely under concurrency (project version + unique index + retry).
- ✅ Board with four columns (To do, In progress, In review, Done) plus Cancelled via the status field.
- ✅ Drag and drop between and within columns; order stored as a fractional rank with automatic rebalancing.
- ✅ Optimistic locking: every task carries a `version`; a stale write returns **409** with the server's current copy.
- ✅ Filters: search (title/key), assignee / unassigned, priority, label, due (overdue, next 24h, next 7 days, none); sort; pagination.
- ✅ Issue types (Task / Story / Bug), Jira-style: a coloured type glyph on board cards and list rows, a Type field in the task drawer and the create dialog, a board filter, and a `type` query filter on the API. The `AddTaskType` migrations (SQLite + SQL Server) backfill existing rows to Task.
- ✅ Task detail: title, description, status, priority, type, assignee, due date, estimate, labels, comments, history.
- ✅ Comments (edit by the author; delete by the author or a project admin), activity feed per project and per task.

### Inbox and dashboard
- ✅ Notifications when you're assigned, added to a project, or someone comments on your task; unread count, mark one/all read.
- ✅ Dashboard: open-and-assigned, overdue, due this week, finished this week, up next, project progress, 14-day throughput, recent activity.
- 🟡 "Overdue" and the due filters are instant-based (a task is late once its due moment passes), so they agree across time zones. The 14-day throughput chart still buckets by UTC day.

### Platform
- ✅ RFC 7807 `application/problem+json` for every error, with a stable `code` and `traceId`; field errors under `errors`.
- ✅ FluentValidation on every request body.
- ✅ Structured JSON logs and a request-logging middleware with `X-Request-Id`.
- ✅ `/health` (includes the database).
- ✅ OpenAPI / Swagger UI at `/swagger` (v1 document, plus a separate "legacy" document).
- ✅ SQLite by default (zero setup), SQL Server via config; separate migration histories for each.
- ✅ Demo seed data (4 users, 3 projects, 22 tasks, comments, notifications).
- 🟡 SQL Server migration generated and reviewed (including a backfill for existing rows) but **not executed against a real SQL Server** in this PR.

### Frontend
- ✅ React 19 + Vite + TypeScript (replaces Create React App), TanStack Query, dnd-kit.
- ✅ Pages: sign in / register, dashboard, projects, project board / list / people & labels, task drawer, inbox, profile.
- ✅ Loading skeletons, empty states and error states with retry on every data view.
- ✅ Responsive: sidebar on desktop; bottom tab bar, swipeable columns and full-screen task sheet on phones.
- ✅ Keyboard: cards are focusable, Enter opens, dnd-kit keyboard sensor for moving.
- ✅ Conflict UI: on 409 the drawer shows the other person's version and offers "Apply my change on top" or "Keep theirs".
- ⏭️ Admin panel, teams, positions and attachments were not rebuilt in the new UI (their API endpoints still exist under the legacy group).
- ⏭️ Real-time updates (SignalR) — the UI polls the unread count and refetches on focus instead.

## 3. Removed or changed endpoints

The v1 API lives under `/api/v1`. The old Auth, Project, ProjectMember, Task, Comment, ActivityLog and Report
controllers were replaced by it. Admin, Position, TaskAttachment, Team and User controllers are kept unchanged
and tagged as "legacy" in Swagger; they are **not** covered by the new tests and the old `vanilla-frontend/`
still targets the old routes, so it no longer works against this API.
