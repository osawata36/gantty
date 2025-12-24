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

  describe("task management", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("Test Project");
    });

    describe("addTask", () => {
      it("adds a new task to the project", () => {
        const { addTask } = useProjectStore.getState();
        addTask("First Task");

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(1);
        expect(state.project?.tasks[0].name).toBe("First Task");
      });

      it("assigns unique id to each task", () => {
        const { addTask } = useProjectStore.getState();
        addTask("Task 1");
        addTask("Task 2");

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].id).not.toBe(state.project?.tasks[1].id);
      });

      it("sets default values for new task", () => {
        const { addTask } = useProjectStore.getState();
        addTask("New Task");

        const state = useProjectStore.getState();
        const task = state.project?.tasks[0];
        expect(task?.progress).toBe(0);
        expect(task?.status).toBe("not_started");
        expect(task?.order).toBe(0);
      });

      it("increments order for subsequent tasks", () => {
        const { addTask } = useProjectStore.getState();
        addTask("Task 1");
        addTask("Task 2");
        addTask("Task 3");

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].order).toBe(0);
        expect(state.project?.tasks[1].order).toBe(1);
        expect(state.project?.tasks[2].order).toBe(2);
      });

      it("marks project as modified", () => {
        const { addTask } = useProjectStore.getState();
        addTask("New Task");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if no project is loaded", () => {
        useProjectStore.getState().reset();
        const { addTask } = useProjectStore.getState();
        addTask("New Task");

        const state = useProjectStore.getState();
        expect(state.project).toBeNull();
      });
    });

    describe("updateTask", () => {
      it("updates task name", () => {
        const { addTask, updateTask } = useProjectStore.getState();
        addTask("Original Name");

        const taskId = useProjectStore.getState().project?.tasks[0].id;
        updateTask(taskId!, { name: "Updated Name" });

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].name).toBe("Updated Name");
      });

      it("updates task partially without affecting other fields", () => {
        const { addTask, updateTask } = useProjectStore.getState();
        addTask("Task Name");

        const taskId = useProjectStore.getState().project?.tasks[0].id;
        updateTask(taskId!, { progress: 50 });

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].name).toBe("Task Name");
        expect(state.project?.tasks[0].progress).toBe(50);
      });

      it("marks project as modified", () => {
        const { addTask, updateTask, markAsSaved } = useProjectStore.getState();
        addTask("Task Name");
        markAsSaved();

        const taskId = useProjectStore.getState().project?.tasks[0].id;
        updateTask(taskId!, { name: "Updated Name" });

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if task not found", () => {
        const { addTask, updateTask, markAsSaved } = useProjectStore.getState();
        addTask("Task Name");
        markAsSaved();

        updateTask("non-existent-id", { name: "Updated Name" });

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].name).toBe("Task Name");
        expect(state.isModified).toBe(false);
      });
    });

    describe("deleteTask", () => {
      it("removes task from project", () => {
        const { addTask, deleteTask } = useProjectStore.getState();
        addTask("Task to Delete");

        const taskId = useProjectStore.getState().project?.tasks[0].id;
        deleteTask(taskId!);

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(0);
      });

      it("only removes specified task", () => {
        const { addTask, deleteTask } = useProjectStore.getState();
        addTask("Task 1");
        addTask("Task 2");
        addTask("Task 3");

        const taskId = useProjectStore.getState().project?.tasks[1].id;
        deleteTask(taskId!);

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(2);
        expect(state.project?.tasks[0].name).toBe("Task 1");
        expect(state.project?.tasks[1].name).toBe("Task 3");
      });

      it("marks project as modified", () => {
        const { addTask, deleteTask, markAsSaved } = useProjectStore.getState();
        addTask("Task to Delete");
        markAsSaved();

        const taskId = useProjectStore.getState().project?.tasks[0].id;
        deleteTask(taskId!);

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if task not found", () => {
        const { addTask, deleteTask, markAsSaved } = useProjectStore.getState();
        addTask("Task Name");
        markAsSaved();

        deleteTask("non-existent-id");

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(1);
        expect(state.isModified).toBe(false);
      });
    });
  });
});
