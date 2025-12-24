import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileOperations } from "./useFileOperations";
import { useProjectStore } from "@/stores/projectStore";

// Mock Tauri APIs
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: vi.fn(),
  readTextFile: vi.fn(),
}));

import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

const mockSave = vi.mocked(save);
const mockOpen = vi.mocked(open);
const mockWriteTextFile = vi.mocked(writeTextFile);
const mockReadTextFile = vi.mocked(readTextFile);

describe("useFileOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.getState().reset();
  });

  afterEach(() => {
    useProjectStore.getState().reset();
  });

  describe("saveProject", () => {
    it("saves project to a new file when no path is set", async () => {
      // Setup: Create a project first
      useProjectStore.getState().createNewProject("Test Project");

      mockSave.mockResolvedValue("/path/to/project.gantty");
      mockWriteTextFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.saveProject();
        expect(success).toBe(true);
      });

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: "Gantty Project", extensions: ["gantty"] }],
        defaultPath: "Test Project.gantty",
      });
      expect(mockWriteTextFile).toHaveBeenCalled();
      expect(useProjectStore.getState().filePath).toBe("/path/to/project.gantty");
      expect(useProjectStore.getState().isModified).toBe(false);
    });

    it("saves to existing path without showing dialog", async () => {
      useProjectStore.getState().createNewProject("Test Project");
      useProjectStore.getState().setFilePath("/existing/path.gantty");
      useProjectStore.getState().markAsModified();

      mockWriteTextFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.saveProject();
        expect(success).toBe(true);
      });

      expect(mockSave).not.toHaveBeenCalled();
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        "/existing/path.gantty",
        expect.any(String)
      );
      expect(useProjectStore.getState().isModified).toBe(false);
    });

    it("returns false when user cancels save dialog", async () => {
      useProjectStore.getState().createNewProject("Test Project");
      mockSave.mockResolvedValue(null);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.saveProject();
        expect(success).toBe(false);
      });

      expect(mockWriteTextFile).not.toHaveBeenCalled();
    });

    it("returns false when no project is loaded", async () => {
      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.saveProject();
        expect(success).toBe(false);
      });

      expect(mockSave).not.toHaveBeenCalled();
      expect(mockWriteTextFile).not.toHaveBeenCalled();
    });
  });

  describe("saveProjectAs", () => {
    it("always shows save dialog even with existing path", async () => {
      useProjectStore.getState().createNewProject("Test Project");
      useProjectStore.getState().setFilePath("/existing/path.gantty");

      mockSave.mockResolvedValue("/new/path.gantty");
      mockWriteTextFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.saveProjectAs();
        expect(success).toBe(true);
      });

      expect(mockSave).toHaveBeenCalled();
      expect(useProjectStore.getState().filePath).toBe("/new/path.gantty");
    });
  });

  describe("openProject", () => {
    it("opens a project from file", async () => {
      const projectData = JSON.stringify({
        version: "1.0.0",
        project: {
          id: "test-id",
          name: "Loaded Project",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          tasks: [],
          resources: [],
          statuses: [],
        },
      });

      mockOpen.mockResolvedValue("/path/to/project.gantty");
      mockReadTextFile.mockResolvedValue(projectData);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.openProject();
        expect(success).toBe(true);
      });

      expect(mockOpen).toHaveBeenCalledWith({
        filters: [{ name: "Gantty Project", extensions: ["gantty"] }],
        multiple: false,
      });
      expect(useProjectStore.getState().project?.name).toBe("Loaded Project");
      expect(useProjectStore.getState().filePath).toBe("/path/to/project.gantty");
    });

    it("returns false when user cancels open dialog", async () => {
      mockOpen.mockResolvedValue(null);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.openProject();
        expect(success).toBe(false);
      });

      expect(mockReadTextFile).not.toHaveBeenCalled();
    });

    it("returns false when file is invalid", async () => {
      mockOpen.mockResolvedValue("/path/to/project.gantty");
      mockReadTextFile.mockResolvedValue("invalid json");

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        const success = await result.current.openProject();
        expect(success).toBe(false);
      });

      expect(useProjectStore.getState().project).toBe(null);
    });
  });

  describe("createNewProject", () => {
    it("creates a new project with given name", async () => {
      const { result } = renderHook(() => useFileOperations());

      act(() => {
        result.current.createNewProject("My New Project");
      });

      expect(useProjectStore.getState().project?.name).toBe("My New Project");
      expect(useProjectStore.getState().filePath).toBe(null);
      expect(useProjectStore.getState().isModified).toBe(false);
    });
  });
});
