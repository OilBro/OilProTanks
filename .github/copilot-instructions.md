# Copilot Instructions for OilProTanks

Purpose: enable AI agents to make safe, useful changes fast. Prefer minimal diffs that follow existing patterns and files referenced below.

## Architecture (big picture)
- Full‑stack TypeScript: React 18 + Vite + Tailwind + shadcn/ui (client `client/`) and Express ESM server (server `server/`).
- Single Node process; in dev serves client via Vite middleware (`server/vite.ts`), in prod serves built assets (`vite.config.ts`).
- Shared types/models live in `shared/schema.ts` (Drizzle + Zod). DB is Postgres, migrations are raw SQL in `migrations/`. Config in `drizzle.config.ts`.
- Core flow: Excel import → map/validate → persist → run API 653 calculations → generate templates/exports → optional AI image analysis.

## Where things are
- Client: pages `client/src/pages/*`, UI `client/src/components/*`, entry `client/src/App.tsx`, `client/src/main.tsx`. Aliases: `@`→`client/src`, `@shared`→`shared`, `@assets`→`attached_assets`.
- Server: bootstrap `server/index.ts`, routes registry `server/routes.ts`, feature modules under `server/routes/*.ts` and `server/*.ts`.
- Validation: `server/validation-schemas.ts`. Data: `shared/schema.ts`. Migrations: `migrations/000*.sql`.

## Run, build, test
- Dev (API+client): `npm run dev`.
- Build: `npm run build` → client to `dist/public`, server bundled to `dist/index.js`; start: `npm start`.
- Types: `npm run check`. Tests: `npm test` (Mocha via ts-node/esm). OpenAPI: `npm run openapi:gen`.
- DB push: `npm run db:push` (requires `DATABASE_URL`).
- Env essentials: set `DATABASE_URL`; `CLIENT_URL` adjusts CORS in dev.
- Deploy: build then run `npm start`; see `test-deployment.mjs` for an example deployment script.
- Seeding: `server/seed.ts`; initial seeding is orchestrated by `server/index.ts` on boot (see `seedDatabase`).
  OpenAPI UI is served via `swagger-ui-express` in `server/routes.ts`.
  Local Postgres example: `export DATABASE_URL="postgres://postgres:postgres@localhost:5432/oilpro"`

## Conventions that matter
- API responses: `{ success, data?, message?, errors? }` (see `API_REFERENCE.md`). Always validate request bodies with Zod schemas in `server/validation-schemas.ts`.
- DB changes sequence:
  1) Update `shared/schema.ts`
  2) Add SQL in `migrations/000*.sql`
  3) Update Zod in `server/validation-schemas.ts`
  4) Update import/export/calculation paths if affected
- Routes: wire in `server/routes.ts`; keep complex logic in separate modules for testability.
- Client: use React Query via `client/src/lib/queryClient`; adhere to shadcn/ui patterns; prefer Tailwind utilities over inline styles.

DB change example
```ts
// shared/schema.ts (add column)
export const inspectionReports = pgTable("inspection_reports", { /* ... */, reviewer: text("reviewer") });
```
```sql
-- migrations/000X_add_reviewer.sql
ALTER TABLE inspection_reports ADD COLUMN reviewer TEXT;
```

## Domain workflows (files to follow)
- Excel import: `server/import-handler.ts` → `server/legacy-import-mapper.ts` → `server/import-persist.ts` (+ `cleanupOrphanedReportChildren`).
- Calculations: `server/api653-calculator.ts`, `server/api653-calculations.ts`, fix scripts `server/fix-birla-*.ts`.
- Templates/exports: `server/template-generator.ts`, `server/exporter.ts` (flat CSV + whole packet ZIP).
- Image analysis (optional): `server/imageAnalysisService.ts`; tables via migrations `0004*`, `0005*`.
- Other analyzers (optional): `server/ai-analyzer.ts`, `server/pdf-analyzer.ts`, `server/openrouter-analyzer.ts`.

## Pitfalls and notes
- ESM throughout; use import paths with `.ts` inside server code where present (see `server/routes.ts`).
- Vite aliases must be used for cross‑package imports (`@`, `@shared`, `@assets`).
- `drizzle.config.ts` throws if `DATABASE_URL` is missing; running `npm run dev` without it will fail early.
 - Smoke test after build: GET `/api/health` (liveness) and `/api/ready` (readiness with seed status).

Examples to copy
- Route pattern: `server/routes.ts` and feature routes under `server/routes/*.ts`.
- Client data pages: `client/src/pages/report-view.tsx`, `client/src/pages/edit-report-full.tsx`.
- Import→persist: `server/import-handler.ts` and `server/import-persist.ts`.

Commit style: describe domain impact, e.g., "Add nozzle Tmin user override + migration".

---

Local DB via Docker (optional)
```bash
docker run -d \
  --name oilpro-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=oilpro \
  -p 5432:5432 \
  postgres:16

# wait a few seconds, then set DATABASE_URL for this shell
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/oilpro"

# verify connection (optional)
psql "$DATABASE_URL" -c "select version();" || true
```

Compose alternative (Postgres + pgAdmin)
```bash
docker compose up -d
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/oilpro"
# pgAdmin at http://localhost:5050 (admin@local / admin)
```

Smoke test after build/start
```bash
npm run build && npm start & sleep 2
bash scripts/smoke-test.sh
```