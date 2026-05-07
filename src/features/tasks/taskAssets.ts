import { Category, PlanningTask, Task, TrackKey } from '@/lib/types';

export type TaskAssetSource = 'move' | 'planning';
export type TaskAssetScope = 'move' | 'home_purchase' | 'loan' | 'home_setup' | 'home_updates';

export type TaskAsset = {
  uid: string;
  source: TaskAssetSource;
  id: number;
  title: string;
  status: Task['status'];
  owner: Task['owner'];
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  groupLabel: string;
  scope: TaskAssetScope;
  sortIndex: number;
  categoryId?: number;
  trackId?: number;
  trackKey?: TrackKey;
  trackName?: string;
  section?: PlanningTask['section'];
  rawMoveTask?: Task;
  rawPlanningTask?: PlanningTask;
};

const SECTION_LABELS: Record<PlanningTask['section'], string> = {
  purchase: 'Purchase',
  loan: 'Loan',
  home_setup: 'Home Setup',
  updates: 'Updates',
};

export function buildTaskAssets({
  categories,
  tasks,
  planningTasks,
}: {
  categories: Category[];
  tasks: Task[];
  planningTasks: PlanningTask[];
}): TaskAsset[] {
  const categoryById = new Map(categories.map(category => [Number(category.id), category]));

  const moveTasks = tasks.map(task => {
    const category = categoryById.get(Number(task.categoryId));
    return {
      uid: `move-${task.id}`,
      source: 'move' as const,
      id: task.id,
      title: task.title,
      status: task.status,
      owner: task.owner,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      notes: task.notes,
      groupLabel: category?.name ?? 'Move Tasks',
      scope: 'move' as const,
      sortIndex: task.orderIndex,
      categoryId: task.categoryId,
      rawMoveTask: task,
    };
  });

  const houseTasks = planningTasks.map(task => {
    const scope = getPlanningTaskScope(task);
    return {
      uid: `planning-${task.id}`,
      source: 'planning' as const,
      id: task.id,
      title: task.title,
      status: task.status,
      owner: task.owner,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      notes: task.notes,
      groupLabel: getPlanningTaskGroupLabel(task),
      scope,
      sortIndex: task.sortIndex,
      trackId: task.trackId,
      trackKey: task.trackKey,
      trackName: task.trackName,
      section: task.section,
      rawPlanningTask: task,
    };
  });

  return [...moveTasks, ...houseTasks];
}

export function getPlanningTaskScope(task: Pick<PlanningTask, 'trackKey' | 'section'>): TaskAssetScope {
  if (task.section === 'home_setup') return 'home_setup';
  if (task.trackKey === 'loan') return 'loan';
  if (task.trackKey === 'home_updates') return 'home_updates';
  return 'home_purchase';
}

function getPlanningTaskGroupLabel(task: PlanningTask) {
  const sectionLabel = SECTION_LABELS[task.section] ?? task.section;
  if (task.section === 'home_setup') return 'Home Setup';
  if (task.trackName) return `${task.trackName} - ${sectionLabel}`;
  return sectionLabel;
}
