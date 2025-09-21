#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:5000}

echo "[smoke] Hitting $BASE_URL/api/health ..."
HEALTH=$(curl -sS --fail "$BASE_URL/api/health")
echo "$HEALTH" | jq . >/dev/null 2>&1 || true

echo "[smoke] Hitting $BASE_URL/api/ready ..."
READY=$(curl -sS --fail "$BASE_URL/api/ready")
echo "$READY" | jq . >/dev/null 2>&1 || true

# Simple checks: ensure fields exist
if ! echo "$HEALTH" | grep -q '"ok": true'; then
  echo "[smoke] /api/health not ok" >&2
  exit 1
fi

if ! echo "$READY" | grep -q '"ready"'; then
  echo "[smoke] /api/ready missing 'ready' field" >&2
  exit 1
fi

echo "[smoke] PASS"
