import { Settings2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useViewStore, ColumnId } from "@/stores/viewStore";

export const COLUMN_LABELS: Record<ColumnId, string> = {
  name: "タスク名",
  duration: "日数",
  startDate: "開始日",
  endDate: "終了日",
  progress: "進捗",
  responsible: "責任者",
  ballHolder: "ボール",
};

export function ColumnSettings() {
  const visibleColumns = useViewStore((state) => state.visibleColumns);
  const columnOrder = useViewStore((state) => state.columnOrder);
  const toggleColumnVisibility = useViewStore(
    (state) => state.toggleColumnVisibility
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings2 className="h-4 w-4 mr-1" />
          列設定
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>表示する列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columnOrder.map((columnId) => (
          <DropdownMenuCheckboxItem
            key={columnId}
            checked={visibleColumns.includes(columnId)}
            onCheckedChange={() => toggleColumnVisibility(columnId)}
            disabled={columnId === "name"}
          >
            {COLUMN_LABELS[columnId]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SortButtonProps {
  columnId: ColumnId;
  label: string;
}

export function SortButton({ columnId, label }: SortButtonProps) {
  const sortConfig = useViewStore((state) => state.sortConfig);
  const setSortConfig = useViewStore((state) => state.setSortConfig);

  const isActive = sortConfig?.column === columnId;
  const direction = isActive ? sortConfig.direction : null;

  const handleClick = () => {
    if (!isActive) {
      setSortConfig({ column: columnId, direction: "asc" });
    } else if (direction === "asc") {
      setSortConfig({ column: columnId, direction: "desc" });
    } else {
      setSortConfig(null);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 hover:text-primary text-xs font-medium"
    >
      {label}
      {!isActive && (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      )}
      {isActive && direction === "asc" && (
        <ArrowUp className="h-3 w-3 text-primary" />
      )}
      {isActive && direction === "desc" && (
        <ArrowDown className="h-3 w-3 text-primary" />
      )}
    </button>
  );
}
