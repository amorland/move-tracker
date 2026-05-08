import { addDays, parseISO } from 'date-fns';
import {
  MoveEvent,
  MoveLocation,
  MoveSettings,
  PlanningTask,
  Task,
  TaskStatus,
  TimelineEntry,
  TrackKey,
} from '@/lib/types';
import { getMilestones } from '@/lib/dateUtils';

export type TimelineAssetFilter =
  | 'key_dates'
  | 'events'
  | 'tasks'
  | 'drive'
  | 'home_purchase'
  | 'loan'
  | 'home_updates';

export type TimelineAssetKind =
  | 'key_date'
  | 'move_event'
  | 'move_task'
  | 'drive_stop'
  | 'track_entry'
  | 'planning_task';

export type TimelineAsset = {
  id: string;
  title: string;
  date: Date;
  kind: TimelineAssetKind;
  status: string;
  filters: TimelineAssetFilter[];
  label: string;
  time?: string | null;
  notes?: string | null;
  trackKey?: TrackKey;
  trackName?: string;
  rawEvent?: MoveEvent;
  rawTimelineEntry?: TimelineEntry;
  rawTask?: Task;
  rawPlanningTask?: PlanningTask;
};

const TRACK_FILTERS = new Set<TimelineAssetFilter>(['home_purchase', 'loan', 'home_updates']);

export function isTimelineTrackFilter(value: string | null): value is TimelineAssetFilter {
  return !!value && TRACK_FILTERS.has(value as TimelineAssetFilter);
}

export function buildTimelineAssets({
  settings,
  tasks,
  events,
  locations,
  timelineEntries,
  planningTasks,
}: {
  settings: MoveSettings;
  tasks: Task[];
  events: MoveEvent[];
  locations: MoveLocation[];
  timelineEntries: TimelineEntry[];
  planningTasks: PlanningTask[];
}): TimelineAsset[] {
  return [
    ...buildMilestoneAssets(settings),
    ...buildMoveTaskAssets(tasks),
    ...buildMoveEventAssets(events),
    ...buildDriveStopAssets(settings, locations),
    ...buildTimelineEntryAssets(timelineEntries),
    ...buildPlanningTaskAssets(planningTasks),
  ].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title);
  });
}

function buildMilestoneAssets(settings: MoveSettings): TimelineAsset[] {
  return getMilestones(settings)
    .filter(milestone => milestone.date)
    .map(milestone => ({
      id: `key-date-${String(milestone.key)}`,
      title: milestone.label,
      date: parseISO(milestone.date!),
      kind: 'key_date' as const,
      status: milestone.status,
      filters: ['key_dates'],
      label: 'Key Date',
    }));
}

function buildMoveTaskAssets(tasks: Task[]): TimelineAsset[] {
  return tasks
    .filter(task => task.dueDate)
    .map(task => ({
      id: `move-task-${task.id}`,
      title: task.title,
      date: parseISO(task.dueDate!),
      kind: 'move_task' as const,
      status: getTaskTimelineStatus(task.status),
      filters: ['tasks'],
      label: 'Move Task',
      notes: task.notes,
      rawTask: task,
    }));
}

function buildMoveEventAssets(events: MoveEvent[]): TimelineAsset[] {
  return events.map(event => ({
    id: `move-event-${event.id}`,
    title: event.title,
    date: parseISO(event.date),
    kind: 'move_event' as const,
    status: event.is_confirmed ? 'confirmed' : 'estimated',
    filters: ['events'],
    label: 'Event',
    time: event.time,
    notes: event.notes,
    rawEvent: event,
  }));
}

function buildDriveStopAssets(settings: MoveSettings, locations: MoveLocation[]): TimelineAsset[] {
  if (!settings.driveStartDate) return [];

  const base = parseISO(settings.driveStartDate);
  const driveStatus = settings.isDriveStartConfirmed ? 'confirmed' : 'estimated';
  const visibleStops = locations
    .filter(location =>
      location.category === 'Origin'
      || location.category === 'Destination'
      || (location.category === 'Stop' && !!location.notes?.startsWith('[overnight]'))
    )
    .sort((a, b) => {
      if (a.category === 'Origin') return -1;
      if (b.category === 'Origin') return 1;
      if (a.category === 'Destination') return 1;
      if (b.category === 'Destination') return -1;
      return (a.id ?? 0) - (b.id ?? 0);
    });

  return visibleStops.map((location, index) => {
    const isOrigin = location.category === 'Origin';
    const isDestination = location.category === 'Destination';
    return {
      id: `drive-stop-${location.id}`,
      title: isOrigin
        ? `Depart ${location.name}`
        : isDestination
          ? `Arrive ${location.name}`
          : `Overnight: ${location.name}`,
      date: addDays(base, index),
      kind: 'drive_stop' as const,
      status: driveStatus,
      filters: ['drive'],
      label: 'Drive',
      notes: location.notes?.replace(/^\[overnight\]\s*/, '') || null,
    };
  });
}

function buildTimelineEntryAssets(entries: TimelineEntry[]): TimelineAsset[] {
  return entries
    .filter(entry => entry.date)
    .map(entry => {
      const filters: TimelineAssetFilter[] = ['events'];
      const trackKey = entry.trackKey;
      if (trackKey && isTimelineTrackFilter(trackKey)) filters.push(trackKey);
      return {
        id: `timeline-entry-${entry.id}`,
        title: entry.title,
        date: parseISO(entry.date),
        kind: 'track_entry' as const,
        status: entry.status,
        filters,
        label: entry.trackName || 'Timeline Entry',
        time: entry.time,
        notes: entry.notes,
        trackKey: entry.trackKey,
        trackName: entry.trackName,
        rawTimelineEntry: entry,
      };
    });
}

function buildPlanningTaskAssets(tasks: PlanningTask[]): TimelineAsset[] {
  return tasks
    .filter(task => task.dueDate)
    .map(task => {
      const filters: TimelineAssetFilter[] = ['tasks'];
      const trackKey = task.trackKey;
      if (trackKey && isTimelineTrackFilter(trackKey)) filters.push(trackKey);
      return {
        id: `planning-task-${task.id}`,
        title: task.title,
        date: parseISO(task.dueDate!),
        kind: 'planning_task' as const,
        status: getTaskTimelineStatus(task.status),
        filters,
        label: task.trackName ? `${task.trackName} Task` : 'Planning Task',
        notes: task.notes,
        trackKey: task.trackKey,
        trackName: task.trackName,
        rawPlanningTask: task,
      };
    });
}

function getTaskTimelineStatus(status: TaskStatus) {
  if (status === 'Blocked') return 'blocked';
  if (status === 'Complete') return 'complete';
  return status;
}
