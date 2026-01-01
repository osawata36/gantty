import { useState, useEffect, useCallback } from "react";
import {
  FilePlus2,
  FolderOpen,
  Save,
  Users,
  Settings,
  Loader2,
  Check,
  RefreshCw,
  Undo2,
  Redo2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ViewSwitcher } from "@/components/layout/ViewSwitcher";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/components/project/NewProjectDialog";
import { TaskList } from "@/components/task/TaskList";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { GanttView } from "@/components/gantt/GanttView";
import { KanbanView } from "@/components/kanban/KanbanView";
import { NetworkView } from "@/components/network/NetworkView";
import { MemberManagementDialog } from "@/components/member/MemberManagementDialog";
import { StatusCustomizationDialog } from "@/components/status/StatusCustomizationDialog";
import { SearchBox } from "@/components/task/SearchBox";
import { FilterDropdown } from "@/components/task/FilterDropdown";
import { useViewStore } from "@/stores/viewStore";
import { useProjectStore } from "@/stores/projectStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useHistory } from "@/hooks/useHistory";
import "./index.css";

function App() {
  const currentView = useViewStore((state) => state.currentView);
  const selectedTaskId = useViewStore((state) => state.selectedTaskId);
  const detailPanelOpen = useViewStore((state) => state.detailPanelOpen);
  const setDetailPanelOpen = useViewStore((state) => state.setDetailPanelOpen);
  const project = useProjectStore((state) => state.project);
  const filePath = useProjectStore((state) => state.filePath);
  const isModified = useProjectStore((state) => state.isModified);
  const createDefaultProject = useProjectStore((state) => state.createDefaultProject);

  // Create default project on initial load if no project exists
  useEffect(() => {
    if (!project) {
      createDefaultProject();
    }
  }, []);

  const { saveProject, openProject, createNewProject } = useFileOperations();
  const { isAutoSaveEnabled, saveStatus, toggleAutoSave } = useAutoSave();
  const { undo, redo, canUndo, canRedo } = useHistory();

  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

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

  // Keyboard shortcuts for Undo/Redo
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (modifier && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (modifier && e.key === "y" && !isMac) {
        // Windows/Linux: Ctrl+Y for redo
        e.preventDefault();
        redo();
      }
    },
    [undo, redo]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Derive file name from path or project name
  const fileName = filePath
    ? filePath.split("/").pop() || filePath.split("\\").pop()
    : project?.name
      ? `${project.name} (未保存)`
      : null;

  const statusText = project
    ? `${fileName}${isModified ? " *" : ""}`
    : "プロジェクトなし";

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            保存中...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Check className="h-3 w-3 text-green-500" />
            保存済み
          </span>
        );
      case "modified":
        return (
          <span className="flex items-center gap-1 text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            未保存
          </span>
        );
    }
  };

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
        title="保存"
      >
        <Save className="h-4 w-4" />
      </Button>
      <div className="mx-2 h-6 w-px bg-border" />
      <Button
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        title="元に戻す (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        title="やり直し (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <div className="mx-2 h-6 w-px bg-border" />
      <ViewSwitcher />
      <div className="mx-2 h-6 w-px bg-border" />
      <SearchBox />
      <FilterDropdown />
      <div className="mx-2 h-6 w-px bg-border" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsMemberDialogOpen(true)}
        title="メンバー管理"
      >
        <Users className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsStatusDialogOpen(true)}
        title="ステータス設定"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </>
  );

  const statusBar = (
    <div className="flex items-center gap-4">
      <span>{statusText}</span>
      <div className="h-4 w-px bg-border" />
      {renderSaveStatus()}
      <button
        onClick={toggleAutoSave}
        className={`text-xs px-2 py-0.5 rounded ${
          isAutoSaveEnabled
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
        title={isAutoSaveEnabled ? "自動保存を無効化" : "自動保存を有効化"}
      >
        自動保存: {isAutoSaveEnabled ? "ON" : "OFF"}
      </button>
    </div>
  );

  return (
    <>
      <AppShell toolbar={toolbar} statusBar={statusBar}>
        <div className="flex h-full flex-col">
          <div className="flex-1 p-4">
            {currentView === "list" && <TaskList />}
            {currentView === "gantt" && <GanttView />}
            {currentView === "kanban" && <KanbanView />}
            {currentView === "network" && <NetworkView />}
          </div>
        </div>
      </AppShell>

      <NewProjectDialog
        open={isNewProjectDialogOpen}
        onOpenChange={setIsNewProjectDialogOpen}
        onCreateProject={handleCreateProject}
      />

      <MemberManagementDialog
        open={isMemberDialogOpen}
        onOpenChange={setIsMemberDialogOpen}
      />

      <StatusCustomizationDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
      />
    </>
  );
}

export default App;
