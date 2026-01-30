-- CreateTable
CREATE TABLE "data_entry_forms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "layout" JSONB,
    "fields" JSONB NOT NULL,
    "validation_rules" JSONB,
    "metadata" JSONB,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_entry_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "changelog" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "form_version" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "validation_errors" JSONB,
    "processed_at" TIMESTAMP(3),
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_entry_forms_form_id_key" ON "data_entry_forms"("form_id");

-- CreateIndex
CREATE INDEX "data_entry_forms_tenant_id_idx" ON "data_entry_forms"("tenant_id");

-- CreateIndex
CREATE INDEX "data_entry_forms_tenant_id_status_idx" ON "data_entry_forms"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "data_entry_forms_tenant_id_entity_type_idx" ON "data_entry_forms"("tenant_id", "entity_type");

-- CreateIndex
CREATE INDEX "data_entry_forms_tenant_id_entity_type_entity_id_idx" ON "data_entry_forms"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_entry_forms_tenant_id_form_id_key" ON "data_entry_forms"("tenant_id", "form_id");

-- CreateIndex
CREATE INDEX "form_versions_tenant_id_idx" ON "form_versions"("tenant_id");

-- CreateIndex
CREATE INDEX "form_versions_tenant_id_form_id_idx" ON "form_versions"("tenant_id", "form_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_form_id_version_key" ON "form_versions"("form_id", "version");

-- CreateIndex
CREATE INDEX "form_submissions_tenant_id_idx" ON "form_submissions"("tenant_id");

-- CreateIndex
CREATE INDEX "form_submissions_tenant_id_form_id_idx" ON "form_submissions"("tenant_id", "form_id");

-- CreateIndex
CREATE INDEX "form_submissions_tenant_id_form_id_status_idx" ON "form_submissions"("tenant_id", "form_id", "status");

-- CreateIndex
CREATE INDEX "form_submissions_tenant_id_entity_type_entity_id_idx" ON "form_submissions"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "form_submissions_submitted_at_idx" ON "form_submissions"("submitted_at");

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "data_entry_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "data_entry_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
