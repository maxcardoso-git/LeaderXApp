-- CreateTable
CREATE TABLE "compliance_checks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "rules" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_check_results" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "check_id" TEXT NOT NULL,
    "check_code" TEXT NOT NULL,
    "report_id" TEXT,
    "status" TEXT NOT NULL,
    "evidence" JSONB,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_checks_code_key" ON "compliance_checks"("code");

-- CreateIndex
CREATE INDEX "compliance_checks_tenant_id_idx" ON "compliance_checks"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_checks_enabled_idx" ON "compliance_checks"("enabled");

-- CreateIndex
CREATE INDEX "compliance_checks_severity_idx" ON "compliance_checks"("severity");

-- CreateIndex
CREATE INDEX "compliance_check_results_tenant_id_idx" ON "compliance_check_results"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_check_results_tenant_id_check_code_idx" ON "compliance_check_results"("tenant_id", "check_code");

-- CreateIndex
CREATE INDEX "compliance_check_results_tenant_id_report_id_idx" ON "compliance_check_results"("tenant_id", "report_id");

-- CreateIndex
CREATE INDEX "compliance_check_results_tenant_id_status_idx" ON "compliance_check_results"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "compliance_check_results_executed_at_idx" ON "compliance_check_results"("executed_at");

-- CreateIndex
CREATE INDEX "compliance_reports_tenant_id_idx" ON "compliance_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_reports_generated_at_idx" ON "compliance_reports"("generated_at");

-- AddForeignKey
ALTER TABLE "compliance_check_results" ADD CONSTRAINT "compliance_check_results_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "compliance_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_check_results" ADD CONSTRAINT "compliance_check_results_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "compliance_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
