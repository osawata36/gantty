import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectStore } from "@/stores/projectStore";
import type { Resource } from "@/types";

const EMPTY_RESOURCES: Resource[] = [];

export function BallHolderFilter() {
  const resources = useProjectStore(
    (state) => state.project?.resources ?? EMPTY_RESOURCES
  );
  const ballHolderFilter = useProjectStore((state) => state.ballHolderFilter);
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const setBallHolderFilter = useProjectStore(
    (state) => state.setBallHolderFilter
  );
  const setCurrentUserId = useProjectStore((state) => state.setCurrentUserId);

  const handleFilterChange = (value: string) => {
    if (value === "all") {
      setBallHolderFilter(null);
    } else {
      setBallHolderFilter(value);
    }
  };

  const handleCurrentUserChange = (value: string) => {
    if (value === "none") {
      setCurrentUserId(null);
    } else {
      setCurrentUserId(value);
    }
  };

  const currentFilterValue = ballHolderFilter ?? "all";

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">自分:</span>
        <Select
          value={currentUserId ?? "none"}
          onValueChange={handleCurrentUserChange}
        >
          <SelectTrigger className="w-[140px] h-8" data-testid="current-user-select">
            <SelectValue placeholder="自分を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">未設定</SelectItem>
            {resources.map((resource) => (
              <SelectItem key={resource.id} value={resource.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: resource.color }}
                  />
                  {resource.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">ボールフィルタ:</span>
        <Select value={currentFilterValue} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[160px] h-8" data-testid="ball-holder-filter-select">
            <SelectValue placeholder="フィルタを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて表示</SelectItem>
            <SelectItem value="my-ball">🏐 自分のボール</SelectItem>
            <SelectItem disabled className="py-0 h-px bg-border my-1" value="_separator">
              <span />
            </SelectItem>
            {resources.map((resource) => (
              <SelectItem key={resource.id} value={resource.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: resource.color }}
                  />
                  {resource.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
