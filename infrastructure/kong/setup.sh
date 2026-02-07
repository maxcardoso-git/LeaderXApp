#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KONG_ADMIN="http://localhost:8001"

echo "=== LeaderX Kong Gateway Setup ==="

# 1. Check Docker
if ! command -v docker &> /dev/null; then
  echo "[1/5] Docker not found. Installing..."
  apt-get update -qq && apt-get install -y -qq docker.io docker-compose-plugin
  systemctl enable docker && systemctl start docker
  echo "      Docker installed."
else
  echo "[1/5] Docker already installed: $(docker --version)"
fi

# 2. Create kong database in PostgreSQL (idempotent)
echo "[2/5] Creating 'kong' database..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw kong; then
  echo "      Database 'kong' already exists."
else
  sudo -u postgres createdb kong
  echo "      Database 'kong' created."
fi

# 3. Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "[3/5] Loading .env file..."
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
else
  echo "[3/5] No .env file found. Using defaults."
  echo "      Create .env from .env.example and set KONG_PG_PASSWORD."
  exit 1
fi

# 4. Start Kong via Docker Compose
echo "[4/5] Starting Kong Gateway..."
cd "$SCRIPT_DIR"
docker compose up -d

# 5. Wait for Kong to be healthy
echo "[5/5] Waiting for Kong to be ready..."
for i in $(seq 1 30); do
  if curl -s "$KONG_ADMIN/status" > /dev/null 2>&1; then
    echo "      Kong is running!"
    curl -s "$KONG_ADMIN/status" | python3 -m json.tool 2>/dev/null || curl -s "$KONG_ADMIN/status"
    echo ""
    echo "=== Kong Gateway is ready ==="
    echo "  Proxy:    http://localhost:8000"
    echo "  Admin:    http://localhost:8001"
    echo "  Manager:  http://localhost:8002"
    echo ""
    echo "Next: Run ./seed-routes.sh to configure API routes."
    exit 0
  fi
  echo "      Waiting... ($i/30)"
  sleep 2
done

echo "ERROR: Kong did not become healthy after 60 seconds."
echo "Check logs: docker logs leaderx-kong"
exit 1
