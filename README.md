# Task Management

A team task manager: projects, a drag-and-drop board, task details with comments and history, an inbox and
a personal dashboard. ASP.NET Core 10 + EF Core API, React + TypeScript frontend.

![Board](docs/screenshots/portfolio_hero.png)

- **Feature spec:** [`docs/FEATURES.md`](docs/FEATURES.md)
- **Design notes:** [`docs/DESIGN.md`](docs/DESIGN.md)
- **Screenshots:** [`docs/screenshots/`](docs/screenshots) (`before/` and `after/`, desktop 1440×900 and mobile 390×844)

## Run it locally

You need the **.NET 10 SDK** and **Node.js 20+**. No database server is needed: SQLite is the default.

```bash
# 1. API on http://localhost:5080 (creates layers.db, applies migrations, seeds demo data in Development)
cd TaskManagement.API
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5080

# 2. Web app on http://localhost:5173 (proxies /api to the API)
cd task-management-frontend
npm install
npm run dev
```

Open http://localhost:5173 and click **Explore the demo workspace**, or sign in with any demo account:

| Email | Password | Notes |
|---|---|---|
| `hoang@layers.dev` | `Layers2026` | Admin, owns all three demo projects |
| `linh@layers.dev` | `Layers2026` | Admin on Atelier storefront |
| `minh@layers.dev` | `Layers2026` | Member on Atelier and Plates |
| `an@layers.dev` | `Layers2026` | Viewer on Atelier storefront (read-only UI) |

Swagger UI: http://localhost:5080/swagger · health: http://localhost:5080/health

### Configuration

Every setting can be overridden with environment variables (`Section__Key`).

| Setting | Default | Notes |
|---|---|---|
| `Database__Provider` | `Sqlite` | `Sqlite` or `SqlServer` |
| `ConnectionStrings__Default` | `Data Source=layers.db` | e.g. `Server=.;Database=TaskManagement;Trusted_Connection=True;TrustServerCertificate=True` |
| `Database__MigrateOnStartup` | `true` | Applies the provider's migrations at startup |
| `Jwt__SigningKey` | *(empty: required outside Development)* | At least 32 random characters |
| `Jwt__AccessTokenMinutes` / `Jwt__RefreshTokenDays` | `15` / `14` | |
| `Auth__RefreshCookieSameSite` | `Lax` | Use `None` (over HTTPS) if the SPA runs on another site |
| `Auth__AlwaysSecure` | `false` | Force the cookie's Secure flag behind a TLS-terminating proxy |
| `Cors__Origins__0` | `http://localhost:5173` | |
| `RateLimiting__AuthPermitPerMinute` | `20` | Per client, for `/api/v1/auth/*` |
| `Seed__Demo` | `false` (`true` in Development) | Seeds demo users and projects into an empty database |
| `Logging__Format` | `json` (`simple` in Development) | |

### SQL Server

```bash
export Database__Provider=SqlServer
export ConnectionStrings__Default="Server=localhost;Database=TaskManagement;User Id=sa;Password=...;TrustServerCertificate=True"
dotnet run --project TaskManagement.API
```

SQL Server migrations live in `TaskManagement.Infrastructure/Migrations`, SQLite ones in `Migrations/Sqlite`.
The `LayersUpgrade` migration backfills project keys, task numbers and ranks for existing data. It was generated
and reviewed but has not yet been run against a real SQL Server: try it on a copy of your database first.

```bash
# add a migration for each provider
dotnet ef migrations add <Name> -p TaskManagement.Infrastructure -s TaskManagement.API -c ApplicationDbContext -o Migrations
dotnet ef migrations add <Name> -p TaskManagement.Infrastructure -s TaskManagement.API -c SqliteApplicationDbContext -o Migrations/Sqlite
```

## Tests

```bash
# Backend: unit, service (real SQLite + real migrations) and HTTP API tests
dotnet test tests/TaskManagement.Tests
dotnet test tests/TaskManagement.Tests --collect:"XPlat Code Coverage"

# Frontend component tests (Vitest + Testing Library)
cd task-management-frontend
npm test
npm run test:coverage

# End-to-end (Playwright): starts its own API on :5090 with a throwaway DB, and Vite on :5174
dotnet build ../TaskManagement.API
npx playwright install chromium   # or set CHROME_PATH=/path/to/chrome
npm run e2e
```

## Project layout

```
TaskManagement.Domain/          entities, ranking and permission rules
TaskManagement.Application/     contracts (DTOs), service interfaces, validators, error types
TaskManagement.Infrastructure/  EF Core context + migrations, services, tokens, demo seeder
TaskManagement.API/             controllers (v1 + legacy), problem details, logging, Swagger
tests/TaskManagement.Tests/     xUnit: Unit/, Services/, Api/
task-management-frontend/       React + Vite + TS app, Vitest tests, Playwright e2e/
vanilla-frontend/               legacy static pages for the old API (no longer maintained)
```
