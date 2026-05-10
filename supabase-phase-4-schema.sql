-- Phase 4: walls-authoritative floor structure
-- Additive schema changes. Safe to run on any current state.
--
-- Run after supabase-walls.sql.

ALTER TABLE home_floor_plans
  ADD COLUMN IF NOT EXISTS structure_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE home_floor_plans
  ADD COLUMN IF NOT EXISTS elements_locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS anchor_x_ft NUMERIC;
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS anchor_y_ft NUMERIC;
