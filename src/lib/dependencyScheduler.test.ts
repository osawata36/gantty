import { describe, it, expect } from "vitest";
import {
  calculateRelativeSchedule,
  getTopologicalOrder,
} from "./dependencyScheduler";
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

describe("calculateRelativeSchedule", () => {
  describe("基本的なスケジュール計算", () => {
    it("依存関係のない単一タスクはDay 0から開始", () => {
      const tasks = [createTask("A", "Task A", 3)];
      const dependencies: TaskDependency[] = [];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.hasCycle).toBe(false);
      const scheduleA = result.schedules.get("A");
      expect(scheduleA).toEqual({
        taskId: "A",
        relativeStart: 0,
        duration: 3,
        relativeEnd: 2,
      });
      expect(result.totalDays).toBe(3);
    });

    it("依存関係のない複数タスクはすべてDay 0から開始", () => {
      const tasks = [
        createTask("A", "Task A", 3),
        createTask("B", "Task B", 5),
        createTask("C", "Task C", 2),
      ];
      const dependencies: TaskDependency[] = [];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("A")?.relativeStart).toBe(0);
      expect(result.schedules.get("B")?.relativeStart).toBe(0);
      expect(result.schedules.get("C")?.relativeStart).toBe(0);
      expect(result.totalDays).toBe(5); // 最長のタスクBの日数
    });

    it("durationがないタスクは1日として計算", () => {
      const tasks = [createTask("A", "Task A")]; // durationなし
      const dependencies: TaskDependency[] = [];

      const result = calculateRelativeSchedule(tasks, dependencies);

      const scheduleA = result.schedules.get("A");
      expect(scheduleA?.duration).toBe(1);
      expect(scheduleA?.relativeEnd).toBe(0);
    });
  });

  describe("Finish-to-Start (FS) 依存関係", () => {
    it("A→B: BはAの終了後に開始", () => {
      const tasks = [
        createTask("A", "Task A", 3),
        createTask("B", "Task B", 2),
      ];
      const dependencies = [createDependency("A", "B", "FS")];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("A")?.relativeStart).toBe(0);
      expect(result.schedules.get("A")?.relativeEnd).toBe(2);
      expect(result.schedules.get("B")?.relativeStart).toBe(3); // Day 3から
      expect(result.schedules.get("B")?.relativeEnd).toBe(4);
      expect(result.totalDays).toBe(5);
    });

    it("A→B→C: チェーン依存関係", () => {
      const tasks = [
        createTask("A", "Task A", 2),
        createTask("B", "Task B", 3),
        createTask("C", "Task C", 1),
      ];
      const dependencies = [
        createDependency("A", "B", "FS"),
        createDependency("B", "C", "FS"),
      ];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("A")?.relativeStart).toBe(0);
      expect(result.schedules.get("B")?.relativeStart).toBe(2);
      expect(result.schedules.get("C")?.relativeStart).toBe(5);
      expect(result.totalDays).toBe(6);
    });

    it("FS with lag: BはAの終了後+lag日後に開始", () => {
      const tasks = [
        createTask("A", "Task A", 3),
        createTask("B", "Task B", 2),
      ];
      const dependencies = [createDependency("A", "B", "FS", 2)]; // 2日のlag

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("B")?.relativeStart).toBe(5); // 3 + 2
    });

    it("FS with negative lag (lead): BはAの終了前に開始", () => {
      const tasks = [
        createTask("A", "Task A", 5),
        createTask("B", "Task B", 2),
      ];
      const dependencies = [createDependency("A", "B", "FS", -2)]; // 2日のリード

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("B")?.relativeStart).toBe(3); // 5 - 2
    });
  });

  describe("Start-to-Start (SS) 依存関係", () => {
    it("SS: BはAと同時に開始", () => {
      const tasks = [
        createTask("A", "Task A", 3),
        createTask("B", "Task B", 2),
      ];
      const dependencies = [createDependency("A", "B", "SS")];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("A")?.relativeStart).toBe(0);
      expect(result.schedules.get("B")?.relativeStart).toBe(0);
    });

    it("SS with lag: BはA開始後+lag日後に開始", () => {
      const tasks = [
        createTask("A", "Task A", 5),
        createTask("B", "Task B", 2),
      ];
      const dependencies = [createDependency("A", "B", "SS", 2)];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("B")?.relativeStart).toBe(2);
    });
  });

  describe("Finish-to-Finish (FF) 依存関係", () => {
    it("FF: BはAと同時に終了", () => {
      const tasks = [
        createTask("A", "Task A", 5),
        createTask("B", "Task B", 3),
      ];
      const dependencies = [createDependency("A", "B", "FF")];

      const result = calculateRelativeSchedule(tasks, dependencies);

      // A: 0-4 (5日間)
      // B: 終了がAと同じ4、duration=3なので開始は2
      expect(result.schedules.get("A")?.relativeEnd).toBe(4);
      expect(result.schedules.get("B")?.relativeEnd).toBe(4);
      expect(result.schedules.get("B")?.relativeStart).toBe(2);
    });
  });

  describe("Start-to-Finish (SF) 依存関係", () => {
    it("SF: BはA開始時に終了（計算上は負になるがDay0以降にクランプ）", () => {
      const tasks = [
        createTask("A", "Task A", 3),
        createTask("B", "Task B", 2),
      ];
      const dependencies = [createDependency("A", "B", "SF")];

      const result = calculateRelativeSchedule(tasks, dependencies);

      // A: 0-2
      // SF計算上はBの開始が-1だが、初期値0との比較でmax(0, -1) = 0になる
      // 実際のプロジェクトではSFは稀なケースで、通常はリードタイムとして使用
      expect(result.schedules.get("B")?.relativeStart).toBe(0);
      expect(result.schedules.get("B")?.relativeEnd).toBe(1);
    });

    it("SF with lag: 正のlagがあればBは正常にスケジュールされる", () => {
      const tasks = [
        createTask("A", "Task A", 3),
        createTask("B", "Task B", 2),
      ];
      // lag=3なので、Bの終了日 = A開始(0) + 3 = 3、開始日 = 3 - 2 + 1 = 2
      const dependencies = [createDependency("A", "B", "SF", 3)];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.schedules.get("B")?.relativeStart).toBe(2);
      expect(result.schedules.get("B")?.relativeEnd).toBe(3);
    });
  });

  describe("複数の先行タスク", () => {
    it("複数の先行タスクがある場合、最も遅い終了日に基づく", () => {
      const tasks = [
        createTask("A", "Task A", 3),
        createTask("B", "Task B", 5),
        createTask("C", "Task C", 2),
      ];
      const dependencies = [
        createDependency("A", "C", "FS"),
        createDependency("B", "C", "FS"),
      ];

      const result = calculateRelativeSchedule(tasks, dependencies);

      // A: 0-2, B: 0-4
      // CはAとBの両方の終了後に開始 → Day 5から
      expect(result.schedules.get("C")?.relativeStart).toBe(5);
    });
  });

  describe("循環依存の検出", () => {
    it("循環依存がある場合はhasCycleがtrue", () => {
      const tasks = [
        createTask("A", "Task A", 2),
        createTask("B", "Task B", 2),
      ];
      const dependencies = [
        createDependency("A", "B", "FS"),
        createDependency("B", "A", "FS"), // 循環
      ];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.hasCycle).toBe(true);
    });

    it("循環依存があっても全タスクにスケジュールが割り当てられる", () => {
      const tasks = [
        createTask("A", "Task A", 2),
        createTask("B", "Task B", 2),
        createTask("C", "Task C", 2),
      ];
      const dependencies = [
        createDependency("A", "B", "FS"),
        createDependency("B", "C", "FS"),
        createDependency("C", "A", "FS"), // 循環
      ];

      const result = calculateRelativeSchedule(tasks, dependencies);

      expect(result.hasCycle).toBe(true);
      expect(result.schedules.size).toBe(3);
    });
  });

  describe("空の入力", () => {
    it("タスクがない場合は空の結果", () => {
      const result = calculateRelativeSchedule([], []);

      expect(result.schedules.size).toBe(0);
      expect(result.hasCycle).toBe(false);
      expect(result.totalDays).toBe(1);
    });
  });
});

