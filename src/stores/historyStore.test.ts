import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore } from "./historyStore";
import type { Project } from "@/types";

function createTestProject(name: string): Project {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: [],
    resources: [],
    statuses: [],
    dependencies: [],
  };
}

describe("historyStore", () => {
  beforeEach(() => {
    useHistoryStore.setState({ past: [], future: [] });
  });

  describe("pushState", () => {
    it("履歴に状態を追加できる", () => {
      const { pushState, canUndo } = useHistoryStore.getState();
      const project = createTestProject("Test Project");

      expect(canUndo()).toBe(false);

      pushState(project);

      expect(useHistoryStore.getState().canUndo()).toBe(true);
      expect(useHistoryStore.getState().past).toHaveLength(1);
    });

    it("futureをクリアする", () => {
      const project1 = createTestProject("Project 1");
      const project2 = createTestProject("Project 2");
      const project3 = createTestProject("Project 3");

      const { pushState } = useHistoryStore.getState();
      pushState(project1);
      pushState(project2);

      // Undo to add to future
      useHistoryStore.getState().undo(project3);

      expect(useHistoryStore.getState().future).toHaveLength(1);

      // Push new state should clear future
      pushState(project3);

      expect(useHistoryStore.getState().future).toHaveLength(0);
    });

    it("最大履歴サイズを超えると古い履歴が削除される", () => {
      const { pushState } = useHistoryStore.getState();

      // Push 55 states (max is 50)
      for (let i = 0; i < 55; i++) {
        pushState(createTestProject(`Project ${i}`));
      }

      const { past } = useHistoryStore.getState();
      expect(past.length).toBe(50);
      // First project should be "Project 5" (0-4 were removed)
      expect(past[0].name).toBe("Project 5");
    });
  });

  describe("undo", () => {
    it("履歴がない場合はnullを返す", () => {
      const { undo } = useHistoryStore.getState();
      const currentProject = createTestProject("Current");

      const result = undo(currentProject);

      expect(result).toBeNull();
    });

    it("前の状態を返して現在の状態をfutureに追加する", () => {
      const project1 = createTestProject("Project 1");
      const project2 = createTestProject("Project 2");

      const { pushState } = useHistoryStore.getState();
      pushState(project1);

      const result = useHistoryStore.getState().undo(project2);

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Project 1");
      expect(useHistoryStore.getState().past).toHaveLength(0);
      expect(useHistoryStore.getState().future).toHaveLength(1);
      expect(useHistoryStore.getState().future[0].name).toBe("Project 2");
    });

    it("連続してundoできる", () => {
      const project1 = createTestProject("Project 1");
      const project2 = createTestProject("Project 2");
      const project3 = createTestProject("Project 3");
      const currentProject = createTestProject("Current");

      const { pushState } = useHistoryStore.getState();
      pushState(project1);
      pushState(project2);
      pushState(project3);

      // First undo
      const result1 = useHistoryStore.getState().undo(currentProject);
      expect(result1!.name).toBe("Project 3");
      expect(useHistoryStore.getState().past).toHaveLength(2);
      expect(useHistoryStore.getState().future).toHaveLength(1);

      // Second undo
      const result2 = useHistoryStore.getState().undo(result1!);
      expect(result2!.name).toBe("Project 2");
      expect(useHistoryStore.getState().past).toHaveLength(1);
      expect(useHistoryStore.getState().future).toHaveLength(2);

      // Third undo
      const result3 = useHistoryStore.getState().undo(result2!);
      expect(result3!.name).toBe("Project 1");
      expect(useHistoryStore.getState().past).toHaveLength(0);
      expect(useHistoryStore.getState().future).toHaveLength(3);
    });
  });

  describe("redo", () => {
    it("futureがない場合はnullを返す", () => {
      const { redo } = useHistoryStore.getState();
      const currentProject = createTestProject("Current");

      const result = redo(currentProject);

      expect(result).toBeNull();
    });

    it("次の状態を返して現在の状態をpastに追加する", () => {
      const project1 = createTestProject("Project 1");
      const currentProject = createTestProject("Current");

      const { pushState, undo } = useHistoryStore.getState();
      pushState(project1);
      undo(currentProject);

      // Now redo
      const result = useHistoryStore.getState().redo(project1);

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Current");
      expect(useHistoryStore.getState().past).toHaveLength(1);
      expect(useHistoryStore.getState().future).toHaveLength(0);
    });

    it("連続してredoできる", () => {
      const project1 = createTestProject("Project 1");
      const project2 = createTestProject("Project 2");
      const project3 = createTestProject("Project 3");
      const currentProject = createTestProject("Current");

      const { pushState } = useHistoryStore.getState();
      pushState(project1);
      pushState(project2);
      pushState(project3);

      // Undo 3 times
      // undo(current) -> returns Project 3, future = [current]
      // undo(Project 3) -> returns Project 2, future = [Project 3, current]
      // undo(Project 2) -> returns Project 1, future = [Project 2, Project 3, current]
      let current = currentProject;
      for (let i = 0; i < 3; i++) {
        const result = useHistoryStore.getState().undo(current);
        if (result) current = result;
      }

      expect(useHistoryStore.getState().past).toHaveLength(0);
      expect(useHistoryStore.getState().future).toHaveLength(3);
      expect(current.name).toBe("Project 1");

      // Redo all - future is [Project 2, Project 3, Current] (first in, first out)
      const redo1 = useHistoryStore.getState().redo(current);
      expect(redo1!.name).toBe("Project 2");

      const redo2 = useHistoryStore.getState().redo(redo1!);
      expect(redo2!.name).toBe("Project 3");

      const redo3 = useHistoryStore.getState().redo(redo2!);
      expect(redo3!.name).toBe("Current");

      expect(useHistoryStore.getState().future).toHaveLength(0);
    });
  });

  describe("canUndo / canRedo", () => {
    it("履歴の状態に応じて正しく判定する", () => {
      const project1 = createTestProject("Project 1");
      const currentProject = createTestProject("Current");

      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().canRedo()).toBe(false);

      useHistoryStore.getState().pushState(project1);

      expect(useHistoryStore.getState().canUndo()).toBe(true);
      expect(useHistoryStore.getState().canRedo()).toBe(false);

      useHistoryStore.getState().undo(currentProject);

      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().canRedo()).toBe(true);
    });
  });

  describe("clear", () => {
    it("履歴を全てクリアする", () => {
      const project1 = createTestProject("Project 1");
      const project2 = createTestProject("Project 2");

      const { pushState, undo, clear } = useHistoryStore.getState();
      pushState(project1);
      pushState(project2);
      undo(project2);

      expect(useHistoryStore.getState().past).toHaveLength(1);
      expect(useHistoryStore.getState().future).toHaveLength(1);

      clear();

      expect(useHistoryStore.getState().past).toHaveLength(0);
      expect(useHistoryStore.getState().future).toHaveLength(0);
    });
  });

  describe("ディープクローン", () => {
    it("pushStateはプロジェクトをディープクローンする", () => {
      const project = createTestProject("Test");
      project.tasks = [{ id: "1", name: "Task 1", progress: 0, order: 0, status: "not_started" }];

      const { pushState } = useHistoryStore.getState();
      pushState(project);

      // 元のプロジェクトを変更
      project.tasks[0].name = "Modified Task";

      // 履歴のプロジェクトは影響を受けない
      const { past } = useHistoryStore.getState();
      expect(past[0].tasks[0].name).toBe("Task 1");
    });
  });
});
