// Task status types
export type TaskStatus = "not_started" | "in_progress" | "review" | "completed";

// Dependency types
// FS: Finish-to-Start (先行タスク終了後に後続タスク開始) - 最も一般的
// SS: Start-to-Start (先行タスク開始と同時に後続タスク開始)
// FF: Finish-to-Finish (先行タスク終了と同時に後続タスク終了)
// SF: Start-to-Finish (先行タスク開始後に後続タスク終了) - 稀なケース
export type DependencyType = "FS" | "SS" | "FF" | "SF";

// Task dependency interface
export interface TaskDependency {
  id: string;
  predecessorId: string; // 先行タスクID
  successorId: string; // 後続タスクID
  type: DependencyType;
  lag: number; // ラグ（日数）: 正=遅延, 負=リード（オーバーラップ）
}

// Dependency type configuration
export interface DependencyTypeConfig {
  id: DependencyType;
  name: string;
  description: string;
}

// Default dependency types
export const DEPENDENCY_TYPES: DependencyTypeConfig[] = [
  { id: "FS", name: "終了-開始", description: "先行タスク終了後に開始" },
  { id: "SS", name: "開始-開始", description: "先行タスク開始と同時に開始" },
  { id: "FF", name: "終了-終了", description: "先行タスク終了と同時に終了" },
  { id: "SF", name: "開始-終了", description: "先行タスク開始後に終了" },
];

// Task interface
export interface Task {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string
  duration?: number; // Duration in days
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
  dependencies?: TaskDependency[];
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
