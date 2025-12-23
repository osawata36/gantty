import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "./projectStore";
import { DEFAULT_STATUSES } from "@/types";

describe("projectStore", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });

  describe("initial state", () => {
    it("has no project initially", () => {
      const state = useProjectStore.getState();
      expect(state.project).toBeNull();
    });

    it("has no file path initially", () => {
      const state = useProjectStore.getState();
      expect(state.filePath).toBeNull();
    });

    it("is not modified initially", () => {
      const state = useProjectStore.getState();
      expect(state.isModified).toBe(false);
    });
  });

  describe("createNewProject", () => {
    it("creates a new project with given name", () => {
      const { createNewProject } = useProjectStore.getState();
      createNewProject("Test Project");

      const state = useProjectStore.getState();
      expect(state.project).not.toBeNull();
      expect(state.project?.name).toBe("Test Project");
    });

    it("initializes project with default statuses", () => {
      const { createNewProject } = useProjectStore.getState();
      createNewProject("Test Project");

      const state = useProjectStore.getState();
      expect(state.project?.statuses).toHaveLength(4);
      expect(state.project?.statuses[0].id).toBe("not_started");
    });

    it("initializes project with empty tasks and resources", () => {
      const { createNewProject } = useProjectStore.getState();
      createNewProject("Test Project");

      const state = useProjectStore.getState();
      expect(state.project?.tasks).toEqual([]);
      expect(state.project?.resources).toEqual([]);
    });

    it("clears file path when creating new project", () => {
      const { createNewProject, setFilePath } = useProjectStore.getState();
      setFilePath("/some/path.gantty");
      createNewProject("Test Project");

      const state = useProjectStore.getState();
      expect(state.filePath).toBeNull();
    });
  });

  describe("setProject", () => {
    it("sets the project", () => {
      const { setProject } = useProjectStore.getState();
      const project = {
        id: "project-1",
        name: "Loaded Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [],
        resources: [],
        statuses: DEFAULT_STATUSES,
      };

      setProject(project);

      const state = useProjectStore.getState();
      expect(state.project?.name).toBe("Loaded Project");
    });
  });

  describe("modification tracking", () => {
    it("marks as modified when project changes", () => {
      const { createNewProject, markAsModified } = useProjectStore.getState();
      createNewProject("Test Project");
      markAsModified();

      const state = useProjectStore.getState();
      expect(state.isModified).toBe(true);
    });

    it("clears modification flag when saved", () => {
      const { createNewProject, markAsModified, markAsSaved } =
        useProjectStore.getState();
      createNewProject("Test Project");
      markAsModified();
      markAsSaved();

      const state = useProjectStore.getState();
      expect(state.isModified).toBe(false);
    });
  });
});
