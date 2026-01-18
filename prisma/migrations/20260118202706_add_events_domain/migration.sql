-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "reservation_mode" TEXT NOT NULL DEFAULT 'FREE',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_phases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_seats" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_policy_bindings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "policy_code" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'EVENT',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_policy_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_tenant_id_idx" ON "events"("tenant_id");

-- CreateIndex
CREATE INDEX "events_tenant_id_status_idx" ON "events"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "events_tenant_id_visibility_status_idx" ON "events"("tenant_id", "visibility", "status");

-- CreateIndex
CREATE INDEX "events_tenant_id_starts_at_ends_at_idx" ON "events"("tenant_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "event_phases_tenant_id_event_id_idx" ON "event_phases"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_tables_tenant_id_event_id_idx" ON "event_tables"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_seats_tenant_id_event_id_idx" ON "event_seats"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_seats_tenant_id_table_id_idx" ON "event_seats"("tenant_id", "table_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_seats_table_id_seat_number_key" ON "event_seats"("table_id", "seat_number");

-- CreateIndex
CREATE INDEX "event_policy_bindings_tenant_id_event_id_idx" ON "event_policy_bindings"("tenant_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_policy_bindings_tenant_id_event_id_policy_code_key" ON "event_policy_bindings"("tenant_id", "event_id", "policy_code");

-- AddForeignKey
ALTER TABLE "event_phases" ADD CONSTRAINT "event_phases_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tables" ADD CONSTRAINT "event_tables_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_seats" ADD CONSTRAINT "event_seats_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "event_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_policy_bindings" ADD CONSTRAINT "event_policy_bindings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
