import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { format, isToday, differenceInDays, getWeek, getQuarter } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronRight, ChevronDown, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/projectStore";
import { DependencyArrows } from "./DependencyArrows";
import {
  getDateRange,
  getDaysInRange,
  calculateBarPosition,
  getDragType,
  calculateDateFromDrag,
  type ScaleType,
  type DragType,
} from "@/lib/ganttUtils";
import type { Task, TaskDependency } from "@/types";

// Empty array constants to avoid creating new array on each render
const EMPTY_TASKS: Task[] = [];
const EMPTY_DEPENDENCIES: TaskDependency[] = [];

const DAY_WIDTH = 40;
const ROW_HEIGHT = 36;
const TASK_LIST_WIDTH = 250;

interface TreeTask extends Task {
  depth: number;
  hasChildren: boolean;
}

interface DragState {
  taskId: string;
  dragType: DragType;
  startX: number;
  originalStartDate: string | undefined;
  originalEndDate: string | undefined;
}

interface DragPreview {
  startDate: string | undefined;
  endDate: string | undefined;
}

export function GanttView() {
  const tasks = useProjectStore((state) => state.project?.tasks ?? EMPTY_TASKS);
  const dependencies = useProjectStore((state) => state.project?.dependencies ?? EMPTY_DEPENDENCIES);
  const updateTask = useProjectStore((state) => state.updateTask);
  const toggleTaskCollapse = useProjectStore(
    (state) => state.toggleTaskCollapse
  );
  const isTaskCollapsed = useProjectStore((state) => state.isTaskCollapsed);
  const collapsedTaskIds = useProjectStore((state) => state.collapsedTaskIds);

  const [scale, setScale] = useState<ScaleType>("day");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Build tree structure
  const treeTasks = useMemo(() => {
    const buildTree = (
      parentId: string | undefined,
      depth: number
    ): TreeTask[] => {
      const children = tasks
        .filter((t) => t.parentId === parentId)
        .sort((a, b) => a.order - b.order);

      const result: TreeTask[] = [];
      for (const task of children) {
        const hasChildren = tasks.some((t) => t.parentId === task.id);
        result.push({ ...task, depth, hasChildren });

        if (!isTaskCollapsed(task.id)) {
          result.push(...buildTree(task.id, depth + 1));
        }
      }
      return result;
    };

    return buildTree(undefined, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, collapsedTaskIds]);

  // Build task index map for dependency arrows
  const taskIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    treeTasks.forEach((task, index) => {
      map.set(task.id, index);
    });
    return map;
  }, [treeTasks]);

  // Calculate date range based on tasks
  const dateRange = useMemo(() => {
    return getDateRange(
      tasks.map((t) => ({
        id: t.id,
        startDate: t.startDate,
        endDate: t.endDate,
      }))
    );
  }, [tasks]);

  // Generate dates for the timeline
  const dates = useMemo(() => {
    return getDaysInRange(dateRange.startDate, dateRange.endDate);
  }, [dateRange]);

  // Calculate chart width
  const chartWidth = dates.length * DAY_WIDTH;

  // Sync scroll between header and chart
  const handleChartScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (chartRef.current) {
      const today = new Date();
      const daysSinceStart = differenceInDays(today, dateRange.startDate);
      const scrollPosition = daysSinceStart * DAY_WIDTH - chartRef.current.clientWidth / 2;
      chartRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [dateRange.startDate]);

  // Scroll to today on mount
  useEffect(() => {
    scrollToToday();
  }, [scrollToToday]);

  // Drag handlers
  const handleDragStart = useCallback(
    (
      taskId: string,
      dragType: DragType,
      startX: number,
      originalStartDate: string | undefined,
      originalEndDate: string | undefined
    ) => {
      setDragState({
        taskId,
        dragType,
        startX,
        originalStartDate,
        originalEndDate,
      });
      setDragPreview({
        startDate: originalStartDate,
        endDate: originalEndDate,
      });
    },
    []
  );

  const handleDragMove = useCallback(
    (currentX: number) => {
      if (!dragState) return;

      const pixelDiff = currentX - dragState.startX;

      if (dragState.dragType === "move") {
        // Move both dates by the same amount
        const newStartDate = dragState.originalStartDate
          ? calculateDateFromDrag(
              new Date(dragState.originalStartDate),
              pixelDiff,
              DAY_WIDTH
            )
          : undefined;
        const newEndDate = dragState.originalEndDate
          ? calculateDateFromDrag(
              new Date(dragState.originalEndDate),
              pixelDiff,
              DAY_WIDTH
            )
          : undefined;

        setDragPreview({
          startDate: newStartDate?.toISOString().slice(0, 10),
          endDate: newEndDate?.toISOString().slice(0, 10),
        });
      } else if (dragState.dragType === "resize-start") {
        // Only change start date
        const newStartDate = dragState.originalStartDate
          ? calculateDateFromDrag(
              new Date(dragState.originalStartDate),
              pixelDiff,
              DAY_WIDTH
            )
          : undefined;

        // Ensure start date doesn't go past end date
        if (
          newStartDate &&
          dragState.originalEndDate &&
          newStartDate > new Date(dragState.originalEndDate)
        ) {
          return;
        }

        setDragPreview({
          startDate: newStartDate?.toISOString().slice(0, 10),
          endDate: dragState.originalEndDate,
        });
      } else if (dragState.dragType === "resize-end") {
        // Only change end date
        const newEndDate = dragState.originalEndDate
          ? calculateDateFromDrag(
              new Date(dragState.originalEndDate),
              pixelDiff,
              DAY_WIDTH
            )
          : undefined;

        // Ensure end date doesn't go before start date
        if (
          newEndDate &&
          dragState.originalStartDate &&
          newEndDate < new Date(dragState.originalStartDate)
        ) {
          return;
        }

        setDragPreview({
          startDate: dragState.originalStartDate,
          endDate: newEndDate?.toISOString().slice(0, 10),
        });
      }
    },
    [dragState]
  );

  const handleDragEnd = useCallback(() => {
    if (dragState && dragPreview) {
      updateTask(dragState.taskId, {
        startDate: dragPreview.startDate,
        endDate: dragPreview.endDate,
      });
    }
    setDragState(null);
    setDragPreview(null);
  }, [dragState, dragPreview, updateTask]);

  // Global mouse event handlers for drag
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  if (treeTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="text-muted-foreground">タスクがありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scale switcher and navigation */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-muted-foreground">表示:</span>
        <Button
          variant="ghost"
          size="sm"
          className={scale === "day" ? "bg-primary text-primary-foreground" : ""}
          onClick={() => setScale("day")}
        >
          日
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={scale === "week" ? "bg-primary text-primary-foreground" : ""}
          onClick={() => setScale("week")}
        >
          週
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={scale === "month" ? "bg-primary text-primary-foreground" : ""}
          onClick={() => setScale("month")}
        >
          月
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={scale === "quarter" ? "bg-primary text-primary-foreground" : ""}
          onClick={() => setScale("quarter")}
        >
          四
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={scrollToToday}
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          今日
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden border rounded-lg">
        {/* Left panel - Task list */}
        <div
          data-testid="gantt-task-list"
          className="flex flex-col border-r bg-background"
          style={{ width: TASK_LIST_WIDTH, minWidth: TASK_LIST_WIDTH }}
        >
          {/* Header */}
          <div className="h-12 border-b px-3 flex items-center font-medium bg-muted/30">
            タスク名
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto">
            {treeTasks.map((task, index) => (
              <div
                key={task.id}
                className="flex items-center gap-1 px-2 border-b hover:bg-muted/50"
                style={{
                  height: ROW_HEIGHT,
                  paddingLeft: `${8 + task.depth * 16}px`,
                }}
              >
                {/* Collapse button */}
                {task.hasChildren ? (
                  <button
                    data-testid={`gantt-collapse-${index}`}
                    onClick={() => toggleTaskCollapse(task.id)}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {isTaskCollapsed(task.id) ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-5" />
                )}

                {/* Task name */}
                <span className="truncate text-sm">{task.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - Chart */}
        <div
          data-testid="gantt-chart-area"
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Timeline header */}
          <div
            ref={headerRef}
            data-testid="gantt-timeline-header"
            className="h-12 border-b overflow-hidden bg-muted/30"
          >
            <div className="flex" style={{ width: chartWidth }}>
              {scale === "day" && (
                <>
                  {/* Month row */}
                  <div className="absolute flex h-6" style={{ width: chartWidth }}>
                    {getMonthHeaders(dates, DAY_WIDTH)}
                  </div>
                  {/* Day row */}
                  <div
                    className="flex h-6 mt-6"
                    style={{ width: chartWidth }}
                  >
                    {dates.map((date, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-center text-xs border-r ${
                          isToday(date) ? "bg-primary/10 font-bold" : ""
                        } ${isWeekend(date) ? "bg-muted/50" : ""}`}
                        style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                      >
                        {format(date, "d")}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {scale === "week" && (
                <>
                  {/* Month row */}
                  <div className="absolute flex h-6" style={{ width: chartWidth }}>
                    {getMonthHeaders(dates, DAY_WIDTH)}
                  </div>
                  {/* Week number row */}
                  <div
                    className="flex h-6 mt-6"
                    style={{ width: chartWidth }}
                  >
                    {getWeekHeaders(dates, DAY_WIDTH)}
                  </div>
                </>
              )}
              {scale === "month" && (
                <>
                  {/* Year row */}
                  <div className="absolute flex h-6" style={{ width: chartWidth }}>
                    {getYearHeaders(dates, DAY_WIDTH)}
                  </div>
                  {/* Month row */}
                  <div
                    className="flex h-6 mt-6"
                    style={{ width: chartWidth }}
                  >
                    {getMonthOnlyHeaders(dates, DAY_WIDTH)}
                  </div>
                </>
              )}
              {scale === "quarter" && (
                <>
                  {/* Year row */}
                  <div className="absolute flex h-6" style={{ width: chartWidth }}>
                    {getYearHeaders(dates, DAY_WIDTH)}
                  </div>
                  {/* Quarter row */}
                  <div
                    className="flex h-6 mt-6"
                    style={{ width: chartWidth }}
                  >
                    {getQuarterHeaders(dates, DAY_WIDTH)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Chart area */}
          <div
            ref={chartRef}
            className="flex-1 overflow-auto"
            onScroll={handleChartScroll}
          >
            <div
              className="relative"
              style={{
                width: chartWidth,
                height: treeTasks.length * ROW_HEIGHT,
              }}
            >
              {/* Grid lines */}
              {dates.map((date, i) => (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 border-r ${
                    isWeekend(date) ? "bg-muted/30" : ""
                  }`}
                  style={{
                    left: i * DAY_WIDTH,
                    width: DAY_WIDTH,
                  }}
                />
              ))}

              {/* Row lines */}
              {treeTasks.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-b"
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Today line */}
              <TodayLine
                dateRange={dateRange}
                dayWidth={DAY_WIDTH}
                height={treeTasks.length * ROW_HEIGHT}
              />

              {/* Task bars */}
              {treeTasks.map((task, index) => {
                // Use preview dates if this task is being dragged
                const isDragging = dragState?.taskId === task.id;
                const displayStartDate = isDragging && dragPreview?.startDate
                  ? dragPreview.startDate
                  : task.startDate;
                const displayEndDate = isDragging && dragPreview?.endDate
                  ? dragPreview.endDate
                  : task.endDate;

                return (
                  <TaskBar
                    key={task.id}
                    task={task}
                    index={index}
                    dateRange={dateRange}
                    dayWidth={DAY_WIDTH}
                    rowHeight={ROW_HEIGHT}
                    displayStartDate={displayStartDate}
                    displayEndDate={displayEndDate}
                    isDragging={isDragging}
                    onDragStart={handleDragStart}
                  />
                );
              })}

              {/* Dependency arrows */}
              <DependencyArrows
                tasks={tasks}
                dependencies={dependencies}
                taskIndexMap={taskIndexMap}
                dateRange={dateRange}
                dayWidth={DAY_WIDTH}
                rowHeight={ROW_HEIGHT}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for task bar
interface TaskBarProps {
  task: TreeTask;
  index: number;
  dateRange: { startDate: Date; endDate: Date };
  dayWidth: number;
  rowHeight: number;
  displayStartDate: string | undefined;
  displayEndDate: string | undefined;
  isDragging: boolean;
  onDragStart: (
    taskId: string,
    dragType: DragType,
    startX: number,
    originalStartDate: string | undefined,
    originalEndDate: string | undefined
  ) => void;
}

function TaskBar({
  task,
  index,
  dateRange,
  dayWidth,
  rowHeight,
  displayStartDate,
  displayEndDate,
  isDragging,
  onDragStart,
}: TaskBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const position = calculateBarPosition(
    displayStartDate ? new Date(displayStartDate) : undefined,
    displayEndDate ? new Date(displayEndDate) : undefined,
    dateRange.startDate,
    dateRange.endDate,
    dayWidth
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!barRef.current || !position) return;

    const rect = barRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;

    const dragType = getDragType(relativeX, 0, position.width);
    if (dragType) {
      e.preventDefault();
      onDragStart(
        task.id,
        dragType,
        e.clientX,
        task.startDate,
        task.endDate
      );
    }
  };

  // Determine cursor based on position
  const getCursor = (e: React.MouseEvent) => {
    if (!barRef.current || !position) return "grab";

    const rect = barRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const dragType = getDragType(relativeX, 0, position.width);

    if (dragType === "resize-start" || dragType === "resize-end") {
      return "ew-resize";
    }
    return isDragging ? "grabbing" : "grab";
  };

  if (!position) {
    return null;
  }

  const barPadding = 4;

  return (
    <div
      ref={barRef}
      data-testid={`gantt-task-bar-${index}`}
      className={`absolute rounded shadow-sm select-none ${
        isDragging ? "bg-primary/60 ring-2 ring-primary" : "bg-primary/80"
      }`}
      style={{
        left: position.left,
        top: index * rowHeight + barPadding,
        width: position.width,
        height: rowHeight - barPadding * 2,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        if (!isDragging && barRef.current) {
          barRef.current.style.cursor = getCursor(e);
        }
      }}
    >
      {/* Progress fill */}
      <div
        data-testid={`gantt-progress-bar-${index}`}
        className="absolute inset-0 rounded bg-primary pointer-events-none"
        style={{ width: `${task.progress}%` }}
      />
      {/* Task name on bar */}
      <span className="absolute inset-0 flex items-center px-2 text-xs text-primary-foreground truncate pointer-events-none">
        {task.name}
      </span>
      {/* Resize handles */}
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize" />
      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize" />
    </div>
  );
}

// Helper component for today line
interface TodayLineProps {
  dateRange: { startDate: Date; endDate: Date };
  dayWidth: number;
  height: number;
}

function TodayLine({ dateRange, dayWidth, height }: TodayLineProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysSinceStart = differenceInDays(today, dateRange.startDate);

  if (daysSinceStart < 0 || daysSinceStart > differenceInDays(dateRange.endDate, dateRange.startDate)) {
    return null;
  }

  return (
    <div
      data-testid="gantt-today-line"
      className="absolute top-0 w-0.5 bg-red-500 z-10"
      style={{
        left: daysSinceStart * dayWidth + dayWidth / 2,
        height,
      }}
    />
  );
}

// Helper function to check if date is weekend
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Helper function to generate month headers
function getMonthHeaders(dates: Date[], dayWidth: number) {
  const months: { month: string; days: number; startIndex: number }[] = [];
  let currentMonth = "";
  let currentDays = 0;
  let startIndex = 0;

  dates.forEach((date, index) => {
    const month = format(date, "yyyy年M月", { locale: ja });
    if (month !== currentMonth) {
      if (currentMonth) {
        months.push({ month: currentMonth, days: currentDays, startIndex });
      }
      currentMonth = month;
      currentDays = 1;
      startIndex = index;
    } else {
      currentDays++;
    }
  });

  if (currentMonth) {
    months.push({ month: currentMonth, days: currentDays, startIndex });
  }

  return months.map((m, i) => (
    <div
      key={i}
      className="flex items-center justify-center text-xs font-medium border-r bg-muted/50"
      style={{
        position: "absolute",
        left: m.startIndex * dayWidth,
        width: m.days * dayWidth,
        height: 24,
      }}
    >
      {m.month}
    </div>
  ));
}

// Helper function to generate week headers
function getWeekHeaders(dates: Date[], dayWidth: number) {
  const weeks: { weekNumber: number; days: number; startIndex: number }[] = [];
  let currentWeek = -1;
  let currentDays = 0;
  let startIndex = 0;

  dates.forEach((date, index) => {
    const weekNumber = getWeek(date, { weekStartsOn: 1 });
    if (weekNumber !== currentWeek) {
      if (currentWeek !== -1) {
        weeks.push({ weekNumber: currentWeek, days: currentDays, startIndex });
      }
      currentWeek = weekNumber;
      currentDays = 1;
      startIndex = index;
    } else {
      currentDays++;
    }
  });

  if (currentWeek !== -1) {
    weeks.push({ weekNumber: currentWeek, days: currentDays, startIndex });
  }

  return weeks.map((w, i) => (
    <div
      key={i}
      className="flex items-center justify-center text-xs font-medium border-r"
      style={{
        position: "absolute",
        left: w.startIndex * dayWidth,
        width: w.days * dayWidth,
        height: 24,
      }}
    >
      W{w.weekNumber}
    </div>
  ));
}

// Helper function to generate year headers
function getYearHeaders(dates: Date[], dayWidth: number) {
  const years: { year: number; days: number; startIndex: number }[] = [];
  let currentYear = -1;
  let currentDays = 0;
  let startIndex = 0;

  dates.forEach((date, index) => {
    const year = date.getFullYear();
    if (year !== currentYear) {
      if (currentYear !== -1) {
        years.push({ year: currentYear, days: currentDays, startIndex });
      }
      currentYear = year;
      currentDays = 1;
      startIndex = index;
    } else {
      currentDays++;
    }
  });

  if (currentYear !== -1) {
    years.push({ year: currentYear, days: currentDays, startIndex });
  }

  return years.map((y, i) => (
    <div
      key={i}
      className="flex items-center justify-center text-xs font-medium border-r bg-muted/50"
      style={{
        position: "absolute",
        left: y.startIndex * dayWidth,
        width: y.days * dayWidth,
        height: 24,
      }}
    >
      {y.year}年
    </div>
  ));
}

// Helper function to generate month only headers (without year)
function getMonthOnlyHeaders(dates: Date[], dayWidth: number) {
  const months: { month: string; days: number; startIndex: number }[] = [];
  let currentMonth = "";
  let currentDays = 0;
  let startIndex = 0;

  dates.forEach((date, index) => {
    const yearMonth = format(date, "yyyy-MM");
    if (yearMonth !== currentMonth) {
      if (currentMonth) {
        months.push({ month: format(new Date(currentMonth), "M月", { locale: ja }), days: currentDays, startIndex });
      }
      currentMonth = yearMonth;
      currentDays = 1;
      startIndex = index;
    } else {
      currentDays++;
    }
  });

  if (currentMonth) {
    months.push({ month: format(new Date(currentMonth), "M月", { locale: ja }), days: currentDays, startIndex });
  }

  return months.map((m, i) => (
    <div
      key={i}
      className="flex items-center justify-center text-xs font-medium border-r"
      style={{
        position: "absolute",
        left: m.startIndex * dayWidth,
        width: m.days * dayWidth,
        height: 24,
      }}
    >
      {m.month}
    </div>
  ));
}

// Helper function to generate quarter headers
function getQuarterHeaders(dates: Date[], dayWidth: number) {
  const quarters: { quarter: number; year: number; days: number; startIndex: number }[] = [];
  let currentQuarter = -1;
  let currentYear = -1;
  let currentDays = 0;
  let startIndex = 0;

  dates.forEach((date, index) => {
    const quarter = getQuarter(date);
    const year = date.getFullYear();
    if (quarter !== currentQuarter || year !== currentYear) {
      if (currentQuarter !== -1) {
        quarters.push({ quarter: currentQuarter, year: currentYear, days: currentDays, startIndex });
      }
      currentQuarter = quarter;
      currentYear = year;
      currentDays = 1;
      startIndex = index;
    } else {
      currentDays++;
    }
  });

  if (currentQuarter !== -1) {
    quarters.push({ quarter: currentQuarter, year: currentYear, days: currentDays, startIndex });
  }

  return quarters.map((q, i) => (
    <div
      key={i}
      className="flex items-center justify-center text-xs font-medium border-r"
      style={{
        position: "absolute",
        left: q.startIndex * dayWidth,
        width: q.days * dayWidth,
        height: 24,
      }}
    >
      Q{q.quarter}
    </div>
  ));
}
