import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (name: string) => void;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState("");

  // Clear input when dialog is closed
  useEffect(() => {
    if (!open) {
      setProjectName("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = projectName.trim();
    if (trimmedName) {
      onCreateProject(trimmedName);
      onOpenChange(false);
    }
  };

  const isValid = projectName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規プロジェクト作成</DialogTitle>
          <DialogDescription>
            新しいプロジェクトの名前を入力してください
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">プロジェクト名</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="プロジェクト名を入力"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={!isValid}>
              作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
