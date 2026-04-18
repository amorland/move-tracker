export type TaskStatus = 'Not Started' | 'In Progress' | 'Complete';
export type TaskOwner = 'Andrew' | 'Tory' | 'Both';
export type TaskPhase = 'Move Out' | 'Move In' | 'Both';

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
  owner: TaskOwner;
  phase: TaskPhase;
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
