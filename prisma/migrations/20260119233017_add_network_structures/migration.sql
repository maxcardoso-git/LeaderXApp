-- CreateTable
CREATE TABLE "structure_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "max_levels" INTEGER NOT NULL DEFAULT 5,
    "allow_nested" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structure_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structures" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    "metadata" JSONB,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structure_leaders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT true,
    "max_amount" DECIMAL(15,2),
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structure_leaders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_chain_steps" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "role_required" TEXT NOT NULL,
    "min_approvers" INTEGER NOT NULL DEFAULT 1,
    "max_amount" DECIMAL(15,2),
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_chain_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "structure_types_tenant_id_idx" ON "structure_types"("tenant_id");

-- CreateIndex
CREATE INDEX "structure_types_tenant_id_status_idx" ON "structure_types"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "structure_types_tenant_id_code_key" ON "structure_types"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "structures_tenant_id_idx" ON "structures"("tenant_id");

-- CreateIndex
CREATE INDEX "structures_tenant_id_type_id_idx" ON "structures"("tenant_id", "type_id");

-- CreateIndex
CREATE INDEX "structures_tenant_id_parent_id_idx" ON "structures"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "structures_tenant_id_status_idx" ON "structures"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "structures_path_idx" ON "structures"("path");

-- CreateIndex
CREATE UNIQUE INDEX "structures_tenant_id_code_key" ON "structures"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "structure_leaders_tenant_id_idx" ON "structure_leaders"("tenant_id");

-- CreateIndex
CREATE INDEX "structure_leaders_tenant_id_structure_id_idx" ON "structure_leaders"("tenant_id", "structure_id");

-- CreateIndex
CREATE INDEX "structure_leaders_tenant_id_user_id_idx" ON "structure_leaders"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "structure_leaders_tenant_id_status_idx" ON "structure_leaders"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "structure_leaders_tenant_id_structure_id_user_id_role_key" ON "structure_leaders"("tenant_id", "structure_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "approval_chain_steps_tenant_id_idx" ON "approval_chain_steps"("tenant_id");

-- CreateIndex
CREATE INDEX "approval_chain_steps_tenant_id_structure_id_idx" ON "approval_chain_steps"("tenant_id", "structure_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_chain_steps_tenant_id_structure_id_step_order_key" ON "approval_chain_steps"("tenant_id", "structure_id", "step_order");

-- AddForeignKey
ALTER TABLE "structures" ADD CONSTRAINT "structures_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "structure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "structures" ADD CONSTRAINT "structures_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "structure_leaders" ADD CONSTRAINT "structure_leaders_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_chain_steps" ADD CONSTRAINT "approval_chain_steps_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
