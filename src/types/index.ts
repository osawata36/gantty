// Task status types
export type TaskStatus = "not_started" | "in_progress" | "review" | "completed";

// Task interface
export interface Task {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string
  progress: number; // 0-100
  status: TaskStatus;
  responsibleId?: string;
  ballHolderId?: string;
  estimatedHours?: number;
  actualHours?: number;
  order: number;
  children?: Task[];
}

// Resource (Member) interface
export interface Resource {
  id: string;
  name: string;
  color: string;
  availability: number; // 0-100 (percentage)
}

// Status configuration
export interface StatusConfig {
  id: string;
  name: string;
  color: string;
  order: number;
}

// Project interface
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
  resources: Resource[];
  statuses: StatusConfig[];
}

// Default statuses
export const DEFAULT_STATUSES: StatusConfig[] = [
  { id: "not_started", name: "未対応", color: "#6B7280", order: 0 },
  { id: "in_progress", name: "処理中", color: "#3B82F6", order: 1 },
  { id: "review", name: "レビュー待ち", color: "#F59E0B", order: 2 },
  { id: "completed", name: "完了", color: "#10B981", order: 3 },
];

// File format for .gantty files
export interface GanttyFile {
  version: string;
  project: Project;
}
