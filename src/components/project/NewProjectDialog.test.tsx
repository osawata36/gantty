import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewProjectDialog } from "./NewProjectDialog";

describe("NewProjectDialog", () => {
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with project name input when open", () => {
    render(
      <NewProjectDialog
        open={true}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("プロジェクト名")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  it("does not render dialog when closed", () => {
    render(
      <NewProjectDialog
        open={false}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onCreateProject with project name when form is submitted", async () => {
    const user = userEvent.setup();

    render(
      <NewProjectDialog
        open={true}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    const input = screen.getByLabelText("プロジェクト名");
    await user.type(input, "My Test Project");
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(mockOnCreate).toHaveBeenCalledWith("My Test Project");
  });

  it("disables submit button when project name is empty", () => {
    render(
      <NewProjectDialog
        open={true}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    const submitButton = screen.getByRole("button", { name: "作成" });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when project name is entered", async () => {
    const user = userEvent.setup();

    render(
      <NewProjectDialog
        open={true}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    const input = screen.getByLabelText("プロジェクト名");
    await user.type(input, "New Project");

    const submitButton = screen.getByRole("button", { name: "作成" });
    expect(submitButton).not.toBeDisabled();
  });

  it("clears input when dialog is reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <NewProjectDialog
        open={true}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    const input = screen.getByLabelText("プロジェクト名");
    await user.type(input, "Some Text");

    // Close and reopen dialog
    rerender(
      <NewProjectDialog
        open={false}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );
    rerender(
      <NewProjectDialog
        open={true}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    expect(screen.getByLabelText("プロジェクト名")).toHaveValue("");
  });

  it("trims whitespace from project name", async () => {
    const user = userEvent.setup();

    render(
      <NewProjectDialog
        open={true}
        onOpenChange={() => {}}
        onCreateProject={mockOnCreate}
      />
    );

    const input = screen.getByLabelText("プロジェクト名");
    await user.type(input, "  My Project  ");
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(mockOnCreate).toHaveBeenCalledWith("My Project");
  });
});
