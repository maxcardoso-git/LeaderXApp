-- AlterTable
ALTER TABLE "structure_types" ADD COLUMN     "hierarchy_level" INTEGER,
ADD COLUMN     "leadership_role_id" TEXT,
ADD COLUMN     "max_leaders" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "scope" TEXT;

-- CreateTable
CREATE TABLE "scopes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scopes_tenant_id_idx" ON "scopes"("tenant_id");

-- CreateIndex
CREATE INDEX "scopes_tenant_id_status_idx" ON "scopes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "scopes_tenant_id_level_idx" ON "scopes"("tenant_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "scopes_tenant_id_code_key" ON "scopes"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "structure_types" ADD CONSTRAINT "structure_types_leadership_role_id_fkey" FOREIGN KEY ("leadership_role_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
