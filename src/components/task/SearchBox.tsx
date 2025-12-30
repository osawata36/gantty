import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useViewStore } from "@/stores/viewStore";

export function SearchBox() {
  const searchQuery = useViewStore((state) => state.searchQuery);
  const setSearchQuery = useViewStore((state) => state.setSearchQuery);

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="タスクを検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-8 w-48 pl-8 pr-8 text-sm"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 h-8 w-8 p-0"
          onClick={() => setSearchQuery("")}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">クリア</span>
        </Button>
      )}
    </div>
  );
}
