import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, GitBranch, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/projectStore";
import { useViewStore } from "@/stores/viewStore";
import { calculateNetworkLayout, createEdgePath } from "@/lib/networkLayout";
import { calculateWbsLayout, createWbsEdgePath } from "@/lib/wbsLayout";
import { cn } from "@/lib/utils";
import type { NodePosition } from "@/lib/networkLayout";
import type { WbsNodePosition } from "@/lib/wbsLayout";

type ViewMode = "dependency" | "wbs";

// Touch gesture constants
const DOUBLE_TAP_DELAY = 300;
const LONG_PRESS_DELAY = 400;
const TAP_MOVE_THRESHOLD = 10;

export function NetworkView() {
  const project = useProjectStore((s) => s.project);
  const openTaskDetail = useViewStore((s) => s.openTaskDetail);
  const deleteDependency = useProjectStore((s) => s.deleteDependency);
  const addSubTask = useProjectStore((s) => s.addSubTask);
  const updateTask = useProjectStore((s) => s.updateTask);
  const moveTask = useProjectStore((s) => s.moveTask);

  const [viewMode, setViewMode] = useState<ViewMode>("wbs");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Touch gesture state per node
  const gestureStateRef = useRef<Map<string, {
    startX: number;
    startY: number;
    startTime: number;
    lastTapTime: number;
    longPressTimer: ReturnType<typeof setTimeout> | null;
  }>>(new Map());

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const tasks = project?.tasks ?? [];
  const dependencies = project?.dependencies ?? [];

  const dependencyLayout = useMemo(() => {
    return calculateNetworkLayout(tasks, dependencies);
  }, [tasks, dependencies]);

  const wbsLayout = useMemo(() => {
    return calculateWbsLayout(tasks, collapsedIds);
  }, [tasks, collapsedIds]);

  const layout = viewMode === "wbs" ? wbsLayout : dependencyLayout;

  const taskMap = useMemo(() => {
    const map = new Map<string, (typeof tasks)[0]>();
    for (const task of tasks) {
      map.set(task.id, task);
    }
    return map;
  }, [tasks]);

  // Check if target is a descendant of parent
  const isDescendant = useCallback((parentId: string, childId: string): boolean => {
    const child = taskMap.get(childId);
    if (!child) return false;
    if (child.parentId === parentId) return true;
    if (child.parentId) return isDescendant(parentId, child.parentId);
    return false;
  }, [taskMap]);

  const handleNodeSelect = useCallback((taskId: string) => {
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
    setSelectedEdgeId(null);
  }, []);

  const handleNodeEdit = useCallback((taskId: string, taskName: string) => {
    setEditingTaskId(taskId);
    setEditingName(taskName);
  }, []);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelectedEdgeId((prev) => (prev === edgeId ? null : edgeId));
    setSelectedTaskId(null);
  }, []);

  const handleToggleCollapse = useCallback((taskId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleAddChild = useCallback((parentId: string) => {
    addSubTask(parentId, "新しいタスク");
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(parentId);
      return next;
    });
  }, [addSubTask]);

  const handleNameEditSubmit = useCallback(() => {
    if (editingTaskId && editingName.trim()) {
      updateTask(editingTaskId, { name: editingName.trim() });
    }
    setEditingTaskId(null);
    setEditingName("");
  }, [editingTaskId, editingName, updateTask]);

  const handleNameEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameEditSubmit();
    } else if (e.key === "Escape") {
      setEditingTaskId(null);
      setEditingName("");
    }
  }, [handleNameEditSubmit]);

  // Touch-friendly pointer handlers for WBS nodes
  const handleNodePointerDown = useCallback((taskId: string, e: React.PointerEvent) => {
    e.stopPropagation();

    const state = gestureStateRef.current.get(taskId) || {
      startX: 0,
      startY: 0,
      startTime: 0,
      lastTapTime: 0,
      longPressTimer: null,
    };

    // Clear any existing timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
    }

    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startTime = Date.now();

    // Set up long press for drag
    state.longPressTimer = setTimeout(() => {
      setDraggedTaskId(taskId);
      setIsDragging(true);
      // Visual feedback - vibrate on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_DELAY);

    gestureStateRef.current.set(taskId, state);

    // Show hover state on touch
    setHoveredTaskId(taskId);
  }, []);

  const handleNodePointerMove = useCallback((taskId: string, e: React.PointerEvent) => {
    const state = gestureStateRef.current.get(taskId);
    if (!state) return;

    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Cancel long press if moved too much before it triggered
    if (distance > TAP_MOVE_THRESHOLD && state.longPressTimer && !isDragging) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    // Update drop target while dragging
    if (isDragging && draggedTaskId) {
      // Find element under pointer
      const elementsUnderPointer = document.elementsFromPoint(e.clientX, e.clientY);
      const nodeElement = elementsUnderPointer.find(el => el.getAttribute('data-task-id'));
      const targetId = nodeElement?.getAttribute('data-task-id');

      if (targetId && targetId !== draggedTaskId && !isDescendant(draggedTaskId, targetId)) {
        setDropTargetId(targetId);
      } else {
        setDropTargetId(null);
      }
    }
  }, [isDragging, draggedTaskId, isDescendant]);

  const handleNodePointerUp = useCallback((taskId: string, e: React.PointerEvent) => {
    const state = gestureStateRef.current.get(taskId);
    if (!state) return;

    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - state.startTime;

    if (isDragging && draggedTaskId) {
      // Complete drag operation
      if (dropTargetId && dropTargetId !== draggedTaskId) {
        moveTask(draggedTaskId, dropTargetId);
      }
      setDraggedTaskId(null);
      setDropTargetId(null);
      setIsDragging(false);
    } else if (distance < TAP_MOVE_THRESHOLD && duration < LONG_PRESS_DELAY) {
      // Tap or double-tap
      const timeSinceLastTap = Date.now() - state.lastTapTime;

      if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 50) {
        // Double tap - edit name
        const task = taskMap.get(taskId);
        if (task) {
          handleNodeEdit(taskId, task.name);
        }
        state.lastTapTime = 0;
      } else {
        // Single tap - select
        state.lastTapTime = Date.now();
        handleNodeSelect(taskId);
      }
    }

    gestureStateRef.current.set(taskId, state);
  }, [isDragging, draggedTaskId, dropTargetId, moveTask, taskMap, handleNodeEdit, handleNodeSelect]);

  const handleNodePointerCancel = useCallback((taskId: string) => {
    const state = gestureStateRef.current.get(taskId);
    if (state?.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    setDraggedTaskId(null);
    setDropTargetId(null);
    setIsDragging(false);
  }, []);

  // Handle pointer enter (for mouse hover)
  const handleNodePointerEnter = useCallback((taskId: string) => {
    if (!isDragging) {
      setHoveredTaskId(taskId);
    }
  }, [isDragging]);

  // Handle pointer leave (mouse only, touch doesn't trigger this reliably)
  const handleNodePointerLeave = useCallback((taskId: string) => {
    if (!isDragging) {
      setHoveredTaskId(null);
    }
  }, [isDragging]);

  // Global pointer up handler for drag cancellation
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        setDraggedTaskId(null);
        setDropTargetId(null);
        setIsDragging(false);
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [isDragging]);

  // Handle Delete key for edges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedEdgeId && viewMode === "dependency") {
        deleteDependency(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, deleteDependency, viewMode]);

  // Focus input when editing
  useEffect(() => {
    if (editingTaskId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTaskId]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        プロジェクトを開いてください
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        タスクがありません
      </div>
    );
  }

  const scaleFactor = zoomLevel / 100;

  return (
    <div className="h-full flex flex-col touch-none">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-background border-b flex-wrap">
        {/* View mode toggle */}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === "wbs" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("wbs")}
            className="rounded-r-none min-h-[44px] min-w-[60px]"
            title="WBS階層ビュー"
          >
            <GitBranch className="h-4 w-4 mr-1" />
            WBS
          </Button>
          <Button
            variant={viewMode === "dependency" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("dependency")}
            className="rounded-l-none min-h-[44px] min-w-[60px]"
            title="依存関係ビュー"
          >
            <Network className="h-4 w-4 mr-1" />
            依存
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-2" />

        {/* Zoom controls - larger touch targets */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          aria-label="ズームイン"
          title="ズームイン"
          className="min-h-[44px] min-w-[44px]"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          aria-label="ズームアウト"
          title="ズームアウト"
          className="min-h-[44px] min-w-[44px]"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomReset}
          aria-label="リセット"
          title="ズームをリセット"
          className="min-h-[44px] min-w-[44px]"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">{zoomLevel}%</span>

        {viewMode === "wbs" && (
          <>
            <div className="h-4 w-px bg-border mx-2 hidden sm:block" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              タップで選択 • ダブルタップで編集 • 長押し+ドラッグで移動 • +で子追加
            </span>
          </>
        )}
      </div>

      {/* Drag indicator */}
      {isDragging && (
        <div className="bg-primary/10 text-primary text-sm px-4 py-2 text-center">
          ドラッグ中... 移動先のノードにドロップしてください
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/20 p-4"
        style={{ touchAction: "pan-x pan-y" }}
      >
        <svg
          width={layout.width * scaleFactor}
          height={layout.height * scaleFactor}
          className="min-w-full"
          style={{ minWidth: layout.width * scaleFactor, minHeight: layout.height * scaleFactor }}
        >
          <g transform={`scale(${scaleFactor})`}>
            <defs>
              <marker
                id="network-arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                  className="text-muted-foreground"
                />
              </marker>
              <marker
                id="network-arrowhead-highlight"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                  className="text-primary"
                />
              </marker>
            </defs>

            {viewMode === "dependency" ? (
              <>
                {dependencyLayout.edges.map((edge) => {
                  const isHighlighted =
                    hoveredTaskId === edge.sourceId ||
                    hoveredTaskId === edge.targetId ||
                    selectedTaskId === edge.sourceId ||
                    selectedTaskId === edge.targetId;
                  const isSelected = selectedEdgeId === edge.id;

                  return (
                    <g
                      key={edge.id}
                      className={cn("cursor-pointer", isSelected && "selected")}
                      onClick={() => handleEdgeClick(edge.id)}
                    >
                      <path
                        d={createEdgePath(edge)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={isSelected ? 3 : isHighlighted ? 2 : 1.5}
                        className={cn(
                          "transition-colors",
                          isSelected ? "text-primary" : isHighlighted ? "text-primary" : "text-muted-foreground"
                        )}
                        markerEnd={
                          isSelected || isHighlighted
                            ? "url(#network-arrowhead-highlight)"
                            : "url(#network-arrowhead)"
                        }
                      />
                      <text
                        x={(edge.sourceX + edge.targetX) / 2}
                        y={(edge.sourceY + edge.targetY) / 2 - 8}
                        className="fill-muted-foreground text-[10px]"
                        textAnchor="middle"
                      >
                        {edge.type}
                        {edge.lag !== 0 && ` (${edge.lag > 0 ? "+" : ""}${edge.lag})`}
                      </text>
                    </g>
                  );
                })}

                {dependencyLayout.nodes.map((node, index) => (
                  <DependencyNode
                    key={node.taskId}
                    index={index}
                    node={node}
                    task={taskMap.get(node.taskId)!}
                    isSelected={selectedTaskId === node.taskId}
                    isHovered={hoveredTaskId === node.taskId}
                    onPointerDown={(e) => handleNodePointerDown(node.taskId, e)}
                    onPointerUp={(e) => handleNodePointerUp(node.taskId, e)}
                    onPointerEnter={() => handleNodePointerEnter(node.taskId)}
                    onPointerLeave={() => handleNodePointerLeave(node.taskId)}
                  />
                ))}
              </>
            ) : (
              <>
                {wbsLayout.edges.map((edge) => (
                  <path
                    key={edge.id}
                    d={createWbsEdgePath(edge)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="text-muted-foreground"
                  />
                ))}

                {wbsLayout.nodes.map((node) => (
                  <WbsNode
                    key={node.taskId}
                    node={node}
                    task={taskMap.get(node.taskId)!}
                    isSelected={selectedTaskId === node.taskId}
                    isHovered={hoveredTaskId === node.taskId}
                    isDraggedOver={dropTargetId === node.taskId}
                    isBeingDragged={draggedTaskId === node.taskId}
                    isEditing={editingTaskId === node.taskId}
                    editingName={editingName}
                    inputRef={editingTaskId === node.taskId ? inputRef : undefined}
                    onPointerDown={(e) => handleNodePointerDown(node.taskId, e)}
                    onPointerMove={(e) => handleNodePointerMove(node.taskId, e)}
                    onPointerUp={(e) => handleNodePointerUp(node.taskId, e)}
                    onPointerCancel={() => handleNodePointerCancel(node.taskId)}
                    onPointerLeave={() => handleNodePointerLeave(node.taskId)}
                    onToggleCollapse={() => handleToggleCollapse(node.taskId)}
                    onAddChild={() => handleAddChild(node.taskId)}
                    onNameChange={setEditingName}
                    onNameSubmit={handleNameEditSubmit}
                    onNameKeyDown={handleNameEditKeyDown}
                  />
                ))}
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

// Dependency view node
interface DependencyNodeProps {
  index: number;
  node: NodePosition;
  task: {
    id: string;
    name: string;
    duration?: number;
    status: string;
  };
  isSelected: boolean;
  isHovered: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

function DependencyNode({
  index,
  node,
  task,
  isSelected,
  isHovered,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerLeave,
}: DependencyNodeProps) {
  const statusColors: Record<string, string> = {
    not_started: "fill-gray-100 stroke-gray-300",
    in_progress: "fill-blue-50 stroke-blue-400",
    completed: "fill-green-50 stroke-green-400",
    on_hold: "fill-yellow-50 stroke-yellow-400",
    cancelled: "fill-red-50 stroke-red-300",
  };

  const colorClass = statusColors[task.status] ?? statusColors.not_started;

  return (
    <g
      className="cursor-pointer"
      data-task-id={task.id}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={8}
        ry={8}
        className={cn(
          colorClass,
          "transition-all",
          isSelected && "stroke-primary stroke-2",
          isHovered && !isSelected && "stroke-primary/50"
        )}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      <text
        x={node.x + node.width / 2}
        y={node.y + 24}
        className="fill-foreground text-sm font-medium pointer-events-none"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {truncateText(task.name, 20)}
      </text>
      <text
        x={node.x + node.width / 2}
        y={node.y + 44}
        className="fill-muted-foreground text-xs pointer-events-none"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {task.duration ? `${task.duration}日` : "未設定"}
      </text>
      {isHovered && (
        <circle
          data-testid={`connection-handle-${index}`}
          cx={node.x + node.width}
          cy={node.y + node.height / 2}
          r={8}
          className="fill-orange-500 stroke-white stroke-2 cursor-crosshair"
        />
      )}
    </g>
  );
}

// WBS view node with touch support
interface WbsNodeProps {
  node: WbsNodePosition;
  task: {
    id: string;
    name: string;
    duration?: number;
    status: string;
  };
  isSelected: boolean;
  isHovered: boolean;
  isDraggedOver: boolean;
  isBeingDragged: boolean;
  isEditing: boolean;
  editingName: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onToggleCollapse: () => void;
  onAddChild: () => void;
  onNameChange: (name: string) => void;
  onNameSubmit: () => void;
  onNameKeyDown: (e: React.KeyboardEvent) => void;
}

function WbsNode({
  node,
  task,
  isSelected,
  isHovered,
  isDraggedOver,
  isBeingDragged,
  isEditing,
  editingName,
  inputRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onToggleCollapse,
  onAddChild,
  onNameChange,
  onNameSubmit,
  onNameKeyDown,
}: WbsNodeProps) {
  const statusColors: Record<string, string> = {
    not_started: "fill-gray-50 stroke-gray-300",
    in_progress: "fill-blue-50 stroke-blue-400",
    completed: "fill-green-50 stroke-green-400",
    on_hold: "fill-yellow-50 stroke-yellow-400",
    cancelled: "fill-red-50 stroke-red-300",
  };

  const colorClass = statusColors[task.status] ?? statusColors.not_started;
  const hasChildren = node.childCount > 0 || node.isCollapsed;

  // Handle button tap separately to prevent event propagation issues
  const handleCollapseTap = (e: React.PointerEvent) => {
    e.stopPropagation();
    onToggleCollapse();
  };

  const handleAddChildTap = (e: React.PointerEvent) => {
    e.stopPropagation();
    onAddChild();
  };

  return (
    <g
      className={cn(
        "touch-none",
        isBeingDragged && "opacity-50"
      )}
      data-task-id={task.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    >
      {/* Node background - larger touch target */}
      <rect
        x={node.x - 4}
        y={node.y - 4}
        width={node.width + 8}
        height={node.height + 8}
        rx={12}
        ry={12}
        fill="transparent"
        className="pointer-events-auto"
      />
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={8}
        ry={8}
        className={cn(
          colorClass,
          "transition-all",
          isSelected && "stroke-primary stroke-2",
          isHovered && !isSelected && "stroke-primary/50",
          isDraggedOver && "stroke-green-500 stroke-3 fill-green-50",
          isBeingDragged && "stroke-primary stroke-2"
        )}
        strokeWidth={isSelected || isDraggedOver || isBeingDragged ? 2.5 : 1.5}
      />

      {/* Collapse/expand button - larger touch target */}
      {hasChildren && (
        <g
          className="cursor-pointer"
          onPointerUp={handleCollapseTap}
        >
          <circle
            cx={node.x + 18}
            cy={node.y + node.height / 2}
            r={14}
            fill="transparent"
          />
          <circle
            cx={node.x + 18}
            cy={node.y + node.height / 2}
            r={11}
            className="fill-white stroke-gray-300"
            strokeWidth={1.5}
          />
          {node.isCollapsed ? (
            <path
              d={`M ${node.x + 13} ${node.y + node.height / 2} L ${node.x + 23} ${node.y + node.height / 2} M ${node.x + 18} ${node.y + node.height / 2 - 5} L ${node.x + 18} ${node.y + node.height / 2 + 5}`}
              stroke="currentColor"
              strokeWidth={2.5}
              className="text-gray-500 pointer-events-none"
            />
          ) : (
            <path
              d={`M ${node.x + 13} ${node.y + node.height / 2} L ${node.x + 23} ${node.y + node.height / 2}`}
              stroke="currentColor"
              strokeWidth={2.5}
              className="text-gray-500 pointer-events-none"
            />
          )}
        </g>
      )}

      {/* Task name */}
      {isEditing ? (
        <foreignObject
          x={node.x + (hasChildren ? 32 : 8)}
          y={node.y + 8}
          width={node.width - (hasChildren ? 40 : 16) - (isHovered ? 28 : 0)}
          height={node.height - 16}
        >
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editingName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameSubmit}
            onKeyDown={onNameKeyDown}
            className="w-full h-full px-2 text-sm bg-white border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ touchAction: "manipulation" }}
          />
        </foreignObject>
      ) : (
        <text
          x={node.x + (hasChildren ? 32 : 8) + (node.width - (hasChildren ? 40 : 16) - (isHovered ? 28 : 0)) / 2}
          y={node.y + node.height / 2}
          className="fill-foreground text-sm font-medium pointer-events-none select-none"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {truncateText(task.name, 12)}
        </text>
      )}

      {/* Add child button - always visible on touch, hover on desktop */}
      {(isHovered || isSelected) && !isEditing && (
        <g
          className="cursor-pointer"
          onPointerUp={handleAddChildTap}
        >
          <circle
            cx={node.x + node.width - 18}
            cy={node.y + node.height / 2}
            r={14}
            fill="transparent"
          />
          <circle
            cx={node.x + node.width - 18}
            cy={node.y + node.height / 2}
            r={11}
            className="fill-primary stroke-white"
            strokeWidth={2}
          />
          <path
            d={`M ${node.x + node.width - 23} ${node.y + node.height / 2} L ${node.x + node.width - 13} ${node.y + node.height / 2} M ${node.x + node.width - 18} ${node.y + node.height / 2 - 5} L ${node.x + node.width - 18} ${node.y + node.height / 2 + 5}`}
            stroke="white"
            strokeWidth={2.5}
            className="pointer-events-none"
          />
        </g>
      )}

      {/* Collapsed indicator */}
      {node.isCollapsed && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height - 6}
          className="fill-muted-foreground text-[9px] pointer-events-none"
          textAnchor="middle"
        >
          ({node.childCount}件)
        </text>
      )}
    </g>
  );
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "...";
}
