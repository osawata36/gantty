import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewType = "list" | "gantt" | "kanban" | "network";

export type ColumnId =
  | "name"
  | "startDate"
  | "endDate"
  | "progress"
  | "responsible"
  | "ballHolder";

export interface SortConfig {
  column: ColumnId;
  direction: "asc" | "desc";
}

export type DueDateFilter = "today" | "this_week" | "overdue" | null;

export interface FilterConfig {
  statusIds: string[];
  responsibleIds: string[];
  dueDate: DueDateFilter;
}

const DEFAULT_FILTERS: FilterConfig = {
  statusIds: [],
  responsibleIds: [],
  dueDate: null,
};

const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  "name",
  "startDate",
  "endDate",
  "progress",
  "responsible",
  "ballHolder",
];

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  "name",
  "startDate",
  "endDate",
  "progress",
  "responsible",
  "ballHolder",
];

interface ViewState {
  currentView: ViewType;
  visibleColumns: ColumnId[];
  columnOrder: ColumnId[];
  sortConfig: SortConfig | null;
  searchQuery: string;
  filters: FilterConfig;
  // Task detail panel state (shared across all views)
  selectedTaskId: string | null;
  detailPanelOpen: boolean;

  setView: (view: ViewType) => void;
  toggleColumnVisibility: (columnId: ColumnId) => void;
  setColumnOrder: (order: ColumnId[]) => void;
  setSortConfig: (config: SortConfig | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (statusIds: string[]) => void;
  setResponsibleFilter: (responsibleIds: string[]) => void;
  setDueDateFilter: (dueDate: DueDateFilter) => void;
  clearFilters: () => void;
  // Task detail panel actions
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  setDetailPanelOpen: (open: boolean) => void;
  reset: () => void;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set, get) => ({
      currentView: "list",
      visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
      columnOrder: [...DEFAULT_COLUMN_ORDER],
      sortConfig: null,
      searchQuery: "",
      filters: { ...DEFAULT_FILTERS },
      selectedTaskId: null,
      detailPanelOpen: false,

      setView: (view) => set({ currentView: view }),

      toggleColumnVisibility: (columnId) => {
        // "name" column cannot be hidden
        if (columnId === "name") return;

        const { visibleColumns } = get();
        if (visibleColumns.includes(columnId)) {
          set({ visibleColumns: visibleColumns.filter((id) => id !== columnId) });
        } else {
          set({ visibleColumns: [...visibleColumns, columnId] });
        }
      },

      setColumnOrder: (order) => {
        set({ columnOrder: order });
      },

      setSortConfig: (config) => {
        set({ sortConfig: config });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setStatusFilter: (statusIds) => {
        set({ filters: { ...get().filters, statusIds } });
      },

      setResponsibleFilter: (responsibleIds) => {
        set({ filters: { ...get().filters, responsibleIds } });
      },

      setDueDateFilter: (dueDate) => {
        set({ filters: { ...get().filters, dueDate } });
      },

      clearFilters: () => {
        set({ filters: { ...DEFAULT_FILTERS } });
      },

      openTaskDetail: (taskId) => {
        set({ selectedTaskId: taskId, detailPanelOpen: true });
      },

      closeTaskDetail: () => {
        set({ detailPanelOpen: false });
      },

      setDetailPanelOpen: (open) => {
        set({ detailPanelOpen: open });
      },

      reset: () => {
        set({
          currentView: "list",
          visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
          columnOrder: [...DEFAULT_COLUMN_ORDER],
          sortConfig: null,
          searchQuery: "",
          filters: { ...DEFAULT_FILTERS },
          selectedTaskId: null,
          detailPanelOpen: false,
        });
      },
    }),
    {
      name: "gantty-view-settings",
    }
  )
);
