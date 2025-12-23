import { describe, it, expect, beforeEach } from "vitest";
import { useViewStore, ViewType } from "./viewStore";

describe("viewStore", () => {
  beforeEach(() => {
    useViewStore.setState({ currentView: "list" });
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
});
