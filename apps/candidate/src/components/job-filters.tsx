import type React from "react";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Label } from "@07nghiep/ui/components/label";
import { useVietnamProvinces } from "@/lib/vietnam-provinces";

export type JobFiltersValue = {
  location: string;
  workType: string;
};

interface JobFiltersProps {
  filters: JobFiltersValue;
  setFilters: React.Dispatch<React.SetStateAction<JobFiltersValue>>;
}

export function JobFilters({ filters, setFilters }: JobFiltersProps) {
  const { provinces, isLoading } = useVietnamProvinces();

  const handleFilterChange = (key: keyof JobFiltersValue, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full bg-surface-wash/70 lg:sticky lg:top-20">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Bộ lọc</CardTitle>
        {(filters.location || filters.workType) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ location: "", workType: "" })}
          >
            Xóa lọc
          </Button>
        )}
      </CardHeader>

      <CardContent className="grid gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="job-location-filter">Địa điểm</Label>
          <select
            id="job-location-filter"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            onChange={(e) => handleFilterChange("location", e.target.value)}
            value={filters.location}
          >
            <option value="">Tất cả địa điểm</option>
            {isLoading ? <option disabled>Đang tải tỉnh/thành...</option> : null}
            {provinces.map((province) => (
              <option key={province.code} value={province.displayName}>
                {province.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Hình thức làm việc</p>
          <div className="flex flex-wrap gap-2">
            {["Remote", "Hybrid", "Onsite"].map((type) => (
              <Button
                type="button"
                key={type}
                onClick={() =>
                  handleFilterChange("workType", filters.workType === type ? "" : type)
                }
                variant={filters.workType === type ? "default" : "outline"}
                size="sm"
                className={
                  filters.workType === type
                    ? "rounded-full bg-primary text-primary-foreground"
                    : "rounded-full"
                }
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
