import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GanttView } from "./GanttView";
import { useProjectStore } from "@/stores/projectStore";

describe("GanttView", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });

  describe("空の状態", () => {
    it("タスクがない場合、空のメッセージを表示する", () => {
      useProjectStore.getState().createNewProject("テストプロジェクト");

      render(<GanttView />);

      expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    });
  });

  describe("レイアウト", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().updateTask(
        useProjectStore.getState().project!.tasks[0].id,
        {
          startDate: "2024-01-10",
          endDate: "2024-01-20",
        }
      );
    });

    it("左側にタスク一覧、右側にチャートを表示する", () => {
      render(<GanttView />);

      // 左側のタスク一覧エリア
      expect(screen.getByTestId("gantt-task-list")).toBeInTheDocument();

      // 右側のチャートエリア
      expect(screen.getByTestId("gantt-chart-area")).toBeInTheDocument();
    });

    it("タスク名がタスク一覧に表示される", () => {
      render(<GanttView />);

      const taskList = screen.getByTestId("gantt-task-list");
      expect(taskList).toHaveTextContent("タスク1");
    });

    it("タイムラインヘッダーが表示される", () => {
      render(<GanttView />);

      expect(screen.getByTestId("gantt-timeline-header")).toBeInTheDocument();
    });
  });

  describe("タスクバー", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      const taskId = useProjectStore.getState().project!.tasks[0].id;
      useProjectStore.getState().updateTask(taskId, {
        startDate: "2024-01-10",
        endDate: "2024-01-20",
        progress: 50,
      });
    });

    it("タスクバーが描画される", () => {
      render(<GanttView />);

      const bar = screen.getByTestId("gantt-task-bar-0");
      expect(bar).toBeInTheDocument();
    });

    it("進捗率がバー内に表示される", () => {
      render(<GanttView />);

      const progressBar = screen.getByTestId("gantt-progress-bar-0");
      expect(progressBar).toBeInTheDocument();
      // 進捗率50%のスタイルが適用されている
      expect(progressBar).toHaveStyle({ width: "50%" });
    });
  });

  describe("今日の日付ライン", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
    });

    it("今日の日付ラインが表示される", () => {
      render(<GanttView />);

      expect(screen.getByTestId("gantt-today-line")).toBeInTheDocument();
    });
  });

  describe("スケール切り替え", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
    });

    it("日/週/月のスケール切り替えボタンが表示される", () => {
      render(<GanttView />);

      expect(screen.getByRole("button", { name: "日" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "週" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "月" })).toBeInTheDocument();
    });

    it("スケールボタンをクリックするとスケールが変わる", async () => {
      const user = userEvent.setup();
      render(<GanttView />);

      const weekButton = screen.getByRole("button", { name: "週" });
      await user.click(weekButton);

      // 週ボタンがアクティブ状態になる
      expect(weekButton).toHaveClass("bg-primary");
    });

    it("週表示モードでは週番号ヘッダーが表示される", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().updateTask(
        useProjectStore.getState().project!.tasks[0].id,
        {
          startDate: "2024-01-08",
          endDate: "2024-01-14",
        }
      );

      render(<GanttView />);

      const weekButton = screen.getByRole("button", { name: "週" });
      await user.click(weekButton);

      // 週番号が表示される（W2など）
      expect(screen.getByTestId("gantt-timeline-header")).toHaveTextContent(
        /W\d+/
      );
    });

    it("月表示モードでは月ヘッダーが表示される", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().updateTask(
        useProjectStore.getState().project!.tasks[0].id,
        {
          startDate: "2024-01-01",
          endDate: "2024-03-31",
        }
      );

      render(<GanttView />);

      const monthButton = screen.getByRole("button", { name: "月" });
      await user.click(monthButton);

      // 月表示ヘッダーが表示される
      expect(screen.getByTestId("gantt-timeline-header")).toHaveTextContent(
        /1月|2月|3月/
      );
    });
  });

  describe("今日に移動", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
    });

    it("「今日に移動」ボタンが表示される", () => {
      render(<GanttView />);

      expect(
        screen.getByRole("button", { name: /今日/ })
      ).toBeInTheDocument();
    });
  });

  describe("階層構造", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("親タスク");
      const parentId = useProjectStore.getState().project!.tasks[0].id;
      useProjectStore.getState().addSubTask(parentId, "子タスク");
    });

    it("親子タスクがインデントで表示される", () => {
      render(<GanttView />);

      const parentTask = screen.getByText("親タスク");
      const childTask = screen.getByText("子タスク");

      expect(parentTask).toBeInTheDocument();
      expect(childTask).toBeInTheDocument();
    });

    it("折りたたみボタンをクリックすると子タスクが非表示になる", async () => {
      const user = userEvent.setup();
      render(<GanttView />);

      const collapseButton = screen.getByTestId("gantt-collapse-0");
      await user.click(collapseButton);

      expect(screen.queryByText("子タスク")).not.toBeInTheDocument();
    });
  });

  describe("依存関係の接続", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");
      const tasks = useProjectStore.getState().project!.tasks;
      useProjectStore.getState().updateTask(tasks[0].id, {
        startDate: "2024-01-10",
        endDate: "2024-01-15",
      });
      useProjectStore.getState().updateTask(tasks[1].id, {
        startDate: "2024-01-16",
        endDate: "2024-01-20",
      });
    });

    it("タスクバーにdata-task-id属性がある", () => {
      render(<GanttView />);

      const taskBar0 = screen.getByTestId("gantt-task-bar-0");
      const taskBar1 = screen.getByTestId("gantt-task-bar-1");

      expect(taskBar0).toHaveAttribute("data-task-id");
      expect(taskBar1).toHaveAttribute("data-task-id");
    });

    it("タスクバーに接続ハンドルが表示される", () => {
      render(<GanttView />);

      // 接続ハンドルはtitle属性で識別
      const handles = screen.getAllByTitle("ドラッグして依存関係を作成");
      expect(handles.length).toBe(2); // 2つのタスクに対して2つのハンドル
    });
  });

  describe("連動モード", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");
      const tasks = useProjectStore.getState().project!.tasks;
      useProjectStore.getState().updateTask(tasks[0].id, {
        startDate: "2024-01-10",
        endDate: "2024-01-15",
      });
      useProjectStore.getState().updateTask(tasks[1].id, {
        startDate: "2024-01-16",
        endDate: "2024-01-20",
      });
    });

    it("連動ボタンが表示される", () => {
      render(<GanttView />);

      expect(screen.getByRole("button", { name: /連動/ })).toBeInTheDocument();
    });

    it("連動ボタンをクリックするとトグルされる", async () => {
      const user = userEvent.setup();
      render(<GanttView />);

      const cascadeButton = screen.getByRole("button", { name: /連動/ });

      // 初期状態ではoutlineスタイル（OFF）
      expect(cascadeButton).not.toHaveClass("bg-primary");

      // クリックしてON
      await user.click(cascadeButton);
      expect(cascadeButton).toHaveClass("bg-primary");

      // 再度クリックしてOFF
      await user.click(cascadeButton);
      expect(cascadeButton).not.toHaveClass("bg-primary");
    });

    it("連動モードONの状態でツールチップが正しい", async () => {
      const user = userEvent.setup();
      render(<GanttView />);

      const cascadeButton = screen.getByRole("button", { name: /連動/ });
      await user.click(cascadeButton);

      expect(cascadeButton).toHaveAttribute(
        "title",
        "連動モード: ON（ドラッグ時に後続タスクも移動）"
      );
    });
  });

  describe("クリティカルパス表示", () => {
    beforeEach(() => {
      useProjectStore.getState().createNewProject("テストプロジェクト");
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");
      useProjectStore.getState().addTask("タスク3");
      const tasks = useProjectStore.getState().project!.tasks;
      // タスク1: 5日間
      useProjectStore.getState().updateTask(tasks[0].id, {
        startDate: "2024-01-10",
        endDate: "2024-01-14",
        duration: 5,
      });
      // タスク2: 3日間
      useProjectStore.getState().updateTask(tasks[1].id, {
        startDate: "2024-01-15",
        endDate: "2024-01-17",
        duration: 3,
      });
      // タスク3: 2日間
      useProjectStore.getState().updateTask(tasks[2].id, {
        startDate: "2024-01-15",
        endDate: "2024-01-16",
        duration: 2,
      });
      // タスク1 → タスク2、タスク1 → タスク3 の依存関係
      useProjectStore.getState().addDependency(tasks[0].id, tasks[1].id, "FS", 0);
      useProjectStore.getState().addDependency(tasks[0].id, tasks[2].id, "FS", 0);
    });

    it("CPボタンが表示される", () => {
      render(<GanttView />);

      expect(screen.getByRole("button", { name: /CP/ })).toBeInTheDocument();
    });

    it("CPボタンをクリックするとトグルされる", async () => {
      const user = userEvent.setup();
      render(<GanttView />);

      const cpButton = screen.getByRole("button", { name: /CP/ });

      // 初期状態ではOFF
      expect(cpButton).not.toHaveClass("bg-red-600");

      // クリックしてON
      await user.click(cpButton);
      expect(cpButton).toHaveClass("bg-red-600");

      // 再度クリックしてOFF
      await user.click(cpButton);
      expect(cpButton).not.toHaveClass("bg-red-600");
    });

    it("CP表示ONでクリティカルパス上のタスクにdata-critical属性がつく", async () => {
      const user = userEvent.setup();
      render(<GanttView />);

      const cpButton = screen.getByRole("button", { name: /CP/ });
      await user.click(cpButton);

      // タスク1とタスク2がクリティカルパス上（タスク1→タスク2が最長パス）
      const taskBar0 = screen.getByTestId("gantt-task-bar-0");
      const taskBar1 = screen.getByTestId("gantt-task-bar-1");
      const taskBar2 = screen.getByTestId("gantt-task-bar-2");

      // 最長パス上のタスクにはdata-critical="true"がある
      expect(taskBar0).toHaveAttribute("data-critical", "true");
      expect(taskBar1).toHaveAttribute("data-critical", "true");
      // タスク3は短いパスなのでクリティカルではない
      expect(taskBar2).not.toHaveAttribute("data-critical");
    });
  });
});
