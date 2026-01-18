-- CreateTable
CREATE TABLE "point_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_ledger_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "entry_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason_code" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_holds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "point_accounts_tenant_id_idx" ON "point_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "point_accounts_owner_id_idx" ON "point_accounts"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_accounts_tenant_id_owner_type_owner_id_key" ON "point_accounts"("tenant_id", "owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "point_ledger_entries_tenant_id_account_id_created_at_idx" ON "point_ledger_entries"("tenant_id", "account_id", "created_at");

-- CreateIndex
CREATE INDEX "point_ledger_entries_tenant_id_reference_type_reference_id_idx" ON "point_ledger_entries"("tenant_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "point_ledger_entries_idempotency_key_idx" ON "point_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "point_holds_tenant_id_idx" ON "point_holds"("tenant_id");

-- CreateIndex
CREATE INDEX "point_holds_account_id_idx" ON "point_holds"("account_id");

-- CreateIndex
CREATE INDEX "point_holds_status_idx" ON "point_holds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "point_holds_tenant_id_account_id_reference_type_reference_i_key" ON "point_holds"("tenant_id", "account_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "idempotency_records_tenant_id_idx" ON "idempotency_records"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_tenant_id_scope_key_key" ON "idempotency_records"("tenant_id", "scope", "key");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_tenant_id_aggregate_type_aggregate_id_idx" ON "outbox_events"("tenant_id", "aggregate_type", "aggregate_id");

-- AddForeignKey
ALTER TABLE "point_ledger_entries" ADD CONSTRAINT "point_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "point_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_holds" ADD CONSTRAINT "point_holds_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "point_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
