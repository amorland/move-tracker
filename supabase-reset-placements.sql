-- Reset item placements + room polygons + architectural elements
-- Run when ready to switch a floor over from the legacy polygon-based
-- room outlines to the new wall-traced layout. Belongings, room
-- metadata (name, ceiling height, notes), and floor calibration are
-- all preserved.
--
-- This is destructive for placements/elements only. Re-place items and
-- re-add doors/windows in the new wall-aware layout tool afterward.

UPDATE room_items
SET plan_x_ft = NULL,
    plan_y_ft = NULL,
    rotation_deg = NULL,
    room_id = NULL;

UPDATE rooms
SET shape_points = NULL,
    geometry_source = 'unknown';

DELETE FROM architectural_elements;
