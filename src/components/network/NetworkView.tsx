import { useMemo, useState, useRef, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { calculateNetworkLayout, createEdgePath } from "@/lib/networkLayout";
import { cn } from "@/lib/utils";
import type { NodePosition } from "@/lib/networkLayout";

export function NetworkView() {
  const project = useProjectStore((s) => s.project);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, []);

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

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-muted/20 p-4">
      <svg
        width={layout.width}
        height={layout.height}
        className="min-w-full"
        style={{ minWidth: layout.width, minHeight: layout.height }}
      >
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

          return (
            <g key={edge.id}>
              <path
                d={createEdgePath(edge)}
                fill="none"
                stroke="currentColor"
                strokeWidth={isHighlighted ? 2 : 1.5}
                className={cn(
                  "transition-colors",
                  isHighlighted ? "text-primary" : "text-muted-foreground"
                )}
                markerEnd={
                  isHighlighted
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
        {layout.nodes.map((node) => (
          <NetworkNode
            key={node.taskId}
            node={node}
            task={taskMap.get(node.taskId)!}
            isSelected={selectedTaskId === node.taskId}
            isHovered={hoveredTaskId === node.taskId}
            onClick={() => handleNodeClick(node.taskId)}
            onMouseEnter={() => setHoveredTaskId(node.taskId)}
            onMouseLeave={() => setHoveredTaskId(null)}
          />
        ))}
      </svg>
    </div>
  );
}

interface NetworkNodeProps {
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
    </g>
  );
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "...";
}
