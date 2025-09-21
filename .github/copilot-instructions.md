# Copilot project instructions for OilProTanks

Purpose: help AI coding agents be productive fast in this repo. Keep changes aligned with these patterns and files.

## Architecture at a glance
- Full-stack TypeScript app: React client (Vite) + Express server + Drizzle ORM (Postgres/Neon) with shared types in `shared/`.
- Server entry: `server/index.ts` bootstraps Express, sets security headers, health/ready endpoints, registers routes from `server/routes.ts`, enables Vite middleware in dev and serves built client in prod via `server/vite.ts`.
- Data access abstraction: `server/storage.ts` exposes `IStorage` with two implementations:
  - `MemStorage` (default when `DATABASE_URL` missing) – fast, in-memory dev/test path.
  - `DatabaseStorage` (when `DATABASE_URL` set) – Drizzle queries against Postgres; schema/types in `shared/schema.ts`.
- API surface: centralized in `server/routes.ts` (large), plus modular routes under `server/routes/*.routes.ts` (e.g., components, nozzles). Input validation via Zod schemas in `server/validation-schemas.ts`.
- Feature flags/integration: image analysis worker in `server/imageAnalysisService.ts` (guarded by `VITE_AI_ANALYSIS_UI`), OpenAPI served from `openapi.json` when present.

## Key workflows
- Dev server: `npm run dev` (Node 20). Express serves API and proxies Vite HMR. Health checks: `/`, `/api/health`, `/api/ready`.
- Build & run prod: `npm run build` (Vite client -> `dist/public`, esbuild bundles server), then `npm start` (serves from `dist`). If `dist/public` is missing, `serveStatic()` throws.
- Tests: Mocha + ts-node. `npm test` runs `server/tests/**/*.test.ts` with Supertest available.
- DB & migrations: Drizzle configured via `drizzle.config.ts` (schema at `shared/schema.ts`). Push schema: `npm run db:push`. SQL migrations live in `/migrations`.
- OpenAPI docs: `npm run openapi:gen` to regenerate `openapi.json`; served at `/api/docs` if file exists.

## Project conventions to follow
- Shared types-first schema: add/modify tables and insert schemas in `shared/schema.ts`; import inferred types and `insert*Schema` across server. Keep `MemStorage` and `DatabaseStorage` methods in sync when adding new entities.
- Validation: use Zod schemas from `server/validation-schemas.ts` and the `validate()` middleware for POST/PUT/PATCH request bodies.
- Route style: parse numeric URL params safely (see `parseId` in routes) and return JSON. Common response patterns use `{ success: true, data }` in modular routes; others return domain objects directly—match local style per endpoint.
- Imports: server uses ESM with explicit `.ts` extensions (`allowImportingTsExtensions: true`). Aliases: `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets` (see `vite.config.ts` and `tsconfig.json`).
- Storage switching: code should work with both `MemStorage` and `DatabaseStorage`. Avoid direct `db` access when possible; prefer `storage` unless the feature is clearly DB-only and mirrored later.

## Integration points and examples
- Reports CRUD and related data: primary endpoints are in `server/routes.ts` (e.g., `/api/reports`, `/api/reports/:id`, measurements, checklists). Example: creating a measurement performs API 653 calcs before validation using helpers from `server/api653-calculations.ts`.
- Components/Nozzles domain: see `server/routes/components.routes.ts` and matching Zod schemas; DB tables in `shared/schema.ts` (`reportComponents`, `reportNozzles`, `cmlPoints`, `reportShellCourses`, etc.).
- Image analysis: enqueue via `POST /api/attachments/:attachmentId/analyze` when `VITE_AI_ANALYSIS_UI=true`. Worker writes to `image_analyses`, `image_labels`, `image_regions`.
- Import/export: Excel/PDF import via `POST /api/reports/import` using `server/import-handler.ts` and `server/import-persist.ts`. Export CSV/ZIP via `server/exporter.ts` endpoints (`/api/reports/:id/export.csv`, `/api/reports/:id/packet.zip`).
- Seeding: `server/seed.ts` seeds report templates; startup seeding is non-blocking and can be disabled with `SEED_TEMPLATES_DISABLE=true`. Admin reseed endpoint: `POST /api/admin/seed/templates` (optional `ADMIN_SEED_SECRET`).

## Environment and deployment notes
- Node 20.x required (see `package.json engines`). Ports resolved from `PORT` (prod) or fallbacks in dev; bind `0.0.0.0`.
- Security headers and CSP are set in `server/index.ts` (dev CSP is permissive for Vite HMR; prod is strict). CORS origin defaults to `process.env.CLIENT_URL || true`.
- Neon (serverless Postgres) is supported via `@neondatabase/serverless` and `drizzle-orm/neon-serverless`; WebSocket configured in `server/db.ts`.

## When adding features
- Update `shared/schema.ts` (tables + insert schemas + types), then wire `MemStorage` and `DatabaseStorage` in `server/storage.ts`, and finally add routes with Zod validation.
- Prefer `storage` for CRUD. If you must hit `db` directly, keep pagination and `eq(...)` filters like existing routes.
- Keep OpenAPI in sync (regenerate) and add minimal Supertest coverage in `server/tests/` for new endpoints.
