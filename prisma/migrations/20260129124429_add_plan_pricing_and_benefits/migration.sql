-- CreateTable
CREATE TABLE "plan_pricing" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "monthly_value" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "validity" TEXT,
    "points_per_month" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriber_benefits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriber_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_benefits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "benefit_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_pricing_program_id_key" ON "plan_pricing"("program_id");

-- CreateIndex
CREATE INDEX "plan_pricing_tenant_id_idx" ON "plan_pricing"("tenant_id");

-- CreateIndex
CREATE INDEX "plan_pricing_program_id_idx" ON "plan_pricing"("program_id");

-- CreateIndex
CREATE INDEX "subscriber_benefits_tenant_id_idx" ON "subscriber_benefits"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriber_benefits_tenant_id_type_idx" ON "subscriber_benefits"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "subscriber_benefits_tenant_id_is_active_idx" ON "subscriber_benefits"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_benefits_tenant_id_code_key" ON "subscriber_benefits"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "plan_benefits_tenant_id_idx" ON "plan_benefits"("tenant_id");

-- CreateIndex
CREATE INDEX "plan_benefits_program_id_idx" ON "plan_benefits"("program_id");

-- CreateIndex
CREATE INDEX "plan_benefits_benefit_id_idx" ON "plan_benefits"("benefit_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_benefits_program_id_benefit_id_key" ON "plan_benefits"("program_id", "benefit_id");

-- AddForeignKey
ALTER TABLE "plan_pricing" ADD CONSTRAINT "plan_pricing_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_benefits" ADD CONSTRAINT "plan_benefits_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_benefits" ADD CONSTRAINT "plan_benefits_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "subscriber_benefits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
