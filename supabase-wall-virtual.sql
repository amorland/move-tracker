-- Add is_virtual flag to walls.
-- Virtual walls are invisible-in-3D barriers used to divide rooms in the
-- flood-fill without representing a physical wall. Useful for separating
-- a hallway from a staircase, a kitchen from a dining nook, etc., where
-- the spaces are architecturally open but should be treated as distinct
-- rooms for item placement and naming.
--
-- Defaults to FALSE so existing walls are unaffected.
--
-- Run after supabase-walls.sql.

ALTER TABLE walls
  ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT FALSE;
