import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@07nghiep/ui/components/button";
import { Input } from "@07nghiep/ui/components/input";
import { cn } from "@07nghiep/ui/lib/utils";
import { useVietnamProvinces } from "@/lib/vietnam-provinces";

type ProvinceMultiSelectProps = {
  id?: string;
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

export function ProvinceMultiSelect({
  id,
  value,
  onValueChange,
  placeholder = "Tỉnh/thành phố",
  className,
  triggerClassName,
}: ProvinceMultiSelectProps) {
  const { provinces, isLoading } = useVietnamProvinces();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(value), [value]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const filteredProvinces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return provinces;

    return provinces.filter(
      (province) =>
        province.displayName.toLowerCase().includes(normalizedQuery) ||
        province.name.toLowerCase().includes(normalizedQuery),
    );
  }, [provinces, query]);

  const visibleProvinces = filteredProvinces.slice(0, 20);

  const toggleProvince = (provinceName: string) => {
    if (selectedSet.has(provinceName)) {
      onValueChange(value.filter((item) => item !== provinceName));
      return;
    }

    onValueChange([...value, provinceName]);
  };

  const removeProvince = (provinceName: string) => {
    onValueChange(value.filter((item) => item !== provinceName));
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        id={id}
        role="combobox"
        tabIndex={0}
        aria-expanded={isOpen}
        className={cn(
          "cursor-pointer",
          "flex min-h-11 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
          triggerClassName,
        )}
        onClick={() => setIsOpen((next) => !next)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((next) => !next);
          }

          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {value.length > 0 ? (
            value.map((provinceName) => (
              <span
                key={provinceName}
                className="inline-flex max-w-36 items-center gap-1 rounded-sm border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                <span className="truncate">{provinceName}</span>
                <button
                  type="button"
                  aria-label={`Bỏ ${provinceName}`}
                  className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeProvince(provinceName);
                  }}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        {isLoading ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      {isOpen ? (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl shadow-primary/15">
          <Input
            value={query}
            placeholder="Tìm tỉnh/thành..."
            className="mb-2 h-9"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
          />

          <div className="max-h-72 overflow-auto">
            {visibleProvinces.length > 0 ? (
              visibleProvinces.map((province) => {
                const isSelected = selectedSet.has(province.displayName);

                return (
                  <button
                    type="button"
                    key={province.code}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-secondary text-secondary-foreground",
                    )}
                    onClick={() => toggleProvince(province.displayName)}
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border">
                      {isSelected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{province.displayName}</span>
                      <span className="block text-xs text-muted-foreground">{province.name}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Không tìm thấy tỉnh/thành phù hợp.
              </div>
            )}
          </div>

          {value.length > 0 ? (
            <div className="mt-2 border-t pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onValueChange([])}>
                Xóa tất cả địa điểm
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
