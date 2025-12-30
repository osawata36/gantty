import { useMemo, useState, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import type { Task, StatusConfig, Resource } from "@/types";

// Empty array constants to avoid creating new arrays on each render
const EMPTY_TASKS: Task[] = [];
const EMPTY_STATUSES: StatusConfig[] = [];
const EMPTY_RESOURCES: Resource[] = [];

interface LeafTask extends Task {
  // Leaf tasks have no children
}

export function KanbanView() {
  const tasks = useProjectStore((state) => state.project?.tasks ?? EMPTY_TASKS);
  const statuses = useProjectStore(
    (state) => state.project?.statuses ?? EMPTY_STATUSES
  );
  const resources = useProjectStore(
    (state) => state.project?.resources ?? EMPTY_RESOURCES
  );
  const setTaskStatus = useProjectStore((state) => state.setTaskStatus);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Get only leaf tasks (tasks without children)
  const leafTasks = useMemo(() => {
    const parentIds = new Set(
      tasks.filter((t) => t.parentId).map((t) => t.parentId!)
    );
    return tasks.filter((t) => !parentIds.has(t.id));
  }, [tasks]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, LeafTask[]> = {};
    for (const status of statuses) {
      grouped[status.id] = [];
    }
    for (const task of leafTasks) {
      const statusId = task.status;
      if (grouped[statusId]) {
        grouped[statusId].push(task);
      }
    }
    return grouped;
  }, [leafTasks, statuses]);

  const getResourceById = (resourceId: string | undefined) => {
    if (!resourceId) return undefined;
    return resources.find((r) => r.id === resourceId);
  };

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", taskId);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, statusId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumn(statusId);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, statusId: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      if (taskId) {
        setTaskStatus(taskId, statusId as Task["status"]);
      }
      setDraggedTaskId(null);
      setDragOverColumn(null);
    },
    [setTaskStatus]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  if (leafTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="text-muted-foreground">タスクがありません</p>
      </div>
    );
  }

  // Keep track of global card index for test IDs
  let cardIndex = 0;

  return (
    <div data-testid="kanban-board" className="flex gap-4 h-full overflow-x-auto p-4">
      {statuses
        .sort((a, b) => a.order - b.order)
        .map((status) => {
          const tasksInColumn = tasksByStatus[status.id] || [];

          return (
            <div
              key={status.id}
              data-testid={`kanban-column-${status.id}`}
              className={`flex flex-col min-w-[280px] w-[280px] rounded-lg bg-muted/30 ${
                dragOverColumn === status.id ? "ring-2 ring-primary" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              {/* Column header */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-b"
                style={{ borderColor: status.color }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="font-medium text-sm">{status.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {tasksInColumn.length}
                </span>
              </div>

              {/* Column content */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {tasksInColumn.map((task) => {
                  const responsible = getResourceById(task.responsibleId);
                  const ballHolder = getResourceById(task.ballHolderId);
                  const currentIndex = cardIndex++;

                  return (
                    <div
                      key={task.id}
                      data-testid={`kanban-card-${currentIndex}`}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-background rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedTaskId === task.id ? "opacity-50" : ""
                      }`}
                    >
                      {/* Task name */}
                      <div className="font-medium text-sm mb-2">{task.name}</div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {task.progress}%
                        </span>
                      </div>

                      {/* Responsible and Ball holder */}
                      <div className="flex flex-wrap gap-1">
                        {responsible && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${responsible.color}20`,
                              color: responsible.color,
                            }}
                            title="責任者"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: responsible.color }}
                            />
                            {responsible.name}
                          </span>
                        )}
                        {ballHolder && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border"
                            style={{
                              borderColor: ballHolder.color,
                              color: ballHolder.color,
                            }}
                            title="ボール"
                          >
                            🏐 {ballHolder.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
