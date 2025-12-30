import type { Task, TaskDependency, DependencyType } from "@/types";

export interface RelativeSchedule {
  taskId: string;
  relativeStart: number; // Day 0からの相対日数
  duration: number;
  relativeEnd: number; // relativeStart + duration - 1
}

export interface ScheduleResult {
  schedules: Map<string, RelativeSchedule>;
  hasCycle: boolean;
  totalDays: number;
}

/**
 * 依存関係とdurationから各タスクの相対開始位置を計算する
 *
 * アルゴリズム:
 * 1. 依存関係のないタスク（ルートタスク）を Day 0 に配置
 * 2. トポロジカルソートで依存関係を辿る
 * 3. 各タスクの相対開始日 = max(先行タスクの終了日 + lag)
 * 4. 循環依存の検出
 */
export function calculateRelativeSchedule(
  tasks: Task[],
  dependencies: TaskDependency[]
): ScheduleResult {
  const schedules = new Map<string, RelativeSchedule>();
  const taskMap = new Map<string, Task>();

  // タスクマップを作成
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // 各タスクの先行タスクを収集
  const predecessorMap = new Map<string, TaskDependency[]>();
  for (const task of tasks) {
    predecessorMap.set(task.id, []);
  }
  for (const dep of dependencies) {
    const deps = predecessorMap.get(dep.successorId);
    if (deps) {
      deps.push(dep);
    }
  }

  // 入次数（このタスクに依存している先行タスクの数）を計算
  const inDegree = new Map<string, number>();
  for (const task of tasks) {
    const deps = predecessorMap.get(task.id) || [];
    inDegree.set(task.id, deps.length);
  }

  // 入次数が0のタスク（依存関係のないタスク）をキューに追加
  const queue: string[] = [];
  for (const task of tasks) {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
    }
  }

  // 処理済みタスク数（循環検出用）
  let processedCount = 0;

  // トポロジカルソートで処理
  while (queue.length > 0) {
    const taskId = queue.shift()!;
    const task = taskMap.get(taskId);
    if (!task) continue;

    processedCount++;

    // このタスクの先行タスクから相対開始日を計算
    const deps = predecessorMap.get(taskId) || [];
    let relativeStart = 0;

    for (const dep of deps) {
      const predecessorSchedule = schedules.get(dep.predecessorId);
      if (predecessorSchedule) {
        const startFromDep = calculateStartFromDependency(
          predecessorSchedule,
          dep.type,
          dep.lag,
          task.duration || 1
        );
        relativeStart = Math.max(relativeStart, startFromDep);
      }
    }

    const duration = task.duration || 1;
    schedules.set(taskId, {
      taskId,
      relativeStart,
      duration,
      relativeEnd: relativeStart + duration - 1,
    });

    // 後続タスクの入次数を減らし、0になったらキューに追加
    for (const dep of dependencies) {
      if (dep.predecessorId === taskId) {
        const successorInDegree = inDegree.get(dep.successorId);
        if (successorInDegree !== undefined) {
          const newInDegree = successorInDegree - 1;
          inDegree.set(dep.successorId, newInDegree);
          if (newInDegree === 0) {
            queue.push(dep.successorId);
          }
        }
      }
    }
  }

  // 循環依存の検出
  const hasCycle = processedCount < tasks.length;

  // 循環がある場合、未処理のタスクも Day 0 に配置
  if (hasCycle) {
    for (const task of tasks) {
      if (!schedules.has(task.id)) {
        const duration = task.duration || 1;
        schedules.set(task.id, {
          taskId: task.id,
          relativeStart: 0,
          duration,
          relativeEnd: duration - 1,
        });
      }
    }
  }

  // 全体の日数を計算
  let totalDays = 0;
  for (const schedule of schedules.values()) {
    totalDays = Math.max(totalDays, schedule.relativeEnd + 1);
  }

  return {
    schedules,
    hasCycle,
    totalDays: Math.max(totalDays, 1),
  };
}

/**
 * 依存関係タイプとlagから後続タスクの開始日を計算
 */
function calculateStartFromDependency(
  predecessor: RelativeSchedule,
  type: DependencyType,
  lag: number,
  successorDuration: number
): number {
  switch (type) {
    case "FS": // Finish-to-Start: 先行タスク終了後に開始
      return predecessor.relativeEnd + 1 + lag;

    case "SS": // Start-to-Start: 先行タスク開始と同時に開始
      return predecessor.relativeStart + lag;

    case "FF": // Finish-to-Finish: 先行タスク終了と同時に終了
      // 後続タスクの終了日 = predecessor.relativeEnd + lag
      // 後続タスクの開始日 = 終了日 - duration + 1
      return predecessor.relativeEnd + lag - successorDuration + 1;

    case "SF": // Start-to-Finish: 先行タスク開始時に後続タスク終了
      // 後続タスクの終了日 = predecessor.relativeStart + lag
      // 後続タスクの開始日 = 終了日 - duration + 1
      return predecessor.relativeStart + lag - successorDuration + 1;

    default:
      return predecessor.relativeEnd + 1 + lag;
  }
}

/**
 * タスクをトポロジカル順序でソートして返す
 * ネットワーク図のレイアウトで使用
 */
export function getTopologicalOrder(
  tasks: Task[],
  dependencies: TaskDependency[]
): { levels: string[][]; taskLevel: Map<string, number> } {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // 各タスクのレベル（依存関係の深さ）を計算
  const taskLevel = new Map<string, number>();
  const predecessorMap = new Map<string, string[]>();

  for (const task of tasks) {
    predecessorMap.set(task.id, []);
  }
  for (const dep of dependencies) {
    const preds = predecessorMap.get(dep.successorId);
    if (preds) {
      preds.push(dep.predecessorId);
    }
  }

  // 各タスクのレベルを再帰的に計算
  function getLevel(taskId: string, visited: Set<string>): number {
    if (visited.has(taskId)) {
      return 0; // 循環検出時は0を返す
    }

    const cached = taskLevel.get(taskId);
    if (cached !== undefined) {
      return cached;
    }

    visited.add(taskId);
    const preds = predecessorMap.get(taskId) || [];

    if (preds.length === 0) {
      taskLevel.set(taskId, 0);
      visited.delete(taskId);
      return 0;
    }

    let maxPredLevel = -1;
    for (const predId of preds) {
      const predLevel = getLevel(predId, visited);
      maxPredLevel = Math.max(maxPredLevel, predLevel);
    }

    const level = maxPredLevel + 1;
    taskLevel.set(taskId, level);
    visited.delete(taskId);
    return level;
  }

  for (const task of tasks) {
    getLevel(task.id, new Set());
  }

  // レベルごとにタスクをグループ化
  const levels: string[][] = [];
  for (const task of tasks) {
    const level = taskLevel.get(task.id) || 0;
    while (levels.length <= level) {
      levels.push([]);
    }
    levels[level].push(task.id);
  }

  return { levels, taskLevel };
}
