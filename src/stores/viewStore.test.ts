import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useViewStore, ViewType, ColumnId } from "./viewStore";

describe("viewStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useViewStore.getState().reset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("has default view as list", () => {
    const state = useViewStore.getState();
    expect(state.currentView).toBe("list");
  });

  it("can switch to gantt view", () => {
    const { setView } = useViewStore.getState();
    setView("gantt");
    expect(useViewStore.getState().currentView).toBe("gantt");
  });

  it("can switch to kanban view", () => {
    const { setView } = useViewStore.getState();
    setView("kanban");
    expect(useViewStore.getState().currentView).toBe("kanban");
  });

  it("returns available views", () => {
    const availableViews: ViewType[] = ["list", "gantt", "kanban"];
    expect(availableViews).toEqual(["list", "gantt", "kanban"]);
  });

  describe("column settings", () => {
    it("has default visible columns", () => {
      const state = useViewStore.getState();
      expect(state.visibleColumns).toContain("name");
      expect(state.visibleColumns).toContain("startDate");
      expect(state.visibleColumns).toContain("endDate");
      expect(state.visibleColumns).toContain("progress");
    });

    it("has default column order", () => {
      const state = useViewStore.getState();
      expect(state.columnOrder).toEqual([
        "name",
        "duration",
        "startDate",
        "endDate",
        "progress",
        "responsible",
        "ballHolder",
      ]);
    });

    it("can toggle column visibility", () => {
      const { toggleColumnVisibility } = useViewStore.getState();

      toggleColumnVisibility("startDate");
      expect(useViewStore.getState().visibleColumns).not.toContain("startDate");

      toggleColumnVisibility("startDate");
      expect(useViewStore.getState().visibleColumns).toContain("startDate");
    });

    it("name column cannot be hidden", () => {
      const { toggleColumnVisibility } = useViewStore.getState();

      toggleColumnVisibility("name");
      expect(useViewStore.getState().visibleColumns).toContain("name");
    });

    it("can set column order", () => {
      const { setColumnOrder } = useViewStore.getState();

      const newOrder: ColumnId[] = [
        "name",
        "progress",
        "startDate",
        "endDate",
        "responsible",
        "ballHolder",
      ];
      setColumnOrder(newOrder);

      expect(useViewStore.getState().columnOrder).toEqual(newOrder);
    });
  });

  describe("sorting", () => {
    it("has no sort by default", () => {
      const state = useViewStore.getState();
      expect(state.sortConfig).toBeNull();
    });

    it("can set sort column", () => {
      const { setSortConfig } = useViewStore.getState();

      setSortConfig({ column: "name", direction: "asc" });

      const state = useViewStore.getState();
      expect(state.sortConfig?.column).toBe("name");
      expect(state.sortConfig?.direction).toBe("asc");
    });

    it("can toggle sort direction", () => {
      const { setSortConfig } = useViewStore.getState();

      setSortConfig({ column: "startDate", direction: "asc" });
      expect(useViewStore.getState().sortConfig?.direction).toBe("asc");

      setSortConfig({ column: "startDate", direction: "desc" });
      expect(useViewStore.getState().sortConfig?.direction).toBe("desc");
    });

    it("can clear sort", () => {
      const { setSortConfig } = useViewStore.getState();

      setSortConfig({ column: "name", direction: "asc" });
      setSortConfig(null);

      expect(useViewStore.getState().sortConfig).toBeNull();
    });
  });

  describe("search", () => {
    it("has empty search query by default", () => {
      const state = useViewStore.getState();
      expect(state.searchQuery).toBe("");
    });

    it("can set search query", () => {
      const { setSearchQuery } = useViewStore.getState();

      setSearchQuery("タスク");

      expect(useViewStore.getState().searchQuery).toBe("タスク");
    });

    it("can clear search query", () => {
      const { setSearchQuery } = useViewStore.getState();

      setSearchQuery("タスク");
      setSearchQuery("");

      expect(useViewStore.getState().searchQuery).toBe("");
    });

    it("search query is persisted", () => {
      const { setSearchQuery } = useViewStore.getState();

      setSearchQuery("検索テスト");

      const stored = localStorage.getItem("gantty-view-settings");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.searchQuery).toBe("検索テスト");
    });
  });

  describe("filters", () => {
    it("has empty filters by default", () => {
      const state = useViewStore.getState();
      expect(state.filters.statusIds).toEqual([]);
      expect(state.filters.responsibleIds).toEqual([]);
      expect(state.filters.dueDate).toBeNull();
    });

    it("can set status filter", () => {
      const { setStatusFilter } = useViewStore.getState();

      setStatusFilter(["in_progress", "completed"]);

      expect(useViewStore.getState().filters.statusIds).toEqual([
        "in_progress",
        "completed",
      ]);
    });

    it("can set responsible filter", () => {
      const { setResponsibleFilter } = useViewStore.getState();

      setResponsibleFilter(["user-1", "user-2"]);

      expect(useViewStore.getState().filters.responsibleIds).toEqual([
        "user-1",
        "user-2",
      ]);
    });

    it("can set due date filter", () => {
      const { setDueDateFilter } = useViewStore.getState();

      setDueDateFilter("today");

      expect(useViewStore.getState().filters.dueDate).toBe("today");
    });

    it("can clear all filters", () => {
      const { setStatusFilter, setResponsibleFilter, setDueDateFilter, clearFilters } =
        useViewStore.getState();

      setStatusFilter(["in_progress"]);
      setResponsibleFilter(["user-1"]);
      setDueDateFilter("overdue");

      clearFilters();

      const state = useViewStore.getState();
      expect(state.filters.statusIds).toEqual([]);
      expect(state.filters.responsibleIds).toEqual([]);
      expect(state.filters.dueDate).toBeNull();
    });

    it("filters are persisted", () => {
      const { setStatusFilter, setDueDateFilter } = useViewStore.getState();

      setStatusFilter(["completed"]);
      setDueDateFilter("this_week");

      const stored = localStorage.getItem("gantty-view-settings");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.filters.statusIds).toEqual(["completed"]);
      expect(parsed.state.filters.dueDate).toBe("this_week");
    });
  });

  describe("task detail panel", () => {
    it("has no selected task by default", () => {
      const state = useViewStore.getState();
      expect(state.selectedTaskId).toBeNull();
    });

    it("has closed detail panel by default", () => {
      const state = useViewStore.getState();
      expect(state.detailPanelOpen).toBe(false);
    });

    it("can open task detail panel with a task", () => {
      const { openTaskDetail } = useViewStore.getState();

      openTaskDetail("task-1");

      const state = useViewStore.getState();
      expect(state.selectedTaskId).toBe("task-1");
      expect(state.detailPanelOpen).toBe(true);
    });

    it("can close task detail panel", () => {
      const { openTaskDetail, closeTaskDetail } = useViewStore.getState();

      openTaskDetail("task-1");
      closeTaskDetail();

      const state = useViewStore.getState();
      expect(state.detailPanelOpen).toBe(false);
      // selectedTaskId should remain for potential re-open
    });

    it("can set detail panel open state", () => {
      const { openTaskDetail, setDetailPanelOpen } = useViewStore.getState();

      openTaskDetail("task-1");
      setDetailPanelOpen(false);

      expect(useViewStore.getState().detailPanelOpen).toBe(false);

      setDetailPanelOpen(true);
      expect(useViewStore.getState().detailPanelOpen).toBe(true);
    });

    it("opening a different task updates selectedTaskId", () => {
      const { openTaskDetail } = useViewStore.getState();

      openTaskDetail("task-1");
      openTaskDetail("task-2");

      expect(useViewStore.getState().selectedTaskId).toBe("task-2");
    });
  });

  describe("persistence", () => {
    it("persists visible columns to localStorage", () => {
      const { toggleColumnVisibility } = useViewStore.getState();

      toggleColumnVisibility("startDate");

      const stored = localStorage.getItem("gantty-view-settings");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.visibleColumns).not.toContain("startDate");
    });

    it("persists column order to localStorage", () => {
      const { setColumnOrder } = useViewStore.getState();

      const newOrder: ColumnId[] = [
        "name",
        "progress",
        "startDate",
        "endDate",
        "responsible",
        "ballHolder",
      ];
      setColumnOrder(newOrder);

      const stored = localStorage.getItem("gantty-view-settings");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.columnOrder).toEqual(newOrder);
    });

    it("persists sort config to localStorage", () => {
      const { setSortConfig } = useViewStore.getState();

      setSortConfig({ column: "name", direction: "asc" });

      const stored = localStorage.getItem("gantty-view-settings");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.sortConfig).toEqual({ column: "name", direction: "asc" });
    });

    it("persists current view to localStorage", () => {
      const { setView } = useViewStore.getState();

      setView("gantt");

      const stored = localStorage.getItem("gantty-view-settings");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.currentView).toBe("gantt");
    });
  });
});
