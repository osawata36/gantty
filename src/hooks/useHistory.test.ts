import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "./useHistory";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";

describe("useHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Reset stores
    useProjectStore.setState({
      project: null,
      filePath: null,
      isModified: false,
      collapsedTaskIds: new Set(),
      currentUserId: null,
      ballHolderFilter: null,
    });

    useHistoryStore.setState({
      past: [],
      future: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("プロジェクトがない場合はundo/redoが無効", () => {
    const { result } = renderHook(() => useHistory());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("プロジェクトの変更が履歴に記録される", async () => {
    // Create a project
    useProjectStore.getState().createDefaultProject();

    const { result, rerender } = renderHook(() => useHistory());

    // Initially no undo available (first state is not recorded as history)
    expect(result.current.canUndo).toBe(false);

    // Add a task (this should trigger history recording after debounce)
    act(() => {
      useProjectStore.getState().addTask("Task 1");
    });

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Rerender to get updated values
    rerender();

    // Now undo should be available
    expect(result.current.canUndo).toBe(true);
  });

  it("undoで前の状態に戻る", async () => {
    // Create a project and add a task
    useProjectStore.getState().createDefaultProject();

    const { result } = renderHook(() => useHistory());

    // Add a task
    act(() => {
      useProjectStore.getState().addTask("Task 1");
    });

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Verify task was added
    expect(useProjectStore.getState().project?.tasks).toHaveLength(1);
    expect(useProjectStore.getState().project?.tasks[0].name).toBe("Task 1");

    // Undo
    act(() => {
      result.current.undo();
    });

    // Should be back to no tasks
    expect(useProjectStore.getState().project?.tasks).toHaveLength(0);
    expect(result.current.canRedo).toBe(true);
  });

  it("redoで取り消した操作をやり直す", async () => {
    // Create a project
    useProjectStore.getState().createDefaultProject();

    const { result } = renderHook(() => useHistory());

    // Add a task
    act(() => {
      useProjectStore.getState().addTask("Task 1");
    });

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Undo
    act(() => {
      result.current.undo();
    });

    expect(useProjectStore.getState().project?.tasks).toHaveLength(0);

    // Redo
    act(() => {
      result.current.redo();
    });

    // Task should be back
    expect(useProjectStore.getState().project?.tasks).toHaveLength(1);
    expect(useProjectStore.getState().project?.tasks[0].name).toBe("Task 1");
  });

  it("連続した変更がデバウンスされて1つの履歴として記録される", async () => {
    useProjectStore.getState().createDefaultProject();

    const { result, rerender } = renderHook(() => useHistory());

    // Make multiple rapid changes within debounce window
    act(() => {
      useProjectStore.getState().addTask("Task 1");
      vi.advanceTimersByTime(100);
      useProjectStore.getState().addTask("Task 2");
      vi.advanceTimersByTime(100);
      useProjectStore.getState().addTask("Task 3");
    });

    // Wait for debounce to complete
    act(() => {
      vi.advanceTimersByTime(350);
    });

    rerender();

    // Should have 3 tasks
    expect(useProjectStore.getState().project?.tasks).toHaveLength(3);

    // Undo should go back to before all the rapid changes
    act(() => {
      result.current.undo();
    });

    // Since the debounce groups changes, we go back to the state before Task 1 was added
    // But due to the way debounce works (captures state before first change),
    // we should have 0 tasks
    expect(useProjectStore.getState().project?.tasks).toHaveLength(0);
  });

  it("新しいプロジェクトを開くと履歴がクリアされる", async () => {
    // Create first project
    useProjectStore.getState().createDefaultProject();

    const { result, rerender } = renderHook(() => useHistory());

    // Add a task
    act(() => {
      useProjectStore.getState().addTask("Task 1");
    });

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(350);
    });

    rerender();

    expect(result.current.canUndo).toBe(true);

    // Create a new project (simulates opening a different file)
    act(() => {
      useProjectStore.getState().createNewProject("New Project");
    });

    // Rerender to get updated values after project change
    rerender();

    // History should be cleared
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("undoするとisModifiedがtrueになる", async () => {
    useProjectStore.getState().createDefaultProject();
    useProjectStore.getState().markAsSaved();

    const { result } = renderHook(() => useHistory());

    // Add a task and wait
    act(() => {
      useProjectStore.getState().addTask("Task 1");
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Save the project (simulated)
    act(() => {
      useProjectStore.getState().markAsSaved();
    });

    expect(useProjectStore.getState().isModified).toBe(false);

    // Undo
    act(() => {
      result.current.undo();
    });

    // Should be marked as modified
    expect(useProjectStore.getState().isModified).toBe(true);
  });
});
