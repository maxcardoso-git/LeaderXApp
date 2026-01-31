-- AlterTable
ALTER TABLE "lines" ADD COLUMN     "interaction_formats" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "purpose_id" TEXT,
ADD COLUMN     "relationship_depth" INTEGER,
ADD COLUMN     "seniority_level" TEXT,
ADD COLUMN     "strategic_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_audiences" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "lines_tenant_id_purpose_id_idx" ON "lines"("tenant_id", "purpose_id");
