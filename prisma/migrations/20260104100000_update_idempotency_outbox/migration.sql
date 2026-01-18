-- ============================================
-- Update IdempotencyRecord and OutboxEvent schemas
-- ============================================

-- Drop existing unique constraint and recreate table with new schema
DROP TABLE IF EXISTS "idempotency_records";

CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "idem_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "http_status" INTEGER,
    "response_payload" JSONB,
    "error_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_records_tenant_id_scope_idem_key_key"
ON "idempotency_records"("tenant_id", "scope", "idem_key");

CREATE INDEX "idempotency_records_tenant_id_idx"
ON "idempotency_records"("tenant_id");

CREATE INDEX "idempotency_records_expires_at_idx"
ON "idempotency_records"("expires_at");

-- Drop and recreate OutboxEvent table with new schema
DROP TABLE IF EXISTS "outbox_events";

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "correlation_id" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_events_status_scheduled_at_idx"
ON "outbox_events"("status", "scheduled_at");

CREATE INDEX "outbox_events_tenant_id_aggregate_type_aggregate_id_idx"
ON "outbox_events"("tenant_id", "aggregate_type", "aggregate_id");
