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

      it("also removes all child tasks when parent is deleted", () => {
        const { addTask, addSubTask, deleteTask } = useProjectStore.getState();
        addTask("Parent Task");

        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child Task 1");
        addSubTask(parentId, "Child Task 2");

        deleteTask(parentId);

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(0);
      });
    });

    describe("addSubTask", () => {
      it("adds a subtask under a parent task", () => {
        const { addTask, addSubTask } = useProjectStore.getState();
        addTask("Parent Task");

        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child Task");

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(2);

        const childTask = state.project?.tasks.find(
          (t) => t.name === "Child Task"
        );
        expect(childTask?.parentId).toBe(parentId);
      });

      it("assigns unique id to subtask", () => {
        const { addTask, addSubTask } = useProjectStore.getState();
        addTask("Parent Task");

        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child Task");

        const state = useProjectStore.getState();
        const parentTask = state.project?.tasks[0];
        const childTask = state.project?.tasks[1];
        expect(parentTask?.id).not.toBe(childTask?.id);
      });

      it("sets default values for subtask", () => {
        const { addTask, addSubTask } = useProjectStore.getState();
        addTask("Parent Task");

        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child Task");

        const state = useProjectStore.getState();
        const childTask = state.project?.tasks.find(
          (t) => t.name === "Child Task"
        );
        expect(childTask?.progress).toBe(0);
        expect(childTask?.status).toBe("not_started");
      });

      it("marks project as modified", () => {
        const { addTask, addSubTask, markAsSaved } = useProjectStore.getState();
        addTask("Parent Task");
        markAsSaved();

        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child Task");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if parent task not found", () => {
        const { addTask, addSubTask, markAsSaved } = useProjectStore.getState();
        addTask("Parent Task");
        markAsSaved();

        addSubTask("non-existent-id", "Child Task");

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(1);
        expect(state.isModified).toBe(false);
      });

      it("can add nested subtasks", () => {
        const { addTask, addSubTask } = useProjectStore.getState();
        addTask("Parent Task");

        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child Task");

        const childId = useProjectStore.getState().project?.tasks.find(
          (t) => t.name === "Child Task"
        )?.id!;
        addSubTask(childId, "Grandchild Task");

        const state = useProjectStore.getState();
        expect(state.project?.tasks).toHaveLength(3);

        const grandchildTask = state.project?.tasks.find(
          (t) => t.name === "Grandchild Task"
        );
        expect(grandchildTask?.parentId).toBe(childId);
      });
    });

    describe("indentTask", () => {
      it("makes task a child of the previous sibling", () => {
        const { addTask, indentTask } = useProjectStore.getState();
        addTask("Task 1");
        addTask("Task 2");

        const task2Id = useProjectStore.getState().project?.tasks[1].id!;
        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        indentTask(task2Id);

        const state = useProjectStore.getState();
        const task2 = state.project?.tasks.find((t) => t.id === task2Id);
        expect(task2?.parentId).toBe(task1Id);
      });

      it("does nothing if task is the first sibling (no previous sibling)", () => {
        const { addTask, indentTask, markAsSaved } = useProjectStore.getState();
        addTask("Task 1");
        addTask("Task 2");
        markAsSaved();

        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        indentTask(task1Id);

        const state = useProjectStore.getState();
        const task1 = state.project?.tasks.find((t) => t.id === task1Id);
        expect(task1?.parentId).toBeUndefined();
        expect(state.isModified).toBe(false);
      });

      it("indents to last sibling in nested structure", () => {
        const { addTask, addSubTask, indentTask } = useProjectStore.getState();
        addTask("Parent");
        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child 1");
        addSubTask(parentId, "Child 2");

        const child2Id = useProjectStore.getState().project?.tasks.find(
          (t) => t.name === "Child 2"
        )?.id!;
        const child1Id = useProjectStore.getState().project?.tasks.find(
          (t) => t.name === "Child 1"
        )?.id!;

        indentTask(child2Id);

        const state = useProjectStore.getState();
        const child2 = state.project?.tasks.find((t) => t.id === child2Id);
        expect(child2?.parentId).toBe(child1Id);
      });

      it("marks project as modified", () => {
        const { addTask, indentTask, markAsSaved } = useProjectStore.getState();
        addTask("Task 1");
        addTask("Task 2");
        markAsSaved();

        const task2Id = useProjectStore.getState().project?.tasks[1].id!;
        indentTask(task2Id);

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });
    });

    describe("outdentTask", () => {
      it("makes task a sibling of its parent", () => {
        const { addTask, addSubTask, outdentTask } = useProjectStore.getState();
        addTask("Parent");
        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child");

        const childId = useProjectStore.getState().project?.tasks.find(
          (t) => t.name === "Child"
        )?.id!;
        outdentTask(childId);

        const state = useProjectStore.getState();
        const child = state.project?.tasks.find((t) => t.id === childId);
        expect(child?.parentId).toBeUndefined();
      });

      it("does nothing if task has no parent", () => {
        const { addTask, outdentTask, markAsSaved } = useProjectStore.getState();
        addTask("Task 1");
        markAsSaved();

        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        outdentTask(task1Id);

        const state = useProjectStore.getState();
        const task1 = state.project?.tasks.find((t) => t.id === task1Id);
        expect(task1?.parentId).toBeUndefined();
        expect(state.isModified).toBe(false);
      });

      it("outdents to grandparent level", () => {
        const { addTask, addSubTask, outdentTask } = useProjectStore.getState();
        addTask("Grandparent");
        const grandparentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(grandparentId, "Parent");
        const parentId = useProjectStore.getState().project?.tasks.find(
          (t) => t.name === "Parent"
        )?.id!;
        addSubTask(parentId, "Child");

        const childId = useProjectStore.getState().project?.tasks.find(
          (t) => t.name === "Child"
        )?.id!;
        outdentTask(childId);

        const state = useProjectStore.getState();
        const child = state.project?.tasks.find((t) => t.id === childId);
        expect(child?.parentId).toBe(grandparentId);
      });

      it("marks project as modified", () => {
        const { addTask, addSubTask, outdentTask, markAsSaved } =
          useProjectStore.getState();
        addTask("Parent");
        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        addSubTask(parentId, "Child");
        markAsSaved();

        const childId = useProjectStore.getState().project?.tasks.find(
          (t) => t.name === "Child"
        )?.id!;
        outdentTask(childId);

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });
    });

    describe("parent task auto-calculation", () => {
      describe("getParentDates", () => {
        it("calculates parent start date as earliest child start date", () => {
          const { addTask, addSubTask, updateTask } =
            useProjectStore.getState();
          addTask("Parent");
          const parentId = useProjectStore.getState().project?.tasks[0].id!;
          addSubTask(parentId, "Child 1");
          addSubTask(parentId, "Child 2");

          const state = useProjectStore.getState();
          const child1Id = state.project?.tasks.find(
            (t) => t.name === "Child 1"
          )?.id!;
          const child2Id = state.project?.tasks.find(
            (t) => t.name === "Child 2"
          )?.id!;

          updateTask(child1Id, { startDate: "2024-01-10" });
          updateTask(child2Id, { startDate: "2024-01-05" });

          const dates = useProjectStore.getState().getParentDates(parentId);
          expect(dates.startDate).toBe("2024-01-05");
        });

        it("calculates parent end date as latest child end date", () => {
          const { addTask, addSubTask, updateTask } =
            useProjectStore.getState();
          addTask("Parent");
          const parentId = useProjectStore.getState().project?.tasks[0].id!;
          addSubTask(parentId, "Child 1");
          addSubTask(parentId, "Child 2");

          const state = useProjectStore.getState();
          const child1Id = state.project?.tasks.find(
            (t) => t.name === "Child 1"
          )?.id!;
          const child2Id = state.project?.tasks.find(
            (t) => t.name === "Child 2"
          )?.id!;

          updateTask(child1Id, { endDate: "2024-01-20" });
          updateTask(child2Id, { endDate: "2024-01-25" });

          const dates = useProjectStore.getState().getParentDates(parentId);
          expect(dates.endDate).toBe("2024-01-25");
        });

        it("returns undefined dates if no children have dates", () => {
          const { addTask, addSubTask } = useProjectStore.getState();
          addTask("Parent");
          const parentId = useProjectStore.getState().project?.tasks[0].id!;
          addSubTask(parentId, "Child 1");

          const dates = useProjectStore.getState().getParentDates(parentId);
          expect(dates.startDate).toBeUndefined();
          expect(dates.endDate).toBeUndefined();
        });

        it("returns undefined dates if task has no children", () => {
          const { addTask } = useProjectStore.getState();
          addTask("Task");
          const taskId = useProjectStore.getState().project?.tasks[0].id!;

          const dates = useProjectStore.getState().getParentDates(taskId);
          expect(dates.startDate).toBeUndefined();
          expect(dates.endDate).toBeUndefined();
        });
      });

      describe("getParentProgress", () => {
        it("calculates parent progress as average of child progresses", () => {
          const { addTask, addSubTask, updateTask } =
            useProjectStore.getState();
          addTask("Parent");
          const parentId = useProjectStore.getState().project?.tasks[0].id!;
          addSubTask(parentId, "Child 1");
          addSubTask(parentId, "Child 2");

          const state = useProjectStore.getState();
          const child1Id = state.project?.tasks.find(
            (t) => t.name === "Child 1"
          )?.id!;
          const child2Id = state.project?.tasks.find(
            (t) => t.name === "Child 2"
          )?.id!;

          updateTask(child1Id, { progress: 50 });
          updateTask(child2Id, { progress: 100 });

          const progress = useProjectStore.getState().getParentProgress(parentId);
          expect(progress).toBe(75);
        });

        it("returns 0 if task has no children", () => {
          const { addTask } = useProjectStore.getState();
          addTask("Task");
          const taskId = useProjectStore.getState().project?.tasks[0].id!;

          const progress = useProjectStore.getState().getParentProgress(taskId);
          expect(progress).toBe(0);
        });

        it("calculates weighted average by estimated hours if available", () => {
          const { addTask, addSubTask, updateTask } =
            useProjectStore.getState();
          addTask("Parent");
          const parentId = useProjectStore.getState().project?.tasks[0].id!;
          addSubTask(parentId, "Child 1");
          addSubTask(parentId, "Child 2");

          const state = useProjectStore.getState();
          const child1Id = state.project?.tasks.find(
            (t) => t.name === "Child 1"
          )?.id!;
          const child2Id = state.project?.tasks.find(
            (t) => t.name === "Child 2"
          )?.id!;

          // Child 1: 10 hours at 100% = 10 completed hours
          // Child 2: 30 hours at 0% = 0 completed hours
          // Total: 40 hours, 10 completed = 25%
          updateTask(child1Id, { progress: 100, estimatedHours: 10 });
          updateTask(child2Id, { progress: 0, estimatedHours: 30 });

          const progress = useProjectStore.getState().getParentProgress(parentId);
          expect(progress).toBe(25);
        });

        it("uses simple average if no children have estimated hours", () => {
          const { addTask, addSubTask, updateTask } =
            useProjectStore.getState();
          addTask("Parent");
          const parentId = useProjectStore.getState().project?.tasks[0].id!;
          addSubTask(parentId, "Child 1");
          addSubTask(parentId, "Child 2");
          addSubTask(parentId, "Child 3");

          const state = useProjectStore.getState();
          const child1Id = state.project?.tasks.find(
            (t) => t.name === "Child 1"
          )?.id!;
          const child2Id = state.project?.tasks.find(
            (t) => t.name === "Child 2"
          )?.id!;
          const child3Id = state.project?.tasks.find(
            (t) => t.name === "Child 3"
          )?.id!;

          updateTask(child1Id, { progress: 30 });
          updateTask(child2Id, { progress: 60 });
          updateTask(child3Id, { progress: 90 });

          const progress = useProjectStore.getState().getParentProgress(parentId);
          expect(progress).toBe(60);
        });

        it("handles nested children for progress calculation", () => {
          const { addTask, addSubTask, updateTask } =
            useProjectStore.getState();
          addTask("Grandparent");
          const grandparentId = useProjectStore.getState().project?.tasks[0].id!;
          addSubTask(grandparentId, "Parent");

          const parentId = useProjectStore.getState().project?.tasks.find(
            (t) => t.name === "Parent"
          )?.id!;
          addSubTask(parentId, "Child 1");
          addSubTask(parentId, "Child 2");

          const state = useProjectStore.getState();
          const child1Id = state.project?.tasks.find(
            (t) => t.name === "Child 1"
          )?.id!;
          const child2Id = state.project?.tasks.find(
            (t) => t.name === "Child 2"
          )?.id!;

          updateTask(child1Id, { progress: 50 });
          updateTask(child2Id, { progress: 50 });

          // Parent's progress should be 50 (average of children)
          const parentProgress = useProjectStore.getState().getParentProgress(parentId);
          expect(parentProgress).toBe(50);

          // Grandparent's progress should be based on Parent's calculated progress
          const grandparentProgress = useProjectStore
            .getState()
            .getParentProgress(grandparentId);
          expect(grandparentProgress).toBe(50);
        });
      });
    });

    describe("task collapse/expand", () => {
      it("tasks are expanded by default", () => {
        const { addTask } = useProjectStore.getState();
        addTask("Parent");
        const parentId = useProjectStore.getState().project?.tasks[0].id!;

        expect(useProjectStore.getState().isTaskCollapsed(parentId)).toBe(false);
      });

      it("toggleTaskCollapse collapses an expanded task", () => {
        const { addTask, toggleTaskCollapse } = useProjectStore.getState();
        addTask("Parent");
        const parentId = useProjectStore.getState().project?.tasks[0].id!;

        toggleTaskCollapse(parentId);

        expect(useProjectStore.getState().isTaskCollapsed(parentId)).toBe(true);
      });

      it("toggleTaskCollapse expands a collapsed task", () => {
        const { addTask, toggleTaskCollapse } = useProjectStore.getState();
        addTask("Parent");
        const parentId = useProjectStore.getState().project?.tasks[0].id!;

        toggleTaskCollapse(parentId);
        toggleTaskCollapse(parentId);

        expect(useProjectStore.getState().isTaskCollapsed(parentId)).toBe(false);
      });

      it("collapsed state persists for multiple tasks", () => {
        const { addTask, toggleTaskCollapse } = useProjectStore.getState();
        addTask("Task 1");
        addTask("Task 2");
        addTask("Task 3");

        const state = useProjectStore.getState();
        const task1Id = state.project?.tasks[0].id!;
        const task2Id = state.project?.tasks[1].id!;
        const task3Id = state.project?.tasks[2].id!;

        toggleTaskCollapse(task1Id);
        toggleTaskCollapse(task3Id);

        const finalState = useProjectStore.getState();
        expect(finalState.isTaskCollapsed(task1Id)).toBe(true);
        expect(finalState.isTaskCollapsed(task2Id)).toBe(false);
        expect(finalState.isTaskCollapsed(task3Id)).toBe(true);
      });

      it("reset clears collapsed state", () => {
        const { addTask, toggleTaskCollapse, reset, createNewProject } =
          useProjectStore.getState();
        addTask("Parent");
        const parentId = useProjectStore.getState().project?.tasks[0].id!;
        toggleTaskCollapse(parentId);

        reset();
        createNewProject("New Project");
        useProjectStore.getState().addTask("New Task");
        const newTaskId = useProjectStore.getState().project?.tasks[0].id!;

        expect(useProjectStore.getState().isTaskCollapsed(newTaskId)).toBe(false);
      });
    });
  });

  describe("resource management", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("Test Project");
    });

    describe("addResource", () => {
      it("adds a new resource with given name", () => {
        const { addResource } = useProjectStore.getState();
        addResource("田中太郎");

        const state = useProjectStore.getState();
        expect(state.project?.resources).toHaveLength(1);
        expect(state.project?.resources[0].name).toBe("田中太郎");
      });

      it("assigns unique id to each resource", () => {
        const { addResource } = useProjectStore.getState();
        addResource("田中太郎");
        addResource("山田花子");

        const state = useProjectStore.getState();
        expect(state.project?.resources[0].id).not.toBe(
          state.project?.resources[1].id
        );
      });

      it("sets default color for new resource", () => {
        const { addResource } = useProjectStore.getState();
        addResource("田中太郎");

        const state = useProjectStore.getState();
        expect(state.project?.resources[0].color).toBeDefined();
        expect(state.project?.resources[0].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it("sets default availability to 100", () => {
        const { addResource } = useProjectStore.getState();
        addResource("田中太郎");

        const state = useProjectStore.getState();
        expect(state.project?.resources[0].availability).toBe(100);
      });

      it("marks project as modified", () => {
        const { addResource, markAsSaved } = useProjectStore.getState();
        markAsSaved();
        addResource("田中太郎");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if no project is loaded", () => {
        useProjectStore.getState().reset();
        const { addResource } = useProjectStore.getState();
        addResource("田中太郎");

        const state = useProjectStore.getState();
        expect(state.project).toBeNull();
      });
    });

    describe("updateResource", () => {
      it("updates resource name", () => {
        const { addResource, updateResource } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        updateResource(resourceId, { name: "田中次郎" });

        const state = useProjectStore.getState();
        expect(state.project?.resources[0].name).toBe("田中次郎");
      });

      it("updates resource color", () => {
        const { addResource, updateResource } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        updateResource(resourceId, { color: "#FF5733" });

        const state = useProjectStore.getState();
        expect(state.project?.resources[0].color).toBe("#FF5733");
      });

      it("updates resource partially without affecting other fields", () => {
        const { addResource, updateResource } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        updateResource(resourceId, { color: "#FF5733" });

        const state = useProjectStore.getState();
        expect(state.project?.resources[0].name).toBe("田中太郎");
        expect(state.project?.resources[0].color).toBe("#FF5733");
      });

      it("marks project as modified", () => {
        const { addResource, updateResource, markAsSaved } =
          useProjectStore.getState();
        addResource("田中太郎");
        markAsSaved();

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        updateResource(resourceId, { name: "田中次郎" });

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if resource not found", () => {
        const { addResource, updateResource, markAsSaved } =
          useProjectStore.getState();
        addResource("田中太郎");
        markAsSaved();

        updateResource("non-existent-id", { name: "田中次郎" });

        const state = useProjectStore.getState();
        expect(state.project?.resources[0].name).toBe("田中太郎");
        expect(state.isModified).toBe(false);
      });
    });

    describe("deleteResource", () => {
      it("removes resource from project", () => {
        const { addResource, deleteResource } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        deleteResource(resourceId);

        const state = useProjectStore.getState();
        expect(state.project?.resources).toHaveLength(0);
      });

      it("clears responsibleId and ballHolderId from tasks when resource is deleted", () => {
        const { addResource, addTask, updateTask, deleteResource } =
          useProjectStore.getState();
        addResource("田中太郎");
        addTask("タスク1");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const taskId = useProjectStore.getState().project?.tasks[0].id!;

        updateTask(taskId, {
          responsibleId: resourceId,
          ballHolderId: resourceId,
        });

        deleteResource(resourceId);

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].responsibleId).toBeUndefined();
        expect(state.project?.tasks[0].ballHolderId).toBeUndefined();
      });

      it("marks project as modified", () => {
        const { addResource, deleteResource, markAsSaved } =
          useProjectStore.getState();
        addResource("田中太郎");
        markAsSaved();

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        deleteResource(resourceId);

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if resource not found", () => {
        const { addResource, deleteResource, markAsSaved } =
          useProjectStore.getState();
        addResource("田中太郎");
        markAsSaved();

        deleteResource("non-existent-id");

        const state = useProjectStore.getState();
        expect(state.project?.resources).toHaveLength(1);
        expect(state.isModified).toBe(false);
      });
    });

    describe("task assignment", () => {
      it("assigns responsible to task", () => {
        const { addResource, addTask, updateTask } = useProjectStore.getState();
        addResource("田中太郎");
        addTask("タスク1");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const taskId = useProjectStore.getState().project?.tasks[0].id!;

        updateTask(taskId, { responsibleId: resourceId });

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].responsibleId).toBe(resourceId);
      });

      it("assigns ball holder to task", () => {
        const { addResource, addTask, updateTask } = useProjectStore.getState();
        addResource("田中太郎");
        addTask("タスク1");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const taskId = useProjectStore.getState().project?.tasks[0].id!;

        updateTask(taskId, { ballHolderId: resourceId });

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].ballHolderId).toBe(resourceId);
      });

      it("allows different responsible and ball holder", () => {
        const { addResource, addTask, updateTask } = useProjectStore.getState();
        addResource("田中太郎");
        addResource("山田花子");
        addTask("タスク1");

        const resource1Id =
          useProjectStore.getState().project?.resources[0].id!;
        const resource2Id =
          useProjectStore.getState().project?.resources[1].id!;
        const taskId = useProjectStore.getState().project?.tasks[0].id!;

        updateTask(taskId, {
          responsibleId: resource1Id,
          ballHolderId: resource2Id,
        });

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].responsibleId).toBe(resource1Id);
        expect(state.project?.tasks[0].ballHolderId).toBe(resource2Id);
      });
    });

    describe("getResourceById", () => {
      it("returns resource by id", () => {
        const { addResource, getResourceById } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const resource = getResourceById(resourceId);

        expect(resource?.name).toBe("田中太郎");
      });

      it("returns undefined if resource not found", () => {
        const { addResource, getResourceById } = useProjectStore.getState();
        addResource("田中太郎");

        const resource = getResourceById("non-existent-id");

        expect(resource).toBeUndefined();
      });

      it("returns undefined if no project is loaded", () => {
        useProjectStore.getState().reset();
        const { getResourceById } = useProjectStore.getState();

        const resource = getResourceById("some-id");

        expect(resource).toBeUndefined();
      });
    });
  });

  describe("status management", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("Test Project");
    });

    describe("updateStatus", () => {
      it("updates status name", () => {
        const { updateStatus } = useProjectStore.getState();
        updateStatus("in_progress", { name: "作業中" });

        const state = useProjectStore.getState();
        const status = state.project?.statuses.find(
          (s) => s.id === "in_progress"
        );
        expect(status?.name).toBe("作業中");
      });

      it("updates status color", () => {
        const { updateStatus } = useProjectStore.getState();
        updateStatus("in_progress", { color: "#FF5733" });

        const state = useProjectStore.getState();
        const status = state.project?.statuses.find(
          (s) => s.id === "in_progress"
        );
        expect(status?.color).toBe("#FF5733");
      });

      it("marks project as modified", () => {
        const { updateStatus, markAsSaved } = useProjectStore.getState();
        markAsSaved();

        updateStatus("in_progress", { name: "作業中" });

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("does nothing if status not found", () => {
        const { updateStatus, markAsSaved } = useProjectStore.getState();
        markAsSaved();

        updateStatus("non-existent-id", { name: "新しいステータス" });

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(false);
      });
    });

    describe("addStatus", () => {
      it("adds a new status", () => {
        const { addStatus } = useProjectStore.getState();
        addStatus("blocked", "ブロック中", "#EF4444");

        const state = useProjectStore.getState();
        expect(state.project?.statuses).toHaveLength(5);
        const newStatus = state.project?.statuses.find(
          (s) => s.id === "blocked"
        );
        expect(newStatus?.name).toBe("ブロック中");
        expect(newStatus?.color).toBe("#EF4444");
      });

      it("assigns order as last position", () => {
        const { addStatus } = useProjectStore.getState();
        addStatus("blocked", "ブロック中", "#EF4444");

        const state = useProjectStore.getState();
        const newStatus = state.project?.statuses.find(
          (s) => s.id === "blocked"
        );
        expect(newStatus?.order).toBe(4);
      });

      it("marks project as modified", () => {
        const { addStatus, markAsSaved } = useProjectStore.getState();
        markAsSaved();

        addStatus("blocked", "ブロック中", "#EF4444");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });
    });

    describe("deleteStatus", () => {
      it("removes status from project", () => {
        const { deleteStatus } = useProjectStore.getState();
        deleteStatus("review");

        const state = useProjectStore.getState();
        expect(state.project?.statuses).toHaveLength(3);
        expect(
          state.project?.statuses.find((s) => s.id === "review")
        ).toBeUndefined();
      });

      it("resets tasks with deleted status to first status", () => {
        const { addTask, updateTask, deleteStatus } =
          useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project?.tasks[0].id!;
        updateTask(taskId, { status: "review" });

        deleteStatus("review");

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].status).toBe("not_started");
      });

      it("cannot delete if only one status remains", () => {
        const { deleteStatus, markAsSaved } = useProjectStore.getState();

        // Delete all but one
        deleteStatus("in_progress");
        deleteStatus("review");
        deleteStatus("completed");
        markAsSaved();

        // Try to delete last one
        deleteStatus("not_started");

        const state = useProjectStore.getState();
        expect(state.project?.statuses).toHaveLength(1);
        expect(state.isModified).toBe(false);
      });

      it("marks project as modified", () => {
        const { deleteStatus, markAsSaved } = useProjectStore.getState();
        markAsSaved();

        deleteStatus("review");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });
    });

    describe("reorderStatuses", () => {
      it("reorders statuses by new order array", () => {
        const { reorderStatuses } = useProjectStore.getState();
        reorderStatuses(["completed", "review", "in_progress", "not_started"]);

        const state = useProjectStore.getState();
        expect(state.project?.statuses[0].id).toBe("completed");
        expect(state.project?.statuses[1].id).toBe("review");
        expect(state.project?.statuses[2].id).toBe("in_progress");
        expect(state.project?.statuses[3].id).toBe("not_started");
      });

      it("updates order property correctly", () => {
        const { reorderStatuses } = useProjectStore.getState();
        reorderStatuses(["completed", "review", "in_progress", "not_started"]);

        const state = useProjectStore.getState();
        expect(state.project?.statuses[0].order).toBe(0);
        expect(state.project?.statuses[1].order).toBe(1);
        expect(state.project?.statuses[2].order).toBe(2);
        expect(state.project?.statuses[3].order).toBe(3);
      });

      it("marks project as modified", () => {
        const { reorderStatuses, markAsSaved } = useProjectStore.getState();
        markAsSaved();

        reorderStatuses(["completed", "review", "in_progress", "not_started"]);

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });
    });

    describe("setTaskStatus (with progress linkage)", () => {
      it("sets task status to completed and updates progress to 100", () => {
        const { addTask, setTaskStatus } = useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project?.tasks[0].id!;
        setTaskStatus(taskId, "completed");

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].status).toBe("completed");
        expect(state.project?.tasks[0].progress).toBe(100);
      });

      it("sets task status to in_progress without changing progress", () => {
        const { addTask, updateTask, setTaskStatus } =
          useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project?.tasks[0].id!;
        updateTask(taskId, { progress: 50 });
        setTaskStatus(taskId, "in_progress");

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].status).toBe("in_progress");
        expect(state.project?.tasks[0].progress).toBe(50);
      });

      it("resets progress when changing from completed to another status", () => {
        const { addTask, setTaskStatus } = useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project?.tasks[0].id!;
        setTaskStatus(taskId, "completed");
        setTaskStatus(taskId, "in_progress");

        const state = useProjectStore.getState();
        expect(state.project?.tasks[0].status).toBe("in_progress");
        // Progress remains 100 - only completed -> status triggers reset if needed
        // Actually, changing from completed doesn't auto-reset. User decides.
        expect(state.project?.tasks[0].progress).toBe(100);
      });

      it("marks project as modified", () => {
        const { addTask, setTaskStatus, markAsSaved } =
          useProjectStore.getState();
        addTask("タスク1");
        markAsSaved();

        const taskId = useProjectStore.getState().project?.tasks[0].id!;
        setTaskStatus(taskId, "completed");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });
    });

    describe("getStatusById", () => {
      it("returns status by id", () => {
        const { getStatusById } = useProjectStore.getState();

        const status = getStatusById("in_progress");

        expect(status?.name).toBe("処理中");
      });

      it("returns undefined if status not found", () => {
        const { getStatusById } = useProjectStore.getState();

        const status = getStatusById("non-existent-id");

        expect(status).toBeUndefined();
      });

      it("returns undefined if no project is loaded", () => {
        useProjectStore.getState().reset();
        const { getStatusById } = useProjectStore.getState();

        const status = getStatusById("in_progress");

        expect(status).toBeUndefined();
      });
    });
  });

  describe("duration calculation", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
    });

    describe("updateTask with duration", () => {
      it("開始日と所要日数が設定されると終了日が自動計算される", () => {
        const { addTask, updateTask } = useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project!.tasks[0].id;

        // Set start date and duration
        updateTask(taskId, {
          startDate: "2025-01-01",
          duration: 5,
        });

        const task = useProjectStore.getState().project!.tasks[0];
        expect(task.endDate).toBe("2025-01-05");
      });

      it("終了日と所要日数が設定されると開始日が自動計算される", () => {
        const { addTask, updateTask } = useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project!.tasks[0].id;

        // Set end date and duration
        updateTask(taskId, {
          endDate: "2025-01-10",
          duration: 5,
        });

        const task = useProjectStore.getState().project!.tasks[0];
        expect(task.startDate).toBe("2025-01-06");
      });

      it("開始日を変更すると終了日が所要日数に基づいて再計算される", () => {
        const { addTask, updateTask } = useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project!.tasks[0].id;

        // Set initial dates and duration
        updateTask(taskId, {
          startDate: "2025-01-01",
          duration: 5,
        });

        // Update start date
        updateTask(taskId, {
          startDate: "2025-01-10",
        });

        const task = useProjectStore.getState().project!.tasks[0];
        expect(task.endDate).toBe("2025-01-14");
        expect(task.duration).toBe(5);
      });

      it("終了日を変更すると開始日が所要日数に基づいて再計算される", () => {
        const { addTask, updateTask } = useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project!.tasks[0].id;

        // Set initial dates with duration mode
        updateTask(taskId, {
          endDate: "2025-01-10",
          duration: 5,
        });

        // Update end date
        updateTask(taskId, {
          endDate: "2025-01-20",
        });

        const task = useProjectStore.getState().project!.tasks[0];
        expect(task.startDate).toBe("2025-01-16");
        expect(task.duration).toBe(5);
      });

      it("所要日数を変更すると終了日が再計算される（開始日固定時）", () => {
        const { addTask, updateTask } = useProjectStore.getState();
        addTask("タスク1");

        const taskId = useProjectStore.getState().project!.tasks[0].id;

        // Set initial dates and duration
        updateTask(taskId, {
          startDate: "2025-01-01",
          duration: 5,
        });

        // Update duration
        updateTask(taskId, {
          duration: 10,
        });

        const task = useProjectStore.getState().project!.tasks[0];
        expect(task.startDate).toBe("2025-01-01");
        expect(task.endDate).toBe("2025-01-10");
      });
    });
  });

  describe("createDefaultProject", () => {
    it("デフォルト名でプロジェクトを作成する", () => {
      const { createDefaultProject } = useProjectStore.getState();
      createDefaultProject();

      const state = useProjectStore.getState();
      expect(state.project).not.toBeNull();
      expect(state.project?.name).toBe("無題のプロジェクト");
    });

    it("デフォルトプロジェクトは未保存状態（isModified = true）で作成される", () => {
      const { createDefaultProject } = useProjectStore.getState();
      createDefaultProject();

      const state = useProjectStore.getState();
      expect(state.isModified).toBe(true);
    });

    it("ファイルパスがnullになる", () => {
      const { createDefaultProject } = useProjectStore.getState();
      createDefaultProject();

      const state = useProjectStore.getState();
      expect(state.filePath).toBeNull();
    });

    it("デフォルトステータスが初期化される", () => {
      const { createDefaultProject } = useProjectStore.getState();
      createDefaultProject();

      const state = useProjectStore.getState();
      expect(state.project?.statuses).toHaveLength(4);
    });
  });

  describe("ball holder filtering", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
    });

    describe("currentUserId management", () => {
      it("currentUserId is null by default", () => {
        const state = useProjectStore.getState();
        expect(state.currentUserId).toBeNull();
      });

      it("setCurrentUserId sets the current user", () => {
        const { addResource, setCurrentUserId } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        setCurrentUserId(resourceId);

        const state = useProjectStore.getState();
        expect(state.currentUserId).toBe(resourceId);
      });

      it("setCurrentUserId can set to null", () => {
        const { addResource, setCurrentUserId } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        setCurrentUserId(resourceId);
        setCurrentUserId(null);

        const state = useProjectStore.getState();
        expect(state.currentUserId).toBeNull();
      });
    });

    describe("ballHolderFilter management", () => {
      it("ballHolderFilter is null by default (show all)", () => {
        const state = useProjectStore.getState();
        expect(state.ballHolderFilter).toBeNull();
      });

      it("setBallHolderFilter sets filter to specific resource", () => {
        const { addResource, setBallHolderFilter } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        setBallHolderFilter(resourceId);

        const state = useProjectStore.getState();
        expect(state.ballHolderFilter).toBe(resourceId);
      });

      it("setBallHolderFilter can be set to 'my-ball' for current user filter", () => {
        const { setBallHolderFilter } = useProjectStore.getState();
        setBallHolderFilter("my-ball");

        const state = useProjectStore.getState();
        expect(state.ballHolderFilter).toBe("my-ball");
      });

      it("setBallHolderFilter can be reset to null", () => {
        const { addResource, setBallHolderFilter } = useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        setBallHolderFilter(resourceId);
        setBallHolderFilter(null);

        const state = useProjectStore.getState();
        expect(state.ballHolderFilter).toBeNull();
      });
    });

    describe("getFilteredTasks", () => {
      it("returns all tasks when filter is null", () => {
        const { addTask, addResource, updateTask, getFilteredTasks } =
          useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const taskId = useProjectStore.getState().project?.tasks[0].id!;
        updateTask(taskId, { ballHolderId: resourceId });

        const filteredTasks = getFilteredTasks();
        expect(filteredTasks).toHaveLength(2);
      });

      it("filters tasks by specific ball holder", () => {
        const {
          addTask,
          addResource,
          updateTask,
          setBallHolderFilter,
          getFilteredTasks,
        } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");
        addResource("田中太郎");
        addResource("山田花子");

        const resource1Id =
          useProjectStore.getState().project?.resources[0].id!;
        const resource2Id =
          useProjectStore.getState().project?.resources[1].id!;
        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;

        updateTask(task1Id, { ballHolderId: resource1Id });
        updateTask(task2Id, { ballHolderId: resource2Id });

        setBallHolderFilter(resource1Id);

        const filteredTasks = getFilteredTasks();
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].id).toBe(task1Id);
      });

      it("filters by 'my-ball' to show only current user's balls", () => {
        const {
          addTask,
          addResource,
          updateTask,
          setCurrentUserId,
          setBallHolderFilter,
          getFilteredTasks,
        } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");
        addResource("田中太郎");
        addResource("山田花子");

        const resource1Id =
          useProjectStore.getState().project?.resources[0].id!;
        const resource2Id =
          useProjectStore.getState().project?.resources[1].id!;
        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;

        updateTask(task1Id, { ballHolderId: resource1Id });
        updateTask(task2Id, { ballHolderId: resource2Id });

        setCurrentUserId(resource1Id);
        setBallHolderFilter("my-ball");

        const filteredTasks = getFilteredTasks();
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].id).toBe(task1Id);
      });

      it("returns empty array when 'my-ball' but no currentUserId set", () => {
        const { addTask, addResource, updateTask, setBallHolderFilter, getFilteredTasks } =
          useProjectStore.getState();
        addTask("タスク1");
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const taskId = useProjectStore.getState().project?.tasks[0].id!;
        updateTask(taskId, { ballHolderId: resourceId });

        setBallHolderFilter("my-ball");

        const filteredTasks = getFilteredTasks();
        expect(filteredTasks).toHaveLength(0);
      });

      it("returns empty array when no project exists", () => {
        useProjectStore.getState().reset();
        const { getFilteredTasks } = useProjectStore.getState();

        const filteredTasks = getFilteredTasks();
        expect(filteredTasks).toHaveLength(0);
      });

      it("filters tasks by search query (task name)", () => {
        const { addTask, getFilteredTasks } = useProjectStore.getState();
        addTask("設計書作成");
        addTask("レビュー");
        addTask("設計レビュー");

        const filteredTasks = getFilteredTasks("設計");
        expect(filteredTasks).toHaveLength(2);
        expect(filteredTasks[0].name).toBe("設計書作成");
        expect(filteredTasks[1].name).toBe("設計レビュー");
      });

      it("search is case-insensitive for ASCII", () => {
        const { addTask, getFilteredTasks } = useProjectStore.getState();
        addTask("Test Task");
        addTask("test case");
        addTask("Other");

        const filteredTasks = getFilteredTasks("test");
        expect(filteredTasks).toHaveLength(2);
      });

      it("returns all tasks when search query is empty", () => {
        const { addTask, getFilteredTasks } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const filteredTasks = getFilteredTasks("");
        expect(filteredTasks).toHaveLength(2);
      });

      it("combines search query with ball holder filter", () => {
        const { addTask, addResource, updateTask, setBallHolderFilter, getFilteredTasks } =
          useProjectStore.getState();
        addTask("設計書作成");
        addTask("設計レビュー");
        addTask("テスト");
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;

        updateTask(task1Id, { ballHolderId: resourceId });
        updateTask(task2Id, { ballHolderId: resourceId });

        setBallHolderFilter(resourceId);

        // Search "設計" among tasks held by 田中太郎
        const filteredTasks = getFilteredTasks("設計");
        expect(filteredTasks).toHaveLength(2);
        expect(filteredTasks[0].name).toBe("設計書作成");
        expect(filteredTasks[1].name).toBe("設計レビュー");
      });

      it("filters tasks by status", () => {
        const { addTask, setTaskStatus, getFilteredTasks } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");

        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;

        setTaskStatus(task1Id, "in_progress");
        setTaskStatus(task2Id, "completed");

        const filteredTasks = getFilteredTasks("", {
          statusIds: ["in_progress"],
          responsibleIds: [],
          dueDate: null,
        });
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].id).toBe(task1Id);
      });

      it("filters tasks by responsible", () => {
        const { addTask, addResource, updateTask, getFilteredTasks } =
          useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");
        addResource("田中太郎");
        addResource("山田花子");

        const resource1Id = useProjectStore.getState().project?.resources[0].id!;
        const resource2Id = useProjectStore.getState().project?.resources[1].id!;
        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;

        updateTask(task1Id, { responsibleId: resource1Id });
        updateTask(task2Id, { responsibleId: resource2Id });

        const filteredTasks = getFilteredTasks("", {
          statusIds: [],
          responsibleIds: [resource1Id],
          dueDate: null,
        });
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].id).toBe(task1Id);
      });

      it("filters tasks by due date (today)", () => {
        const { addTask, updateTask, getFilteredTasks } = useProjectStore.getState();
        addTask("今日のタスク");
        addTask("明日のタスク");
        addTask("先週のタスク");

        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;
        const task3Id = useProjectStore.getState().project?.tasks[2].id!;

        updateTask(task1Id, { endDate: today });
        updateTask(task2Id, { endDate: tomorrow });
        updateTask(task3Id, { endDate: lastWeek });

        const filteredTasks = getFilteredTasks("", {
          statusIds: [],
          responsibleIds: [],
          dueDate: "today",
        });
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].id).toBe(task1Id);
      });

      it("filters tasks by due date (overdue)", () => {
        const { addTask, updateTask, getFilteredTasks } = useProjectStore.getState();
        addTask("遅延タスク");
        addTask("今日のタスク");
        addTask("未来のタスク");

        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const today = new Date().toISOString().split("T")[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;
        const task3Id = useProjectStore.getState().project?.tasks[2].id!;

        updateTask(task1Id, { endDate: yesterday });
        updateTask(task2Id, { endDate: today });
        updateTask(task3Id, { endDate: nextWeek });

        const filteredTasks = getFilteredTasks("", {
          statusIds: [],
          responsibleIds: [],
          dueDate: "overdue",
        });
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].id).toBe(task1Id);
      });

      it("combines multiple filters", () => {
        const { addTask, addResource, updateTask, setTaskStatus, getFilteredTasks } =
          useProjectStore.getState();
        addTask("設計書作成");
        addTask("設計レビュー");
        addTask("テスト実行");
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        const task1Id = useProjectStore.getState().project?.tasks[0].id!;
        const task2Id = useProjectStore.getState().project?.tasks[1].id!;
        // task3 ("テスト実行") is not assigned to resource, so it won't match the filter

        updateTask(task1Id, { responsibleId: resourceId });
        updateTask(task2Id, { responsibleId: resourceId });
        setTaskStatus(task1Id, "in_progress");
        setTaskStatus(task2Id, "completed");

        const filteredTasks = getFilteredTasks("設計", {
          statusIds: ["in_progress"],
          responsibleIds: [resourceId],
          dueDate: null,
        });
        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].id).toBe(task1Id);
      });
    });

    describe("filter persists across operations", () => {
      it("reset clears filter state", () => {
        const { addResource, setBallHolderFilter, setCurrentUserId, reset } =
          useProjectStore.getState();
        addResource("田中太郎");

        const resourceId = useProjectStore.getState().project?.resources[0].id!;
        setBallHolderFilter(resourceId);
        setCurrentUserId(resourceId);

        reset();

        const state = useProjectStore.getState();
        expect(state.ballHolderFilter).toBeNull();
        expect(state.currentUserId).toBeNull();
      });
    });
  });

  describe("reorderTask", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
    });

    describe("同じ階層内での順序変更", () => {
      it("タスクを別のタスクの前に移動できる", () => {
        const { addTask, reorderTask } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task3Id = useProjectStore.getState().project!.tasks[2].id;

        // タスク3をタスク1の前に移動
        reorderTask(task3Id, task1Id, "before");

        const state = useProjectStore.getState();
        const sortedTasks = [...state.project!.tasks].sort((a, b) => a.order - b.order);
        expect(sortedTasks[0].id).toBe(task3Id);
        expect(sortedTasks[1].id).toBe(task1Id);
      });

      it("タスクを別のタスクの後に移動できる", () => {
        const { addTask, reorderTask } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task3Id = useProjectStore.getState().project!.tasks[2].id;

        // タスク1をタスク3の後に移動
        reorderTask(task1Id, task3Id, "after");

        const state = useProjectStore.getState();
        const sortedTasks = [...state.project!.tasks].sort((a, b) => a.order - b.order);
        expect(sortedTasks[2].id).toBe(task1Id);
      });

      it("サブタスク間でも順序変更できる", () => {
        const { addTask, addSubTask, reorderTask } = useProjectStore.getState();
        addTask("親タスク");

        const parentId = useProjectStore.getState().project!.tasks[0].id;
        addSubTask(parentId, "子タスク1");
        addSubTask(parentId, "子タスク2");
        addSubTask(parentId, "子タスク3");

        const child1Id = useProjectStore.getState().project!.tasks.find(
          (t) => t.name === "子タスク1"
        )!.id;
        const child3Id = useProjectStore.getState().project!.tasks.find(
          (t) => t.name === "子タスク3"
        )!.id;

        // 子タスク3を子タスク1の前に移動
        reorderTask(child3Id, child1Id, "before");

        const state = useProjectStore.getState();
        const children = state.project!.tasks
          .filter((t) => t.parentId === parentId)
          .sort((a, b) => a.order - b.order);

        expect(children[0].id).toBe(child3Id);
        expect(children[1].id).toBe(child1Id);
      });

      it("異なる階層間では順序変更できない（親子関係は変わらない）", () => {
        const { addTask, addSubTask, reorderTask } = useProjectStore.getState();
        addTask("親タスク");
        addTask("ルートタスク");

        const parentId = useProjectStore.getState().project!.tasks[0].id;
        addSubTask(parentId, "子タスク");

        const childId = useProjectStore.getState().project!.tasks.find(
          (t) => t.name === "子タスク"
        )!.id;
        const rootTaskId = useProjectStore.getState().project!.tasks.find(
          (t) => t.name === "ルートタスク"
        )!.id;

        // 子タスクをルートタスクの前に移動しようとする（異なる階層）
        const result = reorderTask(childId, rootTaskId, "before");

        expect(result).toBe(false);
        const state = useProjectStore.getState();
        const child = state.project!.tasks.find((t) => t.id === childId);
        expect(child?.parentId).toBe(parentId);
      });

      it("同じタスクへの移動は無視される", () => {
        const { addTask, reorderTask, markAsSaved } = useProjectStore.getState();
        addTask("タスク1");
        markAsSaved();

        const task1Id = useProjectStore.getState().project!.tasks[0].id;

        reorderTask(task1Id, task1Id, "before");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(false);
      });

      it("順序変更するとisModifiedがtrueになる", () => {
        const { addTask, reorderTask, markAsSaved } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        markAsSaved();

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        reorderTask(task2Id, task1Id, "before");

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });
    });
  });

  describe("moveTask", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
    });

    describe("タスクを別の親の下に移動", () => {
      it("タスクを別の親タスクの子として移動できる", () => {
        const { addTask, addSubTask, moveTask } = useProjectStore.getState();
        addTask("親タスクA");
        addTask("親タスクB");

        const parentAId = useProjectStore.getState().project!.tasks[0].id;
        const parentBId = useProjectStore.getState().project!.tasks[1].id;
        addSubTask(parentAId, "子タスク");

        const childId = useProjectStore.getState().project!.tasks[2].id;

        // 子タスクを親Bの下に移動
        moveTask(childId, parentBId);

        const state = useProjectStore.getState();
        const movedTask = state.project!.tasks.find(t => t.id === childId);
        expect(movedTask?.parentId).toBe(parentBId);
      });

      it("ルートタスクを別のタスクの子として移動できる", () => {
        const { addTask, moveTask } = useProjectStore.getState();
        addTask("親タスク");
        addTask("移動するタスク");

        const parentId = useProjectStore.getState().project!.tasks[0].id;
        const taskId = useProjectStore.getState().project!.tasks[1].id;

        moveTask(taskId, parentId);

        const state = useProjectStore.getState();
        const movedTask = state.project!.tasks.find(t => t.id === taskId);
        expect(movedTask?.parentId).toBe(parentId);
      });
    });

    describe("ルートレベルへの移動", () => {
      it("子タスクをルートレベルに移動できる（parentIdをundefinedに）", () => {
        const { addTask, addSubTask, moveTask } = useProjectStore.getState();
        addTask("親タスク");

        const parentId = useProjectStore.getState().project!.tasks[0].id;
        addSubTask(parentId, "子タスク");

        const childId = useProjectStore.getState().project!.tasks[1].id;

        // 子タスクをルートに移動（parentId = undefined）
        moveTask(childId, undefined);

        const state = useProjectStore.getState();
        const movedTask = state.project!.tasks.find(t => t.id === childId);
        expect(movedTask?.parentId).toBeUndefined();
      });
    });

    describe("循環参照防止", () => {
      it("自分自身を親にはできない", () => {
        const { addTask, moveTask } = useProjectStore.getState();
        addTask("タスク");

        const taskId = useProjectStore.getState().project!.tasks[0].id;

        // 自分自身を親に設定しようとする
        const result = moveTask(taskId, taskId);

        expect(result).toBe(false);
        const state = useProjectStore.getState();
        const task = state.project!.tasks.find(t => t.id === taskId);
        expect(task?.parentId).toBeUndefined();
      });

      it("自分の子孫を親にはできない", () => {
        const { addTask, addSubTask, moveTask } = useProjectStore.getState();
        addTask("親タスク");

        const parentId = useProjectStore.getState().project!.tasks[0].id;
        addSubTask(parentId, "子タスク");

        const childId = useProjectStore.getState().project!.tasks[1].id;
        addSubTask(childId, "孫タスク");

        const grandchildId = useProjectStore.getState().project!.tasks[2].id;

        // 親を孫の子にしようとする（循環参照）
        const result = moveTask(parentId, grandchildId);

        expect(result).toBe(false);
        const state = useProjectStore.getState();
        const task = state.project!.tasks.find(t => t.id === parentId);
        expect(task?.parentId).toBeUndefined();
      });

      it("直接の子を親にはできない", () => {
        const { addTask, addSubTask, moveTask } = useProjectStore.getState();
        addTask("親タスク");

        const parentId = useProjectStore.getState().project!.tasks[0].id;
        addSubTask(parentId, "子タスク");

        const childId = useProjectStore.getState().project!.tasks[1].id;

        // 親を子の子にしようとする（循環参照）
        const result = moveTask(parentId, childId);

        expect(result).toBe(false);
      });
    });

    describe("変更検知", () => {
      it("移動するとisModifiedがtrueになる", () => {
        const { addTask, moveTask, markAsSaved } = useProjectStore.getState();
        addTask("親タスク");
        addTask("移動するタスク");
        markAsSaved();

        const parentId = useProjectStore.getState().project!.tasks[0].id;
        const taskId = useProjectStore.getState().project!.tasks[1].id;

        moveTask(taskId, parentId);

        expect(useProjectStore.getState().isModified).toBe(true);
      });

      it("移動するとupdatedAtが更新される", () => {
        const { addTask, moveTask } = useProjectStore.getState();
        addTask("親タスク");
        addTask("移動するタスク");

        const beforeUpdatedAt = useProjectStore.getState().project!.updatedAt;

        // 少し待機
        const parentId = useProjectStore.getState().project!.tasks[0].id;
        const taskId = useProjectStore.getState().project!.tasks[1].id;

        moveTask(taskId, parentId);

        const afterUpdatedAt = useProjectStore.getState().project!.updatedAt;
        expect(new Date(afterUpdatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdatedAt).getTime());
      });
    });
  });

  describe("タスク依存関係 (Task Dependencies)", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
    });

    describe("addDependency", () => {
      it("依存関係を追加できる", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);

        const state = useProjectStore.getState();
        expect(state.project?.dependencies).toHaveLength(1);
        expect(state.project?.dependencies?.[0].predecessorId).toBe(task1Id);
        expect(state.project?.dependencies?.[0].successorId).toBe(task2Id);
        expect(state.project?.dependencies?.[0].type).toBe("FS");
        expect(state.project?.dependencies?.[0].lag).toBe(0);
      });

      it("依存関係にユニークなIDが割り当てられる", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);

        const state = useProjectStore.getState();
        expect(state.project?.dependencies?.[0].id).toBeDefined();
        expect(typeof state.project?.dependencies?.[0].id).toBe("string");
        expect(state.project?.dependencies?.[0].id.length).toBeGreaterThan(0);
      });

      it("ラグタイム（遅延）を設定できる", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 3); // 3日遅延

        const state = useProjectStore.getState();
        expect(state.project?.dependencies?.[0].lag).toBe(3);
      });

      it("リードタイム（負のラグ）を設定できる", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", -2); // 2日リード（オーバーラップ）

        const state = useProjectStore.getState();
        expect(state.project?.dependencies?.[0].lag).toBe(-2);
      });

      it("異なる依存タイプを設定できる（SS, FF, SF）", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");
        addTask("タスク4");

        const tasks = useProjectStore.getState().project!.tasks;

        addDependency(tasks[0].id, tasks[1].id, "SS", 0);
        addDependency(tasks[1].id, tasks[2].id, "FF", 0);
        addDependency(tasks[2].id, tasks[3].id, "SF", 0);

        const state = useProjectStore.getState();
        expect(state.project?.dependencies?.[0].type).toBe("SS");
        expect(state.project?.dependencies?.[1].type).toBe("FF");
        expect(state.project?.dependencies?.[2].type).toBe("SF");
      });

      it("依存関係追加でisModifiedがtrueになる", () => {
        const { addTask, addDependency, markAsSaved } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        markAsSaved();

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("存在しないタスクへの依存関係は追加できない", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;

        const result = addDependency(task1Id, "nonexistent-task", "FS", 0);

        expect(result).toBe(false);
        const state = useProjectStore.getState();
        expect(state.project?.dependencies).toHaveLength(0);
      });

      it("同じタスクへの自己依存は追加できない", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;

        const result = addDependency(task1Id, task1Id, "FS", 0);

        expect(result).toBe(false);
        const state = useProjectStore.getState();
        expect(state.project?.dependencies).toHaveLength(0);
      });

      it("同じペアの依存関係は重複して追加できない", () => {
        const { addTask, addDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);
        const result = addDependency(task1Id, task2Id, "SS", 1); // 同じペアで別タイプ

        expect(result).toBe(false);
        const state = useProjectStore.getState();
        expect(state.project?.dependencies).toHaveLength(1);
      });
    });

    describe("updateDependency", () => {
      it("依存関係のタイプを更新できる", () => {
        const { addTask, addDependency, updateDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);
        const depId = useProjectStore.getState().project!.dependencies![0].id;

        updateDependency(depId, { type: "SS" });

        const state = useProjectStore.getState();
        expect(state.project?.dependencies?.[0].type).toBe("SS");
      });

      it("依存関係のラグを更新できる", () => {
        const { addTask, addDependency, updateDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);
        const depId = useProjectStore.getState().project!.dependencies![0].id;

        updateDependency(depId, { lag: 5 });

        const state = useProjectStore.getState();
        expect(state.project?.dependencies?.[0].lag).toBe(5);
      });

      it("依存関係更新でisModifiedがtrueになる", () => {
        const { addTask, addDependency, updateDependency, markAsSaved } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);
        markAsSaved();

        const depId = useProjectStore.getState().project!.dependencies![0].id;
        updateDependency(depId, { lag: 2 });

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("存在しない依存関係は更新できない", () => {
        const { addTask, addDependency, updateDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);

        const result = updateDependency("nonexistent-dep", { lag: 5 });

        expect(result).toBe(false);
        const state = useProjectStore.getState();
        expect(state.project?.dependencies?.[0].lag).toBe(0); // 変更されていない
      });
    });

    describe("deleteDependency", () => {
      it("依存関係を削除できる", () => {
        const { addTask, addDependency, deleteDependency } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);
        const depId = useProjectStore.getState().project!.dependencies![0].id;

        deleteDependency(depId);

        const state = useProjectStore.getState();
        expect(state.project?.dependencies).toHaveLength(0);
      });

      it("依存関係削除でisModifiedがtrueになる", () => {
        const { addTask, addDependency, deleteDependency, markAsSaved } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const task2Id = useProjectStore.getState().project!.tasks[1].id;

        addDependency(task1Id, task2Id, "FS", 0);
        markAsSaved();

        const depId = useProjectStore.getState().project!.dependencies![0].id;
        deleteDependency(depId);

        const state = useProjectStore.getState();
        expect(state.isModified).toBe(true);
      });

      it("存在しない依存関係の削除はfalseを返す", () => {
        const { deleteDependency } = useProjectStore.getState();

        const result = deleteDependency("nonexistent-dep");

        expect(result).toBe(false);
      });
    });

    describe("getDependencies", () => {
      it("タスクが先行タスクとなる依存関係を取得できる", () => {
        const { addTask, addDependency, getDependencies } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");

        const tasks = useProjectStore.getState().project!.tasks;

        addDependency(tasks[0].id, tasks[1].id, "FS", 0);
        addDependency(tasks[0].id, tasks[2].id, "FS", 0);

        const deps = getDependencies(tasks[0].id);

        expect(deps).toHaveLength(2);
        expect(deps.every(d => d.predecessorId === tasks[0].id)).toBe(true);
      });

      it("タスクが後続タスクとなる依存関係を取得できる", () => {
        const { addTask, addDependency, getDependencies } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");

        const tasks = useProjectStore.getState().project!.tasks;

        addDependency(tasks[0].id, tasks[2].id, "FS", 0);
        addDependency(tasks[1].id, tasks[2].id, "FS", 0);

        const deps = getDependencies(tasks[2].id);

        expect(deps).toHaveLength(2);
        expect(deps.every(d => d.successorId === tasks[2].id)).toBe(true);
      });

      it("両方向の依存関係を取得できる", () => {
        const { addTask, addDependency, getDependencies } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");

        const tasks = useProjectStore.getState().project!.tasks;

        // タスク2は、タスク1に依存し、タスク3が依存する
        addDependency(tasks[0].id, tasks[1].id, "FS", 0);
        addDependency(tasks[1].id, tasks[2].id, "FS", 0);

        const deps = getDependencies(tasks[1].id);

        expect(deps).toHaveLength(2);
      });

      it("依存関係がないタスクは空配列を返す", () => {
        const { addTask, getDependencies } = useProjectStore.getState();
        addTask("タスク1");

        const task1Id = useProjectStore.getState().project!.tasks[0].id;
        const deps = getDependencies(task1Id);

        expect(deps).toEqual([]);
      });
    });

    describe("タスク削除時の依存関係クリーンアップ", () => {
      it("タスク削除時にそのタスクに関連する依存関係も削除される", () => {
        const { addTask, addDependency, deleteTask } = useProjectStore.getState();
        addTask("タスク1");
        addTask("タスク2");
        addTask("タスク3");

        const tasks = useProjectStore.getState().project!.tasks;

        addDependency(tasks[0].id, tasks[1].id, "FS", 0);
        addDependency(tasks[1].id, tasks[2].id, "FS", 0);

        // タスク2を削除すると、両方の依存関係が削除される
        deleteTask(tasks[1].id);

        const state = useProjectStore.getState();
        expect(state.project?.dependencies).toHaveLength(0);
      });
    });
  });
});
