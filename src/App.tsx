import { AppShell } from "@/components/layout/AppShell";
import { ViewSwitcher } from "@/components/layout/ViewSwitcher";
import { useViewStore } from "@/stores/viewStore";
import "./index.css";

function App() {
  const currentView = useViewStore((state) => state.currentView);

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="border-b p-2">
          <ViewSwitcher />
        </div>
        <div className="flex-1 p-4">
          {currentView === "list" && (
            <div className="text-muted-foreground">List View (Coming soon)</div>
          )}
          {currentView === "gantt" && (
            <div className="text-muted-foreground">Gantt Chart View (Coming soon)</div>
          )}
          {currentView === "kanban" && (
            <div className="text-muted-foreground">Kanban View (Coming soon)</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default App;
