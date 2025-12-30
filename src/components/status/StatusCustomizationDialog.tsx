import { useState } from "react";
import { Pencil, Trash2, Check, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/stores/projectStore";
import type { StatusConfig } from "@/types";

// Empty array constant to avoid creating new array on each render
const EMPTY_STATUSES: StatusConfig[] = [];

interface StatusCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusCustomizationDialog({
  open,
  onOpenChange,
}: StatusCustomizationDialogProps) {
  const statuses = useProjectStore(
    (state) => state.project?.statuses ?? EMPTY_STATUSES
  );
  const addStatus = useProjectStore((state) => state.addStatus);
  const updateStatus = useProjectStore((state) => state.updateStatus);
  const deleteStatus = useProjectStore((state) => state.deleteStatus);

  const [newStatusId, setNewStatusId] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#6B7280");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAddStatus = () => {
    const trimmedId = newStatusId.trim();
    const trimmedName = newStatusName.trim();
    if (trimmedId && trimmedName) {
      addStatus(trimmedId, trimmedName, newStatusColor);
      setNewStatusId("");
      setNewStatusName("");
      setNewStatusColor("#6B7280");
    }
  };

  const handleStartEdit = (index: number) => {
    const status = statuses[index];
    setEditingIndex(index);
    setEditName(status.name);
    setEditColor(status.color);
  };

  const handleSaveEdit = (index: number) => {
    const status = statuses[index];
    updateStatus(status.id, {
      name: editName,
      color: editColor,
    });
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const status = statuses[index];
    deleteStatus(status.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ステータス設定</DialogTitle>
          <DialogDescription>
            タスクのステータスをカスタマイズします
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new status */}
          <div className="flex gap-2">
            <input
              type="color"
              value={newStatusColor}
              onChange={(e) => setNewStatusColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <Input
              placeholder="ID（英数字）"
              value={newStatusId}
              onChange={(e) => setNewStatusId(e.target.value)}
              className="w-24"
            />
            <Input
              placeholder="ステータス名"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddStatus();
                }
              }}
            />
            <Button onClick={handleAddStatus} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              追加
            </Button>
          </div>

          {/* Status list */}
          <div className="space-y-2">
            {statuses.map((status, index) => (
              <div
                key={status.id}
                className="flex items-center gap-2 p-2 border rounded-lg"
              >
                {editingIndex === index ? (
                  <>
                    <input
                      type="color"
                      data-testid={`color-input-${index}`}
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`save-status-${index}`}
                      onClick={() => handleSaveEdit(index)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="flex-1 text-sm">{status.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {status.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`edit-status-${index}`}
                      onClick={() => handleStartEdit(index)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`delete-status-${index}`}
                      onClick={() => handleDelete(index)}
                      disabled={statuses.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
