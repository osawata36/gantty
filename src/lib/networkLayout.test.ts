import { describe, it, expect } from "vitest";
import {
  calculateNetworkLayout,
  createEdgePath,
  type EdgePath,
} from "./networkLayout";
import type { Task, TaskDependency } from "@/types";

function createTask(id: string, name: string, duration?: number): Task {
  return {
    id,
    name,
    progress: 0,
    order: 0,
    status: "not_started",
    duration,
  };
}

function createDependency(
  predecessorId: string,
  successorId: string,
  type: "FS" | "SS" | "FF" | "SF" = "FS",
  lag: number = 0
): TaskDependency {
  return {
    id: `${predecessorId}-${successorId}`,
    predecessorId,
    successorId,
    type,
    lag,
  };
}

describe("calculateNetworkLayout", () => {
  it("空のタスク配列で空のレイアウトを返す", () => {
    const result = calculateNetworkLayout([], []);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it("単一タスクで1ノードを返す", () => {
    const tasks = [createTask("A", "Task A", 3)];
    const dependencies: TaskDependency[] = [];

    const result = calculateNetworkLayout(tasks, dependencies);

    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);

    const nodeA = result.nodes.find((n) => n.taskId === "A");
    expect(nodeA).toBeDefined();
    expect(nodeA?.level).toBe(0);
  });

  it("依存関係のない複数タスクは同じレベルに配置", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
    ];
    const dependencies: TaskDependency[] = [];

    const result = calculateNetworkLayout(tasks, dependencies);

    expect(result.nodes).toHaveLength(3);

    // 全てのノードがレベル0
    for (const node of result.nodes) {
      expect(node.level).toBe(0);
    }

    // Y座標が異なる（縦に並ぶ）
    const yCoords = result.nodes.map((n) => n.y);
    expect(new Set(yCoords).size).toBe(3);
  });

  it("チェーン依存関係で正しいレベルに配置", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
    ];
    const dependencies = [
      createDependency("A", "B", "FS"),
      createDependency("B", "C", "FS"),
    ];

    const result = calculateNetworkLayout(tasks, dependencies);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);

    const nodeA = result.nodes.find((n) => n.taskId === "A");
    const nodeB = result.nodes.find((n) => n.taskId === "B");
    const nodeC = result.nodes.find((n) => n.taskId === "C");

    expect(nodeA?.level).toBe(0);
    expect(nodeB?.level).toBe(1);
    expect(nodeC?.level).toBe(2);

    // X座標がレベルに応じて増加
    expect(nodeB!.x).toBeGreaterThan(nodeA!.x);
    expect(nodeC!.x).toBeGreaterThan(nodeB!.x);
  });

  it("複数の先行タスクがある場合、正しく接続", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
    ];
    const dependencies = [
      createDependency("A", "C", "FS"),
      createDependency("B", "C", "FS"),
    ];

    const result = calculateNetworkLayout(tasks, dependencies);

    expect(result.edges).toHaveLength(2);

    const edgeAC = result.edges.find(
      (e) => e.sourceId === "A" && e.targetId === "C"
    );
    const edgeBC = result.edges.find(
      (e) => e.sourceId === "B" && e.targetId === "C"
    );

    expect(edgeAC).toBeDefined();
    expect(edgeBC).toBeDefined();
  });

  it("エッジに依存関係タイプとlagが含まれる", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
    ];
    const dependencies = [createDependency("A", "B", "SS", 2)];

    const result = calculateNetworkLayout(tasks, dependencies);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].type).toBe("SS");
    expect(result.edges[0].lag).toBe(2);
  });

  it("レイアウトの幅と高さが正しく計算される", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
    ];
    const dependencies = [
      createDependency("A", "B", "FS"),
      createDependency("B", "C", "FS"),
    ];

    const result = calculateNetworkLayout(tasks, dependencies);

    // 幅: 3レベル分のノード + ギャップ + パディング
    expect(result.width).toBeGreaterThan(0);
    // 高さ: 1ノード分 + パディング
    expect(result.height).toBeGreaterThan(0);
  });

  it("エッジの座標がノードの位置に基づいて計算される", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
    ];
    const dependencies = [createDependency("A", "B", "FS")];

    const result = calculateNetworkLayout(tasks, dependencies);

    const nodeA = result.nodes.find((n) => n.taskId === "A")!;
    const nodeB = result.nodes.find((n) => n.taskId === "B")!;
    const edge = result.edges[0];

    // sourceXはノードAの右端
    expect(edge.sourceX).toBe(nodeA.x + nodeA.width);
    // sourceYはノードAの中央
    expect(edge.sourceY).toBe(nodeA.y + nodeA.height / 2);
    // targetXはノードBの左端
    expect(edge.targetX).toBe(nodeB.x);
    // targetYはノードBの中央
    expect(edge.targetY).toBe(nodeB.y + nodeB.height / 2);
  });
});

describe("createEdgePath", () => {
  it("左から右へのパスを生成", () => {
    const edge: EdgePath = {
      id: "test",
      sourceId: "A",
      targetId: "B",
      sourceX: 100,
      sourceY: 50,
      targetX: 300,
      targetY: 50,
      type: "FS",
      lag: 0,
    };

    const path = createEdgePath(edge);

    expect(path).toContain("M 100 50");
    expect(path).toContain("C");
    expect(path).toContain("300 50");
  });

  it("バックリンク（右から左）のパスを生成", () => {
    const edge: EdgePath = {
      id: "test",
      sourceId: "A",
      targetId: "B",
      sourceX: 300,
      sourceY: 50,
      targetX: 100,
      targetY: 100,
      type: "FS",
      lag: 0,
    };

    const path = createEdgePath(edge);

    expect(path).toContain("M 300 50");
    expect(path).toContain("100 100");
  });

  it("同じY座標でもパスを生成", () => {
    const edge: EdgePath = {
      id: "test",
      sourceId: "A",
      targetId: "B",
      sourceX: 100,
      sourceY: 75,
      targetX: 300,
      targetY: 75,
      type: "FS",
      lag: 0,
    };

    const path = createEdgePath(edge);

    expect(path).toContain("M 100 75");
    expect(path).toContain("300 75");
  });
});
