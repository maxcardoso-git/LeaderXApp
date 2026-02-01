-- AlterTable: Add approval_outcome to plm_stages
-- This field is used by governance workflow to determine what action to take
-- when a card reaches this stage (APPROVE, REJECT, CANCEL)
ALTER TABLE "plm_stages" ADD COLUMN "approval_outcome" TEXT;
