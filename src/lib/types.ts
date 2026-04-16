export type TaskStatus = 'Not Started' | 'In Progress' | 'Complete';
export type TaskOwner = 'Andrew' | 'Tory' | 'Both';
export type TaskPhase = 'Move Out' | 'Move In' | 'Both';
export type TimingType = 'Fixed' | 'Before Move' | 'After Move' | 'Before Closing' | 'After Closing' | 'Flexible';

export interface MoveSettings {
  id: number;
  earliestMoveDate: string;
  latestMoveDate: string;
  confirmedMoveDate: string | null;
  closingDate: string | null;
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
  owner: TaskOwner;
  phase: TaskPhase;
  dueDate: string | null;
  timingType: TimingType;
  timingOffsetDays: number;
  notes: string | null;
  orderIndex: number;
}

export type PackingAction = 'Bring' | 'Trash' | 'Sell' | 'Donate';
export type PackingStatus = 'Not Packed' | 'Packed' | 'Unpacked';
export type PackingPriority = 'Low' | 'Medium' | 'High';

export interface PackingItem {
  id: number;
  room: string;
  itemName: string;
  action: PackingAction;
  status: PackingStatus;
  notes: string | null;
  priority: PackingPriority;
  createdAt: string;
}

export interface Document {
  id: number;
  taskId: number | null;
  categoryId: number | null;
  name: string;
  url: string;
  isLink: boolean;
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
