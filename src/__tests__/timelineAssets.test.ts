import { describe, expect, it } from 'vitest';
import { buildTimelineAssets } from '@/features/timelines/timelineAssets';
import type { MoveSettings, PlanningTask, Task } from '@/lib/types';

const settings: MoveSettings = {
  id: 1,
  closingDate: null,
  isClosingDateConfirmed: false,
  upackDropoffDate: null,
  isUpackDropoffConfirmed: false,
  upackPickupDate: null,
  isUpackPickupConfirmed: false,
  driveStartDate: null,
  isDriveStartConfirmed: false,
  arrivalDate: null,
  isArrivalConfirmed: false,
  upackDeliveryDate: null,
  isUpackDeliveryConfirmed: false,
  upackFinalPickupDate: null,
  isUpackFinalPickupConfirmed: false,
};

describe('buildTimelineAssets', () => {
  it('projects blocked task due dates as blocked timeline assets', () => {
    const moveTasks: Task[] = [{
      id: 1,
      categoryId: 1,
      title: 'Resolve mover quote',
      description: null,
      status: 'Blocked',
      owner: 'Andrew',
      dueDate: '2026-05-12',
      completedAt: null,
      notes: null,
      orderIndex: 0,
    }];
    const planningTasks: PlanningTask[] = [{
      id: 2,
      trackId: 4,
      trackKey: 'loan',
      trackName: 'Loan',
      section: 'loan',
      title: 'Get employer letter',
      description: null,
      status: 'Blocked',
      owner: 'Andrew',
      dueDate: '2026-05-13',
      completedAt: null,
      notes: null,
      sortIndex: 0,
      createdAt: '2026-05-08T00:00:00Z',
    }];

    const assets = buildTimelineAssets({
      settings,
      tasks: moveTasks,
      events: [],
      locations: [],
      timelineEntries: [],
      planningTasks,
    });

    expect(assets.find(item => item.id === 'move-task-1')).toMatchObject({
      status: 'blocked',
      filters: ['tasks'],
    });
    expect(assets.find(item => item.id === 'planning-task-2')).toMatchObject({
      status: 'blocked',
      filters: ['tasks', 'loan'],
      label: 'Loan Task',
    });
  });
});
