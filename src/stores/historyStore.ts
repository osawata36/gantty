import { create } from "zustand";
import type { Project } from "@/types";

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  past: Project[];
  future: Project[];

  // Actions
  pushState: (project: Project) => void;
  undo: (currentProject: Project) => Project | null;
  redo: (currentProject: Project) => Project | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],

  pushState: (project: Project) => {
    const { past } = get();

    // Deep clone the project to avoid reference issues
    const clonedProject = JSON.parse(JSON.stringify(project)) as Project;

    // Add to past, limit size
    const newPast = [...past, clonedProject];
    if (newPast.length > MAX_HISTORY_SIZE) {
      newPast.shift();
    }

    // Clear future when new state is pushed (new branch)
    set({ past: newPast, future: [] });
  },

  undo: (currentProject: Project) => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const newPast = [...past];
    const previousState = newPast.pop()!;

    // Add current state to future for redo
    const clonedCurrent = JSON.parse(JSON.stringify(currentProject)) as Project;
    const newFuture = [clonedCurrent, ...future];

    set({ past: newPast, future: newFuture });

    return previousState;
  },

  redo: (currentProject: Project) => {
    const { past, future } = get();
    if (future.length === 0) return null;

    const newFuture = [...future];
    const nextState = newFuture.shift()!;

    // Add current state to past
    const clonedCurrent = JSON.parse(JSON.stringify(currentProject)) as Project;
    const newPast = [...past, clonedCurrent];

    set({ past: newPast, future: newFuture });

    return nextState;
  },

  canUndo: () => {
    const { past } = get();
    return past.length > 0;
  },

  canRedo: () => {
    const { future } = get();
    return future.length > 0;
  },

  clear: () => {
    set({ past: [], future: [] });
  },
}));

// E2Eテスト用: 開発環境でのみストアをウィンドウに公開
if (import.meta.env.DEV) {
  (window as unknown as { __historyStore: typeof useHistoryStore }).__historyStore = useHistoryStore;
}
