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
