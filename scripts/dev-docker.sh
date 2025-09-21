#!/usr/bin/env bash
set -euo pipefail

# Start Postgres + pgAdmin via docker compose
docker compose up -d

# Set DATABASE_URL for this process if not already set
export DATABASE_URL=${DATABASE_URL:-"postgres://postgres:postgres@localhost:5432/oilpro"}
echo "[dev:docker] DATABASE_URL=$DATABASE_URL"

# Optionally wait briefly for DB to become ready
sleep 2

# Start the dev server (API + Vite)
npm run dev
