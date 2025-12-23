import { create } from "zustand";

export type ViewType = "list" | "gantt" | "kanban";

interface ViewState {
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

export const useViewStore = create<ViewState>()((set) => ({
  currentView: "list",
  setView: (view) => set({ currentView: view }),
}));
