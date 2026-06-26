import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X } from "lucide-react";
import { Button } from "@07nghiep/ui/components/button";

interface SearchBarProps {
  onSearch: (keyword: string, location: string) => void;
  initialKeyword?: string;
  initialLocation?: string;
}

export function SearchBar({ onSearch, initialKeyword = "", initialLocation = "" }: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [location, setLocation] = useState(initialLocation);

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
    <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm md:flex-row">
      <div className="relative flex h-12 w-full flex-grow items-center md:w-auto">
        <Search className="absolute left-4 size-5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="Job title, keywords, or company..."
          className="h-full w-full border-0 bg-transparent pl-11 pr-10 text-base text-foreground shadow-none placeholder:text-muted-foreground focus:outline-none"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {keyword && (
          <button
            type="button"
            onClick={handleClearKeyword}
            className="absolute right-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="hidden h-8 w-px shrink-0 bg-border md:block" />

      <div className="relative flex h-12 w-full flex-grow items-center border-t pt-2 md:w-1/3 md:border-t-0 md:pt-0">
        <MapPin className="absolute left-4 size-5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="City, state, or 'Remote'"
          className="h-full w-full border-0 bg-transparent pl-11 pr-10 text-base text-foreground shadow-none placeholder:text-muted-foreground focus:outline-none"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        {location && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="absolute right-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear location"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Button
        className="h-12 w-full rounded-xl px-8 font-medium md:w-auto"
        onClick={() => onSearch(keyword, location)}
      >
        Search
      </Button>
    </div>
  );
}
