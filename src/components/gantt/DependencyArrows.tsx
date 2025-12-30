import { useMemo } from "react";
import { differenceInDays } from "date-fns";
import type { Task, TaskDependency } from "@/types";
import type { RelativeSchedule } from "@/lib/dependencyScheduler";

type GanttMode = "date" | "relative";

interface DependencyArrowsProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  taskIndexMap: Map<string, number>;
  dateRange: { startDate: Date; endDate: Date };
  dayWidth: number;
  rowHeight: number;
  mode?: GanttMode;
  relativeSchedules?: Map<string, RelativeSchedule>;
}

interface ArrowPath {
  id: string;
  d: string;
}

export function DependencyArrows({
  tasks,
  dependencies,
  taskIndexMap,
  dateRange,
  dayWidth,
  rowHeight,
  mode = "date",
  relativeSchedules,
}: DependencyArrowsProps) {
  const arrowPaths = useMemo(() => {
    const paths: ArrowPath[] = [];

    for (const dep of dependencies) {
      // Get row indices for predecessor and successor
      const predIndex = taskIndexMap.get(dep.predecessorId);
      const succIndex = taskIndexMap.get(dep.successorId);

      // Skip if either task is not visible
      if (predIndex === undefined || succIndex === undefined) continue;

      // Get task data
      const predTask = tasks.find((t) => t.id === dep.predecessorId);
      const succTask = tasks.find((t) => t.id === dep.successorId);

      if (!predTask || !succTask) continue;

      // Calculate x positions based on mode and dependency type
      let startX: number;
      let endX: number;

      if (mode === "relative" && relativeSchedules) {
        // Relative mode: use relative schedules
        const predSchedule = relativeSchedules.get(dep.predecessorId);
        const succSchedule = relativeSchedules.get(dep.successorId);

        if (!predSchedule || !succSchedule) continue;

        switch (dep.type) {
          case "FS": // Finish-to-Start
            startX = (predSchedule.relativeStart + predSchedule.duration) * dayWidth;
            endX = succSchedule.relativeStart * dayWidth;
            break;
          case "SS": // Start-to-Start
            startX = predSchedule.relativeStart * dayWidth;
            endX = succSchedule.relativeStart * dayWidth;
            break;
          case "FF": // Finish-to-Finish
            startX = (predSchedule.relativeStart + predSchedule.duration) * dayWidth;
            endX = (succSchedule.relativeStart + succSchedule.duration) * dayWidth;
            break;
          case "SF": // Start-to-Finish
            startX = predSchedule.relativeStart * dayWidth;
            endX = (succSchedule.relativeStart + succSchedule.duration) * dayWidth;
            break;
          default:
            continue;
        }
      } else {
        // Date mode: use actual dates
        // Skip if either task has no dates
        if (!predTask.endDate || !succTask.startDate) continue;

        switch (dep.type) {
          case "FS": // Finish-to-Start
            startX = calculateXPosition(predTask.endDate, dateRange.startDate, dayWidth) + dayWidth;
            endX = calculateXPosition(succTask.startDate, dateRange.startDate, dayWidth);
            break;
          case "SS": // Start-to-Start
            startX = calculateXPosition(predTask.startDate || predTask.endDate, dateRange.startDate, dayWidth);
            endX = calculateXPosition(succTask.startDate, dateRange.startDate, dayWidth);
            break;
          case "FF": // Finish-to-Finish
            startX = calculateXPosition(predTask.endDate, dateRange.startDate, dayWidth) + dayWidth;
            endX = calculateXPosition(succTask.endDate || succTask.startDate, dateRange.startDate, dayWidth) + dayWidth;
            break;
          case "SF": // Start-to-Finish
            startX = calculateXPosition(predTask.startDate || predTask.endDate, dateRange.startDate, dayWidth);
            endX = calculateXPosition(succTask.endDate || succTask.startDate, dateRange.startDate, dayWidth) + dayWidth;
            break;
          default:
            continue;
        }
      }

      // Calculate y positions (center of row)
      const startY = predIndex * rowHeight + rowHeight / 2;
      const endY = succIndex * rowHeight + rowHeight / 2;

      // Create path (curved arrow)
      const path = createArrowPath(startX, startY, endX, endY, dep.type);

      paths.push({
        id: dep.id,
        d: path,
      });
    }

    return paths;
  }, [tasks, dependencies, taskIndexMap, dateRange.startDate, dayWidth, rowHeight, mode, relativeSchedules]);

  return (
    <svg
      data-testid="dependency-arrows-svg"
      className="absolute inset-0 pointer-events-none z-20"
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="currentColor"
            className="text-orange-500"
          />
        </marker>
      </defs>
      {arrowPaths.map((arrow) => (
        <path
          key={arrow.id}
          d={arrow.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-orange-500"
          markerEnd="url(#arrowhead)"
        />
      ))}
    </svg>
  );
}

function calculateXPosition(
  dateStr: string | undefined,
  rangeStart: Date,
  dayWidth: number
): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const days = differenceInDays(date, rangeStart);
  return days * dayWidth;
}

function createArrowPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  _type: string // Reserved for future type-specific path styling
): string {
  // Add some offset from the bar
  const horizontalOffset = 5;
  const verticalOffset = 10;

  // Adjust start and end points
  const x1 = startX + horizontalOffset;
  const x2 = endX - horizontalOffset;
  const y1 = startY;
  const y2 = endY;

  // Calculate control points for a smooth curve
  const midX = (x1 + x2) / 2;

  if (y1 === y2) {
    // Same row - straight line
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  } else if (x2 > x1) {
    // Successor is to the right - simple S-curve
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  } else {
    // Successor is to the left or same position - need to go around
    return `M ${x1} ${y1}
            L ${x1 + 15} ${y1}
            L ${x1 + 15} ${y2 < y1 ? y2 - verticalOffset : y2 + verticalOffset}
            L ${x2 - 15} ${y2 < y1 ? y2 - verticalOffset : y2 + verticalOffset}
            L ${x2 - 15} ${y2}
            L ${x2} ${y2}`;
  }
}
