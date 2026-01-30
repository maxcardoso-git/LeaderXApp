-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_venues" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue_type" TEXT NOT NULL,
    "address" JSONB,
    "parking" JSONB,
    "areas" JSONB,
    "tech_infrastructure" JSONB,
    "service_infrastructure" JSONB,
    "technical_team" JSONB,
    "available_months" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_venue_event_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "event_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_venue_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_types_tenant_id_idx" ON "event_types"("tenant_id");

-- CreateIndex
CREATE INDEX "event_types_tenant_id_is_active_idx" ON "event_types"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_tenant_id_name_key" ON "event_types"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "event_venues_tenant_id_idx" ON "event_venues"("tenant_id");

-- CreateIndex
CREATE INDEX "event_venues_tenant_id_venue_type_idx" ON "event_venues"("tenant_id", "venue_type");

-- CreateIndex
CREATE INDEX "event_venues_tenant_id_is_active_idx" ON "event_venues"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "event_venues_tenant_id_name_key" ON "event_venues"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "event_venue_event_types_tenant_id_idx" ON "event_venue_event_types"("tenant_id");

-- CreateIndex
CREATE INDEX "event_venue_event_types_venue_id_idx" ON "event_venue_event_types"("venue_id");

-- CreateIndex
CREATE INDEX "event_venue_event_types_event_type_id_idx" ON "event_venue_event_types"("event_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_venue_event_types_venue_id_event_type_id_key" ON "event_venue_event_types"("venue_id", "event_type_id");

-- AddForeignKey
ALTER TABLE "event_venue_event_types" ADD CONSTRAINT "event_venue_event_types_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "event_venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_venue_event_types" ADD CONSTRAINT "event_venue_event_types_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
