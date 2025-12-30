import { List, GanttChart, Columns3, Network } from "lucide-react";
import { useViewStore, ViewType } from "@/stores/viewStore";
import { cn } from "@/lib/utils";

const views: { type: ViewType; label: string; icon: React.ReactNode }[] = [
  { type: "list", label: "List", icon: <List className="h-4 w-4" /> },
  { type: "gantt", label: "Gantt", icon: <GanttChart className="h-4 w-4" /> },
  { type: "kanban", label: "Kanban", icon: <Columns3 className="h-4 w-4" /> },
  { type: "network", label: "Network", icon: <Network className="h-4 w-4" /> },
];

export function ViewSwitcher() {
  const { currentView, setView } = useViewStore();

  return (
    <div className="flex gap-1">
      {views.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => setView(type)}
          data-active={currentView === type}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-sm",
            currentView === type
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
