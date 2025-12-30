import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DependencyArrows } from "./DependencyArrows";
import type { Task, TaskDependency } from "@/types";

// Mock tasks with positions
const createMockTasks = (): Task[] => [
  {
    id: "task-1",
    name: "タスク1",
    startDate: "2024-01-01",
    endDate: "2024-01-05",
    progress: 0,
    status: "not_started",
    order: 0,
  },
  {
    id: "task-2",
    name: "タスク2",
    startDate: "2024-01-06",
    endDate: "2024-01-10",
    progress: 0,
    status: "not_started",
    order: 1,
  },
  {
    id: "task-3",
    name: "タスク3",
    startDate: "2024-01-11",
    endDate: "2024-01-15",
    progress: 0,
    status: "not_started",
    order: 2,
  },
];

const createMockDependencies = (): TaskDependency[] => [
  {
    id: "dep-1",
    predecessorId: "task-1",
    successorId: "task-2",
    type: "FS",
    lag: 0,
  },
];

describe("DependencyArrows", () => {
  const defaultDateRange = {
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-31"),
  };

  it("依存関係がある場合、SVGパスを描画する", () => {
    const tasks = createMockTasks();
    const dependencies = createMockDependencies();
    const taskIndexMap = new Map([
      ["task-1", 0],
      ["task-2", 1],
      ["task-3", 2],
    ]);

    render(
      <DependencyArrows
        tasks={tasks}
        dependencies={dependencies}
        taskIndexMap={taskIndexMap}
        dateRange={defaultDateRange}
        dayWidth={40}
        rowHeight={36}
      />
    );

    // SVG要素が存在するか確認
    const svg = screen.getByTestId("dependency-arrows-svg");
    expect(svg).toBeInTheDocument();

    // パス要素が存在するか確認
    const path = svg.querySelector("path");
    expect(path).toBeInTheDocument();
  });

  it("依存関係がない場合、パスは描画されない", () => {
    const tasks = createMockTasks();
    const taskIndexMap = new Map([
      ["task-1", 0],
      ["task-2", 1],
      ["task-3", 2],
    ]);

    render(
      <DependencyArrows
        tasks={tasks}
        dependencies={[]}
        taskIndexMap={taskIndexMap}
        dateRange={defaultDateRange}
        dayWidth={40}
        rowHeight={36}
      />
    );

    const svg = screen.getByTestId("dependency-arrows-svg");
    const paths = svg.querySelectorAll("path");
    // マーカー以外のパスがないこと
    expect(paths.length).toBe(0);
  });

  it("複数の依存関係を描画できる", () => {
    const tasks = createMockTasks();
    const dependencies: TaskDependency[] = [
      {
        id: "dep-1",
        predecessorId: "task-1",
        successorId: "task-2",
        type: "FS",
        lag: 0,
      },
      {
        id: "dep-2",
        predecessorId: "task-2",
        successorId: "task-3",
        type: "FS",
        lag: 0,
      },
    ];
    const taskIndexMap = new Map([
      ["task-1", 0],
      ["task-2", 1],
      ["task-3", 2],
    ]);

    render(
      <DependencyArrows
        tasks={tasks}
        dependencies={dependencies}
        taskIndexMap={taskIndexMap}
        dateRange={defaultDateRange}
        dayWidth={40}
        rowHeight={36}
      />
    );

    const svg = screen.getByTestId("dependency-arrows-svg");
    const paths = svg.querySelectorAll("path");
    expect(paths.length).toBe(2);
  });

  it("表示されていないタスクへの依存関係はスキップされる", () => {
    const tasks = createMockTasks();
    const dependencies: TaskDependency[] = [
      {
        id: "dep-1",
        predecessorId: "task-1",
        successorId: "nonexistent-task",
        type: "FS",
        lag: 0,
      },
    ];
    const taskIndexMap = new Map([
      ["task-1", 0],
      ["task-2", 1],
    ]);

    render(
      <DependencyArrows
        tasks={tasks}
        dependencies={dependencies}
        taskIndexMap={taskIndexMap}
        dateRange={defaultDateRange}
        dayWidth={40}
        rowHeight={36}
      />
    );

    const svg = screen.getByTestId("dependency-arrows-svg");
    const paths = svg.querySelectorAll("path");
    expect(paths.length).toBe(0);
  });

  it("日付がないタスクへの依存関係はスキップされる", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        name: "タスク1",
        startDate: "2024-01-01",
        endDate: "2024-01-05",
        progress: 0,
        status: "not_started",
        order: 0,
      },
      {
        id: "task-2",
        name: "タスク2",
        // 日付がない
        progress: 0,
        status: "not_started",
        order: 1,
      },
    ];
    const dependencies: TaskDependency[] = [
      {
        id: "dep-1",
        predecessorId: "task-1",
        successorId: "task-2",
        type: "FS",
        lag: 0,
      },
    ];
    const taskIndexMap = new Map([
      ["task-1", 0],
      ["task-2", 1],
    ]);

    render(
      <DependencyArrows
        tasks={tasks}
        dependencies={dependencies}
        taskIndexMap={taskIndexMap}
        dateRange={defaultDateRange}
        dayWidth={40}
        rowHeight={36}
      />
    );

    const svg = screen.getByTestId("dependency-arrows-svg");
    const paths = svg.querySelectorAll("path");
    expect(paths.length).toBe(0);
  });
});
