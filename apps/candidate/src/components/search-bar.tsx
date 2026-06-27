import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X } from "lucide-react";
import { Button } from "@07nghiep/ui/components/button";
import { Input } from "@07nghiep/ui/components/input";
import { ProvinceMultiSelect } from "@/components/province-multi-select";

interface SearchBarProps {
  onSearch: (keyword: string, locations: string[]) => void;
  initialKeyword?: string;
  initialLocations?: string[];
}

export function SearchBar({
  onSearch,
  initialKeyword = "",
  initialLocations = [],
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [locations, setLocations] = useState(initialLocations);
  const initialLocationsKey = initialLocations.join("|");

  useEffect(() => {
    setKeyword(initialKeyword);
    setLocations(initialLocations);
  }, [initialKeyword, initialLocationsKey]);

  // Dùng useRef để giữ giá trị timeout ID (phục vụ cho Debounce)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hàm xử lý Debounce 300ms
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(keyword, locations);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [keyword, locations, onSearch]);

  const handleClearKeyword = () => setKeyword("");
  const handleClearLocations = () => setLocations([]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-2 rounded-xl border bg-card p-2 shadow-md shadow-primary/5 md:grid-cols-[1fr_0.7fr_auto]">
      <div className="relative flex h-11 w-full items-center">
        <Search className="absolute left-3 size-4 shrink-0 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Chức danh, kỹ năng hoặc công ty"
          className="h-11 border-transparent bg-transparent pl-9 pr-9 focus-visible:border-ring"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {keyword && (
          <button
            type="button"
            onClick={handleClearKeyword}
            className="absolute right-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Xóa từ khóa"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="relative flex h-11 w-full items-center">
        <MapPin className="pointer-events-none absolute left-3 z-10 size-4 shrink-0 text-muted-foreground" />
        <ProvinceMultiSelect
          value={locations}
          onValueChange={setLocations}
          placeholder="Tỉnh/thành phố"
          triggerClassName="min-h-11 border-transparent bg-transparent pl-9 pr-16 focus-visible:border-ring"
        />
        {locations.length > 0 && (
          <button
            type="button"
            onClick={handleClearLocations}
            className="absolute right-9 z-10 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Xóa địa điểm"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Button
        className="h-11 w-full bg-brand-orange px-8 text-brand-orange-foreground shadow-sm hover:bg-brand-orange/90 md:w-auto"
        onClick={() => onSearch(keyword, locations)}
      >
        <Search data-icon="inline-start" />
        Tìm việc
      </Button>
    </div>
  );
}
