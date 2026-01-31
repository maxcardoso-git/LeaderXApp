-- CreateTable
CREATE TABLE "plm_pipelines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT,
    "project_name" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lifecycle_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "published_version" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_pipeline_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "version_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_pipeline_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_stages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pipeline_version_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "is_initial" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "wip_limit" INTEGER,
    "sla_hours" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_stage_transitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pipeline_version_id" TEXT NOT NULL,
    "from_stage_id" TEXT NOT NULL,
    "to_stage_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plm_stage_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_stage_transition_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transition_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "form_definition_id" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_stage_transition_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_stage_form_attach_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "form_definition_id" TEXT,
    "external_form_id" TEXT,
    "external_form_name" TEXT,
    "default_form_status" TEXT NOT NULL DEFAULT 'TO_FILL',
    "unique_key_field_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_stage_form_attach_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_cards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "pipeline_version" INTEGER NOT NULL,
    "current_stage_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "unique_key_value" TEXT,
    "owner_id" TEXT,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "plm_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_card_forms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "form_definition_id" TEXT,
    "external_form_id" TEXT,
    "form_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TO_FILL',
    "data" JSONB NOT NULL DEFAULT '{}',
    "attached_at_stage_id" TEXT NOT NULL,
    "attached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filled_at" TIMESTAMP(3),
    "filled_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_card_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_card_move_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "from_stage_id" TEXT NOT NULL,
    "to_stage_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'MANUAL',
    "moved_by" TEXT,
    "comment" TEXT,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plm_card_move_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_card_comments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_card_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_stage_triggers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "integration_name" TEXT,
    "integration_key" TEXT,
    "event_type" TEXT NOT NULL,
    "from_stage_id" TEXT,
    "form_definition_id" TEXT,
    "field_id" TEXT,
    "execution_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "http_method" TEXT,
    "endpoint" TEXT,
    "default_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_stage_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_stage_trigger_conditions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "trigger_id" TEXT NOT NULL,
    "field_path" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plm_stage_trigger_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_trigger_executions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "trigger_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "event_type" TEXT NOT NULL,
    "integration_name" TEXT,
    "integration_key" TEXT,
    "stage_name" TEXT,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plm_trigger_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_user_groups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_group_members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT,
    "user_email" TEXT,
    "added_by" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plm_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plm_pipeline_permissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plm_pipeline_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plm_pipelines_tenant_id_idx" ON "plm_pipelines"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_pipelines_tenant_id_lifecycle_status_idx" ON "plm_pipelines"("tenant_id", "lifecycle_status");

