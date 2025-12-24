import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import type { Task } from "@/types";

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
  const tasks = useProjectStore((state) => state.project?.tasks ?? []);
  const updateTask = useProjectStore((state) => state.updateTask);

  const task = taskId ? tasks.find((t) => t.id === taskId) : null;

  const [formState, setFormState] = useState<Partial<Task>>({});

  useEffect(() => {
    if (task) {
      setFormState({
        name: task.name,
        description: task.description ?? "",
        startDate: task.startDate,
        endDate: task.endDate,
        progress: task.progress,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
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

  const handleStartDateSelect = (date: Date | undefined) => {
    const dateStr = date ? date.toISOString().split("T")[0] : undefined;
    handleChange("startDate", dateStr);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    const dateStr = date ? date.toISOString().split("T")[0] : undefined;
    handleChange("endDate", dateStr);
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

          {/* 開始日・終了日 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>開始日</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formState.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(formState.startDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parseDate(formState.startDate)}
                    onSelect={handleStartDateSelect}
                    locale={ja}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <Label>終了日</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formState.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(formState.endDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parseDate(formState.endDate)}
                    onSelect={handleEndDateSelect}
                    locale={ja}
                  />
                </PopoverContent>
              </Popover>
            </div>
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
