import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { format, isToday, differenceInDays, getWeek, getQuarter, addDays } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronRight, ChevronDown, CalendarDays, Calendar, Hash, Link2, Link, Unlink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/projectStore";
import { useViewStore } from "@/stores/viewStore";
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
import { calculateRelativeSchedule, calculateCriticalPath } from "@/lib/dependencyScheduler";
import type { Task, TaskDependency } from "@/types";

type GanttMode = "date" | "relative";

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

interface ConnectionState {
  sourceTaskId: string;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
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

  const addDependency = useProjectStore((state) => state.addDependency);
  const openTaskDetail = useViewStore((state) => state.openTaskDetail);

  const [scale, setScale] = useState<ScaleType>("day");
  const [mode, setMode] = useState<GanttMode>("date");
  const [cascadeMode, setCascadeMode] = useState<boolean>(false);
  const [showCriticalPath, setShowCriticalPath] = useState<boolean>(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Calculate relative schedule for relative mode
  const relativeScheduleResult = useMemo(() => {
    return calculateRelativeSchedule(tasks, dependencies);
  }, [tasks, dependencies]);

  // Calculate critical path
  const criticalPathResult = useMemo(() => {
    return calculateCriticalPath(tasks, dependencies);
  }, [tasks, dependencies]);

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

  // Generate dates for the timeline (date mode)
  const dates = useMemo(() => {
    return getDaysInRange(dateRange.startDate, dateRange.endDate);
  }, [dateRange]);

  // Calculate chart width based on mode
  const chartWidth = mode === "date"
    ? dates.length * DAY_WIDTH
    : relativeScheduleResult.totalDays * DAY_WIDTH;

  // Generate relative days array for relative mode
  const relativeDays = useMemo(() => {
    return Array.from({ length: relativeScheduleResult.totalDays }, (_, i) => i + 1);
  }, [relativeScheduleResult.totalDays]);

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

  // Calculate cascaded updates for successor tasks
  const calculateCascadeUpdates = useCallback(
    (
      taskId: string,
      daysDelta: number,
      processed: Set<string> = new Set()
    ): Array<{ taskId: string; startDate: string; endDate: string }> => {
      if (processed.has(taskId)) return [];
      processed.add(taskId);

      const updates: Array<{ taskId: string; startDate: string; endDate: string }> = [];

      // Find all dependencies where this task is the predecessor
      const successorDeps = dependencies.filter((d) => d.predecessorId === taskId);

      for (const dep of successorDeps) {
        const successorTask = tasks.find((t) => t.id === dep.successorId);
        if (!successorTask || !successorTask.startDate || !successorTask.endDate) continue;

        // Calculate new dates based on dependency type
        const successorStart = new Date(successorTask.startDate);
        const successorEnd = new Date(successorTask.endDate);

        let newStart: Date;
        let newEnd: Date;

        switch (dep.type) {
          case "FS": // Finish-to-Start: successor moves with predecessor
          case "SS": // Start-to-Start: successor moves with predecessor
            newStart = addDays(successorStart, daysDelta);
            newEnd = addDays(successorEnd, daysDelta);
            break;
          case "FF": // Finish-to-Finish: successor end moves with predecessor end
          case "SF": // Start-to-Finish: successor moves with predecessor
            newStart = addDays(successorStart, daysDelta);
            newEnd = addDays(successorEnd, daysDelta);
            break;
          default:
            newStart = addDays(successorStart, daysDelta);
            newEnd = addDays(successorEnd, daysDelta);
        }

        updates.push({
          taskId: dep.successorId,
          startDate: format(newStart, "yyyy-MM-dd"),
          endDate: format(newEnd, "yyyy-MM-dd"),
        });

        // Recursively calculate for successors of this task
        const childUpdates = calculateCascadeUpdates(
          dep.successorId,
          daysDelta,
          processed
        );
        updates.push(...childUpdates);
      }

      return updates;
    },
    [tasks, dependencies]
  );

  const handleDragEnd = useCallback(() => {
    if (dragState && dragPreview) {
      // Update the dragged task
      updateTask(dragState.taskId, {
        startDate: dragPreview.startDate,
        endDate: dragPreview.endDate,
      });

      // If cascade mode is on and it's a move operation, update successor tasks
      if (
        cascadeMode &&
        dragState.dragType === "move" &&
        dragState.originalStartDate &&
        dragPreview.startDate
      ) {
        const originalStart = new Date(dragState.originalStartDate);
        const newStart = new Date(dragPreview.startDate);
        const daysDelta = differenceInDays(newStart, originalStart);

        if (daysDelta !== 0) {
          const cascadeUpdates = calculateCascadeUpdates(dragState.taskId, daysDelta);
          for (const update of cascadeUpdates) {
            updateTask(update.taskId, {
              startDate: update.startDate,
              endDate: update.endDate,
            });
          }
        }
      }
    }
    setDragState(null);
    setDragPreview(null);
  }, [dragState, dragPreview, updateTask, cascadeMode, calculateCascadeUpdates]);

  // Connection drag handlers
  const handleConnectionStart = useCallback(
    (taskId: string, startX: number, startY: number) => {
      setConnectionState({
        sourceTaskId: taskId,
        sourceX: startX,
        sourceY: startY,
        currentX: startX,
        currentY: startY,
      });
    },
    []
  );

  const handleConnectionMove = useCallback(
    (currentX: number, currentY: number) => {
      if (!connectionState) return;
      setConnectionState((prev) =>
        prev ? { ...prev, currentX, currentY } : null
      );
    },
    [connectionState]
  );

  const handleConnectionEnd = useCallback(
    (targetTaskId: string | null) => {
      if (connectionState && targetTaskId && targetTaskId !== connectionState.sourceTaskId) {
        // Create FS dependency: source -> target
        addDependency(connectionState.sourceTaskId, targetTaskId, "FS", 0);
      }
      setConnectionState(null);
    },
    [connectionState, addDependency]
  );

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

  // Global mouse event handlers for connection drag
  useEffect(() => {
    if (!connectionState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        handleConnectionMove(e.clientX - rect.left + chartContainerRef.current.scrollLeft, e.clientY - rect.top + chartContainerRef.current.scrollTop);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Find target task under cursor
      const target = e.target as HTMLElement;
      const taskBar = target.closest("[data-task-id]");
      const targetTaskId = taskBar?.getAttribute("data-task-id") ?? null;
      handleConnectionEnd(targetTaskId);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [connectionState, handleConnectionMove, handleConnectionEnd]);

  if (treeTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="text-muted-foreground">タスクがありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mode switcher and navigation */}
      <div className="flex items-center gap-2 mb-2">
        {/* Mode toggle */}
        <span className="text-sm text-muted-foreground">モード:</span>
        <Button
          variant="ghost"
          size="sm"
          className={mode === "date" ? "bg-primary text-primary-foreground" : ""}
          onClick={() => setMode("date")}
          title="日付モード"
        >
          <Calendar className="h-4 w-4 mr-1" />
          日付
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={mode === "relative" ? "bg-primary text-primary-foreground" : ""}
          onClick={() => setMode("relative")}
          title="相対モード（依存関係から自動計算）"
        >
          <Hash className="h-4 w-4 mr-1" />
          相対
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Scale switcher (only in date mode) */}
        {mode === "date" && (
          <>
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

            <div className="h-4 w-px bg-border mx-1" />

            {/* Cascade mode toggle */}
            <Button
              variant={cascadeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setCascadeMode(!cascadeMode)}
              title={cascadeMode ? "連動モード: ON（ドラッグ時に後続タスクも移動）" : "連動モード: OFF（ドラッグしたタスクのみ移動）"}
            >
              {cascadeMode ? (
                <Link className="h-4 w-4 mr-1" />
              ) : (
                <Unlink className="h-4 w-4 mr-1" />
              )}
              連動
            </Button>

            {/* Critical path toggle */}
            <Button
              variant={showCriticalPath ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCriticalPath(!showCriticalPath)}
              title={showCriticalPath ? "クリティカルパス表示中" : "クリティカルパスを表示"}
              className={showCriticalPath ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <Zap className="h-4 w-4 mr-1" />
              CP
            </Button>
          </>
        )}

        {/* Cycle warning in relative mode */}
        {mode === "relative" && relativeScheduleResult.hasCycle && (
          <span className="text-sm text-amber-600">
            ⚠ 循環依存が検出されました
          </span>
        )}
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
              {mode === "relative" ? (
                <>
                  {/* Relative mode: Day 1, Day 2, ... */}
                  <div className="absolute flex h-6 items-center justify-center text-xs font-medium bg-muted/50" style={{ width: chartWidth }}>
                    相対日数（依存関係から自動計算）
                  </div>
                  <div className="flex h-6 mt-6" style={{ width: chartWidth }}>
                    {relativeDays.map((day, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center text-xs border-r"
                        style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Chart area */}
          <div
            ref={(el) => {
              (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              (chartContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
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
              {mode === "relative" ? (
                relativeDays.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r"
                    style={{
                      left: i * DAY_WIDTH,
                      width: DAY_WIDTH,
                    }}
                  />
                ))
              ) : (
                dates.map((date, i) => (
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
                ))
              )}

              {/* Row lines */}
              {treeTasks.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-b"
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Today line (only in date mode) */}
              {mode === "date" && (
                <TodayLine
                  dateRange={dateRange}
                  dayWidth={DAY_WIDTH}
                  height={treeTasks.length * ROW_HEIGHT}
                />
              )}

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

                // Get relative schedule for this task
                const relativeSchedule = relativeScheduleResult.schedules.get(task.id);

                // Check if this task is on the critical path
                const isCritical = showCriticalPath && criticalPathResult.criticalTaskIds.has(task.id);
                const taskFloat = criticalPathResult.taskFloats.get(task.id);

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
                    onClick={openTaskDetail}
                    mode={mode}
                    relativeSchedule={relativeSchedule}
                    onConnectionStart={handleConnectionStart}
                    isConnecting={connectionState !== null}
                    isCritical={isCritical}
                    taskFloat={taskFloat}
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
                mode={mode}
                relativeSchedules={relativeScheduleResult.schedules}
              />

              {/* Connection preview line */}
              {connectionState && (
                <svg
                  className="absolute inset-0 pointer-events-none z-30"
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    <marker
                      id="connection-preview-arrow"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        className="fill-primary"
                      />
                    </marker>
                  </defs>
                  <line
                    x1={connectionState.sourceX}
                    y1={connectionState.sourceY}
                    x2={connectionState.currentX}
                    y2={connectionState.currentY}
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    className="text-primary"
                    markerEnd="url(#connection-preview-arrow)"
                  />
                </svg>
              )}
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
  onClick: (taskId: string) => void;
  mode: GanttMode;
  relativeSchedule: { relativeStart: number; duration: number } | undefined;
  onConnectionStart: (taskId: string, startX: number, startY: number) => void;
  isConnecting: boolean;
  isCritical: boolean;
  taskFloat: number | undefined;
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
  onClick,
  mode,
  relativeSchedule,
  onConnectionStart,
  isConnecting,
  isCritical,
  taskFloat,
}: TaskBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate position based on mode
  const position = mode === "relative"
    ? relativeSchedule
      ? {
          left: relativeSchedule.relativeStart * dayWidth,
          width: Math.max(relativeSchedule.duration * dayWidth, dayWidth),
        }
      : null
    : calculateBarPosition(
        displayStartDate ? new Date(displayStartDate) : undefined,
        displayEndDate ? new Date(displayEndDate) : undefined,
        dateRange.startDate,
        dateRange.endDate,
        dayWidth
      );

  const dragStartedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartedRef.current = false;
    // Disable drag in relative mode
    if (mode === "relative") return;
    if (!barRef.current || !position) return;

    const rect = barRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;

    const dragType = getDragType(relativeX, 0, position.width);
    if (dragType) {
      e.preventDefault();
      dragStartedRef.current = true;
      onDragStart(
        task.id,
        dragType,
        e.clientX,
        task.startDate,
        task.endDate
      );
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only open detail panel if it wasn't a drag operation
    if (!dragStartedRef.current) {
      e.stopPropagation();
      onClick(task.id);
    }
    dragStartedRef.current = false;
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

  const handleConnectionHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      const chartContainer = barRef.current.closest(".overflow-auto");
      if (chartContainer) {
        const containerRect = chartContainer.getBoundingClientRect();
        const scrollLeft = chartContainer.scrollLeft;
        const scrollTop = chartContainer.scrollTop;
        // Calculate position relative to the chart container
        const x = rect.right - containerRect.left + scrollLeft;
        const y = rect.top + rect.height / 2 - containerRect.top + scrollTop;
        onConnectionStart(task.id, x, y);
      }
    }
  };

  // Determine bar colors based on critical path status
  const barBgClass = isCritical
    ? "bg-red-500/80"
    : "bg-primary/80";
  const progressBgClass = isCritical
    ? "bg-red-600"
    : "bg-primary";
  const ringClass = isCritical
    ? "ring-2 ring-red-400"
    : "";

  return (
    <div
      ref={barRef}
      data-testid={`gantt-task-bar-${index}`}
      data-task-id={task.id}
      data-critical={isCritical ? "true" : undefined}
      className={`absolute rounded shadow-sm select-none ${
        isDragging ? (isCritical ? "bg-red-400/60 ring-2 ring-red-500" : "bg-primary/60 ring-2 ring-primary") : ""
      } ${isConnecting ? "ring-2 ring-primary/50" : ""} ${barBgClass} ${ringClass}`}
      style={{
        left: position.left,
        top: index * rowHeight + barPadding,
        width: position.width,
        height: rowHeight - barPadding * 2,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(e) => {
        if (!isDragging && barRef.current) {
          barRef.current.style.cursor = getCursor(e);
        }
      }}
      title={isCritical ? `クリティカルパス（余裕: 0日）` : taskFloat !== undefined ? `余裕: ${taskFloat}日` : undefined}
    >
      {/* Progress fill */}
      <div
        data-testid={`gantt-progress-bar-${index}`}
        className={`absolute inset-0 rounded pointer-events-none ${progressBgClass}`}
        style={{ width: `${task.progress}%` }}
      />
      {/* Task name on bar */}
      <span className="absolute inset-0 flex items-center px-2 pr-6 text-xs text-primary-foreground truncate pointer-events-none">
        {task.name}
      </span>
      {/* Resize handles - visible on hover */}
      {isHovered && (
        <>
          <div
            data-testid={`resize-handle-left-${index}`}
            className="absolute left-0 top-0 bottom-0 w-2 bg-primary/60 rounded-l cursor-ew-resize"
            style={{ cursor: "ew-resize" }}
          />
          <div
            data-testid={`resize-handle-right-${index}`}
            className="absolute right-0 top-0 bottom-0 w-2 bg-primary/60 rounded-r cursor-ew-resize"
            style={{ cursor: "ew-resize" }}
          />
        </>
      )}
      {/* Drag tooltip - shows dates during drag */}
      {isDragging && displayStartDate && displayEndDate && (
        <div
          data-testid={`drag-tooltip-${index}`}
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground border rounded shadow-md text-xs whitespace-nowrap z-20"
        >
          {format(new Date(displayStartDate), "M/d", { locale: ja })} - {format(new Date(displayEndDate), "M/d", { locale: ja })}
        </div>
      )}
      {/* Connection handle */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow cursor-crosshair hover:scale-125 transition-transform flex items-center justify-center z-10"
        onMouseDown={handleConnectionHandleMouseDown}
        title="ドラッグして依存関係を作成"
      >
        <Link2 className="w-2.5 h-2.5 text-white" />
      </div>
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
