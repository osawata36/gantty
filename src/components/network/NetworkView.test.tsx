import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NetworkView } from "./NetworkView";
import { useProjectStore } from "@/stores/projectStore";

describe("NetworkView", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });

  describe("空の状態", () => {
    it("プロジェクトがない場合、メッセージを表示する", () => {
      render(<NetworkView />);

      expect(screen.getByText("プロジェクトを開いてください")).toBeInTheDocument();
    });

    it("タスクがない場合、メッセージを表示する", () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");

      render(<NetworkView />);

      expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    });
  });

  describe("タスクノード表示", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");
      const tasks = useProjectStore.getState().project!.tasks;
      useProjectStore.getState().updateTask(tasks[0].id, {
        startDate: "2024-01-10",
        endDate: "2024-01-15",
        duration: 5,
      });
      useProjectStore.getState().updateTask(tasks[1].id, {
        startDate: "2024-01-16",
        endDate: "2024-01-20",
        duration: 5,
      });
    });

    it("タスクがノードとして表示される", () => {
      render(<NetworkView />);

      expect(screen.getByText("タスク1")).toBeInTheDocument();
      expect(screen.getByText("タスク2")).toBeInTheDocument();
    });

    it("ノードにdurationが表示される", () => {
      render(<NetworkView />);

      // 複数のタスクがあるので getAllByText を使用
      const durationTexts = screen.getAllByText("5日");
      expect(durationTexts.length).toBe(2);
    });

    it("ノードをクリックすると詳細パネルが開く", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      const taskNode = screen.getByText("タスク1").closest("g");
      await user.click(taskNode!);

      // openTaskDetailが呼ばれることを確認（viewStore経由）
      const { selectedTaskId, detailPanelOpen } = (await import("@/stores/viewStore")).useViewStore.getState();
      expect(selectedTaskId).toBe(useProjectStore.getState().project!.tasks[0].id);
      expect(detailPanelOpen).toBe(true);
    });
  });

  describe("依存関係の表示", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");
      const tasks = useProjectStore.getState().project!.tasks;
      useProjectStore.getState().updateTask(tasks[0].id, {
        duration: 5,
      });
      useProjectStore.getState().updateTask(tasks[1].id, {
        duration: 5,
      });
      // タスク1 → タスク2 のFS依存関係を追加
      useProjectStore.getState().addDependency(tasks[0].id, tasks[1].id, "FS", 0);
    });

    it("依存関係がエッジとして表示される", () => {
      render(<NetworkView />);

      // FSラベルが表示される
      expect(screen.getByText("FS")).toBeInTheDocument();
    });

    it("ラグがある場合、ラベルに表示される", () => {
      const deps = useProjectStore.getState().project?.dependencies ?? [];
      if (deps.length > 0) {
        useProjectStore.getState().updateDependency(deps[0].id, { lag: 2 });
      }

      render(<NetworkView />);

      // FS (+2) が表示される
      expect(screen.getByText(/FS.*\+2/)).toBeInTheDocument();
    });
  });

  describe("ズーム機能", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
    });

    it("ズームボタンが表示される", () => {
      render(<NetworkView />);

      expect(screen.getByRole("button", { name: /ズームイン/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ズームアウト/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /リセット/ })).toBeInTheDocument();
    });

    it("ズームインボタンをクリックすると拡大される", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      const zoomInButton = screen.getByRole("button", { name: /ズームイン/ });
      await user.click(zoomInButton);

      // ズームレベルが表示される
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });
  });

  describe("ノード移動", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
    });

    it("ノードはドラッグ可能である", () => {
      render(<NetworkView />);

      // ノードにドラッグ可能な属性があることを確認
      const taskNode = screen.getByText("タスク1").closest("g");
      expect(taskNode).toHaveClass("cursor-pointer");
    });

    it("自動レイアウトボタンが表示される", () => {
      render(<NetworkView />);

      expect(screen.getByRole("button", { name: /自動レイアウト/ })).toBeInTheDocument();
    });
  });

  describe("依存関係編集", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");
      const tasks = useProjectStore.getState().project!.tasks;
      useProjectStore.getState().addDependency(tasks[0].id, tasks[1].id, "FS", 0);
    });

    it("ノードに接続ハンドルが表示される", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // ノードをホバーすると接続ハンドルが表示される
      const taskNode = screen.getByText("タスク1").closest("g");
      await user.hover(taskNode!);

      expect(screen.getByTestId("connection-handle-0")).toBeInTheDocument();
    });

    it("エッジをクリックすると選択状態になる", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // FSラベルをクリック
      const edgeLabel = screen.getByText("FS");
      await user.click(edgeLabel);

      // 選択状態になる（親gにselected classがあることを確認）
      const edgeGroup = edgeLabel.closest("g");
      expect(edgeGroup).toHaveClass("selected");
    });

    it("選択したエッジをDeleteキーで削除できる", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // エッジを選択
      const edgeLabel = screen.getByText("FS");
      await user.click(edgeLabel);

      // Deleteキーを押す
      await user.keyboard("{Delete}");

      // 依存関係が削除される
      const deps = useProjectStore.getState().project?.dependencies ?? [];
      expect(deps.length).toBe(0);
    });
  });
});
