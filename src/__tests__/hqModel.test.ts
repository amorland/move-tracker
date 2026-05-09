import { describe, expect, it } from 'vitest';
import { buildHqModel } from '@/features/hq/hqModel';
import type {
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

const settings: MoveSettings = {
  id: 1,
  closingDate: '2026-07-01',
  isClosingDateConfirmed: true,
  upackDropoffDate: '2026-06-20',
  isUpackDropoffConfirmed: true,
  upackPickupDate: '2026-06-23',
  isUpackPickupConfirmed: true,
  driveStartDate: '2026-06-26',
  isDriveStartConfirmed: true,
  arrivalDate: '2026-06-29',
  isArrivalConfirmed: true,
  upackDeliveryDate: '2026-07-02',
  isUpackDeliveryConfirmed: true,
  upackFinalPickupDate: '2026-07-05',
  isUpackFinalPickupConfirmed: true,
};

const categories: Category[] = [{ id: 1, name: 'Move-Out Logistics', orderIndex: 0 }];

const moveTasks: Task[] = [
  {
    id: 1,
    categoryId: 1,
    title: 'Book movers',
    description: null,
    status: 'Complete',
    owner: 'Andrew',
    dueDate: '2026-05-20',
    completedAt: '2026-05-01',
    notes: null,
    orderIndex: 0,
  },
];

const planningTasks: PlanningTask[] = [
  {
    id: 2,
    trackId: 3,
    trackKey: 'loan',
    trackName: 'Loan',
    section: 'loan',
    title: 'Get employer letter',
    description: null,
    status: 'Blocked',
    owner: 'Andrew',
    dueDate: '2026-05-10',
    completedAt: null,
    notes: null,
    sortIndex: 0,
    createdAt: '2026-05-07T00:00:00Z',
  },
  {
    id: 3,
    trackId: 2,
    trackKey: 'home_purchase',
    trackName: 'Home Purchase',
    section: 'purchase',
    title: 'Review contract',
    description: null,
    status: 'Complete',
    owner: 'Tory',
    dueDate: '2026-05-08',
    completedAt: '2026-05-07',
    notes: null,
    sortIndex: 1,
    createdAt: '2026-05-07T00:00:00Z',
  },
];

const events: MoveEvent[] = [];

const timelineEntries: TimelineEntry[] = [
  {
    id: 4,
    trackId: 3,
    trackKey: 'loan',
    trackName: 'Loan',
    title: 'Appraisal report received',
    entryType: 'milestone',
    status: 'complete',
    date: '2026-05-07',
    time: null,
    notes: null,
    sortIndex: 0,
    createdAt: '2026-05-07T00:00:00Z',
  },
  {
    id: 5,
    trackId: 3,
    trackKey: 'loan',
    trackName: 'Loan',
    title: 'Employer remote-work confirmation pending',
    entryType: 'deadline',
    status: 'blocked',
    date: '2026-05-07',
    time: null,
    notes: null,
    sortIndex: 1,
    createdAt: '2026-05-07T00:00:00Z',
  },
];

const locations: MoveLocation[] = [
  {
    id: 1,
    name: 'Clearwater',
    address: 'Clearwater, FL',
    notes: null,
    category: 'Origin',
    lat: 27.9659,
    lng: -82.8001,
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Roanoke',
    address: 'Roanoke, VA',
    notes: '[overnight] hotel',
    category: 'Stop',
    lat: 37.271,
    lng: -79.9414,
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Cold Spring',
    address: 'Cold Spring, NY',
    notes: null,
    category: 'Destination',
    lat: 41.4201,
    lng: -73.9546,
    createdAt: '2026-05-01T00:00:00Z',
  },
];

const belongings: Belonging[] = [
  { id: 1, room: 'Kitchen', itemName: 'Table', action: 'Bring', status: 'resolved', notes: null, createdAt: '2026-05-01' },
  { id: 2, room: 'Garage', itemName: 'Old shelf', action: 'Donate', status: 'unresolved', notes: null, createdAt: '2026-05-01' },
];

const documents: DocumentRecord[] = [
  { id: 1, title: 'Loan estimate', provider: 'google_drive', url: 'https://example.com', mimeType: null, category: 'loan', notes: null, createdAt: '2026-05-01' },
];

const rooms: Room[] = [
  { id: 1, name: 'Kitchen', floor: '1', notes: null, floorPlanId: null, planXFt: null, planYFt: null, planWidthFt: null, planDepthFt: null, labelXFt: null, labelYFt: null, ceilingHeightFt: null, shapePoints: null, sortIndex: 0 },
];

const roomItems: RoomItem[] = [
  { id: 1, roomId: 1, floorPlanId: null, belongingId: 1, itemName: 'Table', furnitureType: 'dining_table', itemSource: 'existing_belonging', status: 'placed', dimensions: null, notes: null, layoutX: 1, layoutY: 1, layoutW: 2, layoutH: 2, widthIn: null, depthIn: null, heightIn: null, planXFt: null, planYFt: null, rotationDeg: null, sortIndex: 0 },
  { id: 2, roomId: null, floorPlanId: null, belongingId: null, itemName: 'Sofa', furnitureType: 'sofa', itemSource: 'planned_purchase', status: 'planned', dimensions: null, notes: null, layoutX: null, layoutY: null, layoutW: null, layoutH: null, widthIn: null, depthIn: null, heightIn: null, planXFt: null, planYFt: null, rotationDeg: null, sortIndex: 1 },
];

const projects: HomeProject[] = [
  { id: 1, title: 'Paint nursery', area: 'Nursery', status: 'planning', priority: 'high', targetDate: null, budgetNotes: null, notes: null, createdAt: '2026-05-01' },
];

const driveVehicles: DriveVehicle[] = [
  { id: 1, name: 'Mazda', vehicleType: 'car', seats: 5, cargoSummary: null, driverName: 'Andrew', orderIndex: 0 },
];

const driveLoadoutItems: DriveLoadoutItem[] = [
  { id: 1, label: 'Andrew', itemType: 'adult', assignedVehicleId: 1, placement: 'driver', required: true, notes: null, orderIndex: 0 },
  { id: 2, label: 'Plants', itemType: 'gear', assignedVehicleId: null, placement: null, required: true, notes: null, orderIndex: 1 },
];

function buildModel() {
  return buildHqModel({
    settings,
    categories,
    tasks: moveTasks,
    planningTasks,
    events,
    timelineEntries,
    locations,
    belongings,
    documents,
    rooms,
    roomItems,
    projects,
    driveVehicles,
    driveLoadoutItems,
    today: new Date('2026-05-07T12:00:00Z'),
  });
}

describe('buildHqModel', () => {
  it('syncs task totals from move and planning task sources', () => {
    const model = buildModel();
    expect(model.taskSummary.total).toBe(3);
    expect(model.taskSummary.complete).toBe(2);
    expect(model.taskSummary.open).toBe(1);
    expect(model.taskSummary.scopes.find(scope => scope.scope === 'loan')).toMatchObject({
      total: 1,
      complete: 0,
      open: 1,
    });
  });

  it('surfaces loan timeline entries and blocked loan work', () => {
    const model = buildModel();
    expect(model.loanSummary.timelineTotal).toBe(2);
    expect(model.loanSummary.timelineBlocked).toBe(2);
    expect(model.loanSummary.taskBlocked).toBe(1);
    expect(model.loanSummary.taskOpen).toBe(1);
    expect(model.timelineSummary.blocked).toHaveLength(2);
    expect(model.loanSummary.latestTimeline?.title).toBe('Appraisal report received');
  });

  it('summarizes house, stuff, cars, and route from their source tables', () => {
    const model = buildModel();
    expect(model.houseSummary).toMatchObject({
      rooms: 1,
      roomItems: 2,
      placedItems: 1,
      unplacedItems: 1,
      documents: 1,
      openProjects: 1,
      highPriorityProjects: 1,
    });
    expect(model.belongingsSummary).toMatchObject({ total: 2, resolved: 1, percent: 50 });
    expect(model.driveSummary).toMatchObject({
      vehicles: 1,
      loadoutItems: 2,
      assignedItems: 1,
      unassignedItems: 1,
      requiredUnassignedItems: 1,
      routeStops: 3,
      overnightStops: 1,
    });
  });
});
