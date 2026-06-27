import { useState, useEffect, useRef } from "react";
import { BriefcaseBusiness, Search, MapPin, X } from "lucide-react";
import { Button } from "@07nghiep/ui/components/button";
import { Input } from "@07nghiep/ui/components/input";
import { IndustryMultiSelect } from "@/components/industry-multi-select";
import { ProvinceMultiSelect } from "@/components/province-multi-select";

interface SearchBarProps {
  onSearch: (keyword: string, locations: string[], industries: string[]) => void;
  initialKeyword?: string;
  initialLocations?: string[];
  initialIndustries?: string[];
  industryOptions?: string[];
  isLoadingIndustries?: boolean;
}

export function SearchBar({
  onSearch,
  initialKeyword = "",
  initialLocations = [],
  initialIndustries = [],
  industryOptions = [],
  isLoadingIndustries = false,
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [locations, setLocations] = useState(initialLocations);
  const [industries, setIndustries] = useState(initialIndustries);
  const initialLocationsKey = initialLocations.join("|");
  const initialIndustriesKey = initialIndustries.join("|");

  useEffect(() => {
    setKeyword(initialKeyword);
    setLocations(initialLocations);
    setIndustries(initialIndustries);
  }, [initialKeyword, initialLocationsKey, initialIndustriesKey]);

  // Dùng useRef để giữ giá trị timeout ID (phục vụ cho Debounce)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hàm xử lý Debounce 300ms
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(keyword, locations, industries);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [keyword, locations, industries, onSearch]);

  const handleClearKeyword = () => setKeyword("");
  const handleClearLocations = () => setLocations([]);
  const handleClearIndustries = () => setIndustries([]);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-2 rounded-xl border bg-card/95 p-2 shadow-md shadow-primary/5 backdrop-blur md:grid-cols-[1fr_0.75fr_0.75fr_auto]">
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

      <div className="relative flex h-11 w-full items-center">
        <BriefcaseBusiness className="pointer-events-none absolute left-3 z-10 size-4 shrink-0 text-muted-foreground" />
        <IndustryMultiSelect
          value={industries}
          onValueChange={setIndustries}
          options={industryOptions}
          isLoading={isLoadingIndustries}
          placeholder="Ngành nghề"
          triggerClassName="min-h-11 border-transparent bg-transparent pl-9 pr-16 focus-visible:border-ring"
        />
        {industries.length > 0 && (
          <button
            type="button"
            onClick={handleClearIndustries}
            className="absolute right-9 z-10 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Xóa ngành nghề"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Button
        className="h-11 w-full bg-brand-orange px-8 text-brand-orange-foreground shadow-sm hover:bg-brand-orange/90 md:w-auto"
        onClick={() => onSearch(keyword, locations, industries)}
      >
        <Search data-icon="inline-start" />
        Tìm việc
      </Button>
    </div>
  );
}
