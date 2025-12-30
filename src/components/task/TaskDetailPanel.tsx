import { useEffect, useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Plus, Trash2, Link2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import type { Task, TaskStatus, Resource, StatusConfig, TaskDependency, DependencyType } from "@/types";
import { DEPENDENCY_TYPES } from "@/types";

// Empty array constants to avoid creating new arrays on each render
const EMPTY_TASKS: Task[] = [];
const EMPTY_RESOURCES: Resource[] = [];
const EMPTY_STATUSES: StatusConfig[] = [];
const EMPTY_DEPENDENCIES: TaskDependency[] = [];

interface TaskDetailPanelProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailPanel({
  taskId,
  open,
  onOpenChange,
}: TaskDetailPanelProps) {
  const tasks = useProjectStore((state) => state.project?.tasks ?? EMPTY_TASKS);
  const resources = useProjectStore(
    (state) => state.project?.resources ?? EMPTY_RESOURCES
  );
  const statuses = useProjectStore(
    (state) => state.project?.statuses ?? EMPTY_STATUSES
  );
  const dependencies = useProjectStore(
    (state) => state.project?.dependencies ?? EMPTY_DEPENDENCIES
  );
  const updateTask = useProjectStore((state) => state.updateTask);
  const setTaskStatus = useProjectStore((state) => state.setTaskStatus);
  const addDependency = useProjectStore((state) => state.addDependency);
  const updateDependency = useProjectStore((state) => state.updateDependency);
  const deleteDependency = useProjectStore((state) => state.deleteDependency);

  const task = taskId ? tasks.find((t) => t.id === taskId) : null;

  const [formState, setFormState] = useState<Partial<Task>>({});
  const [newDepPredecessorId, setNewDepPredecessorId] = useState<string>("");
  const [newDepType, setNewDepType] = useState<DependencyType>("FS");
  const [newDepLag, setNewDepLag] = useState<number>(0);

  // Get dependencies for this task
  const taskDependencies = taskId
    ? dependencies.filter(
        (d) => d.predecessorId === taskId || d.successorId === taskId
      )
    : [];

  // Get predecessors (tasks that this task depends on)
  const predecessors = taskDependencies.filter((d) => d.successorId === taskId);

  // Get successors (tasks that depend on this task)
  const successors = taskDependencies.filter((d) => d.predecessorId === taskId);

  // Get available tasks for adding as predecessor (exclude self and existing predecessors)
  const existingPredecessorIds = predecessors.map((d) => d.predecessorId);
  const availablePredecessors = tasks.filter(
    (t) => t.id !== taskId && !existingPredecessorIds.includes(t.id)
  );

  useEffect(() => {
    if (task) {
      setFormState({
        name: task.name,
        description: task.description ?? "",
        startDate: task.startDate,
        endDate: task.endDate,
        duration: task.duration,
        progress: task.progress,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        responsibleId: task.responsibleId,
        ballHolderId: task.ballHolderId,
        status: task.status,
      });
    }
  }, [task]);

  if (!task) {
    return null;
  }

  const handleChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    updateTask(task.id, { [field]: value });
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      // Clear both dates
      updateTask(task.id, { startDate: undefined, endDate: undefined });
      setFormState((prev) => ({ ...prev, startDate: undefined, endDate: undefined }));
      return;
    }

    const { from, to } = range;

    // If only one date selected, wait for the second
    if (from && !to) {
      const dateStr = from.toISOString().split("T")[0];
      setFormState((prev) => ({ ...prev, startDate: dateStr, endDate: undefined }));
      return;
    }

    if (from && to) {
      // Ensure from <= to (auto-swap if needed)
      const [startDate, endDate] = from <= to ? [from, to] : [to, from];
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];
      const duration = differenceInDays(endDate, startDate) + 1;

      updateTask(task.id, { startDate: startStr, endDate: endStr, duration });
      setFormState((prev) => ({ ...prev, startDate: startStr, endDate: endStr, duration }));
    }
  };

  const handleStatusChange = (value: string) => {
    setFormState((prev) => ({ ...prev, status: value as TaskStatus }));
    setTaskStatus(task.id, value as TaskStatus);
  };

  const handleResponsibleChange = (value: string) => {
    const newValue = value === "none" ? undefined : value;
    setFormState((prev) => ({ ...prev, responsibleId: newValue }));
    updateTask(task.id, { responsibleId: newValue });
  };

  const handleBallHolderChange = (value: string) => {
    const newValue = value === "none" ? undefined : value;
    setFormState((prev) => ({ ...prev, ballHolderId: newValue }));
    updateTask(task.id, { ballHolderId: newValue });
  };

  const handleAddDependency = () => {
    if (!taskId || !newDepPredecessorId) return;
    const success = addDependency(newDepPredecessorId, taskId, newDepType, newDepLag);
    if (success) {
      setNewDepPredecessorId("");
      setNewDepType("FS");
      setNewDepLag(0);
    }
  };

  const handleDeleteDependency = (depId: string) => {
    deleteDependency(depId);
  };

  const handleUpdateDependencyType = (depId: string, type: DependencyType) => {
    updateDependency(depId, { type });
  };

  const handleUpdateDependencyLag = (depId: string, lag: number) => {
    updateDependency(depId, { lag });
  };

  const getTaskName = (taskId: string) => {
    const t = tasks.find((t) => t.id === taskId);
    return t?.name || "不明なタスク";
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "日付を選択";
    return format(parseISO(dateStr), "yyyy年M月d日", { locale: ja });
  };

  const parseDate = (dateStr: string | undefined) => {
    if (!dateStr) return undefined;
    return parseISO(dateStr);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>タスク詳細</SheetTitle>
          <SheetDescription>タスクの詳細情報を編集できます</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {/* タスク名 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-name">タスク名</Label>
            <Input
              id="task-name"
              value={formState.name ?? ""}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          {/* ステータス */}
          <div className="flex flex-col gap-2">
            <Label>ステータス</Label>
            <Select
              value={formState.status ?? "not_started"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger data-testid="status-select">
                <SelectValue placeholder="ステータスを選択" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 責任者・ボール */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>責任者</Label>
              <Select
                value={formState.responsibleId ?? "none"}
                onValueChange={handleResponsibleChange}
              >
                <SelectTrigger data-testid="responsible-select">
                  <SelectValue placeholder="責任者を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未割り当て</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: resource.color }}
                        />
                        {resource.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>ボール</Label>
              <Select
                value={formState.ballHolderId ?? "none"}
                onValueChange={handleBallHolderChange}
              >
                <SelectTrigger data-testid="ballholder-select">
                  <SelectValue placeholder="ボール保持者を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未割り当て</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: resource.color }}
                        />
                        {resource.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 期間選択（開始日〜終了日） */}
          <div className="flex flex-col gap-2">
            <Label>期間</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formState.startDate && !formState.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formState.startDate && formState.endDate ? (
                    <>
                      {formatDate(formState.startDate)} 〜 {formatDate(formState.endDate)}
                      <span className="ml-2 text-muted-foreground">
                        ({formState.duration ?? differenceInDays(parseDate(formState.endDate)!, parseDate(formState.startDate)!) + 1}日間)
                      </span>
                    </>
                  ) : formState.startDate ? (
                    <>
                      {formatDate(formState.startDate)} 〜 <span className="text-muted-foreground">終了日を選択</span>
                    </>
                  ) : (
                    "カレンダーで期間を選択"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: parseDate(formState.startDate),
                    to: parseDate(formState.endDate),
                  }}
                  onSelect={handleDateRangeSelect}
                  locale={ja}
                  numberOfMonths={2}
                />
                <div className="border-t p-3 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    2回クリックで期間を選択
                  </span>
                  {(formState.startDate || formState.endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDateRangeSelect(undefined)}
                    >
                      クリア
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* 所要日数（手動調整用） */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="duration">所要日数</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={formState.duration ?? ""}
              onChange={(e) =>
                handleChange(
                  "duration",
                  e.target.value ? parseInt(e.target.value, 10) : undefined
                )
              }
              placeholder="日数"
              className="w-32"
            />
            <span className="text-xs text-muted-foreground">
              日付なしでも所要日数だけ設定できます
            </span>
          </div>

          {/* 進捗率 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>進捗率</Label>
              <span className="text-sm text-muted-foreground">
                {formState.progress ?? 0}%
              </span>
            </div>
            <Slider
              value={[formState.progress ?? 0]}
              onValueChange={(values) => handleChange("progress", values[0])}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* 工数（予定/実績） */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="estimated-hours">予定工数（時間）</Label>
              <Input
                id="estimated-hours"
                type="number"
                min={0}
                step={0.5}
                value={formState.estimatedHours ?? ""}
                onChange={(e) =>
                  handleChange(
                    "estimatedHours",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="0"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="actual-hours">実績工数（時間）</Label>
              <Input
                id="actual-hours"
                type="number"
                min={0}
                step={0.5}
                value={formState.actualHours ?? ""}
                onChange={(e) =>
                  handleChange(
                    "actualHours",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* 依存関係 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <Label>依存関係</Label>
            </div>

            {/* 先行タスク（このタスクが依存するタスク） */}
            {predecessors.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">先行タスク（このタスクが依存するタスク）</span>
                {predecessors.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm"
                  >
                    <span className="flex-1 truncate">
                      {getTaskName(dep.predecessorId)}
                    </span>
                    <Select
                      value={dep.type}
                      onValueChange={(value) =>
                        handleUpdateDependencyType(dep.id, value as DependencyType)
                      }
                    >
                      <SelectTrigger className="w-24 h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPENDENCY_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={dep.lag}
                      onChange={(e) =>
                        handleUpdateDependencyLag(dep.id, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-16 h-7 text-center"
                      title="ラグ日数（正=遅延、負=リード）"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteDependency(dep.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 後続タスク（このタスクに依存するタスク） */}
            {successors.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">後続タスク（このタスクに依存するタスク）</span>
                {successors.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm"
                  >
                    <span className="flex-1 truncate text-muted-foreground">
                      → {getTaskName(dep.successorId)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {DEPENDENCY_TYPES.find((t) => t.id === dep.type)?.name} ({dep.lag}日)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 新しい依存関係を追加 */}
            {availablePredecessors.length > 0 && (
              <div className="flex flex-col gap-2 p-3 border border-dashed rounded-md">
                <span className="text-xs text-muted-foreground">先行タスクを追加</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={newDepPredecessorId}
                    onValueChange={setNewDepPredecessorId}
                  >
                    <SelectTrigger className="flex-1" data-testid="add-predecessor-select">
                      <SelectValue placeholder="タスクを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePredecessors.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={newDepType}
                    onValueChange={(value) => setNewDepType(value as DependencyType)}
                  >
                    <SelectTrigger className="flex-1" data-testid="add-dep-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPENDENCY_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={newDepLag}
                    onChange={(e) => setNewDepLag(parseInt(e.target.value, 10) || 0)}
                    className="w-20"
                    placeholder="ラグ"
                    title="ラグ日数（正=遅延、負=リード）"
                    data-testid="add-dep-lag-input"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddDependency}
                    disabled={!newDepPredecessorId}
                    data-testid="add-dependency-button"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    追加
                  </Button>
                </div>
              </div>
            )}

            {predecessors.length === 0 && successors.length === 0 && availablePredecessors.length === 0 && (
              <p className="text-sm text-muted-foreground">
                依存関係はありません
              </p>
            )}
          </div>

          {/* 説明文 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={formState.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="タスクの詳細を入力..."
              rows={4}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
