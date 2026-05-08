-- Blueprint overlay defaults for the measured home layout planner.
-- Run after supabase-measured-layout.sql on existing databases.

ALTER TABLE home_floor_plans ADD COLUMN IF NOT EXISTS overlay_offset_x_ft NUMERIC;
ALTER TABLE home_floor_plans ADD COLUMN IF NOT EXISTS overlay_offset_y_ft NUMERIC;
ALTER TABLE home_floor_plans ADD COLUMN IF NOT EXISTS overlay_width_ft NUMERIC;
ALTER TABLE home_floor_plans ADD COLUMN IF NOT EXISTS overlay_depth_ft NUMERIC;

INSERT INTO home_floor_plans (
  name,
  label,
  level,
  width_ft,
  depth_ft,
  blueprint_page,
  blueprint_image_path,
  overlay_offset_x_ft,
  overlay_offset_y_ft,
  overlay_width_ft,
  overlay_depth_ft,
  notes,
  sort_index
)
VALUES
  ('Basement', 'Basement', 0, 50, 50, NULL, NULL, 0, 0, 50, 50, 'Needs manual measurement; no basement floor-plan sheet was found in the provided blueprint set.', 0),
  ('Main Floor', 'First Floor', 1, 50, 50, 1, '/api/home-blueprint-assets/first-floor', 0, 0, 50, 50, 'Initial calibration from blueprint sheet A1, scale 1/8 inch = 1 foot.', 10),
  ('Second Floor', 'Second Floor', 2, 50, 50, 1, '/api/home-blueprint-assets/second-floor', 0, 0, 50, 50, 'Initial calibration from blueprint sheet A1, scale 1/8 inch = 1 foot.', 20),
  ('Third Floor', 'Third Floor', 3, 50, 50, 2, '/api/home-blueprint-assets/third-floor', 0, 0, 50, 50, 'Initial calibration from blueprint sheet A2, scale 1/8 inch = 1 foot.', 30),
  ('Exterior', 'Exterior', -1, 80, 80, 6, '/api/home-blueprint-assets/site-plan', 0, 0, 80, 80, 'Exterior planning area for garage, porch, and yard items.', 40)
ON CONFLICT (name) DO UPDATE SET
  label = EXCLUDED.label,
  level = EXCLUDED.level,
  width_ft = EXCLUDED.width_ft,
  depth_ft = EXCLUDED.depth_ft,
  blueprint_page = EXCLUDED.blueprint_page,
  blueprint_image_path = EXCLUDED.blueprint_image_path,
  overlay_offset_x_ft = COALESCE(home_floor_plans.overlay_offset_x_ft, EXCLUDED.overlay_offset_x_ft),
  overlay_offset_y_ft = COALESCE(home_floor_plans.overlay_offset_y_ft, EXCLUDED.overlay_offset_y_ft),
  overlay_width_ft = COALESCE(home_floor_plans.overlay_width_ft, EXCLUDED.overlay_width_ft),
  overlay_depth_ft = COALESCE(home_floor_plans.overlay_depth_ft, EXCLUDED.overlay_depth_ft),
  notes = COALESCE(home_floor_plans.notes, EXCLUDED.notes),
  sort_index = EXCLUDED.sort_index;
