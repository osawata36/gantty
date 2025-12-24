import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyProjectState } from "./EmptyProjectState";

describe("EmptyProjectState", () => {
  const mockOnNewProject = vi.fn();
  const mockOnOpenProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state message", () => {
    render(
      <EmptyProjectState
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
      />
    );

    expect(
      screen.getByText("プロジェクトが開かれていません")
    ).toBeInTheDocument();
  });

  it("renders new project button", () => {
    render(
      <EmptyProjectState
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
      />
    );

    expect(
      screen.getByRole("button", { name: /新規プロジェクト作成/i })
    ).toBeInTheDocument();
  });

  it("renders open project button", () => {
    render(
      <EmptyProjectState
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
      />
    );

    expect(
      screen.getByRole("button", { name: /プロジェクトを開く/i })
    ).toBeInTheDocument();
  });

  it("calls onNewProject when new project button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <EmptyProjectState
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /新規プロジェクト作成/i })
    );

    expect(mockOnNewProject).toHaveBeenCalled();
  });

  it("calls onOpenProject when open project button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <EmptyProjectState
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /プロジェクトを開く/i })
    );

    expect(mockOnOpenProject).toHaveBeenCalled();
  });
});
