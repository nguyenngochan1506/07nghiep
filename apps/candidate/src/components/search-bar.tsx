import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X } from "lucide-react";
import { Button } from "@07nghiep/ui/components/button";
// Nếu bạn chưa có component Input từ shadcn, hãy dùng thẻ <input> HTML mặc định tạm thời như dưới đây,
// hoặc chạy lệnh: pnpm dlx shadcn@latest add input -c packages/ui để cài nhé!

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
    <div className="w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-sm border p-2 flex flex-col md:flex-row items-center gap-2 relative z-10">
      {/* Ô tìm kiếm theo từ khóa */}
      <div className="relative flex-grow w-full md:w-auto flex items-center h-12">
        <Search className="absolute left-4 h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Job title, keywords, or company..."
          className="w-full h-full pl-11 pr-10 border-0 bg-transparent shadow-none focus:outline-none text-base text-foreground"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {keyword && (
          <button
            type="button"
            onClick={handleClearKeyword}
            className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Đường kẻ dọc chia tách (chỉ hiện trên Desktop) */}
      <div className="hidden md:block w-px h-8 bg-border shrink-0"></div>

      {/* Ô tìm kiếm theo địa điểm */}
      <div className="relative flex-grow md:w-1/3 w-full flex items-center h-12 border-t md:border-t-0 pt-2 md:pt-0">
        <MapPin className="absolute left-4 h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="City, state, or 'Remote'"
          className="w-full h-full pl-11 pr-10 border-0 bg-transparent shadow-none focus:outline-none text-base text-foreground"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        {location && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear location"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nút Tìm kiếm */}
      <Button
        className="w-full md:w-auto h-12 px-8 rounded-xl font-medium"
        onClick={() => onSearch(keyword, location)}
      >
        Search
      </Button>
    </div>
  );
}
