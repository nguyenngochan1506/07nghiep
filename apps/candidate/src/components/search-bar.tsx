import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X } from "lucide-react";
import { Button } from "@07nghiep/ui/components/button";
import { Input } from "@07nghiep/ui/components/input";
import { ProvinceCombobox } from "@/components/province-combobox";

interface SearchBarProps {
  onSearch: (keyword: string, location: string) => void;
  initialKeyword?: string;
  initialLocation?: string;
}

export function SearchBar({ onSearch, initialKeyword = "", initialLocation = "" }: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [location, setLocation] = useState(initialLocation);

  useEffect(() => {
    setKeyword(initialKeyword);
    setLocation(initialLocation);
  }, [initialKeyword, initialLocation]);

  // Dùng useRef để giữ giá trị timeout ID (phục vụ cho Debounce)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hàm xử lý Debounce 300ms
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(keyword, location);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [keyword, location, onSearch]);

  const handleClearKeyword = () => setKeyword("");
  const handleClearLocation = () => setLocation("");

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
        <ProvinceCombobox
          value={location}
          onValueChange={setLocation}
          inputClassName="h-11 border-transparent bg-transparent pl-9 pr-16 focus-visible:border-ring"
        />
        {location && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="absolute right-9 z-10 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Xóa địa điểm"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Button
        className="h-11 w-full bg-brand-orange px-8 text-brand-orange-foreground shadow-sm hover:bg-brand-orange/90 md:w-auto"
        onClick={() => onSearch(keyword, location)}
      >
        <Search data-icon="inline-start" />
        Tìm việc
      </Button>
    </div>
  );
}
