# Layers API v1 Reference

Base prefix: `/api/v1` · Content-Type: `application/json` · Error contract: RFC 7807 `application/problem+json` (`status`, `title`, `detail`, `code`, `traceId`, `errors`, `current`).

## Authentication & Sessions
- `POST /api/v1/auth/register` — `{ email, password, fullName }` → returns `{ accessToken, accessTokenExpiresAt, user }` + sets rotated `httpOnly` `layers_rt` cookie.
- `POST /api/v1/auth/login` — `{ email, password }` → returns `{ accessToken, accessTokenExpiresAt, user }` + sets `layers_rt` cookie.
- `POST /api/v1/auth/refresh` — exchanges `layers_rt` cookie for a fresh access token and rotated refresh token (detects reuse/theft across token families).
- `POST /api/v1/auth/logout` — revokes refresh token family and clears cookie (`204`).
- `GET /api/v1/auth/me` & `PATCH /api/v1/auth/me` — read or update profile (`{ fullName, bio }`).

## Projects, People & Labels
- `GET /api/v1/projects?search=&page=1&pageSize=100` — paginated list of active projects for the signed-in user.
- `POST /api/v1/projects` — `{ name, key?, description?, color? }` (`201`).
- `GET /api/v1/projects/{projectId}` / `PATCH /api/v1/projects/{projectId}` / `DELETE /api/v1/projects/{projectId}` (soft-archive).
- `GET /api/v1/projects/{projectId}/members` / `POST .../members` / `PATCH .../members/{userId}` / `DELETE .../members/{userId}`.
- `GET /api/v1/projects/{projectId}/labels` / `POST .../labels` / `DELETE .../labels/{labelId}`.
- `GET /api/v1/users?search=` — workspace user directory search for member pickers.

## Agile Issues, Sprints & Kanban Board
- `GET /api/v1/projects/{projectId}/board` — returns Kanban columns (`Todo`, `InProgress`, `InReview`, `Done`) ordered by sparse fractional `rank`.
- `GET /api/v1/projects/{projectId}/tasks` — filtered, sorted, paginated issues (`Epic`, `Story`, `Task`, `Bug`, `Subtask`; statuses including `Backlog`).
- `POST /api/v1/projects/{projectId}/tasks` — allocates per-project sequence key (`LAY-101`, `API-204`) under optimistic concurrency.
- `GET /api/v1/projects/{projectId}/tasks/{taskId}` — full issue detail.
- `PATCH /api/v1/projects/{projectId}/tasks/{taskId}` — partial update guarded by `version`. Stale `version` returns `409 Conflict` with `code: "task.version_conflict"` and the latest server issue in `current`.
- `POST /api/v1/projects/{projectId}/tasks/{taskId}/move` — `{ version, status, beforeTaskId?, afterTaskId? }` fractional rank move.
- `DELETE /api/v1/projects/{projectId}/tasks/{taskId}` — soft delete (`204`).
- `GET/POST /api/v1/projects/{projectId}/tasks/{taskId}/comments` & `DELETE .../comments/{commentId}`.
- `GET /api/v1/projects/{projectId}/tasks/{taskId}/activity` — immutable audit history trail.
- `GET /api/v1/projects/{projectId}/sprints` / `POST .../sprints` / `PATCH .../sprints/{sprintId}` / `POST .../sprints/{sprintId}/complete` — sprint lifecycle & spillover rollover (supported natively in the Stateful Local/Demo Agile Engine and frontend workspace).
- `GET /api/v1/projects/{projectId}/analytics` — Sprint Burndown, 4-sprint Velocity, Workload by Assignee, and Epic Progress metrics.

## Dashboard & Inbox
- `GET /api/v1/dashboard` — personal metrics, up-next issues, project progress bars, 14-day throughput, recent activity.
- `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`.

## Layers AI Sprint Copilot
- `POST /api/v1/ai/chat` — `{ message, projectId?, history? }` → executes grounded workspace tools (`search_issues_hybrid`, `create_issue`, `transition_issue`, `decompose_epic_to_subtasks`, `analyze_sprint_health`) with optional `GEMINI_API_KEY` enrichment and returns structured Generative UI payloads (`issues`, `proposedSubtasks`, `sprintHealth`, `toolCalls`).
