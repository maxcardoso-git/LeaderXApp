-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_type" TEXT,
    "device_name" TEXT,
    "browser" TEXT,
    "browser_version" TEXT,
    "os" TEXT,
    "os_version" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "user_agent" TEXT,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_sessions_tenant_id_idx" ON "user_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "user_sessions_tenant_id_user_id_idx" ON "user_sessions"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "user_sessions_tenant_id_status_idx" ON "user_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "user_sessions_tenant_id_user_id_status_idx" ON "user_sessions"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "user_sessions_last_activity_idx" ON "user_sessions"("last_activity");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
