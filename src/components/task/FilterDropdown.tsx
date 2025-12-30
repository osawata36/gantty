import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useViewStore, DueDateFilter } from "@/stores/viewStore";
import { useProjectStore } from "@/stores/projectStore";

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: null, label: "すべて" },
  { value: "today", label: "今日まで" },
  { value: "this_week", label: "今週まで" },
  { value: "overdue", label: "遅延中" },
];

export function FilterDropdown() {
  const filters = useViewStore((state) => state.filters);
  const setStatusFilter = useViewStore((state) => state.setStatusFilter);
  const setResponsibleFilter = useViewStore((state) => state.setResponsibleFilter);
  const setDueDateFilter = useViewStore((state) => state.setDueDateFilter);
  const clearFilters = useViewStore((state) => state.clearFilters);

  const statuses = useProjectStore((state) => state.project?.statuses ?? []);
  const resources = useProjectStore((state) => state.project?.resources ?? []);

  const hasActiveFilters =
    filters.statusIds.length > 0 ||
    filters.responsibleIds.length > 0 ||
    filters.dueDate !== null;

  const toggleStatus = (statusId: string) => {
    if (filters.statusIds.includes(statusId)) {
      setStatusFilter(filters.statusIds.filter((id) => id !== statusId));
    } else {
      setStatusFilter([...filters.statusIds, statusId]);
    }
  };

  const toggleResponsible = (resourceId: string) => {
    if (filters.responsibleIds.includes(resourceId)) {
      setResponsibleFilter(
        filters.responsibleIds.filter((id) => id !== resourceId)
      );
    } else {
      setResponsibleFilter([...filters.responsibleIds, resourceId]);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={hasActiveFilters ? "text-primary" : ""}
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {filters.statusIds.length +
                  filters.responsibleIds.length +
                  (filters.dueDate ? 1 : 0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>フィルタ</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              ステータス
              {filters.statusIds.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {filters.statusIds.length}
                </span>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {statuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status.id}
                  checked={filters.statusIds.includes(status.id)}
                  onCheckedChange={() => toggleStatus(status.id)}
                >
                  <span
                    className="mr-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              責任者
              {filters.responsibleIds.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {filters.responsibleIds.length}
                </span>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {resources.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  メンバーがいません
                </div>
              ) : (
                resources.map((resource) => (
                  <DropdownMenuCheckboxItem
                    key={resource.id}
                    checked={filters.responsibleIds.includes(resource.id)}
                    onCheckedChange={() => toggleResponsible(resource.id)}
                  >
                    <span
                      className="mr-2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: resource.color }}
                    />
                    {resource.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              期限
              {filters.dueDate && (
                <span className="ml-auto text-xs text-muted-foreground">1</span>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={filters.dueDate ?? ""}
                onValueChange={(value) =>
                  setDueDateFilter((value || null) as DueDateFilter)
                }
              >
                {DUE_DATE_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value ?? "all"}
                    value={option.value ?? ""}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={clearFilters}
              >
                <X className="mr-2 h-4 w-4" />
                フィルタをクリア
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
