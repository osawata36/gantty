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

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Dependency layout
  const dependencyLayout = useMemo(() => {
    return calculateNetworkLayout(tasks, dependencies);
  }, [tasks, dependencies]);

  // WBS layout
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

  const handleNodeClick = useCallback((taskId: string) => {
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
    setSelectedEdgeId(null);
  }, []);

  const handleNodeDoubleClick = useCallback((taskId: string, taskName: string) => {
    setEditingTaskId(taskId);
    setEditingName(taskName);
  }, []);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelectedEdgeId((prev) => (prev === edgeId ? null : edgeId));
    setSelectedTaskId(null);
  }, []);

  const handleToggleCollapse = useCallback((taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleAddChild = useCallback((parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addSubTask(parentId, "新しいタスク");
    // Expand parent if collapsed
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

  // Pointer-based drag and drop for reparenting
  const handlePointerDown = useCallback((taskId: string, e: React.PointerEvent) => {
    // Only start drag on left click
    if (e.button !== 0) return;
    setDraggedTaskId(taskId);
  }, []);

  const handlePointerUp = useCallback((targetId: string) => {
    if (draggedTaskId && draggedTaskId !== targetId) {
      // Check if target is not a descendant of dragged task
      const isDescendant = (parentId: string, childId: string): boolean => {
        const child = taskMap.get(childId);
        if (!child) return false;
        if (child.parentId === parentId) return true;
        if (child.parentId) return isDescendant(parentId, child.parentId);
        return false;
      };

      if (!isDescendant(draggedTaskId, targetId)) {
        moveTask(draggedTaskId, targetId);
      }
    }
    setDraggedTaskId(null);
    setDropTargetId(null);
  }, [draggedTaskId, moveTask, taskMap]);

  // Track hover target while dragging
  const handleNodeHover = useCallback((taskId: string | null) => {
    setHoveredTaskId(taskId);
    if (draggedTaskId && taskId && taskId !== draggedTaskId) {
      setDropTargetId(taskId);
    } else {
      setDropTargetId(null);
    }
  }, [draggedTaskId]);

  // Cancel drag on mouse up anywhere
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (draggedTaskId) {
        setDraggedTaskId(null);
        setDropTargetId(null);
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [draggedTaskId]);

  // Handle Delete key to remove selected edge
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
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-background border-b">
        {/* View mode toggle */}
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === "wbs" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("wbs")}
            className="rounded-r-none"
            title="WBS階層ビュー"
          >
            <GitBranch className="h-4 w-4 mr-1" />
            WBS
          </Button>
          <Button
            variant={viewMode === "dependency" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("dependency")}
            className="rounded-l-none"
            title="依存関係ビュー"
          >
            <Network className="h-4 w-4 mr-1" />
            依存
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-2" />

        {/* Zoom controls */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          aria-label="ズームイン"
          title="ズームイン"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          aria-label="ズームアウト"
          title="ズームアウト"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomReset}
          aria-label="リセット"
          title="ズームをリセット"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">{zoomLevel}%</span>

        {viewMode === "wbs" && (
          <>
            <div className="h-4 w-px bg-border mx-2" />
            <span className="text-xs text-muted-foreground">
              ドラッグ&ドロップで親子関係を変更 • ダブルクリックで名前編集 • +で子タスク追加
            </span>
          </>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/20 p-4">
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
              // Dependency view
              <>
                {/* Edges */}
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

                {/* Nodes */}
                {dependencyLayout.nodes.map((node, index) => (
                  <DependencyNode
                    key={node.taskId}
                    index={index}
                    node={node}
                    task={taskMap.get(node.taskId)!}
                    isSelected={selectedTaskId === node.taskId}
                    isHovered={hoveredTaskId === node.taskId}
                    onClick={() => handleNodeClick(node.taskId)}
                    onDoubleClick={() => {
                      const task = taskMap.get(node.taskId);
                      if (task) openTaskDetail(node.taskId);
                    }}
                    onMouseEnter={() => setHoveredTaskId(node.taskId)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  />
                ))}
              </>
            ) : (
              // WBS view
              <>
                {/* Edges */}
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

                {/* Nodes */}
                {wbsLayout.nodes.map((node, index) => (
                  <WbsNode
                    key={node.taskId}
                    index={index}
                    node={node}
                    task={taskMap.get(node.taskId)!}
                    isSelected={selectedTaskId === node.taskId}
                    isHovered={hoveredTaskId === node.taskId}
                    isDraggedOver={dropTargetId === node.taskId}
                    isEditing={editingTaskId === node.taskId}
                    editingName={editingName}
                    inputRef={editingTaskId === node.taskId ? inputRef : undefined}
                    onClick={() => handleNodeClick(node.taskId)}
                    onDoubleClick={() => {
                      const task = taskMap.get(node.taskId);
                      if (task) handleNodeDoubleClick(node.taskId, task.name);
                    }}
                    onMouseEnter={() => handleNodeHover(node.taskId)}
                    onMouseLeave={() => handleNodeHover(null)}
                    onToggleCollapse={(e) => handleToggleCollapse(node.taskId, e)}
                    onAddChild={(e) => handleAddChild(node.taskId, e)}
                    onPointerDown={(e) => handlePointerDown(node.taskId, e)}
                    onPointerUp={() => handlePointerUp(node.taskId)}
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
  onClick: () => void;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function DependencyNode({
  index,
  node,
  task,
  isSelected,
  isHovered,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
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
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
        className="fill-foreground text-sm font-medium"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {truncateText(task.name, 20)}
      </text>
      <text
        x={node.x + node.width / 2}
        y={node.y + 44}
        className="fill-muted-foreground text-xs"
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

// WBS view node
interface WbsNodeProps {
  index: number;
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
  isEditing: boolean;
  editingName: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onClick: () => void;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onToggleCollapse: (e: React.MouseEvent) => void;
  onAddChild: (e: React.MouseEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
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
  isEditing,
  editingName,
  inputRef,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onToggleCollapse,
  onAddChild,
  onPointerDown,
  onPointerUp,
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

  return (
    <g
      className="cursor-grab active:cursor-grabbing"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* Node background */}
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
          isDraggedOver && "stroke-green-500 stroke-2 fill-green-50"
        )}
        strokeWidth={isSelected || isDraggedOver ? 2 : 1.5}
      />

      {/* Collapse/expand button (for tasks with children) */}
      {hasChildren && (
        <g
          className="cursor-pointer"
          onClick={onToggleCollapse}
        >
          <circle
            cx={node.x + 16}
            cy={node.y + node.height / 2}
            r={10}
            className="fill-white stroke-gray-300"
            strokeWidth={1}
          />
          {node.isCollapsed ? (
            <path
              d={`M ${node.x + 12} ${node.y + node.height / 2} L ${node.x + 20} ${node.y + node.height / 2} M ${node.x + 16} ${node.y + node.height / 2 - 4} L ${node.x + 16} ${node.y + node.height / 2 + 4}`}
              stroke="currentColor"
              strokeWidth={2}
              className="text-gray-500"
            />
          ) : (
            <path
              d={`M ${node.x + 12} ${node.y + node.height / 2} L ${node.x + 20} ${node.y + node.height / 2}`}
              stroke="currentColor"
              strokeWidth={2}
              className="text-gray-500"
            />
          )}
        </g>
      )}

      {/* Task name */}
      {isEditing ? (
        <foreignObject
          x={node.x + (hasChildren ? 28 : 8)}
          y={node.y + 8}
          width={node.width - (hasChildren ? 36 : 16)}
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
          />
        </foreignObject>
      ) : (
        <text
          x={node.x + (hasChildren ? 28 : 8) + (node.width - (hasChildren ? 36 : 16)) / 2}
          y={node.y + node.height / 2}
          className="fill-foreground text-sm font-medium pointer-events-none"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {truncateText(task.name, 14)}
        </text>
      )}

      {/* Add child button (shown on hover) */}
      {isHovered && !isEditing && (
        <g
          className="cursor-pointer"
          onClick={onAddChild}
        >
          <circle
            cx={node.x + node.width - 16}
            cy={node.y + node.height / 2}
            r={10}
            className="fill-primary stroke-white"
            strokeWidth={2}
          />
          <path
            d={`M ${node.x + node.width - 20} ${node.y + node.height / 2} L ${node.x + node.width - 12} ${node.y + node.height / 2} M ${node.x + node.width - 16} ${node.y + node.height / 2 - 4} L ${node.x + node.width - 16} ${node.y + node.height / 2 + 4}`}
            stroke="white"
            strokeWidth={2}
          />
        </g>
      )}

      {/* Collapsed indicator */}
      {node.isCollapsed && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height - 8}
          className="fill-muted-foreground text-[10px]"
          textAnchor="middle"
        >
          (折りたたみ中)
        </text>
      )}
    </g>
  );
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "...";
}
