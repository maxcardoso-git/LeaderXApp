-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "billing_period" TEXT,
ADD COLUMN     "renewal_period_months" INTEGER;

-- CreateTable
CREATE TABLE "program_price_tables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "name" TEXT,
    "monthly_value" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "points_per_month" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_price_tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_price_tables_tenant_id_idx" ON "program_price_tables"("tenant_id");

-- CreateIndex
CREATE INDEX "program_price_tables_program_id_idx" ON "program_price_tables"("program_id");

-- CreateIndex
CREATE INDEX "program_price_tables_tenant_id_program_id_is_active_idx" ON "program_price_tables"("tenant_id", "program_id", "is_active");

-- CreateIndex
CREATE INDEX "program_price_tables_tenant_id_starts_at_ends_at_idx" ON "program_price_tables"("tenant_id", "starts_at", "ends_at");

-- AddForeignKey
ALTER TABLE "program_price_tables" ADD CONSTRAINT "program_price_tables_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