-- CreateIndex
CREATE INDEX "plm_pipelines_tenant_id_project_id_idx" ON "plm_pipelines"("tenant_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "plm_pipelines_tenant_id_key_key" ON "plm_pipelines"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "plm_pipeline_versions_tenant_id_idx" ON "plm_pipeline_versions"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_pipeline_versions_tenant_id_pipeline_id_idx" ON "plm_pipeline_versions"("tenant_id", "pipeline_id");

-- CreateIndex
CREATE INDEX "plm_pipeline_versions_tenant_id_version_status_idx" ON "plm_pipeline_versions"("tenant_id", "version_status");

-- CreateIndex
CREATE UNIQUE INDEX "plm_pipeline_versions_pipeline_id_version_number_key" ON "plm_pipeline_versions"("pipeline_id", "version_number");

-- CreateIndex
CREATE INDEX "plm_stages_tenant_id_idx" ON "plm_stages"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_stages_tenant_id_pipeline_version_id_idx" ON "plm_stages"("tenant_id", "pipeline_version_id");

-- CreateIndex
CREATE INDEX "plm_stages_classification_idx" ON "plm_stages"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "plm_stages_pipeline_version_id_stage_order_key" ON "plm_stages"("pipeline_version_id", "stage_order");

-- CreateIndex
CREATE INDEX "plm_stage_transitions_tenant_id_idx" ON "plm_stage_transitions"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_stage_transitions_from_stage_id_idx" ON "plm_stage_transitions"("from_stage_id");

-- CreateIndex
CREATE INDEX "plm_stage_transitions_to_stage_id_idx" ON "plm_stage_transitions"("to_stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "plm_stage_transitions_pipeline_version_id_from_stage_id_to__key" ON "plm_stage_transitions"("pipeline_version_id", "from_stage_id", "to_stage_id");

-- CreateIndex
CREATE INDEX "plm_stage_transition_rules_tenant_id_idx" ON "plm_stage_transition_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_stage_transition_rules_transition_id_idx" ON "plm_stage_transition_rules"("transition_id");

-- CreateIndex
CREATE INDEX "plm_stage_form_attach_rules_tenant_id_idx" ON "plm_stage_form_attach_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_stage_form_attach_rules_stage_id_idx" ON "plm_stage_form_attach_rules"("stage_id");

-- CreateIndex
CREATE INDEX "plm_stage_form_attach_rules_form_definition_id_idx" ON "plm_stage_form_attach_rules"("form_definition_id");

-- CreateIndex
CREATE INDEX "plm_cards_tenant_id_idx" ON "plm_cards"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_cards_tenant_id_pipeline_id_idx" ON "plm_cards"("tenant_id", "pipeline_id");

-- CreateIndex
CREATE INDEX "plm_cards_tenant_id_pipeline_id_current_stage_id_idx" ON "plm_cards"("tenant_id", "pipeline_id", "current_stage_id");

-- CreateIndex
CREATE INDEX "plm_cards_tenant_id_status_idx" ON "plm_cards"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "plm_cards_tenant_id_priority_idx" ON "plm_cards"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "plm_cards_tenant_id_owner_id_idx" ON "plm_cards"("tenant_id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "plm_cards_tenant_id_pipeline_id_unique_key_value_key" ON "plm_cards"("tenant_id", "pipeline_id", "unique_key_value");

-- CreateIndex
CREATE INDEX "plm_card_forms_tenant_id_idx" ON "plm_card_forms"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_card_forms_card_id_idx" ON "plm_card_forms"("card_id");

-- CreateIndex
CREATE INDEX "plm_card_forms_form_definition_id_idx" ON "plm_card_forms"("form_definition_id");

-- CreateIndex
CREATE INDEX "plm_card_forms_status_idx" ON "plm_card_forms"("status");

-- CreateIndex
CREATE INDEX "plm_card_move_history_tenant_id_idx" ON "plm_card_move_history"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_card_move_history_card_id_idx" ON "plm_card_move_history"("card_id");

-- CreateIndex
CREATE INDEX "plm_card_move_history_moved_at_idx" ON "plm_card_move_history"("moved_at");

-- CreateIndex
CREATE INDEX "plm_card_comments_tenant_id_idx" ON "plm_card_comments"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_card_comments_card_id_idx" ON "plm_card_comments"("card_id");

-- CreateIndex
CREATE INDEX "plm_card_comments_created_at_idx" ON "plm_card_comments"("created_at");

-- CreateIndex
CREATE INDEX "plm_stage_triggers_tenant_id_idx" ON "plm_stage_triggers"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_stage_triggers_stage_id_idx" ON "plm_stage_triggers"("stage_id");

-- CreateIndex
CREATE INDEX "plm_stage_triggers_event_type_idx" ON "plm_stage_triggers"("event_type");

-- CreateIndex
CREATE INDEX "plm_stage_triggers_enabled_idx" ON "plm_stage_triggers"("enabled");

-- CreateIndex
CREATE INDEX "plm_stage_trigger_conditions_tenant_id_idx" ON "plm_stage_trigger_conditions"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_stage_trigger_conditions_trigger_id_idx" ON "plm_stage_trigger_conditions"("trigger_id");

-- CreateIndex
CREATE INDEX "plm_trigger_executions_tenant_id_idx" ON "plm_trigger_executions"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_trigger_executions_trigger_id_idx" ON "plm_trigger_executions"("trigger_id");

-- CreateIndex
CREATE INDEX "plm_trigger_executions_card_id_idx" ON "plm_trigger_executions"("card_id");

-- CreateIndex
CREATE INDEX "plm_trigger_executions_status_idx" ON "plm_trigger_executions"("status");

-- CreateIndex
CREATE INDEX "plm_trigger_executions_executed_at_idx" ON "plm_trigger_executions"("executed_at");

-- CreateIndex
CREATE INDEX "plm_user_groups_tenant_id_idx" ON "plm_user_groups"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "plm_user_groups_tenant_id_name_key" ON "plm_user_groups"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "plm_group_members_tenant_id_idx" ON "plm_group_members"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_group_members_group_id_idx" ON "plm_group_members"("group_id");

-- CreateIndex
CREATE INDEX "plm_group_members_user_id_idx" ON "plm_group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plm_group_members_group_id_user_id_key" ON "plm_group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "plm_pipeline_permissions_tenant_id_idx" ON "plm_pipeline_permissions"("tenant_id");

-- CreateIndex
CREATE INDEX "plm_pipeline_permissions_pipeline_id_idx" ON "plm_pipeline_permissions"("pipeline_id");

-- CreateIndex
CREATE INDEX "plm_pipeline_permissions_group_id_idx" ON "plm_pipeline_permissions"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "plm_pipeline_permissions_pipeline_id_group_id_key" ON "plm_pipeline_permissions"("pipeline_id", "group_id");

-- AddForeignKey
ALTER TABLE "plm_pipeline_versions" ADD CONSTRAINT "plm_pipeline_versions_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "plm_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stages" ADD CONSTRAINT "plm_stages_pipeline_version_id_fkey" FOREIGN KEY ("pipeline_version_id") REFERENCES "plm_pipeline_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stage_transitions" ADD CONSTRAINT "plm_stage_transitions_pipeline_version_id_fkey" FOREIGN KEY ("pipeline_version_id") REFERENCES "plm_pipeline_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stage_transitions" ADD CONSTRAINT "plm_stage_transitions_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "plm_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stage_transitions" ADD CONSTRAINT "plm_stage_transitions_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "plm_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stage_transition_rules" ADD CONSTRAINT "plm_stage_transition_rules_transition_id_fkey" FOREIGN KEY ("transition_id") REFERENCES "plm_stage_transitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stage_form_attach_rules" ADD CONSTRAINT "plm_stage_form_attach_rules_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "plm_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_cards" ADD CONSTRAINT "plm_cards_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "plm_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_cards" ADD CONSTRAINT "plm_cards_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "plm_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_card_forms" ADD CONSTRAINT "plm_card_forms_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "plm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_card_move_history" ADD CONSTRAINT "plm_card_move_history_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "plm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_card_move_history" ADD CONSTRAINT "plm_card_move_history_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "plm_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_card_move_history" ADD CONSTRAINT "plm_card_move_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "plm_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_card_comments" ADD CONSTRAINT "plm_card_comments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "plm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stage_triggers" ADD CONSTRAINT "plm_stage_triggers_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "plm_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_stage_trigger_conditions" ADD CONSTRAINT "plm_stage_trigger_conditions_trigger_id_fkey" FOREIGN KEY ("trigger_id") REFERENCES "plm_stage_triggers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_trigger_executions" ADD CONSTRAINT "plm_trigger_executions_trigger_id_fkey" FOREIGN KEY ("trigger_id") REFERENCES "plm_stage_triggers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_trigger_executions" ADD CONSTRAINT "plm_trigger_executions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "plm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_group_members" ADD CONSTRAINT "plm_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "plm_user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_pipeline_permissions" ADD CONSTRAINT "plm_pipeline_permissions_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "plm_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plm_pipeline_permissions" ADD CONSTRAINT "plm_pipeline_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "plm_user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
