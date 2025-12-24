import { create } from "zustand";
import type { Project, Task } from "@/types";
import { DEFAULT_STATUSES } from "@/types";

interface ProjectState {
  project: Project | null;
  filePath: string | null;
  isModified: boolean;

  // Project Actions
  createNewProject: (name: string) => void;
  setProject: (project: Project) => void;
  setFilePath: (path: string | null) => void;
  markAsModified: () => void;
  markAsSaved: () => void;
  reset: () => void;

  // Task Actions
  addTask: (name: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
}

const initialState = {
  project: null as Project | null,
  filePath: null as string | null,
  isModified: false,
};

export const useProjectStore = create<ProjectState>()((set, get) => ({
  ...initialState,

  createNewProject: (name: string) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      tasks: [],
      resources: [],
      statuses: [...DEFAULT_STATUSES],
    };
    set({ project, filePath: null, isModified: false });
  },

  setProject: (project: Project) => {
    set({ project, isModified: false });
  },

  setFilePath: (path: string | null) => {
    set({ filePath: path });
  },

  markAsModified: () => {
    set({ isModified: true });
  },

  markAsSaved: () => {
    set({ isModified: false });
  },

  reset: () => {
    set(initialState);
  },

  addTask: (name: string) => {
    const { project } = get();
    if (!project) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      name,
      progress: 0,
      status: "not_started",
      order: project.tasks.length,
    };

    set({
      project: {
        ...project,
        tasks: [...project.tasks, newTask],
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  updateTask: (taskId: string, updates: Partial<Task>) => {
    const { project } = get();
    if (!project) return;

    const taskIndex = project.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTasks = [...project.tasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...updates };

    set({
      project: {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  deleteTask: (taskId: string) => {
    const { project } = get();
    if (!project) return;

    const taskIndex = project.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    set({
      project: {
        ...project,
        tasks: project.tasks.filter((t) => t.id !== taskId),
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },
}));
