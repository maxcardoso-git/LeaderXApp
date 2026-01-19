-- CreateTable
CREATE TABLE "working_units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "structure_id" TEXT,
    "parent_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    "max_members" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_unit_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "working_unit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "position_id" TEXT,
    "role" TEXT NOT NULL,
    "is_leader" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_unit_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "working_units_tenant_id_idx" ON "working_units"("tenant_id");

-- CreateIndex
CREATE INDEX "working_units_tenant_id_structure_id_idx" ON "working_units"("tenant_id", "structure_id");

-- CreateIndex
CREATE INDEX "working_units_tenant_id_parent_id_idx" ON "working_units"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "working_units_tenant_id_type_idx" ON "working_units"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "working_units_tenant_id_status_idx" ON "working_units"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "working_units_tenant_id_code_key" ON "working_units"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "working_unit_memberships_tenant_id_idx" ON "working_unit_memberships"("tenant_id");

-- CreateIndex
CREATE INDEX "working_unit_memberships_tenant_id_working_unit_id_idx" ON "working_unit_memberships"("tenant_id", "working_unit_id");

-- CreateIndex
CREATE INDEX "working_unit_memberships_tenant_id_user_id_idx" ON "working_unit_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "working_unit_memberships_tenant_id_position_id_idx" ON "working_unit_memberships"("tenant_id", "position_id");

-- CreateIndex
CREATE INDEX "working_unit_memberships_tenant_id_status_idx" ON "working_unit_memberships"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "working_unit_memberships_tenant_id_working_unit_id_user_id_key" ON "working_unit_memberships"("tenant_id", "working_unit_id", "user_id");

-- AddForeignKey
ALTER TABLE "working_units" ADD CONSTRAINT "working_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "working_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_unit_memberships" ADD CONSTRAINT "working_unit_memberships_working_unit_id_fkey" FOREIGN KEY ("working_unit_id") REFERENCES "working_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
