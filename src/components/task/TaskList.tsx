import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/stores/projectStore";
import { TaskDetailPanel } from "./TaskDetailPanel";

interface EditingState {
  taskId: string;
  value: string;
}

export function TaskList() {
  const tasks = useProjectStore((state) => state.project?.tasks ?? []);
  const addTask = useProjectStore((state) => state.addTask);
  const updateTask = useProjectStore((state) => state.updateTask);
  const deleteTask = useProjectStore((state) => state.deleteTask);

  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const editCancelledRef = useRef(false);

  const handleAddTask = () => {
    const trimmedName = newTaskName.trim();
    if (trimmedName) {
      addTask(trimmedName);
      setNewTaskName("");
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (newTaskName.trim()) {
        handleAddTask();
      } else {
        setIsAdding(false);
        setNewTaskName("");
      }
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTaskName("");
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

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleOpenDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDetailPanelOpen(true);
  };

  const formatTaskDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    return format(parseISO(dateStr), "M/d", { locale: ja });
  };

  if (tasks.length === 0 && !isAdding) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="text-muted-foreground">タスクがありません</p>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          タスクを追加
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 cursor-pointer"
            onClick={() => handleOpenDetail(task.id)}
          >
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
                {task.name}
              </span>
            )}

            {/* 日程表示 */}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTaskDate(task.startDate)} - {formatTaskDate(task.endDate)}
            </span>

            {/* 進捗バー */}
            <div className="flex items-center gap-1 min-w-[60px]">
              <div className="h-1.5 w-10 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">
                {task.progress}%
              </span>
            </div>

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
          </li>
        ))}
      </ul>

      <TaskDetailPanel
        taskId={selectedTaskId}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
      />

      {isAdding ? (
        <div className="flex gap-2">
          <Input
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={handleAddKeyDown}
            onBlur={() => {
              if (!newTaskName.trim()) {
                setIsAdding(false);
              }
            }}
            placeholder="タスク名を入力"
            autoFocus
            className="flex-1"
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          className="justify-start"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          タスクを追加
        </Button>
      )}
    </div>
  );
}
