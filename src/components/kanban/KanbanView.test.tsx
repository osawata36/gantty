import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { KanbanView } from "./KanbanView";
import { useProjectStore } from "@/stores/projectStore";

describe("KanbanView", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.getState().createNewProject("テストプロジェクト");
  });

  describe("空の状態", () => {
    it("タスクがない場合、空のメッセージを表示する", () => {
      render(<KanbanView />);

      expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    });
  });

  describe("レイアウト", () => {
    beforeEach(() => {
      useProjectStore.getState().addTask("タスク1");
    });

    it("ステータス列がすべて表示される", () => {
      render(<KanbanView />);

      // デフォルトのステータス列が表示される
      expect(screen.getByText("未対応")).toBeInTheDocument();
      expect(screen.getByText("処理中")).toBeInTheDocument();
      expect(screen.getByText("レビュー待ち")).toBeInTheDocument();
      expect(screen.getByText("完了")).toBeInTheDocument();
    });

    it("カンバン全体のコンテナが表示される", () => {
      render(<KanbanView />);

      expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    });
  });

  describe("タスクカード", () => {
    beforeEach(() => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project!.tasks[0].id;
      useProjectStore.getState().updateTask(taskId, {
        progress: 50,
      });
    });

    it("タスクカードが適切なステータス列に表示される", () => {
      render(<KanbanView />);

      // タスクカードが表示される
      expect(screen.getByTestId("kanban-card-0")).toBeInTheDocument();
      expect(screen.getByTestId("kanban-card-0")).toHaveTextContent("タスク1");
    });

    it("タスクカードに進捗率が表示される", () => {
      render(<KanbanView />);

      // 進捗率が表示される
      expect(screen.getByTestId("kanban-card-0")).toHaveTextContent("50%");
    });

    it("タスクカードに責任者が表示される", () => {
      useProjectStore.getState().addResource("田中太郎");
      const resourceId = useProjectStore.getState().project!.resources[0].id;
      const taskId = useProjectStore.getState().project!.tasks[0].id;
      useProjectStore.getState().updateTask(taskId, {
        responsibleId: resourceId,
      });

      render(<KanbanView />);

      expect(screen.getByTestId("kanban-card-0")).toHaveTextContent("田中太郎");
    });

    it("タスクカードにボール保持者が表示される", () => {
      useProjectStore.getState().addResource("山田花子");
      const resourceId = useProjectStore.getState().project!.resources[0].id;
      const taskId = useProjectStore.getState().project!.tasks[0].id;
      useProjectStore.getState().updateTask(taskId, {
        ballHolderId: resourceId,
      });

      render(<KanbanView />);

      expect(screen.getByTestId("kanban-card-0")).toHaveTextContent("山田花子");
    });
  });

  describe("リーフタスクのみ表示", () => {
    it("親タスクは表示されず、子タスクのみ表示される", () => {
      useProjectStore.getState().addTask("親タスク");
      const parentId = useProjectStore.getState().project!.tasks[0].id;
      useProjectStore.getState().addSubTask(parentId, "子タスク");

      render(<KanbanView />);

      // 親タスクはカードとして表示されない
      expect(screen.queryByText("親タスク")).not.toBeInTheDocument();
      // 子タスクは表示される
      expect(screen.getByText("子タスク")).toBeInTheDocument();
    });

    it("子タスクがない場合はタスク自体が表示される", () => {
      useProjectStore.getState().addTask("単独タスク");

      render(<KanbanView />);

      expect(screen.getByText("単独タスク")).toBeInTheDocument();
    });
  });

  describe("ドラッグ&ドロップ", () => {
    it("タスクカードをドラッグできる（draggable属性がある）", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<KanbanView />);

      const card = screen.getByTestId("kanban-card-0");
      expect(card).toHaveAttribute("draggable", "true");
    });

    it("ステータス列がドロップターゲットになる", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<KanbanView />);

      // 各ステータス列がドロップターゲットとして識別可能
      expect(screen.getByTestId("kanban-column-not_started")).toBeInTheDocument();
      expect(screen.getByTestId("kanban-column-in_progress")).toBeInTheDocument();
      expect(screen.getByTestId("kanban-column-review")).toBeInTheDocument();
      expect(screen.getByTestId("kanban-column-completed")).toBeInTheDocument();
    });
  });
});
