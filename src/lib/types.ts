export type TaskStatus = 'Not Started' | 'In Progress' | 'Complete';
export type TaskOwner = 'Andrew' | 'Tory' | 'Both';
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
  dueDate: string | null;
  timingType: TimingType;
  timingOffsetDays: number;
  notes: string | null;
  orderIndex: number;
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
