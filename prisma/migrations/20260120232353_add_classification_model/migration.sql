-- CreateTable
CREATE TABLE "classifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "badge_color" TEXT NOT NULL DEFAULT '#c4a45a',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "classifications_tenant_id_idx" ON "classifications"("tenant_id");

-- CreateIndex
CREATE INDEX "classifications_tenant_id_category_id_idx" ON "classifications"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "classifications_tenant_id_status_idx" ON "classifications"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "classifications_tenant_id_category_id_name_key" ON "classifications"("tenant_id", "category_id", "name");
