# PaperXent

Paper trading and stock portfolio platform in production :D

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma
- Cache: Redis
- Workspace: npm workspaces

## Structure

```txt
apps/
  web/      Next.js frontend
  api/      Express API
packages/
  database/ Prisma schema and client package
  shared-types/ Cross-app TypeScript contracts
```

## Getting Started

```bash
npm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local   # optional; defaults already match API port 4000
npm run db:generate
npm run dev
```

`npm run dev` starts PostgreSQL, Redis, the API, and the web app.

**Env files:** The API reads the repo-root `.env`. Next.js reads `apps/web/.env.local` (not the root file). If you skip copying `apps/web/.env.example`, the web app still defaults to `http://localhost:4000` for API calls.

## Ports

- Web: http://localhost:3000
- API: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Transaction history API

- `GET /api/transactions/:userId` (Bearer auth; `:userId` must match the token) — query: `cursor`, `limit` (default 20, max 100), `type` (`BUY` | `SELL`), `ticker`, `from`, `to` (ISO date strings). Returns `{ data: PaginatedResponse<TransactionHistoryItem> }` with cursor-based pagination.

## Portfolio analytics

- **Migration:** run `npm run db:migrate` (or `npm run db:migrate` from the repo root per your scripts) after pulling — adds `PortfolioSnapshot` (`userId`, `snapshotDate` @date, `totalAccountValue` = cash + securities at capture time).
- **Cron:** `node-cron` runs **daily at 00:00 UTC** and upserts one row per user (`apps/api/src/shared/jobs/portfolio-snapshot.cron.ts`, started from `server.ts`).
- **API:** `GET /api/analytics/:userId?range=7d|30d|all` (Bearer auth; user id must match token). Response `{ data: PortfolioAnalyticsPayload }` with snake_case fields: `value_over_time`, `allocation`, `per_asset_roi`, `valued_at`. The last `value_over_time` point is **live** (current cash + `PortfoliosService.getValuation()`); historical points come from snapshots.
- **Web:** `/portfolio` — Recharts line / donut / bar charts, **7D / 30D / All** range, responsive layout (same light theme as the rest of the app).
