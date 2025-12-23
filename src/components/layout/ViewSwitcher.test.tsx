import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { ViewSwitcher } from "./ViewSwitcher";
import { useViewStore } from "@/stores/viewStore";

describe("ViewSwitcher", () => {
  beforeEach(() => {
    useViewStore.setState({ currentView: "list" });
  });

  it("renders three view buttons", () => {
    render(<ViewSwitcher />);
    expect(screen.getByRole("button", { name: /list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gantt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /kanban/i })).toBeInTheDocument();
  });

  it("highlights current view button", () => {
    render(<ViewSwitcher />);
    const listButton = screen.getByRole("button", { name: /list/i });
    expect(listButton).toHaveAttribute("data-active", "true");
  });

  it("changes view when button is clicked", () => {
    render(<ViewSwitcher />);
    const ganttButton = screen.getByRole("button", { name: /gantt/i });
    fireEvent.click(ganttButton);
    expect(useViewStore.getState().currentView).toBe("gantt");
  });

  it("updates highlighted button after view change", () => {
    render(<ViewSwitcher />);
    const ganttButton = screen.getByRole("button", { name: /gantt/i });
    fireEvent.click(ganttButton);
    expect(ganttButton).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: /list/i })).toHaveAttribute("data-active", "false");
  });
});
