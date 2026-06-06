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
npm run db:generate
npm run dev
```

`npm run dev` starts PostgreSQL, Redis, the API, and the web app.

## Ports

- Web: http://localhost:3000
- API: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
