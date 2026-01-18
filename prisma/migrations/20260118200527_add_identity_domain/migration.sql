-- CreateTable
CREATE TABLE "identity_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "external_id" TEXT,
    "email" TEXT,
    "full_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effect" TEXT NOT NULL DEFAULT 'ALLOW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "effect" TEXT NOT NULL DEFAULT 'ALLOW',

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "access_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_users_tenant_id_idx" ON "identity_users"("tenant_id");

-- CreateIndex
CREATE INDEX "identity_users_tenant_id_external_id_idx" ON "identity_users"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "identity_users_tenant_id_status_idx" ON "identity_users"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "identity_users_tenant_id_email_key" ON "identity_users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "permissions_tenant_id_idx" ON "permissions"("tenant_id");

-- CreateIndex
CREATE INDEX "permissions_tenant_id_category_idx" ON "permissions"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_code_key" ON "permissions"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_code_key" ON "roles"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "access_assignments_tenant_id_user_id_status_idx" ON "access_assignments"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "access_assignments_tenant_id_role_id_status_idx" ON "access_assignments"("tenant_id", "role_id", "status");

-- CreateIndex
CREATE INDEX "access_assignments_tenant_id_scope_type_scope_id_idx" ON "access_assignments"("tenant_id", "scope_type", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_assignments_tenant_id_user_id_role_id_scope_type_sco_key" ON "access_assignments"("tenant_id", "user_id", "role_id", "scope_type", "scope_id", "status");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_assignments" ADD CONSTRAINT "access_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_assignments" ADD CONSTRAINT "access_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "reservation_policies_tenant_id_event_id_resource_type_is_active" RENAME TO "reservation_policies_tenant_id_event_id_resource_type_is_ac_idx";
