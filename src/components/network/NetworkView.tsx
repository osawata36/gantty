import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, LayoutGrid, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/projectStore";
import { useViewStore } from "@/stores/viewStore";
import { calculateNetworkLayout, createEdgePath } from "@/lib/networkLayout";
import { cn } from "@/lib/utils";
import type { NodePosition } from "@/lib/networkLayout";

export function NetworkView() {
  const project = useProjectStore((s) => s.project);
  const openTaskDetail = useViewStore((s) => s.openTaskDetail);
  const deleteDependency = useProjectStore((s) => s.deleteDependency);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const layout = useMemo(() => {
    return calculateNetworkLayout(tasks, dependencies);
  }, [tasks, dependencies]);

  const taskMap = useMemo(() => {
    const map = new Map<string, (typeof tasks)[0]>();
    for (const task of tasks) {
      map.set(task.id, task);
    }
    return map;
  }, [tasks]);

  const handleNodeClick = useCallback((taskId: string) => {
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
    setSelectedEdgeId(null); // Deselect edge when node is clicked
    openTaskDetail(taskId);
  }, [openTaskDetail]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelectedEdgeId((prev) => (prev === edgeId ? null : edgeId));
    setSelectedTaskId(null); // Deselect node when edge is clicked
  }, []);

  // Handle Delete key to remove selected edge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedEdgeId) {
        deleteDependency(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, deleteDependency]);

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
      {/* Zoom controls */}
      <div className="flex items-center gap-2 p-2 bg-background border-b">
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

        <div className="h-4 w-px bg-border mx-2" />

        <Button
          variant="outline"
          size="sm"
          aria-label="自動レイアウト"
          title="依存関係に基づいて自動配置"
        >
          <LayoutGrid className="h-4 w-4 mr-1" />
          自動レイアウト
        </Button>
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

        {/* Edges */}
        {layout.edges.map((edge) => {
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
              {/* Dependency type label */}
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
        {layout.nodes.map((node, index) => (
          <NetworkNode
            key={node.taskId}
            index={index}
            node={node}
            task={taskMap.get(node.taskId)!}
            isSelected={selectedTaskId === node.taskId}
            isHovered={hoveredTaskId === node.taskId}
            onClick={() => handleNodeClick(node.taskId)}
            onMouseEnter={() => setHoveredTaskId(node.taskId)}
            onMouseLeave={() => setHoveredTaskId(null)}
          />
        ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

interface NetworkNodeProps {
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
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function NetworkNode({
  index,
  node,
  task,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: NetworkNodeProps) {
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
          isHovered && !isSelected && "stroke-primary/50"
        )}
        strokeWidth={isSelected ? 2 : 1.5}
      />

      {/* Task name */}
      <text
        x={node.x + node.width / 2}
        y={node.y + 24}
        className="fill-foreground text-sm font-medium"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {truncateText(task.name, 20)}
      </text>

      {/* Duration */}
      <text
        x={node.x + node.width / 2}
        y={node.y + 44}
        className="fill-muted-foreground text-xs"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {task.duration ? `${task.duration}日` : "未設定"}
      </text>

      {/* Connection handle - shown on hover */}
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

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "...";
}
