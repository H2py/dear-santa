#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$API_KEY" ]]; then
  echo "SUPABASE_SERVICE_ROLE_KEY is required in env (x-api-key)" >&2
  exit 1
fi

curl -sS -X POST "${BASE_URL}/api/admin/ornaments/mint-batch" \
  -H "x-api-key: ${API_KEY}"
