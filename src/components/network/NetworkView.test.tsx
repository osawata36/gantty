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

  describe("WBSビュー（デフォルト）", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("親タスク");
      const parentId = useProjectStore.getState().project!.tasks[0].id;
      useProjectStore.getState().addSubTask(parentId, "子タスク");
    });

    it("WBSボタンがデフォルトでアクティブ", () => {
      render(<NetworkView />);

      const wbsButton = screen.getByRole("button", { name: /WBS/ });
      expect(wbsButton).toHaveClass("bg-primary");
    });

    it("タスクがノードとして表示される", () => {
      render(<NetworkView />);

      expect(screen.getByText("親タスク")).toBeInTheDocument();
      expect(screen.getByText("子タスク")).toBeInTheDocument();
    });

    it("ノードをダブルクリックすると名前編集モードになる", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      const taskNode = screen.getByText("親タスク").closest("g");
      await user.dblClick(taskNode!);

      // 入力フィールドが表示される
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("親タスク");
    });

    it("ホバー時に子タスク追加ボタンが表示される", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      const taskNode = screen.getByText("親タスク").closest("g");
      await user.hover(taskNode!);

      // +ボタンのcircleが表示される（primary色）
      const circles = taskNode?.querySelectorAll("circle.fill-primary");
      expect(circles?.length).toBeGreaterThan(0);
    });

    it("操作説明がツールバーに表示される", () => {
      render(<NetworkView />);

      expect(screen.getByText(/ドラッグ&ドロップで親子関係を変更/)).toBeInTheDocument();
    });
  });

  describe("依存関係ビュー", () => {
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

    it("依存ボタンをクリックすると依存関係ビューに切り替わる", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      const depButton = screen.getByRole("button", { name: /依存/ });
      await user.click(depButton);

      expect(depButton).toHaveClass("bg-primary");
    });

    it("依存関係がエッジとして表示される", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // 依存関係ビューに切り替え
      await user.click(screen.getByRole("button", { name: /依存/ }));

      // FSラベルが表示される
      expect(screen.getByText("FS")).toBeInTheDocument();
    });

    it("ラグがある場合、ラベルに表示される", async () => {
      const deps = useProjectStore.getState().project?.dependencies ?? [];
      if (deps.length > 0) {
        useProjectStore.getState().updateDependency(deps[0].id, { lag: 2 });
      }

      const user = userEvent.setup();
      render(<NetworkView />);

      // 依存関係ビューに切り替え
      await user.click(screen.getByRole("button", { name: /依存/ }));

      // FS (+2) が表示される
      expect(screen.getByText(/FS.*\+2/)).toBeInTheDocument();
    });

    it("ノードにdurationが表示される", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // 依存関係ビューに切り替え
      await user.click(screen.getByRole("button", { name: /依存/ }));

      // 複数のタスクがあるので getAllByText を使用
      const durationTexts = screen.getAllByText("5日");
      expect(durationTexts.length).toBe(2);
    });

    it("ノードをホバーすると接続ハンドルが表示される", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // 依存関係ビューに切り替え
      await user.click(screen.getByRole("button", { name: /依存/ }));

      // ノードをホバーすると接続ハンドルが表示される
      const taskNode = screen.getByText("タスク1").closest("g");
      await user.hover(taskNode!);

      expect(screen.getByTestId("connection-handle-0")).toBeInTheDocument();
    });

    it("エッジをクリックすると選択状態になる", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // 依存関係ビューに切り替え
      await user.click(screen.getByRole("button", { name: /依存/ }));

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

      // 依存関係ビューに切り替え
      await user.click(screen.getByRole("button", { name: /依存/ }));

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

      // ズームレベルが表示される（125%になる）
      expect(screen.getByText("125%")).toBeInTheDocument();
    });

    it("ズームアウトボタンをクリックすると縮小される", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      const zoomOutButton = screen.getByRole("button", { name: /ズームアウト/ });
      await user.click(zoomOutButton);

      // ズームレベルが表示される（75%になる）
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("リセットボタンをクリックすると100%に戻る", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      // まずズームイン
      const zoomInButton = screen.getByRole("button", { name: /ズームイン/ });
      await user.click(zoomInButton);
      expect(screen.getByText("125%")).toBeInTheDocument();

      // リセット
      const resetButton = screen.getByRole("button", { name: /リセット/ });
      await user.click(resetButton);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("ビュー切り替え", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
    });

    it("WBSと依存の切り替えボタンが表示される", () => {
      render(<NetworkView />);

      expect(screen.getByRole("button", { name: /WBS/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /依存/ })).toBeInTheDocument();
    });

    it("ビュー切り替えでボタンのアクティブ状態が変わる", async () => {
      const user = userEvent.setup();
      render(<NetworkView />);

      const wbsButton = screen.getByRole("button", { name: /WBS/ });
      const depButton = screen.getByRole("button", { name: /依存/ });

      // 初期状態: WBSがアクティブ
      expect(wbsButton).toHaveClass("bg-primary");
      expect(depButton).not.toHaveClass("bg-primary");

      // 依存に切り替え
      await user.click(depButton);
      expect(wbsButton).not.toHaveClass("bg-primary");
      expect(depButton).toHaveClass("bg-primary");

      // WBSに戻す
      await user.click(wbsButton);
      expect(wbsButton).toHaveClass("bg-primary");
      expect(depButton).not.toHaveClass("bg-primary");
    });
  });
});
