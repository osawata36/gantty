import type { Task, TaskDependency } from "@/types";
import { getTopologicalOrder } from "./dependencyScheduler";

export interface NodePosition {
  taskId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
}

export interface EdgePath {
  id: string;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  type: string;
  lag: number;
}

export interface NetworkLayout {
  nodes: NodePosition[];
  edges: EdgePath[];
  width: number;
  height: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 100;
const VERTICAL_GAP = 40;
const PADDING = 40;

/**
 * Calculate network layout for tasks based on dependencies
 * Uses hierarchical layout: X = dependency depth, Y = position within level
 */
export function calculateNetworkLayout(
  tasks: Task[],
  dependencies: TaskDependency[]
): NetworkLayout {
  if (tasks.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // Get topological order and levels
  const { levels } = getTopologicalOrder(tasks, dependencies);

  // Calculate node positions
  const nodes: NodePosition[] = [];
  const nodeMap = new Map<string, NodePosition>();

  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const levelTasks = levels[levelIndex];
    const x = PADDING + levelIndex * (NODE_WIDTH + HORIZONTAL_GAP);

    for (let i = 0; i < levelTasks.length; i++) {
      const taskId = levelTasks[i];
      const y = PADDING + i * (NODE_HEIGHT + VERTICAL_GAP);

      const node: NodePosition = {
        taskId,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        level: levelIndex,
      };

      nodes.push(node);
      nodeMap.set(taskId, node);
    }
  }

  // Calculate edges
  const edges: EdgePath[] = [];

  for (const dep of dependencies) {
    const sourceNode = nodeMap.get(dep.predecessorId);
    const targetNode = nodeMap.get(dep.successorId);

    if (sourceNode && targetNode) {
      edges.push({
        id: dep.id,
        sourceId: dep.predecessorId,
        targetId: dep.successorId,
        sourceX: sourceNode.x + sourceNode.width,
        sourceY: sourceNode.y + sourceNode.height / 2,
        targetX: targetNode.x,
        targetY: targetNode.y + targetNode.height / 2,
        type: dep.type,
        lag: dep.lag,
      });
    }
  }

  // Calculate total dimensions
  const maxLevel = levels.length - 1;
  const maxNodesInLevel = Math.max(...levels.map((l) => l.length));

  const width =
    PADDING * 2 + maxLevel * (NODE_WIDTH + HORIZONTAL_GAP) + NODE_WIDTH;
  const height =
    PADDING * 2 +
    (maxNodesInLevel - 1) * (NODE_HEIGHT + VERTICAL_GAP) +
    NODE_HEIGHT;

  return {
    nodes,
    edges,
    width: Math.max(width, 400),
    height: Math.max(height, 200),
  };
}

/**
 * Create SVG path for an edge with curved line
 */
export function createEdgePath(edge: EdgePath): string {
  const { sourceX, sourceY, targetX, targetY } = edge;

  // Simple bezier curve
  const midX = (sourceX + targetX) / 2;

  if (targetX > sourceX) {
    // Normal left-to-right flow
    return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
  } else {
    // Back-link (rare case)
    const offset = 30;
    return `M ${sourceX} ${sourceY}
            L ${sourceX + offset} ${sourceY}
            Q ${sourceX + offset + 20} ${sourceY}, ${sourceX + offset + 20} ${sourceY + (targetY > sourceY ? offset : -offset)}
            L ${sourceX + offset + 20} ${targetY - (targetY > sourceY ? offset : -offset)}
            Q ${sourceX + offset + 20} ${targetY}, ${sourceX + offset} ${targetY}
            L ${targetX} ${targetY}`;
  }
}
