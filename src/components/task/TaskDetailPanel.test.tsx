import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useProjectStore } from "@/stores/projectStore";

describe("TaskDetailPanel", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.getState().createNewProject("テストプロジェクト");
  });

  describe("責任者の割り当て", () => {
    it("責任者を選択できる", async () => {
      useProjectStore.getState().addResource("田中太郎");
      useProjectStore.getState().addResource("山田花子");
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      const user = userEvent.setup();
      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // 責任者セレクトをクリック
      const responsibleTrigger = screen.getByTestId("responsible-select");
      await user.click(responsibleTrigger);

      // 田中太郎を選択
      const option = screen.getByRole("option", { name: "田中太郎" });
      await user.click(option);

      const state = useProjectStore.getState();
      const resourceId = state.project?.resources[0].id;
      expect(state.project?.tasks[0].responsibleId).toBe(resourceId);
    });

    it("責任者が割り当て済みの場合、名前が表示される", () => {
      useProjectStore.getState().addResource("田中太郎");
      useProjectStore.getState().addTask("タスク1");
      const resourceId =
        useProjectStore.getState().project?.resources[0].id!;
      const taskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().updateTask(taskId, {
        responsibleId: resourceId,
      });

      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText("田中太郎")).toBeInTheDocument();
    });
  });

  describe("ボールの割り当て", () => {
    it("ボール保持者を選択できる", async () => {
      useProjectStore.getState().addResource("田中太郎");
      useProjectStore.getState().addResource("山田花子");
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      const user = userEvent.setup();
      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // ボール保持者セレクトをクリック
      const ballHolderTrigger = screen.getByTestId("ballholder-select");
      await user.click(ballHolderTrigger);

      // 山田花子を選択
      const option = screen.getByRole("option", { name: "山田花子" });
      await user.click(option);

      const state = useProjectStore.getState();
      const resourceId = state.project?.resources[1].id;
      expect(state.project?.tasks[0].ballHolderId).toBe(resourceId);
    });

    it("ボール保持者が割り当て済みの場合、名前が表示される", () => {
      useProjectStore.getState().addResource("山田花子");
      useProjectStore.getState().addTask("タスク1");
      const resourceId =
        useProjectStore.getState().project?.resources[0].id!;
      const taskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().updateTask(taskId, {
        ballHolderId: resourceId,
      });

      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText("山田花子")).toBeInTheDocument();
    });
  });

  describe("ステータスの変更", () => {
    it("ステータスを変更できる", async () => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      const user = userEvent.setup();
      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // ステータスセレクトをクリック
      const statusTrigger = screen.getByTestId("status-select");
      await user.click(statusTrigger);

      // 完了を選択
      const option = screen.getByRole("option", { name: "完了" });
      await user.click(option);

      const state = useProjectStore.getState();
      expect(state.project?.tasks[0].status).toBe("completed");
    });

    it("ステータスを完了に変更すると進捗率が100%になる", async () => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      const user = userEvent.setup();
      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // ステータスセレクトをクリック
      const statusTrigger = screen.getByTestId("status-select");
      await user.click(statusTrigger);

      // 完了を選択
      const option = screen.getByRole("option", { name: "完了" });
      await user.click(option);

      const state = useProjectStore.getState();
      expect(state.project?.tasks[0].progress).toBe(100);
    });
  });

  describe("期間選択", () => {
    it("期間ボタンに日付未設定のプレースホルダーが表示される", () => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText("カレンダーで期間を選択")).toBeInTheDocument();
    });

    it("設定済みの期間が表示される", () => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().updateTask(taskId, {
        startDate: "2024-01-15",
        endDate: "2024-01-19",
        duration: 5,
      });

      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText(/2024年1月15日/)).toBeInTheDocument();
      expect(screen.getByText(/2024年1月19日/)).toBeInTheDocument();
      expect(screen.getByText(/5日間/)).toBeInTheDocument();
    });

    it("期間ボタンをクリックするとカレンダーが開く", async () => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      const user = userEvent.setup();
      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // 期間ボタンをクリック
      const periodButton = screen.getByText("カレンダーで期間を選択");
      await user.click(periodButton);

      // カレンダーが表示されることを確認
      expect(screen.getByText("2回クリックで期間を選択")).toBeInTheDocument();
    });

    it("所要日数を直接入力できる", async () => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      const user = userEvent.setup();
      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // 所要日数入力フィールドを取得
      const durationInput = screen.getByLabelText("所要日数");
      await user.clear(durationInput);
      await user.type(durationInput, "7");

      const state = useProjectStore.getState();
      expect(state.project?.tasks[0].duration).toBe(7);
    });

    it("日付なしでも所要日数だけ設定できることの説明がある", () => {
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project?.tasks[0].id!;

      render(
        <TaskDetailPanel
          taskId={taskId}
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText("日付なしでも所要日数だけ設定できます")).toBeInTheDocument();
    });
  });
});
