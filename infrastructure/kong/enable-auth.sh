#!/bin/bash
set -euo pipefail

KONG_ADMIN="http://localhost:8001"

echo "=== LeaderX Kong API Key Authentication Setup ==="

# Helper
kong_post() {
  local endpoint="$1"
  shift
  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$KONG_ADMIN$endpoint" "$@")
  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    echo "  OK: $endpoint"
    echo "$body"
  elif [ "$http_code" = "409" ]; then
    echo "  SKIP (exists): $endpoint"
  else
    echo "  ERROR ($http_code): $endpoint"
    echo "  $body"
  fi
}

# ─── 1. Enable key-auth plugin globally ───────────────────────────
echo ""
echo "[1/3] Enabling key-auth plugin globally..."
kong_post "/plugins" \
  -d "name=key-auth" \
  -d "config.key_names[]=apikey" \
  -d "config.hide_credentials=true"

# ─── 2. Generate API keys for each consumer ──────────────────────
echo ""
echo "[2/3] Generating API keys for consumers..."

echo ""
echo "--- admin-panel ---"
kong_post "/consumers/admin-panel/key-auth"

echo ""
echo "--- mobile-app ---"
kong_post "/consumers/mobile-app/key-auth"

echo ""
echo "--- system-internal ---"
kong_post "/consumers/system-internal/key-auth"

echo ""
echo "--- ai-agent ---"
kong_post "/consumers/ai-agent/key-auth"

# ─── 3. Display all generated keys ───────────────────────────────
echo ""
echo "[3/3] API Keys Summary:"
echo ""

for consumer in admin-panel mobile-app system-internal ai-agent; do
  key=$(curl -s "$KONG_ADMIN/consumers/$consumer/key-auth" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = data.get('data', [])
if keys:
    print(keys[0].get('key', 'N/A'))
else:
    print('NO_KEY')
" 2>/dev/null || echo "ERROR")
  echo "  $consumer: $key"
done

echo ""
echo "=== Done! ==="
echo ""
echo "IMPORTANT: Copy the admin-panel key to your frontend .env.local:"
echo "  NEXT_PUBLIC_API_KEY=<admin-panel-key>"
echo ""
echo "And the ai-agent key to your backend .env:"
echo "  MCP_API_KEY=<ai-agent-key>"
