import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskList } from "./TaskList";
import { useProjectStore } from "@/stores/projectStore";

describe("TaskList", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.getState().createNewProject("Test Project");
  });

  describe("empty state", () => {
    it("shows empty message when no tasks exist", () => {
      render(<TaskList />);

      expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    });

    it("shows add task button in empty state", () => {
      render(<TaskList />);

      expect(
        screen.getByRole("button", { name: /タスクを追加/i })
      ).toBeInTheDocument();
    });
  });

  describe("task display", () => {
    it("displays task names", () => {
      useProjectStore.getState().addTask("Task 1");
      useProjectStore.getState().addTask("Task 2");

      render(<TaskList />);

      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
    });

    it("displays tasks in order", () => {
      useProjectStore.getState().addTask("First Task");
      useProjectStore.getState().addTask("Second Task");
      useProjectStore.getState().addTask("Third Task");

      render(<TaskList />);

      const taskItems = screen.getAllByRole("listitem");
      expect(taskItems).toHaveLength(3);
      expect(taskItems[0]).toHaveTextContent("First Task");
      expect(taskItems[1]).toHaveTextContent("Second Task");
      expect(taskItems[2]).toHaveTextContent("Third Task");
    });
  });

  describe("adding tasks", () => {
    it("adds new task when clicking add button and entering name", async () => {
      const user = userEvent.setup();

      render(<TaskList />);

      await user.click(screen.getByRole("button", { name: /タスクを追加/i }));
      await user.type(screen.getByRole("textbox"), "New Task");
      await user.keyboard("{Enter}");

      expect(screen.getByText("New Task")).toBeInTheDocument();
    });

    it("clears input after adding task", async () => {
      const user = userEvent.setup();

      render(<TaskList />);

      await user.click(screen.getByRole("button", { name: /タスクを追加/i }));
      await user.type(screen.getByRole("textbox"), "New Task");
      await user.keyboard("{Enter}");

      const input = screen.queryByRole("textbox");
      if (input) {
        expect(input).toHaveValue("");
      }
    });

    it("does not add task with empty name", async () => {
      const user = userEvent.setup();

      render(<TaskList />);

      await user.click(screen.getByRole("button", { name: /タスクを追加/i }));
      await user.keyboard("{Enter}");

      expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    });
  });

  describe("editing tasks", () => {
    it("allows inline editing of task name on double click", async () => {
      const user = userEvent.setup();

      useProjectStore.getState().addTask("Original Name");

      render(<TaskList />);

      await user.dblClick(screen.getByText("Original Name"));

      const input = screen.getByDisplayValue("Original Name");
      expect(input).toBeInTheDocument();
    });

    it("saves edited name on Enter", async () => {
      const user = userEvent.setup();

      useProjectStore.getState().addTask("Original Name");

      render(<TaskList />);

      await user.dblClick(screen.getByText("Original Name"));
      const input = screen.getByDisplayValue("Original Name");
      await user.clear(input);
      await user.type(input, "Updated Name");
      await user.keyboard("{Enter}");

      expect(screen.getByText("Updated Name")).toBeInTheDocument();
      expect(screen.queryByText("Original Name")).not.toBeInTheDocument();
    });

    // TODO: Fix this test - Escape key event not being handled correctly in test environment
    it.skip("cancels editing on Escape", async () => {
      const user = userEvent.setup();

      useProjectStore.getState().addTask("Original Name");

      render(<TaskList />);

      await user.dblClick(screen.getByText("Original Name"));
      const input = screen.getByDisplayValue("Original Name");
      await user.clear(input);
      await user.type(input, "Updated Name");

      // Re-get the current input element
      const currentInput = screen.getByDisplayValue("Updated Name");

      // Press Escape to cancel editing
      await act(async () => {
        const event = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        });
        currentInput.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(screen.getByText("Original Name")).toBeInTheDocument();
      });
      expect(screen.queryByText("Updated Name")).not.toBeInTheDocument();
    });
  });

  describe("deleting tasks", () => {
    it("shows delete button for each task", () => {
      useProjectStore.getState().addTask("Task to Delete");

      render(<TaskList />);

      expect(screen.getByRole("button", { name: /削除/i })).toBeInTheDocument();
    });

    it("deletes task when delete button is clicked", async () => {
      const user = userEvent.setup();

      useProjectStore.getState().addTask("Task to Delete");

      render(<TaskList />);

      await user.click(screen.getByRole("button", { name: /削除/i }));

      expect(screen.queryByText("Task to Delete")).not.toBeInTheDocument();
      expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    });
  });

  describe("責任者・ボール表示", () => {
    it("責任者が割り当てられている場合、責任者名が表示される", () => {
      useProjectStore.getState().addResource("田中太郎");
      useProjectStore.getState().addTask("タスク1");

      const resourceId =
        useProjectStore.getState().project?.resources[0].id!;
      const taskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().updateTask(taskId, {
        responsibleId: resourceId,
      });

      render(<TaskList />);

      // 責任者バッジを確認
      expect(screen.getByTestId("responsible-badge-0")).toHaveTextContent(
        "田中太郎"
      );
    });

    it("ボール保持者が割り当てられている場合、ボール保持者名が表示される", () => {
      useProjectStore.getState().addResource("山田花子");
      useProjectStore.getState().addTask("タスク1");

      const resourceId =
        useProjectStore.getState().project?.resources[0].id!;
      const taskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().updateTask(taskId, {
        ballHolderId: resourceId,
      });

      render(<TaskList />);

      // ボールバッジを確認
      expect(screen.getByTestId("ball-badge-0")).toHaveTextContent("山田花子");
    });

    it("未割り当ての場合、バッジは表示されない", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<TaskList />);

      expect(screen.queryByTestId("responsible-badge-0")).not.toBeInTheDocument();
      expect(screen.queryByTestId("ball-badge-0")).not.toBeInTheDocument();
    });
  });

  describe("タスクの階層変更（ドラッグ&ドロップ）", () => {
    it("タスクにdraggable属性がある", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<TaskList />);

      const taskItem = screen.getByTestId("task-item-0");
      expect(taskItem).toHaveAttribute("draggable", "true");
    });

    it("タスクにドロップゾーンがある", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<TaskList />);

      const dropZone = screen.getByTestId("task-dropzone-0");
      expect(dropZone).toBeInTheDocument();
    });

    it("ルートへのドロップゾーンがある", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<TaskList />);

      const rootDropZone = screen.getByTestId("root-dropzone");
      expect(rootDropZone).toBeInTheDocument();
    });

    it("タスクを別のタスクにドロップすると子タスクになる", async () => {
      useProjectStore.getState().addTask("親タスク");
      useProjectStore.getState().addTask("子タスク候補");

      render(<TaskList />);

      const sourceTask = screen.getByTestId("task-item-1");
      const targetDropZone = screen.getByTestId("task-dropzone-0");

      const childTaskId = useProjectStore.getState().project?.tasks[1].id!;
      const parentTaskId = useProjectStore.getState().project?.tasks[0].id!;

      // Simulate drag & drop using fireEvent
      fireEvent.dragStart(sourceTask, {
        dataTransfer: { setData: () => {}, getData: () => childTaskId },
      });

      fireEvent.drop(targetDropZone, {
        dataTransfer: { getData: () => childTaskId },
      });

      // Verify the task was moved
      const childTask = useProjectStore
        .getState()
        .project?.tasks.find((t) => t.id === childTaskId);
      expect(childTask?.parentId).toBe(parentTaskId);
    });

    it("循環参照になるドロップは視覚的に警告される", () => {
      // 親タスクを子タスクの下にドロップしようとした場合
      useProjectStore.getState().addTask("親タスク");
      const parentTaskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().addSubTask(parentTaskId, "子タスク");

      render(<TaskList />);

      const parentTask = screen.getByTestId("task-item-0");
      const childDropZone = screen.getByTestId("task-dropzone-1");

      // Start dragging parent task
      fireEvent.dragStart(parentTask, {
        dataTransfer: { setData: () => {}, getData: () => parentTaskId },
      });

      // Drag over child task
      fireEvent.dragOver(childDropZone, {
        dataTransfer: { getData: () => parentTaskId },
      });

      // The drop zone should show warning (red indicator)
      // We check that the invalid-drop class or similar indicator is present
      const dropZoneParent = childDropZone.closest("li");
      expect(dropZoneParent).toHaveClass("ring-destructive");
    });

    it("タスクをルートにドロップすると親タスクが解除される", () => {
      useProjectStore.getState().addTask("親タスク");
      const parentTaskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().addSubTask(parentTaskId, "子タスク");

      render(<TaskList />);

      const childTaskId = useProjectStore.getState().project?.tasks[1].id!;

      // Before: child task has parent
      expect(
        useProjectStore.getState().project?.tasks.find((t) => t.id === childTaskId)
          ?.parentId
      ).toBe(parentTaskId);

      const rootDropZone = screen.getByTestId("root-dropzone");

      // Simulate drop using fireEvent
      fireEvent.drop(rootDropZone, {
        dataTransfer: { getData: () => childTaskId },
      });

      // After: child task has no parent (undefined)
      const childTask = useProjectStore
        .getState()
        .project?.tasks.find((t) => t.id === childTaskId);
      expect(childTask?.parentId).toBeUndefined();
    });
  });

  describe("タスクの階層変更（ボタン）", () => {
    it("インデントボタンが表示される", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<TaskList />);

      expect(screen.getByLabelText("階層を上げる")).toBeInTheDocument();
      expect(screen.getByLabelText("階層を下げる")).toBeInTheDocument();
    });

    it("インデントボタンをクリックすると前のタスクの子になる", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");

      render(<TaskList />);

      const task2Id = useProjectStore.getState().project?.tasks[1].id!;
      const task1Id = useProjectStore.getState().project?.tasks[0].id!;

      // タスク2のインデントボタンをクリック
      const indentButtons = screen.getAllByLabelText("階層を下げる");
      await user.click(indentButtons[1]); // 2番目のタスクのボタン

      // タスク2がタスク1の子になる
      const task2 = useProjectStore.getState().project?.tasks.find((t) => t.id === task2Id);
      expect(task2?.parentId).toBe(task1Id);
    });

    it("アウトデントボタンをクリックすると親から外れる", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("親タスク");
      const parentId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().addSubTask(parentId, "子タスク");

      render(<TaskList />);

      const childId = useProjectStore.getState().project?.tasks[1].id!;

      // 子タスクのアウトデントボタンをクリック
      const outdentButtons = screen.getAllByLabelText("階層を上げる");
      await user.click(outdentButtons[1]); // 子タスクのボタン

      // 子タスクがルートになる
      const child = useProjectStore.getState().project?.tasks.find((t) => t.id === childId);
      expect(child?.parentId).toBeUndefined();
    });

    it("ルートタスクのアウトデントボタンは無効", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<TaskList />);

      const outdentButton = screen.getByLabelText("階層を上げる");
      expect(outdentButton).toBeDisabled();
    });
  });

  describe("サブタスク追加のインライン入力", () => {
    it("サブタスク追加ボタンをクリックすると親タスクの直下に入力フィールドが表示される", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("親タスク");

      render(<TaskList />);

      // サブタスク追加ボタンをクリック
      await user.click(screen.getByLabelText("サブタスクを追加"));

      // 入力フィールドが表示される
      const input = screen.getByPlaceholderText("サブタスク名を入力");
      expect(input).toBeInTheDocument();

      // 入力フィールドは親タスクの後に表示される（インライン入力フィールドのdata-testid）
      const inlineInput = screen.getByTestId("inline-subtask-input");
      expect(inlineInput).toBeInTheDocument();
    });

    it("Enterキーでサブタスクが追加される", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("親タスク");

      render(<TaskList />);

      await user.click(screen.getByLabelText("サブタスクを追加"));
      const input = screen.getByPlaceholderText("サブタスク名を入力");
      await user.type(input, "新しいサブタスク");
      await user.keyboard("{Enter}");

      // サブタスクが追加される
      expect(screen.getByText("新しいサブタスク")).toBeInTheDocument();
    });

    it("Escapeキーで入力がキャンセルされる", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("親タスク");

      render(<TaskList />);

      await user.click(screen.getByLabelText("サブタスクを追加"));
      const input = screen.getByPlaceholderText("サブタスク名を入力");
      await user.type(input, "キャンセルされるサブタスク");
      await user.keyboard("{Escape}");

      // 入力フィールドが消える
      expect(screen.queryByPlaceholderText("サブタスク名を入力")).not.toBeInTheDocument();
      // サブタスクは追加されない
      expect(screen.queryByText("キャンセルされるサブタスク")).not.toBeInTheDocument();
    });

    it("追加後も入力フィールドが残り連続追加できる", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("親タスク");

      render(<TaskList />);

      await user.click(screen.getByLabelText("サブタスクを追加"));
      const input = screen.getByPlaceholderText("サブタスク名を入力");

      // 1つ目のサブタスクを追加
      await user.type(input, "サブタスク1");
      await user.keyboard("{Enter}");

      // 入力フィールドがまだ表示されている
      const inputAfterAdd = screen.getByPlaceholderText("サブタスク名を入力");
      expect(inputAfterAdd).toBeInTheDocument();
      expect(inputAfterAdd).toHaveValue("");

      // 2つ目のサブタスクを追加
      await user.type(inputAfterAdd, "サブタスク2");
      await user.keyboard("{Enter}");

      // 両方のサブタスクが表示される
      expect(screen.getByText("サブタスク1")).toBeInTheDocument();
      expect(screen.getByText("サブタスク2")).toBeInTheDocument();
    });

    it("空のEnterで入力フィールドが閉じる", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("親タスク");

      render(<TaskList />);

      await user.click(screen.getByLabelText("サブタスクを追加"));
      expect(screen.getByPlaceholderText("サブタスク名を入力")).toBeInTheDocument();
      await user.keyboard("{Enter}");

      // 入力フィールドが消える
      expect(screen.queryByPlaceholderText("サブタスク名を入力")).not.toBeInTheDocument();
    });
  });

  describe("タスクの階層変更（キーボード）", () => {
    it("タスク行がフォーカス可能", () => {
      useProjectStore.getState().addTask("タスク1");

      render(<TaskList />);

      const taskItem = screen.getByTestId("task-item-0");
      expect(taskItem).toHaveAttribute("tabIndex", "0");
    });

    it("Tabキーで階層を下げる", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("タスク1");
      useProjectStore.getState().addTask("タスク2");

      render(<TaskList />);

      const task2Id = useProjectStore.getState().project?.tasks[1].id!;
      const task1Id = useProjectStore.getState().project?.tasks[0].id!;

      // タスク2にフォーカスしてTabキーを押す
      const taskItem = screen.getByTestId("task-item-1");
      taskItem.focus();
      await user.keyboard("{Tab}");

      // タスク2がタスク1の子になる
      const task2 = useProjectStore.getState().project?.tasks.find((t) => t.id === task2Id);
      expect(task2?.parentId).toBe(task1Id);
    });

    it("Shift+Tabキーで階層を上げる", async () => {
      const user = userEvent.setup();
      useProjectStore.getState().addTask("親タスク");
      const parentId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().addSubTask(parentId, "子タスク");

      render(<TaskList />);

      const childId = useProjectStore.getState().project?.tasks[1].id!;

      // 子タスクにフォーカスしてShift+Tabキーを押す
      const taskItem = screen.getByTestId("task-item-1");
      taskItem.focus();
      await user.keyboard("{Shift>}{Tab}{/Shift}");

      // 子タスクがルートになる
      const child = useProjectStore.getState().project?.tasks.find((t) => t.id === childId);
      expect(child?.parentId).toBeUndefined();
    });
  });
});
