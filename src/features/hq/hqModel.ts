import { startOfDay } from 'date-fns';
import { getMilestones, Milestone } from '@/lib/dateUtils';
import {
  Belonging,
  Category,
  DocumentRecord,
  DriveLoadoutItem,
  DriveVehicle,
  HomeProject,
  MoveEvent,
  MoveLocation,
  MoveSettings,
  PlanningTask,
  Room,
  RoomItem,
  Task,
  TimelineEntry,
} from '@/lib/types';
import { buildTaskAssets, TaskAsset, TaskAssetScope } from '@/features/tasks/taskAssets';
import { buildTimelineAssets, TimelineAsset } from '@/features/timelines/timelineAssets';

export type HqModelInput = {
  settings: MoveSettings;
  categories: Category[];
  tasks: Task[];
  planningTasks: PlanningTask[];
  events: MoveEvent[];
  timelineEntries: TimelineEntry[];
  locations: MoveLocation[];
  belongings: Belonging[];
  documents: DocumentRecord[];
  rooms: Room[];
  roomItems: RoomItem[];
  projects: HomeProject[];
  driveVehicles: DriveVehicle[];
  driveLoadoutItems: DriveLoadoutItem[];
  today?: Date;
};

export type HqTaskScopeSummary = {
  scope: TaskAssetScope;
  label: string;
  total: number;
  complete: number;
  open: number;
};

export type HqActionSummary = {
  action: Belonging['action'];
  total: number;
  resolved: number;
};

export type HqModel = {
  milestones: Milestone[];
  taskAssets: TaskAsset[];
  timelineAssets: TimelineAsset[];
  taskSummary: {
    total: number;
    complete: number;
    open: number;
    percent: number;
    scopes: HqTaskScopeSummary[];
    nextOpen: TaskAsset[];
  };
  timelineSummary: {
    total: number;
    upcoming: TimelineAsset[];
    recent: TimelineAsset[];
    blocked: TimelineAsset[];
  };
  loanSummary: {
    taskTotal: number;
    taskOpen: number;
    taskBlocked: number;
    timelineTotal: number;
    timelineBlocked: number;
    latestTimeline: TimelineAsset | null;
    nextTasks: TaskAsset[];
  };
  houseSummary: {
    rooms: number;
    roomItems: number;
    placedItems: number;
    unplacedItems: number;
    plannedPurchases: number;
    existingItems: number;
    documents: number;
    projects: number;
    openProjects: number;
    activeProjects: number;
    highPriorityProjects: number;
  };
  belongingsSummary: {
    total: number;
    resolved: number;
    percent: number;
    byAction: HqActionSummary[];
  };
  driveSummary: {
    vehicles: number;
    loadoutItems: number;
    assignedItems: number;
    unassignedItems: number;
    requiredUnassignedItems: number;
    routeStops: number;
    overnightStops: number;
  };
};

const SCOPE_LABELS: Record<TaskAssetScope, string> = {
  move: 'Move',
  home_purchase: 'Home Purchase',
  loan: 'Loan',
  home_setup: 'Home Setup',
  home_updates: 'Home Updates',
};

const SCOPE_ORDER: TaskAssetScope[] = ['move', 'home_purchase', 'loan', 'home_setup', 'home_updates'];
const ACTION_ORDER: Belonging['action'][] = ['Bring', 'Sell', 'Donate', 'Trash'];

