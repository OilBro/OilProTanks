#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:5000}
MAX_WAIT=${MAX_WAIT:-30}
SLEEP=${SLEEP:-2}

start=$(date +%s)

check_once() {
  local url="$1"
  curl -sS --fail "$url" || return 1
}

until check_once "$BASE_URL/api/health" && check_once "$BASE_URL/api/ready"; do
  now=$(date +%s)
  elapsed=$(( now - start ))
  if (( elapsed >= MAX_WAIT )); then
    echo "[smoke:retry] Timeout after ${MAX_WAIT}s waiting for service at $BASE_URL" >&2
    exit 1
  fi
  echo "[smoke:retry] Not ready yet, waiting ${SLEEP}s..." >&2
  sleep "$SLEEP"
done

echo "[smoke:retry] Service is responding at $BASE_URL"
