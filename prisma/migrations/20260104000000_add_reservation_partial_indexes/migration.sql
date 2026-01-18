-- ============================================
-- RESERVATIONS DOMAIN - Tables, Indexes, and Partial Indexes
-- ============================================

-- CreateTable: reservation_policies
CREATE TABLE "reservation_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "cost_in_points" INTEGER NOT NULL DEFAULT 0,
    "max_per_user" INTEGER NOT NULL DEFAULT 1,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "hold_ttl_seconds" INTEGER NOT NULL DEFAULT 900,
    "window_start" TIMESTAMP(3),
    "window_end" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reservable_resources
CREATE TABLE "reservable_resources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity_total" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservable_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable: reservations
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HOLD',
    "points_hold_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Standard Indexes (from Prisma schema)
-- ============================================

-- ReservationPolicy indexes
CREATE INDEX "reservation_policies_tenant_id_event_id_resource_type_is_active_idx"
ON "reservation_policies"("tenant_id", "event_id", "resource_type", "is_active");

CREATE INDEX "reservation_policies_event_id_idx"
ON "reservation_policies"("event_id");

-- ReservableResource indexes
CREATE INDEX "reservable_resources_tenant_id_event_id_resource_type_idx"
ON "reservable_resources"("tenant_id", "event_id", "resource_type");

CREATE INDEX "reservable_resources_tenant_id_event_id_is_active_idx"
ON "reservable_resources"("tenant_id", "event_id", "is_active");

-- Reservation indexes
CREATE INDEX "reservations_tenant_id_event_id_owner_id_status_idx"
ON "reservations"("tenant_id", "event_id", "owner_id", "status");

CREATE INDEX "reservations_tenant_id_resource_id_status_idx"
ON "reservations"("tenant_id", "resource_id", "status");

CREATE INDEX "reservations_tenant_id_event_id_resource_id_status_idx"
ON "reservations"("tenant_id", "event_id", "resource_id", "status");

CREATE INDEX "reservations_status_expires_at_idx"
ON "reservations"("status", "expires_at");

-- ============================================
-- Foreign Keys
-- ============================================

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_fkey"
FOREIGN KEY ("resource_id") REFERENCES "reservable_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_policy_id_fkey"
FOREIGN KEY ("policy_id") REFERENCES "reservation_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Partial Indexes (PostgreSQL-specific optimizations)
-- ============================================

-- 1. Unique partial index to prevent duplicate HOLD per owner+resource
-- Business rule: A user cannot have more than one active HOLD on the same resource
-- This prevents race conditions when creating reservations
CREATE UNIQUE INDEX "reservations_unique_hold_per_owner_resource"
ON "reservations" ("tenant_id", "owner_id", "resource_id")
WHERE "status" = 'HOLD';

-- 2. Partial index to accelerate expired holds query
-- Used by ExpireHoldsJob to find HOLD reservations past their expiry time
-- The WHERE clause filters only HOLD status, making the index smaller and faster
CREATE INDEX "reservations_expires_at_hold_idx"
ON "reservations" ("expires_at")
WHERE "status" = 'HOLD';

-- 3. Partial index for active reservations per resource (capacity check)
-- Used to quickly count active reservations (HOLD + CONFIRMED) for capacity validation
CREATE INDEX "reservations_active_per_resource_idx"
ON "reservations" ("tenant_id", "resource_id")
WHERE "status" IN ('HOLD', 'CONFIRMED');

-- 4. Partial index for active reservations per owner (maxPerUser check)
-- Used to count how many active reservations a user has for a specific resource type
CREATE INDEX "reservations_active_per_owner_idx"
ON "reservations" ("tenant_id", "event_id", "owner_id", "resource_type")
WHERE "status" IN ('HOLD', 'CONFIRMED');
