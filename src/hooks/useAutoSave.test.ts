import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "./useAutoSave";
import { useProjectStore } from "@/stores/projectStore";

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
  open: vi.fn(),
}));

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useProjectStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("auto save state", () => {
    it("auto save is enabled by default", () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");

      const { result } = renderHook(() => useAutoSave());

      expect(result.current.isAutoSaveEnabled).toBe(true);
    });

    it("can toggle auto save", () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");

      const { result } = renderHook(() => useAutoSave());

      act(() => {
        result.current.toggleAutoSave();
      });

      expect(result.current.isAutoSaveEnabled).toBe(false);

      act(() => {
        result.current.toggleAutoSave();
      });

      expect(result.current.isAutoSaveEnabled).toBe(true);
    });
  });

  describe("save status", () => {
    it("save status is 'saved' when not modified", () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().markAsSaved();

      const { result } = renderHook(() => useAutoSave());

      expect(result.current.saveStatus).toBe("saved");
    });

    it("save status reflects isModified state", () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().markAsSaved();

      const { result, rerender } = renderHook(() => useAutoSave());

      expect(result.current.saveStatus).toBe("saved");

      // Make modification
      act(() => {
        useProjectStore.getState().addTask("タスク");
      });

      // Rerender to pick up state changes
      rerender();

      expect(result.current.saveStatus).toBe("modified");
    });
  });

  describe("performSave", () => {
    it("returns false if no project", async () => {
      const { result } = renderHook(() => useAutoSave());

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.performSave();
      });

      expect(saveResult).toBe(false);
    });

    it("returns false if no file path", async () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");

      const { result } = renderHook(() => useAutoSave());

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.performSave();
      });

      expect(saveResult).toBe(false);
    });

    it("saves successfully with project and file path", async () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().setFilePath("/test/path.gantty");

      const { result, rerender } = renderHook(() => useAutoSave());

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.performSave();
      });

      rerender();

      expect(saveResult).toBe(true);
      expect(result.current.saveStatus).toBe("saved");
      expect(useProjectStore.getState().isModified).toBe(false);
    });
  });
});
