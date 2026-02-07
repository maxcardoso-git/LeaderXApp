#!/bin/bash
set -euo pipefail

KONG_ADMIN="http://localhost:8001"

echo "=== LeaderX Kong Route Configuration ==="

# Helper: POST to Kong Admin API, ignore "already exists" errors
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
  elif [ "$http_code" = "409" ]; then
    echo "  SKIP (exists): $endpoint"
  else
    echo "  ERROR ($http_code): $endpoint"
    echo "  $body"
  fi
}

# ─── 1. Upstream Service ───────────────────────────────────────────
echo ""
echo "[1/4] Creating upstream service..."
kong_post "/services" \
  -d "name=leaderx-api" \
  -d "url=http://host.docker.internal:3004" \
  -d "connect_timeout=10000" \
  -d "read_timeout=60000" \
  -d "write_timeout=60000"

# ─── 2. Routes (domain-based) ─────────────────────────────────────
echo ""
echo "[2/4] Creating routes..."

# IDENTITY
kong_post "/services/leaderx-api/routes" \
  -d "name=identity" \
  -d "paths[]=/identity" \
  -d "strip_path=false"

# POINTS
kong_post "/services/leaderx-api/routes" \
  -d "name=points" \
  -d "paths[]=/points" \
  -d "strip_path=false"

kong_post "/services/leaderx-api/routes" \
  -d "name=admin-points" \
  -d "paths[]=/admin/points-policy" \
  -d "paths[]=/admin/points" \
  -d "paths[]=/admin/conciliation" \
  -d "strip_path=false"

# GOVERNANCE
kong_post "/services/leaderx-api/routes" \
  -d "name=governance" \
  -d "paths[]=/governance" \
  -d "strip_path=false"

# NETWORK
kong_post "/services/leaderx-api/routes" \
  -d "name=network" \
  -d "paths[]=/network" \
  -d "strip_path=false"

# EVENTS
kong_post "/services/leaderx-api/routes" \
  -d "name=events" \
  -d "paths[]=/events" \
  -d "paths[]=/admin/events" \
  -d "strip_path=false"

# PLM
kong_post "/services/leaderx-api/routes" \
  -d "name=plm" \
  -d "paths[]=/plm" \
  -d "strip_path=false"

# FORM STUDIO
kong_post "/services/leaderx-api/routes" \
  -d "name=form-studio" \
  -d "paths[]=/form-studio" \
  -d "strip_path=false"

# MEMBER JOURNEY
kong_post "/services/leaderx-api/routes" \
  -d "name=member-journey" \
  -d "paths[]=/member-journey" \
  -d "strip_path=false"

# AUDIT
kong_post "/services/leaderx-api/routes" \
  -d "name=audit" \
  -d "paths[]=/audit" \
  -d "strip_path=false"

# SETTINGS & TAXONOMY
kong_post "/services/leaderx-api/routes" \
  -d "name=settings" \
  -d "paths[]=/settings" \
  -d "strip_path=false"

kong_post "/services/leaderx-api/routes" \
  -d "name=taxonomy" \
  -d "paths[]=/taxonomy" \
  -d "strip_path=false"

kong_post "/services/leaderx-api/routes" \
  -d "name=suppliers" \
  -d "paths[]=/suppliers" \
  -d "paths[]=/integrations" \
  -d "strip_path=false"

kong_post "/services/leaderx-api/routes" \
  -d "name=workflow" \
  -d "paths[]=/workflow" \
  -d "strip_path=false"

# RESERVATIONS
kong_post "/services/leaderx-api/routes" \
  -d "name=reservations" \
  -d "paths[]=/reservations" \
  -d "strip_path=false"

# SYSTEM
kong_post "/services/leaderx-api/routes" \
  -d "name=system" \
  -d "paths[]=/system" \
  -d "strip_path=false"

# APPROVALS
kong_post "/services/leaderx-api/routes" \
  -d "name=approvals" \
  -d "paths[]=/approvals" \
  -d "strip_path=false"

# HEALTH
kong_post "/services/leaderx-api/routes" \
  -d "name=health" \
  -d "paths[]=/health" \
  -d "strip_path=false"

# SWAGGER
kong_post "/services/leaderx-api/routes" \
  -d "name=swagger" \
  -d "paths[]=/api" \
  -d "strip_path=false"

# ─── 3. Global Plugins ────────────────────────────────────────────
echo ""
echo "[3/4] Enabling global plugins..."

# Rate limiting (100 req/min per IP)
kong_post "/plugins" \
  -d "name=rate-limiting" \
  -d "config.minute=100" \
  -d "config.policy=local" \
  -d "config.fault_tolerant=true" \
  -d "config.hide_client_headers=false"

# CORS
kong_post "/plugins" \
  -d "name=cors" \
  -d "config.origins[]=*" \
  -d "config.methods[]=GET" \
  -d "config.methods[]=POST" \
  -d "config.methods[]=PUT" \
  -d "config.methods[]=PATCH" \
  -d "config.methods[]=DELETE" \
  -d "config.methods[]=OPTIONS" \
  -d "config.headers[]=Content-Type" \
  -d "config.headers[]=X-Tenant-Id" \
  -d "config.headers[]=X-Org-Id" \
  -d "config.headers[]=X-Request-Id" \
  -d "config.headers[]=Authorization" \
  -d "config.exposed_headers[]=X-Kong-Request-Id" \
  -d "config.exposed_headers[]=X-RateLimit-Remaining-Minute" \
  -d "config.credentials=true" \
  -d "config.max_age=3600"

# Correlation ID (request tracing)
kong_post "/plugins" \
  -d "name=correlation-id" \
  -d "config.header_name=X-Request-Id" \
  -d "config.generator=uuid" \
  -d "config.echo_downstream=true"

# ─── 4. Consumers (prepare for IAM) ───────────────────────────────
echo ""
echo "[4/4] Creating API consumers..."

kong_post "/consumers" -d "username=admin-panel" -d "custom_id=consumer-admin"
kong_post "/consumers" -d "username=mobile-app" -d "custom_id=consumer-mobile"
kong_post "/consumers" -d "username=system-internal" -d "custom_id=consumer-system"
kong_post "/consumers" -d "username=ai-agent" -d "custom_id=consumer-ai"

# ─── Done ──────────────────────────────────────────────────────────
echo ""
echo "=== Kong routes configured! ==="
echo ""
echo "Verify:"
echo "  curl -s http://localhost:8001/routes | python3 -m json.tool"
echo "  curl -s http://localhost:8000/health"
echo ""

# Show summary
ROUTE_COUNT=$(curl -s "$KONG_ADMIN/routes" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo "?")
PLUGIN_COUNT=$(curl -s "$KONG_ADMIN/plugins" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo "?")
CONSUMER_COUNT=$(curl -s "$KONG_ADMIN/consumers" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo "?")

echo "Summary:"
echo "  Routes:    $ROUTE_COUNT"
echo "  Plugins:   $PLUGIN_COUNT"
echo "  Consumers: $CONSUMER_COUNT"
