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

/**
 * クリティカルパスを計算する
 *
 * クリティカルパスは、プロジェクト全体の所要時間を決定する最長経路
 * フロート（余裕時間）が0のタスクがクリティカルパス上にある
 *
 * アルゴリズム:
 * 1. フォワードパス: 各タスクの最早開始日(ES)と最早終了日(EF)を計算
 * 2. バックワードパス: 各タスクの最遅開始日(LS)と最遅終了日(LF)を計算
 * 3. フロート = LS - ES = 0 のタスクがクリティカルパス
 */
export interface CriticalPathResult {
  criticalTaskIds: Set<string>;
  taskFloats: Map<string, number>; // タスクごとの余裕日数
  projectDuration: number;
}

export function calculateCriticalPath(
  tasks: Task[],
  dependencies: TaskDependency[]
): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      criticalTaskIds: new Set(),
      taskFloats: new Map(),
      projectDuration: 0,
    };
  }

  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // 先行タスクと後続タスクのマップを作成
  const predecessorDeps = new Map<string, TaskDependency[]>();
  const successorDeps = new Map<string, TaskDependency[]>();

  for (const task of tasks) {
    predecessorDeps.set(task.id, []);
    successorDeps.set(task.id, []);
  }

  for (const dep of dependencies) {
    const preds = predecessorDeps.get(dep.successorId);
    if (preds) preds.push(dep);
    const succs = successorDeps.get(dep.predecessorId);
    if (succs) succs.push(dep);
  }

  // フォワードパス: ES（最早開始）とEF（最早終了）を計算
  const es = new Map<string, number>(); // Earliest Start
  const ef = new Map<string, number>(); // Earliest Finish

  // 入次数を計算
  const inDegree = new Map<string, number>();
  for (const task of tasks) {
    inDegree.set(task.id, (predecessorDeps.get(task.id) || []).length);
  }

  // 入次数0のタスクからスタート
  const queue: string[] = [];
  for (const task of tasks) {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
      es.set(task.id, 0);
    }
  }

  const processed = new Set<string>();

  while (queue.length > 0) {
    const taskId = queue.shift()!;
    if (processed.has(taskId)) continue;
    processed.add(taskId);

    const task = taskMap.get(taskId)!;
    const duration = task.duration || 1;
    const taskEs = es.get(taskId) || 0;
    ef.set(taskId, taskEs + duration);

    // 後続タスクのESを更新
    const succs = successorDeps.get(taskId) || [];
    for (const dep of succs) {
      const successorId = dep.successorId;
      const currentEs = es.get(successorId);
      const newEs = calculateSuccessorEs(ef.get(taskId)!, es.get(taskId)!, dep, taskMap.get(successorId)!);

      if (currentEs === undefined || newEs > currentEs) {
        es.set(successorId, newEs);
      }

      // 入次数を減らす
      const newInDegree = (inDegree.get(successorId) || 1) - 1;
      inDegree.set(successorId, newInDegree);
      if (newInDegree === 0) {
        queue.push(successorId);
      }
    }
  }

  // 循環依存のチェック - 未処理のタスクにデフォルト値を設定
  for (const task of tasks) {
    if (!es.has(task.id)) {
      es.set(task.id, 0);
      ef.set(task.id, task.duration || 1);
    }
  }

  // プロジェクト全体の終了日（最大のEF）
  let projectDuration = 0;
  for (const finish of ef.values()) {
    projectDuration = Math.max(projectDuration, finish);
  }

  // バックワードパス: LS（最遅開始）とLF（最遅終了）を計算
  const ls = new Map<string, number>(); // Latest Start
  const lf = new Map<string, number>(); // Latest Finish

  // 出次数を計算
  const outDegree = new Map<string, number>();
  for (const task of tasks) {
    outDegree.set(task.id, (successorDeps.get(task.id) || []).length);
  }

  // 終端タスク（後続がない）から逆算
  const backQueue: string[] = [];
  for (const task of tasks) {
    if (outDegree.get(task.id) === 0) {
      backQueue.push(task.id);
      lf.set(task.id, projectDuration);
    }
  }

  const backProcessed = new Set<string>();

  while (backQueue.length > 0) {
    const taskId = backQueue.shift()!;
    if (backProcessed.has(taskId)) continue;
    backProcessed.add(taskId);

    const task = taskMap.get(taskId)!;
    const duration = task.duration || 1;
    const taskLf = lf.get(taskId) || projectDuration;
    ls.set(taskId, taskLf - duration);

    // 先行タスクのLFを更新
    const preds = predecessorDeps.get(taskId) || [];
    for (const dep of preds) {
      const predecessorId = dep.predecessorId;
      const currentLf = lf.get(predecessorId);
      const newLf = calculatePredecessorLf(ls.get(taskId)!, lf.get(taskId)!, dep, taskMap.get(predecessorId)!);

      if (currentLf === undefined || newLf < currentLf) {
        lf.set(predecessorId, newLf);
      }

      // 出次数を減らす
      const newOutDegree = (outDegree.get(predecessorId) || 1) - 1;
      outDegree.set(predecessorId, newOutDegree);
      if (newOutDegree === 0) {
        backQueue.push(predecessorId);
      }
    }
  }

  // 未処理タスクにデフォルト値を設定
  for (const task of tasks) {
    if (!lf.has(task.id)) {
      lf.set(task.id, projectDuration);
      ls.set(task.id, projectDuration - (task.duration || 1));
    }
  }

  // フロートを計算してクリティカルパスを特定
  const criticalTaskIds = new Set<string>();
  const taskFloats = new Map<string, number>();

  for (const task of tasks) {
    const taskEs = es.get(task.id) || 0;
    const taskLs = ls.get(task.id) || 0;
    const float = taskLs - taskEs;
    taskFloats.set(task.id, float);

    if (float === 0) {
      criticalTaskIds.add(task.id);
    }
  }

  return {
    criticalTaskIds,
    taskFloats,
    projectDuration,
  };
}

/**
 * 依存関係タイプから後続タスクのESを計算
 */
function calculateSuccessorEs(
  predecessorEf: number,
  predecessorEs: number,
  dep: TaskDependency,
  successor: Task
): number {
  const lag = dep.lag || 0;
  const successorDuration = successor.duration || 1;

  switch (dep.type) {
    case "FS": // Finish-to-Start
      return predecessorEf + lag;
    case "SS": // Start-to-Start
      return predecessorEs + lag;
    case "FF": // Finish-to-Finish
      return predecessorEf + lag - successorDuration;
    case "SF": // Start-to-Finish
      return predecessorEs + lag - successorDuration;
    default:
      return predecessorEf + lag;
  }
}

/**
 * 依存関係タイプから先行タスクのLFを計算
 */
function calculatePredecessorLf(
  successorLs: number,
  successorLf: number,
  dep: TaskDependency,
  predecessor: Task
): number {
  const lag = dep.lag || 0;
  const predecessorDuration = predecessor.duration || 1;

  switch (dep.type) {
    case "FS": // Finish-to-Start
      return successorLs - lag;
    case "SS": // Start-to-Start
      return successorLs - lag + predecessorDuration;
    case "FF": // Finish-to-Finish
      return successorLf - lag;
    case "SF": // Start-to-Finish
      return successorLf - lag + predecessorDuration;
    default:
      return successorLs - lag;
  }
}
