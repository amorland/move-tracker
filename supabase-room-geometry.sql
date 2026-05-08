-- Room geometry fields for blueprint-aligned layout planning.
-- Run after supabase-home-planning.sql or supabase-measured-layout.sql.

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS label_x_ft NUMERIC;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS label_y_ft NUMERIC;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS shape_points JSONB;
