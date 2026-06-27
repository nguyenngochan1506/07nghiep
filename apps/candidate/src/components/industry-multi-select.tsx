import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@07nghiep/ui/components/button";
import { Input } from "@07nghiep/ui/components/input";
import { cn } from "@07nghiep/ui/lib/utils";

type IndustryMultiSelectProps = {
  id?: string;
  value: string[];
  onValueChange: (value: string[]) => void;
  options: string[];
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

export function IndustryMultiSelect({
  id,
  value,
  onValueChange,
  options,
  isLoading = false,
  placeholder = "Ngành nghề",
  className,
  triggerClassName,
}: IndustryMultiSelectProps) {
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

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const uniqueOptions = Array.from(new Set(options.filter((option) => option.trim()))).sort(
      (a, b) => a.localeCompare(b, "vi"),
    );

    if (!normalizedQuery) return uniqueOptions;

    return uniqueOptions.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const visibleOptions = filteredOptions.slice(0, 30);
  const displayValue =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value.length} ngành đã chọn`;

  const toggleOption = (option: string) => {
    if (selectedSet.has(option)) {
      onValueChange(value.filter((item) => item !== option));
      return;
    }

    onValueChange([...value, option]);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        id={id}
        role="combobox"
        tabIndex={0}
        aria-expanded={isOpen}
        className={cn(
          "flex h-11 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
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
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            value.length === 0 ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {displayValue}
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
            placeholder="Tìm ngành nghề..."
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
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => {
                const isSelected = selectedSet.has(option);

                return (
                  <button
                    type="button"
                    key={option}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-secondary text-secondary-foreground",
                    )}
                    onClick={() => toggleOption(option)}
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border">
                      {isSelected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0 text-sm font-medium">{option}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Không tìm thấy ngành nghề phù hợp.
              </div>
            )}
          </div>

          {value.length > 0 ? (
            <div className="mt-2 border-t pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onValueChange([])}>
                Xóa tất cả ngành nghề
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
