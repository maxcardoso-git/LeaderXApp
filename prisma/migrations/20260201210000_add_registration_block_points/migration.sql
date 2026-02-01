-- CreateTable: Registration Block Points
CREATE TABLE "registration_block_points" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "block_key" TEXT NOT NULL,
    "block_name" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_block_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Registration Bonus Settings
CREATE TABLE "registration_bonus_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bonus_points" INTEGER NOT NULL DEFAULT 500,
    "target_total" INTEGER NOT NULL DEFAULT 500,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_bonus_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registration_block_points_tenant_id_block_key_key" ON "registration_block_points"("tenant_id", "block_key");

-- CreateIndex
CREATE INDEX "registration_block_points_tenant_id_idx" ON "registration_block_points"("tenant_id");

-- CreateIndex
CREATE INDEX "registration_block_points_tenant_id_active_idx" ON "registration_block_points"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "registration_bonus_settings_tenant_id_key" ON "registration_bonus_settings"("tenant_id");
