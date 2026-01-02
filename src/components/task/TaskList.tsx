import React, { useState, useRef, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  IndentIncrease,
  IndentDecrease,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/stores/projectStore";
import { useViewStore, ColumnId } from "@/stores/viewStore";
import { BallHolderFilter } from "./BallHolderFilter";
import { ColumnSettings, SortButton, COLUMN_LABELS } from "./ColumnSettings";
import type { Task, Resource } from "@/types";

// Empty array constants to avoid creating new arrays on each render
const EMPTY_TASKS: Task[] = [];
const EMPTY_RESOURCES: Resource[] = [];

interface EditingState {
  taskId: string;
  value: string;
}

interface EditingDurationState {
  taskId: string;
  value: string;
}

interface TreeTask extends Task {
  depth: number;
  hasChildren: boolean;
}

export function TaskList() {
  const tasks = useProjectStore((state) => state.project?.tasks ?? EMPTY_TASKS);
  const resources = useProjectStore(
    (state) => state.project?.resources ?? EMPTY_RESOURCES
  );
  const addTask = useProjectStore((state) => state.addTask);
  const addSubTask = useProjectStore((state) => state.addSubTask);
  const updateTask = useProjectStore((state) => state.updateTask);
  const deleteTask = useProjectStore((state) => state.deleteTask);
  const toggleTaskCollapse = useProjectStore(
    (state) => state.toggleTaskCollapse
  );
  const isTaskCollapsed = useProjectStore((state) => state.isTaskCollapsed);
  const collapsedTaskIds = useProjectStore((state) => state.collapsedTaskIds);
  const getParentProgress = useProjectStore((state) => state.getParentProgress);
  const getParentDates = useProjectStore((state) => state.getParentDates);
  const getParentDuration = useProjectStore((state) => state.getParentDuration);
  const moveTask = useProjectStore((state) => state.moveTask);
  const indentTask = useProjectStore((state) => state.indentTask);
  const outdentTask = useProjectStore((state) => state.outdentTask);
  const ballHolderFilter = useProjectStore((state) => state.ballHolderFilter);
  const getFilteredTasks = useProjectStore((state) => state.getFilteredTasks);

  // View settings
  const visibleColumns = useViewStore((state) => state.visibleColumns);
  const sortConfig = useViewStore((state) => state.sortConfig);
  const searchQuery = useViewStore((state) => state.searchQuery);
  const filters = useViewStore((state) => state.filters);
  const openTaskDetail = useViewStore((state) => state.openTaskDetail);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<
    "before" | "child" | "after" | null
  >(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const [isInvalidDrop, setIsInvalidDrop] = useState(false);
  const reorderTask = useProjectStore((state) => state.reorderTask);

  // Check if dropping draggedTaskId onto targetTaskId would cause circular reference
  const wouldCauseCircularReference = useCallback(
    (draggedId: string, targetId: string): boolean => {
      // Check if target is a descendant of dragged task
      const isDescendant = (parentId: string, childId: string): boolean => {
        const children = tasks.filter((t) => t.parentId === parentId);
        for (const child of children) {
          if (child.id === childId) return true;
          if (isDescendant(child.id, childId)) return true;
        }
        return false;
      };
      return isDescendant(draggedId, targetId);
    },
    [tasks]
  );

  const getResourceById = (resourceId: string | undefined) => {
    if (!resourceId) return undefined;
    return resources.find((r) => r.id === resourceId);
  };

  // Highlight matching text in task name
  const highlightMatch = useCallback(
    (text: string) => {
      if (!searchQuery.trim()) {
        return text;
      }
      const query = searchQuery.toLowerCase();
      const lowerText = text.toLowerCase();
      const index = lowerText.indexOf(query);
      if (index === -1) {
        return text;
      }
      const before = text.slice(0, index);
      const match = text.slice(index, index + query.length);
      const after = text.slice(index + query.length);
      return (
        <>
          {before}
          <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {match}
          </mark>
          {after}
        </>
      );
    },
    [searchQuery]
  );

  const [isAdding, setIsAdding] = useState(false);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editingDuration, setEditingDuration] = useState<EditingDurationState | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const editCancelledRef = useRef(false);
  const durationEditCancelledRef = useRef(false);

  // Check if any filters are active
  const hasActiveFilters =
    filters.statusIds.length > 0 ||
    filters.responsibleIds.length > 0 ||
    filters.dueDate !== null;

  // Build tree structure
  const treeTasks = useMemo(() => {
    // If filter or search is applied, show filtered tasks as flat list
    if (ballHolderFilter !== null || searchQuery.trim() !== "" || hasActiveFilters) {
      const filteredTasks = getFilteredTasks(searchQuery, filters);
      return filteredTasks.map((task) => ({
        ...task,
        depth: 0,
        hasChildren: false,
      }));
    }

    // Build tree by depth-first traversal
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

        // If not collapsed, add children
        if (!isTaskCollapsed(task.id)) {
          result.push(...buildTree(task.id, depth + 1));
        }
      }
      return result;
    };

    return buildTree(undefined, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, collapsedTaskIds, ballHolderFilter, searchQuery, hasActiveFilters, filters]);

  // Apply sorting to treeTasks
  const sortedTreeTasks = useMemo(() => {
    if (!sortConfig) return treeTasks;

    const getValueForSort = (task: TreeTask, column: ColumnId): string | number => {
      switch (column) {
        case "name":
          return task.name.toLowerCase();
        case "duration":
          return task.hasChildren ? (getParentDuration(task.id) ?? 0) : (task.duration ?? 0);
        case "startDate":
          return task.startDate || "";
        case "endDate":
          return task.endDate || "";
        case "progress":
          return task.hasChildren ? getParentProgress(task.id) : task.progress;
        case "responsible":
          return getResourceById(task.responsibleId)?.name.toLowerCase() || "";
        case "ballHolder":
          return getResourceById(task.ballHolderId)?.name.toLowerCase() || "";
        default:
          return "";
      }
    };

    return [...treeTasks].sort((a, b) => {
      const aValue = getValueForSort(a, sortConfig.column);
      const bValue = getValueForSort(b, sortConfig.column);

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [treeTasks, sortConfig, getParentProgress, getResourceById]);

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const trimmedName = newTaskName.trim();
      if (trimmedName) {
        // Add the task
        if (addingParentId) {
          addSubTask(addingParentId, trimmedName);
          // Keep input field open for continuous adding
          setNewTaskName("");
          // Don't reset addingParentId or isAdding - keep input open
        } else {
          addTask(trimmedName);
          setNewTaskName("");
          setIsAdding(false);
          setAddingParentId(null);
        }
      } else {
        // Empty input - close the input field
        setIsAdding(false);
        setNewTaskName("");
        setAddingParentId(null);
      }
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTaskName("");
      setAddingParentId(null);
    }
  };

  const handleStartEditing = (taskId: string, currentName: string) => {
    editCancelledRef.current = false;
    setEditing({ taskId, value: currentName });
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit(e.currentTarget.value);
    } else if (e.key === "Escape") {
      editCancelledRef.current = true;
      e.currentTarget.blur();
      setEditing(null);
    }
  };

  const handleEditBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleSaveEdit(e.currentTarget.value);
  };

  const handleSaveEdit = (value: string) => {
    if (editCancelledRef.current) {
      editCancelledRef.current = false;
      return;
    }
    if (editing) {
      const trimmedValue = value.trim();
      if (trimmedValue && trimmedValue !== "") {
        updateTask(editing.taskId, { name: trimmedValue });
      }
      setEditing(null);
    }
  };

  // Duration editing handlers
  const handleStartEditingDuration = (taskId: string, currentDuration: number | undefined) => {
    durationEditCancelledRef.current = false;
    setEditingDuration({ taskId, value: String(currentDuration ?? "") });
  };

  const handleDurationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveDuration(e.currentTarget.value);
    } else if (e.key === "Escape") {
      durationEditCancelledRef.current = true;
      e.currentTarget.blur();
      setEditingDuration(null);
    }
  };

  const handleDurationBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleSaveDuration(e.currentTarget.value);
  };

  const handleSaveDuration = (value: string) => {
    if (durationEditCancelledRef.current) {
      durationEditCancelledRef.current = false;
      return;
    }
    if (editingDuration) {
      const trimmedValue = value.trim();
      const numValue = parseInt(trimmedValue, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        updateTask(editingDuration.taskId, { duration: numValue });
      }
      setEditingDuration(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleOpenDetail = (taskId: string) => {
    openTaskDetail(taskId);
  };

  const handleStartAddSubTask = (parentId: string) => {
    setAddingParentId(parentId);
    setIsAdding(true);
    setNewTaskName("");
  };

  const formatTaskDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    return format(parseISO(dateStr), "M/d", { locale: ja });
  };

  const getTaskProgress = (task: TreeTask) => {
    if (task.hasChildren) {
      return getParentProgress(task.id);
    }
    return task.progress;
  };

  const getTaskDates = (task: TreeTask) => {
    if (task.hasChildren) {
      const dates = getParentDates(task.id);
      return {
        startDate: dates.startDate,
        endDate: dates.endDate,
      };
    }
    return {
      startDate: task.startDate,
      endDate: task.endDate,
    };
  };

  // Drag & Drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", taskId);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverPosition(null);
    setDragOverRoot(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetTaskId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedTaskId !== targetTaskId) {
        setDragOverTaskId(targetTaskId);
        setDragOverRoot(false);

        // Determine drop position based on mouse Y position
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        const percentage = y / height;

        if (percentage < 0.25) {
          setDragOverPosition("before");
          setIsInvalidDrop(false); // before/after don't cause circular reference
        } else if (percentage > 0.75) {
          setDragOverPosition("after");
          setIsInvalidDrop(false); // before/after don't cause circular reference
        } else {
          setDragOverPosition("child");
          // Check for circular reference when dropping as child
          if (draggedTaskId) {
            setIsInvalidDrop(wouldCauseCircularReference(draggedTaskId, targetTaskId));
          }
        }
      }
    },
    [draggedTaskId, wouldCauseCircularReference]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverTaskId(null);
    setDragOverPosition(null);
    setIsInvalidDrop(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetTaskId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = e.dataTransfer.getData("text/plain");
      if (taskId && taskId !== targetTaskId) {
        if (dragOverPosition === "before" || dragOverPosition === "after") {
          // Try to reorder within the same hierarchy
          const success = reorderTask(taskId, targetTaskId, dragOverPosition);
          if (!success) {
            // If reorder fails (different hierarchy), move to target's parent
            const targetTask = tasks.find((t) => t.id === targetTaskId);
            if (targetTask) {
              moveTask(taskId, targetTask.parentId);
            }
          }
        } else {
          // Default: move as child of target task (dragOverPosition === "child" or null)
          moveTask(taskId, targetTaskId);
        }
      }
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverPosition(null);
      setDragOverRoot(false);
    },
    [moveTask, reorderTask, dragOverPosition, tasks]
  );

  const handleRootDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverRoot(true);
      setDragOverTaskId(null);
    },
    []
  );

  const handleRootDragLeave = useCallback(() => {
    setDragOverRoot(false);
  }, []);

  const handleRootDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      if (taskId) {
        moveTask(taskId, undefined);
      }
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragOverRoot(false);
    },
    [moveTask]
  );

  // Keyboard handler for indent/outdent
  const handleTaskKeyDown = useCallback(
    (e: React.KeyboardEvent, taskId: string) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: outdent (move up in hierarchy)
          outdentTask(taskId);
        } else {
          // Tab: indent (move down in hierarchy)
          indentTask(taskId);
        }
      }
    },
    [indentTask, outdentTask]
  );

  // Indent/outdent button handlers
  const handleIndent = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      indentTask(taskId);
    },
    [indentTask]
  );

  const handleOutdent = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      outdentTask(taskId);
    },
    [outdentTask]
  );

  // Helper to check if a column is visible
  const isColumnVisible = (columnId: ColumnId) =>
    visibleColumns.includes(columnId);

  if (sortedTreeTasks.length === 0 && !isAdding) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <BallHolderFilter />
          <ColumnSettings />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <p className="text-muted-foreground">
            {ballHolderFilter !== null
              ? "フィルター条件に一致するタスクがありません"
              : "タスクがありません"}
          </p>
          {ballHolderFilter === null && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              タスクを追加
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <BallHolderFilter />
        <ColumnSettings />
      </div>

      {/* Column Headers with Sort */}
      <div className="flex items-center gap-2 px-2 py-1 border-b text-muted-foreground">
        <div className="w-6" /> {/* Expand/collapse placeholder */}
        <div className="flex-1 min-w-0">
          <SortButton columnId="name" label={COLUMN_LABELS.name} />
        </div>
        {isColumnVisible("duration") && (
          <div className="w-16 text-center">
            <SortButton columnId="duration" label={COLUMN_LABELS.duration} />
          </div>
        )}
        {isColumnVisible("startDate") && (
          <div className="w-24 text-center">
            <SortButton columnId="startDate" label={COLUMN_LABELS.startDate} />
          </div>
        )}
        {isColumnVisible("endDate") && (
          <div className="w-24 text-center">
            <SortButton columnId="endDate" label={COLUMN_LABELS.endDate} />
          </div>
        )}
        {isColumnVisible("progress") && (
          <div className="w-24 text-center">
            <SortButton columnId="progress" label={COLUMN_LABELS.progress} />
          </div>
        )}
        {isColumnVisible("responsible") && (
          <div className="w-20 text-center">
            <SortButton columnId="responsible" label={COLUMN_LABELS.responsible} />
          </div>
        )}
        {isColumnVisible("ballHolder") && (
          <div className="w-20 text-center">
            <SortButton columnId="ballHolder" label={COLUMN_LABELS.ballHolder} />
          </div>
        )}
        <div className="w-16" /> {/* Actions placeholder */}
      </div>

      <ul className="flex flex-col gap-1">
        {sortedTreeTasks.map((task, index) => {
          const progress = getTaskProgress(task);
          const dates = getTaskDates(task);
          const showInlineInput = isAdding && addingParentId === task.id;
          return (
            <React.Fragment key={task.id}>
            <li
              data-testid={`task-item-${index}`}
              tabIndex={0}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragEnd={handleDragEnd}
              onKeyDown={(e) => handleTaskKeyDown(e, task.id)}
              onFocus={() => setFocusedTaskId(task.id)}
              onBlur={() => setFocusedTaskId(null)}
              className={`relative flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 cursor-pointer ${
                draggedTaskId === task.id ? "opacity-50" : ""
              } ${focusedTaskId === task.id ? "ring-2 ring-primary" : ""} ${
                dragOverTaskId === task.id && isInvalidDrop ? "ring-2 ring-destructive" : ""
              }`}
              style={{ paddingLeft: `${12 + task.depth * 24}px` }}
              onClick={() => handleOpenDetail(task.id)}
            >
              {/* Collapse/Expand toggle */}
              {task.hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskCollapse(task.id);
                  }}
                  className="h-5 w-5 p-0"
                >
                  {isTaskCollapsed(task.id) ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <span className="w-5" />
              )}

              {editing?.taskId === task.id ? (
                <Input
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ ...editing, value: e.target.value })
                  }
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditBlur}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="flex-1"
                />
              ) : (
                <span
                  className="flex-1"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartEditing(task.id, task.name);
                  }}
                >
                  {highlightMatch(task.name)}
                </span>
              )}

              {/* 日数表示・編集 */}
              {isColumnVisible("duration") && (
                <div className="w-16 text-center">
                  {task.hasChildren ? (
                    // 親タスクは子タスクから自動算出（編集不可）
                    <span
                      className="text-xs text-muted-foreground"
                      title="子タスクの合計"
                    >
                      {(() => {
                        const parentDuration = getParentDuration(task.id);
                        return parentDuration != null ? `${parentDuration}日` : "-";
                      })()}
                    </span>
                  ) : editingDuration?.taskId === task.id ? (
                    <Input
                      type="number"
                      min="0"
                      value={editingDuration.value}
                      onChange={(e) =>
                        setEditingDuration({ ...editingDuration, value: e.target.value })
                      }
                      onKeyDown={handleDurationKeyDown}
                      onBlur={handleDurationBlur}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-14 h-6 text-xs text-center px-1"
                    />
                  ) : (
                    <span
                      className="text-xs text-muted-foreground cursor-pointer hover:text-primary"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartEditingDuration(task.id, task.duration);
                      }}
                      title="ダブルクリックで編集"
                    >
                      {task.duration != null ? `${task.duration}日` : "-"}
                    </span>
                  )}
                </div>
              )}

              {/* 開始日表示 */}
              {isColumnVisible("startDate") && (
                <span className="text-xs text-muted-foreground whitespace-nowrap w-24 text-center">
                  {formatTaskDate(dates.startDate)}
                </span>
              )}

              {/* 終了日表示 */}
              {isColumnVisible("endDate") && (
                <span className="text-xs text-muted-foreground whitespace-nowrap w-24 text-center">
                  {formatTaskDate(dates.endDate)}
                </span>
              )}

              {/* 進捗バー */}
              {isColumnVisible("progress") && (
                <div className="flex items-center gap-1 w-24 justify-center">
                  <div className="h-1.5 w-10 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {progress}%
                  </span>
                </div>
              )}

              {/* 責任者表示 */}
              {isColumnVisible("responsible") && (
                <div className="w-20 flex justify-center">
                  {(() => {
                    const responsible = getResourceById(task.responsibleId);
                    return responsible ? (
                      <span
                        data-testid={`responsible-badge-${index}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: `${responsible.color}20`,
                          color: responsible.color,
                        }}
                        title="責任者"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: responsible.color }} />
                        {responsible.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    );
                  })()}
                </div>
              )}

              {/* ボール表示 */}
              {isColumnVisible("ballHolder") && (
                <div className="w-20 flex justify-center">
                  {(() => {
                    const ballHolder = getResourceById(task.ballHolderId);
                    return ballHolder ? (
                      <span
                        data-testid={`ball-badge-${index}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border"
                        style={{
                          borderColor: ballHolder.color,
                          color: ballHolder.color,
                        }}
                        title="ボール"
                      >
                        🏐 {ballHolder.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    );
                  })()}
                </div>
              )}

              {/* インデント変更ボタン */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => handleOutdent(e, task.id)}
                aria-label="階層を上げる"
                title="階層を上げる (Shift+Tab)"
                disabled={!task.parentId}
              >
                <IndentDecrease className={`h-4 w-4 ${task.parentId ? "text-muted-foreground hover:text-primary" : "text-muted-foreground/30"}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => handleIndent(e, task.id)}
                aria-label="階層を下げる"
                title="階層を下げる (Tab)"
              >
                <IndentIncrease className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>

              {/* サブタスク追加ボタン */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartAddSubTask(task.id);
                }}
                aria-label="サブタスクを追加"
                title="サブタスクを追加"
              >
                <CornerDownRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task.id);
                }}
                aria-label="削除"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
              {/* Drop zone indicators */}
              {dragOverTaskId === task.id && (
                <>
                  {dragOverPosition === "before" && (
                    <div className="absolute -top-0.5 left-0 right-0 h-1 bg-primary rounded-full" />
                  )}
                  {dragOverPosition === "child" && (
                    <div className="absolute inset-0 bg-primary/10 ring-2 ring-primary rounded-md" />
                  )}
                  {dragOverPosition === "after" && (
                    <div className="absolute -bottom-0.5 left-0 right-0 h-1 bg-primary rounded-full" />
                  )}
                </>
              )}
              {/* Invisible drop zone for detecting drag over */}
              <div
                data-testid={`task-dropzone-${index}`}
                className="absolute inset-0 pointer-events-none"
                style={{ pointerEvents: draggedTaskId ? "auto" : "none" }}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, task.id)}
              />
            </li>
            {/* Inline subtask input - appears directly under parent task */}
            {showInlineInput && (
              <li
                data-testid="inline-subtask-input"
                className="flex gap-2 items-center rounded-md border border-dashed border-primary/50 bg-primary/5 px-3 py-2"
                style={{ paddingLeft: `${12 + (task.depth + 1) * 24}px` }}
              >
                <span className="text-muted-foreground text-sm flex items-center">
                  └
                </span>
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  onBlur={() => {
                    if (!newTaskName.trim()) {
                      setIsAdding(false);
                      setAddingParentId(null);
                    }
                  }}
                  placeholder="サブタスク名を入力"
                  autoFocus
                  className="flex-1"
                />
              </li>
            )}
            </React.Fragment>
          );
        })}
      </ul>

      {/* Root drop zone - for moving tasks to root level */}
      <div
        data-testid="root-dropzone"
        className={`min-h-[40px] rounded-md border-2 border-dashed transition-colors ${
          draggedTaskId
            ? dragOverRoot
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/30"
            : "border-transparent"
        }`}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {draggedTaskId && (
          <div className="flex items-center justify-center h-full py-2 text-sm text-muted-foreground">
            ここにドロップしてルートレベルに移動
          </div>
        )}
      </div>

      {/* Root-level task input (only shown when adding root task, not subtask) */}
      {isAdding && !addingParentId ? (
        <div className="flex gap-2">
          <Input
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={handleAddKeyDown}
            onBlur={() => {
              if (!newTaskName.trim()) {
                setIsAdding(false);
                setAddingParentId(null);
              }
            }}
            placeholder="タスク名を入力"
            autoFocus
            className="flex-1"
          />
        </div>
      ) : !isAdding ? (
        <Button
          variant="ghost"
          className="justify-start"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          タスクを追加
        </Button>
      ) : null}
    </div>
  );
}
