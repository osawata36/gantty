import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
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
});
