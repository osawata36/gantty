import { FolderOpen, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyProjectStateProps {
  onNewProject: () => void;
  onOpenProject: () => void;
}

export function EmptyProjectState({
  onNewProject,
  onOpenProject,
}: EmptyProjectStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          プロジェクトが開かれていません
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          新規プロジェクトを作成するか、既存のプロジェクトを開いてください
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={onNewProject} variant="default">
          <FilePlus2 className="mr-2 h-4 w-4" />
          新規プロジェクト作成
        </Button>
        <Button onClick={onOpenProject} variant="outline">
          <FolderOpen className="mr-2 h-4 w-4" />
          プロジェクトを開く
        </Button>
      </div>
    </div>
  );
}
