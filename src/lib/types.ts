export type TaskStatus = 'Not Started' | 'In Progress' | 'Complete';
export type TaskOwner = 'Andrew' | 'Tory';
export type TrackKey = 'move' | 'drive' | 'home_purchase' | 'loan' | 'home_updates';
export type TimelineEntryStatus = 'estimated' | 'confirmed' | 'complete' | 'blocked';
export type TimelineEntryType = 'milestone' | 'event' | 'deadline' | 'submission' | 'closing_step' | 'project';
export type DocumentProvider = 'google_drive' | 'manual_link';
export type DocumentCategory = 'contract' | 'disclosure' | 'loan' | 'inspection' | 'receipt' | 'floorplan' | 'project' | 'other';
export type LinkedEntityType = 'move_task' | 'planning_task' | 'event' | 'timeline_entry';
export type PlanningTaskSection = 'purchase' | 'loan' | 'home_setup' | 'updates';
export type DriveLoadoutType = 'adult' | 'child' | 'pet' | 'gear' | 'vehicle_addon';

export interface MoveSettings {
  id: number;
  closingDate: string | null;
  isClosingDateConfirmed: boolean;
  upackDropoffDate: string | null;
  isUpackDropoffConfirmed: boolean;
  upackPickupDate: string | null;
  isUpackPickupConfirmed: boolean;
  driveStartDate: string | null;
  isDriveStartConfirmed: boolean;
  arrivalDate: string | null;
  isArrivalConfirmed: boolean;
  upackDeliveryDate: string | null;
  isUpackDeliveryConfirmed: boolean;
  upackFinalPickupDate: string | null;
  isUpackFinalPickupConfirmed: boolean;
}

export interface Category {
  id: number;
  name: string;
  orderIndex: number;
}

export interface Task {
  id: number;
  categoryId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  owner: TaskOwner | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  orderIndex: number;
}

export type BelongingAction = 'Bring' | 'Sell' | 'Donate' | 'Trash';
export type BelongingStatus = 'unresolved' | 'resolved';

export interface Belonging {
  id: number;
  room: string;
  itemName: string;
  action: BelongingAction;
  status: BelongingStatus;
  notes: string | null;
  createdAt: string;
}

export interface MoveLocation {
  id: number;
  name: string;
  address: string;
  notes: string | null;
  category: 'Origin' | 'Destination' | 'Stop' | 'Utility' | 'Errand' | 'Service';
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export interface MoveEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  is_confirmed: boolean;
  notes: string | null;
  created_at: string;
}

export interface Track {
  id: number;
  key: TrackKey;
  name: string;
  color: string | null;
  icon: string | null;
  orderIndex: number;
}

export interface TimelineEntry {
  id: number;
  trackId: number;
  trackKey?: TrackKey;
  trackName?: string;
  title: string;
  entryType: TimelineEntryType;
  status: TimelineEntryStatus;
  date: string;
  time: string | null;
  notes: string | null;
  sortIndex: number;
  createdAt: string;
}

export interface DocumentRecord {
  id: number;
  title: string;
  provider: DocumentProvider;
  url: string;
  mimeType: string | null;
  category: DocumentCategory;
  notes: string | null;
  createdAt: string;
}

export interface DocumentLink {
  id: number;
  documentId: number;
  entityType: LinkedEntityType;
  entityId: number;
  label: string | null;
  createdAt: string;
  document?: DocumentRecord;
}

export interface PlanningTask {
  id: number;
  trackId: number;
  trackKey?: TrackKey;
  trackName?: string;
  section: PlanningTaskSection;
  title: string;
  description: string | null;
  status: TaskStatus;
  owner: TaskOwner | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  sortIndex: number;
  createdAt: string;
}

export interface Room {
  id: number;
  name: string;
  floor: string | null;
  notes: string | null;
  sortIndex: number;
}

export interface RoomItem {
  id: number;
  roomId: number | null;
  belongingId: number | null;
  itemName: string;
  itemSource: 'existing_belonging' | 'planned_purchase';
  status: 'planned' | 'placed' | 'undecided';
  dimensions: string | null;
  notes: string | null;
  layoutX: number | null;
  layoutY: number | null;
  layoutW: number | null;
  layoutH: number | null;
  sortIndex: number;
}

export interface HomeProject {
  id: number;
  title: string;
  area: string | null;
  status: 'idea' | 'planning' | 'quoted' | 'scheduled' | 'complete';
  priority: 'low' | 'medium' | 'high';
  targetDate: string | null;
  budgetNotes: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DriveVehicle {
  id: number;
  name: string;
  vehicleType: string;
  seats: number;
  cargoSummary: string | null;
  driverName: string | null;
  orderIndex: number;
}

export interface DriveLoadoutItem {
  id: number;
  label: string;
  itemType: DriveLoadoutType;
  assignedVehicleId: number | null;
  placement: string | null;
  required: boolean;
  notes: string | null;
  orderIndex: number;
}
