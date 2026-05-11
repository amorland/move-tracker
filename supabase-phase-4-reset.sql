-- Phase 4 reset: wipe layout state so the floor can be rebuilt with
-- walls as authoritative geometry. Belongings, room metadata
-- (name, notes, ceiling_height_ft, sort_index), and floor calibration
-- (blueprint_image_path, overlay_*_ft) are preserved.
--
-- Destructive. Run only after confirming Phase 4 schema is in place
-- (supabase-phase-4-schema.sql).
--
-- Idempotent: safe to re-run, and tolerates missing tables. If the
-- walls or architectural_elements tables don't exist yet (i.e., you
-- haven't run supabase-walls.sql), the corresponding DELETE is
-- skipped instead of erroring.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'walls'
  ) THEN
    DELETE FROM walls;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'architectural_elements'
  ) THEN
    DELETE FROM architectural_elements;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rooms'
  ) THEN
    UPDATE rooms
    SET shape_points = NULL,
        plan_x_ft = NULL,
        plan_y_ft = NULL,
        plan_width_ft = NULL,
        plan_depth_ft = NULL,
        label_x_ft = NULL,
        label_y_ft = NULL,
        geometry_source = 'unknown',
        anchor_x_ft = NULL,
        anchor_y_ft = NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'room_items'
  ) THEN
    UPDATE room_items
    SET plan_x_ft = NULL,
        plan_y_ft = NULL,
        rotation_deg = NULL,
        room_id = NULL;
  END IF;
END $$;
