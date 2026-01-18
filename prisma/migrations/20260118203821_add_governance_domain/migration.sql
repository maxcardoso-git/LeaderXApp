-- CreateTable
CREATE TABLE "governance_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "rules" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "policy_code" TEXT NOT NULL,
    "policy_id" TEXT,
    "decision" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "reason" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "governance_policies_code_key" ON "governance_policies"("code");

-- CreateIndex
CREATE INDEX "governance_policies_tenant_id_idx" ON "governance_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "governance_policies_status_idx" ON "governance_policies"("status");

-- CreateIndex
CREATE INDEX "governance_policies_scope_idx" ON "governance_policies"("scope");

-- CreateIndex
CREATE INDEX "governance_audit_logs_tenant_id_idx" ON "governance_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "governance_audit_logs_tenant_id_policy_code_idx" ON "governance_audit_logs"("tenant_id", "policy_code");

-- CreateIndex
CREATE INDEX "governance_audit_logs_tenant_id_decision_idx" ON "governance_audit_logs"("tenant_id", "decision");

-- CreateIndex
CREATE INDEX "governance_audit_logs_evaluated_at_idx" ON "governance_audit_logs"("evaluated_at");
