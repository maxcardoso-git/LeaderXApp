-- DropIndex
DROP INDEX "tenant_settings_tenant_id_key";

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "segment_id" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hierarchy_group" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,
    "approval_limit" DECIMAL(15,2),
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hierarchy_groups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hierarchy_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade_name" TEXT,
    "document" TEXT,
    "document_type" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "country" TEXT DEFAULT 'BR',
    "category_id" TEXT,
    "segment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rating" INTEGER,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_parent_id_idx" ON "categories"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_status_idx" ON "categories"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_code_key" ON "categories"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "segments_tenant_id_idx" ON "segments"("tenant_id");

-- CreateIndex
CREATE INDEX "segments_tenant_id_status_idx" ON "segments"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "segments_tenant_id_code_key" ON "segments"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "lines_tenant_id_idx" ON "lines"("tenant_id");

-- CreateIndex
CREATE INDEX "lines_tenant_id_segment_id_idx" ON "lines"("tenant_id", "segment_id");

-- CreateIndex
CREATE INDEX "lines_tenant_id_status_idx" ON "lines"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "lines_tenant_id_code_key" ON "lines"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "positions_tenant_id_idx" ON "positions"("tenant_id");

-- CreateIndex
CREATE INDEX "positions_tenant_id_hierarchy_group_idx" ON "positions"("tenant_id", "hierarchy_group");

-- CreateIndex
CREATE INDEX "positions_tenant_id_status_idx" ON "positions"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "positions_tenant_id_code_key" ON "positions"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "hierarchy_groups_tenant_id_idx" ON "hierarchy_groups"("tenant_id");

-- CreateIndex
CREATE INDEX "hierarchy_groups_tenant_id_status_idx" ON "hierarchy_groups"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hierarchy_groups_tenant_id_code_key" ON "hierarchy_groups"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "cycles_tenant_id_idx" ON "cycles"("tenant_id");

-- CreateIndex
CREATE INDEX "cycles_tenant_id_status_idx" ON "cycles"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cycles_tenant_id_is_current_idx" ON "cycles"("tenant_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "cycles_tenant_id_code_key" ON "cycles"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_status_idx" ON "suppliers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_category_id_idx" ON "suppliers"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_segment_id_idx" ON "suppliers"("tenant_id", "segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenant_id_code_key" ON "suppliers"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
