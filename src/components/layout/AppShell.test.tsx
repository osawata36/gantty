import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders header with application name", () => {
    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Gantty")).toBeInTheDocument();
  });

  it("renders main content area with children", () => {
    render(<AppShell>Test Content</AppShell>);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders toolbar area", () => {
    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("renders status bar", () => {
    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