describe("getTopologicalOrder", () => {
  it("依存関係のないタスクはすべてレベル0", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
    ];
    const dependencies: TaskDependency[] = [];

    const result = getTopologicalOrder(tasks, dependencies);

    expect(result.levels.length).toBe(1);
    expect(result.levels[0]).toContain("A");
    expect(result.levels[0]).toContain("B");
    expect(result.levels[0]).toContain("C");
  });

  it("チェーン依存関係で正しいレベルが計算される", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
    ];
    const dependencies = [
      createDependency("A", "B", "FS"),
      createDependency("B", "C", "FS"),
    ];

    const result = getTopologicalOrder(tasks, dependencies);

    expect(result.taskLevel.get("A")).toBe(0);
    expect(result.taskLevel.get("B")).toBe(1);
    expect(result.taskLevel.get("C")).toBe(2);
    expect(result.levels.length).toBe(3);
  });

  it("複数の先行タスクがある場合、最大レベル+1になる", () => {
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
    ];
    const dependencies = [
      createDependency("A", "C", "FS"),
      createDependency("B", "C", "FS"),
    ];

    const result = getTopologicalOrder(tasks, dependencies);

    expect(result.taskLevel.get("A")).toBe(0);
    expect(result.taskLevel.get("B")).toBe(0);
    expect(result.taskLevel.get("C")).toBe(1);
  });

  it("複雑な依存関係でも正しく計算される", () => {
    // A → B → D
    // A → C → D
    const tasks = [
      createTask("A", "Task A"),
      createTask("B", "Task B"),
      createTask("C", "Task C"),
      createTask("D", "Task D"),
    ];
    const dependencies = [
      createDependency("A", "B", "FS"),
      createDependency("A", "C", "FS"),
      createDependency("B", "D", "FS"),
      createDependency("C", "D", "FS"),
    ];

    const result = getTopologicalOrder(tasks, dependencies);

    expect(result.taskLevel.get("A")).toBe(0);
    expect(result.taskLevel.get("B")).toBe(1);
    expect(result.taskLevel.get("C")).toBe(1);
    expect(result.taskLevel.get("D")).toBe(2);
  });
});
