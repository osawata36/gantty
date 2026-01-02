/**
 * WBS Hierarchical Tree Layout Algorithm
 * Creates a mind map-like layout for parent-child task relationships
 */

import type { Task } from "@/types";

export interface WbsNodePosition {
  taskId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  parentId: string | undefined;
  childCount: number;
  isCollapsed: boolean;
}

export interface WbsEdge {
  id: string;
  parentId: string;
  childId: string;
  parentX: number;
  parentY: number;
  childX: number;
  childY: number;
}

export interface WbsLayout {
  nodes: WbsNodePosition[];
  edges: WbsEdge[];
  width: number;
  height: number;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 40;
const PADDING = 40;

interface TreeNode {
  task: Task;
  children: TreeNode[];
  subtreeWidth: number;
  x: number;
  y: number;
}

/**
 * Build a tree structure from flat task list
 */
function buildTree(tasks: Task[], collapsedIds: Set<string>): TreeNode[] {
  const taskMap = new Map<string, Task>();
  const childrenMap = new Map<string, Task[]>();

  // Index tasks
  for (const task of tasks) {
    taskMap.set(task.id, task);
    if (!childrenMap.has(task.parentId ?? "root")) {
      childrenMap.set(task.parentId ?? "root", []);
    }
    childrenMap.get(task.parentId ?? "root")!.push(task);
  }

  // Recursively build tree
  function buildNode(task: Task): TreeNode {
    const isCollapsed = collapsedIds.has(task.id);
    const childTasks = isCollapsed ? [] : (childrenMap.get(task.id) ?? []);
    const children = childTasks.map(buildNode);

    return {
      task,
      children,
      subtreeWidth: 0,
      x: 0,
      y: 0,
    };
  }

  const rootTasks = childrenMap.get("root") ?? [];
  return rootTasks.map(buildNode);
}

/**
 * Calculate subtree widths (bottom-up)
 */
function calculateSubtreeWidths(node: TreeNode): number {
  if (node.children.length === 0) {
    node.subtreeWidth = NODE_WIDTH;
    return NODE_WIDTH;
  }

  let totalWidth = 0;
  for (const child of node.children) {
    totalWidth += calculateSubtreeWidths(child);
  }
  totalWidth += (node.children.length - 1) * HORIZONTAL_GAP;

  node.subtreeWidth = Math.max(NODE_WIDTH, totalWidth);
  return node.subtreeWidth;
}

/**
 * Assign positions (top-down)
 */
function assignPositions(node: TreeNode, x: number, y: number): void {
  // Center node within its subtree width
  node.x = x + (node.subtreeWidth - NODE_WIDTH) / 2;
  node.y = y;

  if (node.children.length === 0) return;

  // Calculate total children width
  let totalChildrenWidth = 0;
  for (const child of node.children) {
    totalChildrenWidth += child.subtreeWidth;
  }
  totalChildrenWidth += (node.children.length - 1) * HORIZONTAL_GAP;

  // Position children
  let childX = x + (node.subtreeWidth - totalChildrenWidth) / 2;
  const childY = y + NODE_HEIGHT + VERTICAL_GAP;

  for (const child of node.children) {
    assignPositions(child, childX, childY);
    childX += child.subtreeWidth + HORIZONTAL_GAP;
  }
}

/**
 * Flatten tree to node positions
 */
function flattenTree(
  nodes: TreeNode[],
  collapsedIds: Set<string>,
  result: WbsNodePosition[] = [],
  level: number = 0
): WbsNodePosition[] {
  for (const node of nodes) {
    result.push({
      taskId: node.task.id,
      x: node.x,
      y: node.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      level,
      parentId: node.task.parentId,
      childCount: node.children.length,
      isCollapsed: collapsedIds.has(node.task.id),
    });

    if (!collapsedIds.has(node.task.id)) {
      flattenTree(node.children, collapsedIds, result, level + 1);
    }
  }

  return result;
}

/**
 * Create edges between parent and children
 */
function createEdges(nodes: WbsNodePosition[]): WbsEdge[] {
  const edges: WbsEdge[] = [];
  const nodeMap = new Map<string, WbsNodePosition>();

  for (const node of nodes) {
    nodeMap.set(node.taskId, node);
  }

  for (const node of nodes) {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        edges.push({
          id: `${parent.taskId}-${node.taskId}`,
          parentId: parent.taskId,
          childId: node.taskId,
          parentX: parent.x + parent.width / 2,
          parentY: parent.y + parent.height,
          childX: node.x + node.width / 2,
          childY: node.y,
        });
      }
    }
  }

  return edges;
}

/**
 * Calculate WBS hierarchical layout
 */
export function calculateWbsLayout(
  tasks: Task[],
  collapsedIds: Set<string> = new Set()
): WbsLayout {
  if (tasks.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // Build tree structure
  const roots = buildTree(tasks, collapsedIds);

  if (roots.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // Calculate subtree widths
  let totalWidth = 0;
  for (const root of roots) {
    totalWidth += calculateSubtreeWidths(root);
  }
  totalWidth += (roots.length - 1) * HORIZONTAL_GAP;

  // Assign positions
  let currentX = PADDING;
  for (const root of roots) {
    assignPositions(root, currentX, PADDING);
    currentX += root.subtreeWidth + HORIZONTAL_GAP;
  }

  // Flatten to positions
  const nodes = flattenTree(roots, collapsedIds);

  // Create edges
  const edges = createEdges(nodes);

  // Calculate bounds
  let maxX = 0;
  let maxY = 0;
  for (const node of nodes) {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    nodes,
    edges,
    width: maxX + PADDING,
    height: maxY + PADDING,
  };
}

/**
 * Create SVG path for parent-child edge (curved)
 */
export function createWbsEdgePath(edge: WbsEdge): string {
  const { parentX, parentY, childX, childY } = edge;
  const midY = (parentY + childY) / 2;

  // Curved bezier path
  return `M ${parentX} ${parentY} C ${parentX} ${midY}, ${childX} ${midY}, ${childX} ${childY}`;
}
