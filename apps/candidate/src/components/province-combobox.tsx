import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@07nghiep/ui/components/input";
import { cn } from "@07nghiep/ui/lib/utils";
import { useVietnamProvinces } from "@/lib/vietnam-provinces";

type ProvinceComboboxProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  invalid?: boolean;
};

export function ProvinceCombobox({
  id,
  value,
  onValueChange,
  placeholder = "Tỉnh/thành phố",
  className,
  inputClassName,
  invalid,
}: ProvinceComboboxProps) {
  const { provinces, isLoading } = useVietnamProvinces();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

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

    if (!normalizedQuery) {
      return provinces;
    }

    return provinces.filter(
      (province) =>
        province.displayName.toLowerCase().includes(normalizedQuery) ||
        province.name.toLowerCase().includes(normalizedQuery),
    );
  }, [provinces, query]);

  const visibleProvinces = filteredProvinces.slice(0, 12);

  const handleChange = (nextValue: string) => {
    setQuery(nextValue);
    onValueChange(nextValue);
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Input
        id={id}
        value={query}
        placeholder={placeholder}
        data-invalid={invalid || undefined}
        aria-invalid={invalid}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        className={cn("pr-9", inputClassName)}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        onClick={() => setIsOpen((next) => !next)}
        aria-label="Mở danh sách tỉnh thành"
      >
        {isLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </button>

      {isOpen ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl shadow-primary/15">
          {visibleProvinces.length > 0 ? (
            visibleProvinces.map((province) => (
              <button
                type="button"
                key={province.code}
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setQuery(province.displayName);
                  onValueChange(province.displayName);
                  setIsOpen(false);
                }}
              >
                <span className="text-sm font-medium">{province.displayName}</span>
                <span className="text-xs text-muted-foreground">{province.name}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              Không tìm thấy tỉnh/thành phù hợp.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
