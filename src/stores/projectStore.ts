import { create } from "zustand";
import type { Project } from "@/types";
import { DEFAULT_STATUSES } from "@/types";

interface ProjectState {
  project: Project | null;
  filePath: string | null;
  isModified: boolean;

  // Actions
  createNewProject: (name: string) => void;
  setProject: (project: Project) => void;
  setFilePath: (path: string | null) => void;
  markAsModified: () => void;
  markAsSaved: () => void;
  reset: () => void;
}

const initialState = {
  project: null,
  filePath: null,
  isModified: false,
};

export const useProjectStore = create<ProjectState>()((set) => ({
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
}));
