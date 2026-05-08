-- Allow tasks to be marked blocked.
-- Run after supabase-home-planning.sql on existing databases.

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('Not Started', 'In Progress', 'Blocked', 'Complete'));

ALTER TABLE planning_tasks DROP CONSTRAINT IF EXISTS planning_tasks_status_check;
ALTER TABLE planning_tasks ADD CONSTRAINT planning_tasks_status_check
  CHECK (status IN ('Not Started', 'In Progress', 'Blocked', 'Complete'));
