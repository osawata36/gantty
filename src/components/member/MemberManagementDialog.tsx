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
import type { Resource } from "@/types";

// Empty array constant to avoid creating new array on each render
const EMPTY_RESOURCES: Resource[] = [];

interface MemberManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberManagementDialog({
  open,
  onOpenChange,
}: MemberManagementDialogProps) {
  const resources = useProjectStore(
    (state) => state.project?.resources ?? EMPTY_RESOURCES
  );
  const addResource = useProjectStore((state) => state.addResource);
  const updateResource = useProjectStore((state) => state.updateResource);
  const deleteResource = useProjectStore((state) => state.deleteResource);

  const [newMemberName, setNewMemberName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAddMember = () => {
    const trimmedName = newMemberName.trim();
    if (trimmedName) {
      addResource(trimmedName);
      setNewMemberName("");
    }
  };

  const handleStartEdit = (index: number) => {
    const resource = resources[index];
    setEditingIndex(index);
    setEditName(resource.name);
    setEditColor(resource.color);
  };

  const handleSaveEdit = (index: number) => {
    const resource = resources[index];
    updateResource(resource.id, {
      name: editName,
      color: editColor,
    });
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const resource = resources[index];
    deleteResource(resource.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>メンバー管理</DialogTitle>
          <DialogDescription>
            プロジェクトのメンバーを管理します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new member */}
          <div className="flex gap-2">
            <Input
              placeholder="メンバー名を入力"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
            />
            <Button onClick={handleAddMember} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              追加
            </Button>
          </div>

          {/* Member list */}
          <div className="space-y-2">
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                メンバーがいません
              </p>
            ) : (
              resources.map((resource, index) => (
                <div
                  key={resource.id}
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
                        data-testid={`save-member-${index}`}
                        onClick={() => handleSaveEdit(index)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: resource.color }}
                      />
                      <span className="flex-1 text-sm">{resource.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`edit-member-${index}`}
                        onClick={() => handleStartEdit(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`delete-member-${index}`}
                        onClick={() => handleDelete(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
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
