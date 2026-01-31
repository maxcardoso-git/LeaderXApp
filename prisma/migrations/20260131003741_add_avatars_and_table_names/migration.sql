-- CreateTable
CREATE TABLE "table_names" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_capacity" INTEGER,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_avatars" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "table_names_tenant_id_idx" ON "table_names"("tenant_id");

-- CreateIndex
CREATE INDEX "table_names_tenant_id_display_order_idx" ON "table_names"("tenant_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "table_names_tenant_id_name_key" ON "table_names"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "participant_avatars_tenant_id_idx" ON "participant_avatars"("tenant_id");

-- CreateIndex
CREATE INDEX "participant_avatars_tenant_id_display_order_idx" ON "participant_avatars"("tenant_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "participant_avatars_tenant_id_code_key" ON "participant_avatars"("tenant_id", "code");
