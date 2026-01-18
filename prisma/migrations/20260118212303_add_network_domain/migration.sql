-- CreateTable
CREATE TABLE "network_nodes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "user_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hierarchy_level" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_relations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "parent_node_id" TEXT NOT NULL,
    "child_node_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL DEFAULT 'DIRECT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "network_nodes_tenant_id_idx" ON "network_nodes"("tenant_id");

-- CreateIndex
CREATE INDEX "network_nodes_tenant_id_owner_id_owner_type_idx" ON "network_nodes"("tenant_id", "owner_id", "owner_type");

-- CreateIndex
CREATE INDEX "network_nodes_tenant_id_user_id_idx" ON "network_nodes"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "network_nodes_tenant_id_status_idx" ON "network_nodes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "network_nodes_tenant_id_role_idx" ON "network_nodes"("tenant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "network_nodes_tenant_id_owner_id_owner_type_user_id_key" ON "network_nodes"("tenant_id", "owner_id", "owner_type", "user_id");

-- CreateIndex
CREATE INDEX "network_relations_tenant_id_idx" ON "network_relations"("tenant_id");

-- CreateIndex
CREATE INDEX "network_relations_tenant_id_parent_node_id_idx" ON "network_relations"("tenant_id", "parent_node_id");

-- CreateIndex
CREATE INDEX "network_relations_tenant_id_child_node_id_idx" ON "network_relations"("tenant_id", "child_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "network_relations_parent_node_id_child_node_id_key" ON "network_relations"("parent_node_id", "child_node_id");

-- AddForeignKey
ALTER TABLE "network_relations" ADD CONSTRAINT "network_relations_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "network_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_relations" ADD CONSTRAINT "network_relations_child_node_id_fkey" FOREIGN KEY ("child_node_id") REFERENCES "network_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