export function buildHqModel(input: HqModelInput): HqModel {
  const today = startOfDay(input.today ?? new Date());
  const milestones = getMilestones(input.settings);
  const taskAssets = buildTaskAssets({
    categories: input.categories,
    tasks: input.tasks,
    planningTasks: input.planningTasks,
  });
  const timelineAssets = buildTimelineAssets({
    settings: input.settings,
    tasks: input.tasks,
    events: input.events,
    locations: input.locations,
    timelineEntries: input.timelineEntries,
    planningTasks: input.planningTasks,
  });

  const completeTasks = taskAssets.filter(task => task.status === 'Complete');
  const openTasks = taskAssets.filter(task => task.status !== 'Complete');
  const taskScopes = SCOPE_ORDER
    .map(scope => {
      const scopedTasks = taskAssets.filter(task => task.scope === scope);
      const complete = scopedTasks.filter(task => task.status === 'Complete').length;
      return {
        scope,
        label: SCOPE_LABELS[scope],
        total: scopedTasks.length,
        complete,
        open: scopedTasks.length - complete,
      };
    })
    .filter(scope => scope.total > 0);

  const sortedOpenTasks = [...openTasks].sort(compareTasks);
  const blockedTimeline = timelineAssets.filter(item => item.status === 'blocked');
  const upcomingTimeline = timelineAssets
    .filter(item => startOfDay(item.date).getTime() >= today.getTime())
    .sort(compareTimelineAsc)
    .slice(0, 6);
  const recentTimeline = [...timelineAssets]
    .sort(compareTimelineDesc)
    .slice(0, 6);

  const loanTasks = taskAssets.filter(task => task.scope === 'loan');
  const loanOpenTasks = loanTasks.filter(task => task.status !== 'Complete').sort(compareTasks);
  const loanTimeline = timelineAssets
    .filter(item => item.filters.includes('loan') && item.kind === 'track_entry')
    .sort(compareTimelineDesc);
  const loanBlockedTimeline = loanTimeline.filter(item => item.status === 'blocked');

  const placedItems = input.roomItems.filter(item => item.roomId !== null);
  const unplacedItems = input.roomItems.filter(item => item.roomId === null);
  const openProjects = input.projects.filter(project => project.status !== 'complete');
  const activeProjects = input.projects.filter(project => ['planning', 'quoted', 'scheduled'].includes(project.status));
  const highPriorityProjects = input.projects.filter(project => project.priority === 'high' && project.status !== 'complete');

  const resolvedBelongings = input.belongings.filter(item => item.status === 'resolved');
  const belongingsByAction = ACTION_ORDER
    .map(action => {
      const actionItems = input.belongings.filter(item => item.action === action);
      return {
        action,
        total: actionItems.length,
        resolved: actionItems.filter(item => item.status === 'resolved').length,
      };
    })
    .filter(action => action.total > 0);

  const assignedLoadoutItems = input.driveLoadoutItems.filter(item => item.assignedVehicleId !== null);
  const unassignedLoadoutItems = input.driveLoadoutItems.filter(item => item.assignedVehicleId === null);
  const routeStops = input.locations.filter(location =>
    location.category === 'Origin'
    || location.category === 'Destination'
    || location.category === 'Stop'
  );
  const overnightStops = input.locations.filter(location =>
    location.category === 'Stop' && !!location.notes?.startsWith('[overnight]')
  );

  return {
    milestones,
    taskAssets,
    timelineAssets,
    taskSummary: {
      total: taskAssets.length,
      complete: completeTasks.length,
      open: openTasks.length,
      percent: percent(completeTasks.length, taskAssets.length),
      scopes: taskScopes,
      nextOpen: sortedOpenTasks.slice(0, 5),
    },
    timelineSummary: {
      total: timelineAssets.length,
      upcoming: upcomingTimeline,
      recent: recentTimeline,
      blocked: blockedTimeline,
    },
    loanSummary: {
      taskTotal: loanTasks.length,
      taskOpen: loanOpenTasks.length,
      taskBlocked: loanOpenTasks.length + loanBlockedTimeline.length,
      timelineTotal: loanTimeline.length,
      timelineBlocked: loanBlockedTimeline.length,
      latestTimeline: loanTimeline[0] ?? null,
      nextTasks: loanOpenTasks.slice(0, 4),
    },
    houseSummary: {
      rooms: input.rooms.length,
      roomItems: input.roomItems.length,
      placedItems: placedItems.length,
      unplacedItems: unplacedItems.length,
      plannedPurchases: input.roomItems.filter(item => item.itemSource === 'planned_purchase').length,
      existingItems: input.roomItems.filter(item => item.itemSource === 'existing_belonging').length,
      documents: input.documents.length,
      projects: input.projects.length,
      openProjects: openProjects.length,
      activeProjects: activeProjects.length,
      highPriorityProjects: highPriorityProjects.length,
    },
    belongingsSummary: {
      total: input.belongings.length,
      resolved: resolvedBelongings.length,
      percent: percent(resolvedBelongings.length, input.belongings.length),
      byAction: belongingsByAction,
    },
    driveSummary: {
      vehicles: input.driveVehicles.length,
      loadoutItems: input.driveLoadoutItems.length,
      assignedItems: assignedLoadoutItems.length,
      unassignedItems: unassignedLoadoutItems.length,
      requiredUnassignedItems: unassignedLoadoutItems.filter(item => item.required).length,
      routeStops: routeStops.length,
      overnightStops: overnightStops.length,
    },
  };
}

function percent(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

function compareTasks(a: TaskAsset, b: TaskAsset) {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
  return a.title.localeCompare(b.title);
}

function compareTimelineAsc(a: TimelineAsset, b: TimelineAsset) {
  const byDate = a.date.getTime() - b.date.getTime();
  if (byDate !== 0) return byDate;
  return a.title.localeCompare(b.title);
}

function compareTimelineDesc(a: TimelineAsset, b: TimelineAsset) {
  const byDate = b.date.getTime() - a.date.getTime();
  if (byDate !== 0) return byDate;
  return a.title.localeCompare(b.title);
}
