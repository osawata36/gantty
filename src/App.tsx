import { useState } from "react";
import { FilePlus2, FolderOpen, Save } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ViewSwitcher } from "@/components/layout/ViewSwitcher";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/components/project/NewProjectDialog";
import { EmptyProjectState } from "@/components/project/EmptyProjectState";
import { TaskList } from "@/components/task/TaskList";
import { useViewStore } from "@/stores/viewStore";
import { useProjectStore } from "@/stores/projectStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import "./index.css";

function App() {
  const currentView = useViewStore((state) => state.currentView);
  const project = useProjectStore((state) => state.project);
  const filePath = useProjectStore((state) => state.filePath);
  const isModified = useProjectStore((state) => state.isModified);

  const { saveProject, openProject, createNewProject } = useFileOperations();

  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);

  const handleCreateProject = (name: string) => {
    createNewProject(name);
    setIsNewProjectDialogOpen(false);
  };

  const handleSave = async () => {
    await saveProject();
  };

  const handleOpen = async () => {
    await openProject();
  };

  // Derive file name from path or project name
  const fileName = filePath
    ? filePath.split("/").pop() || filePath.split("\\").pop()
    : project?.name
      ? `${project.name} (未保存)`
      : null;

  const statusText = project
    ? `${fileName}${isModified ? " *" : ""}`
    : "プロジェクトなし";

  const toolbar = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsNewProjectDialogOpen(true)}
        title="新規プロジェクト"
      >
        <FilePlus2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        title="プロジェクトを開く"
      >
        <FolderOpen className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={!project}
        title="保存"
      >
        <Save className="h-4 w-4" />
      </Button>
      <div className="mx-2 h-6 w-px bg-border" />
      {project && <ViewSwitcher />}
    </>
  );

  const statusBar = <span>{statusText}</span>;

  return (
    <>
      <AppShell toolbar={toolbar} statusBar={statusBar}>
        {project ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 p-4">
              {currentView === "list" && <TaskList />}
              {currentView === "gantt" && (
                <div className="text-muted-foreground">
                  Gantt Chart View (Coming soon)
                </div>
              )}
              {currentView === "kanban" && (
                <div className="text-muted-foreground">
                  Kanban View (Coming soon)
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyProjectState
            onNewProject={() => setIsNewProjectDialogOpen(true)}
            onOpenProject={handleOpen}
          />
        )}
      </AppShell>

      <NewProjectDialog
        open={isNewProjectDialogOpen}
        onOpenChange={setIsNewProjectDialogOpen}
        onCreateProject={handleCreateProject}
      />
    </>
  );
}

export default App;
