import type React from "react";
import { Button } from "@07nghiep/ui/components/button";
import { Label } from "@07nghiep/ui/components/label";

export type JobFiltersValue = {
  location: string;
  workType: string;
};

interface JobFiltersProps {
  filters: JobFiltersValue;
  setFilters: React.Dispatch<React.SetStateAction<JobFiltersValue>>;
}

export function JobFilters({ filters, setFilters }: JobFiltersProps) {
  const handleFilterChange = (key: keyof JobFiltersValue, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="hidden w-64 rounded-xl border bg-card p-4 md:block">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Bộ lọc</h3>

      <div className="mb-4 flex flex-col gap-2">
        <Label htmlFor="job-location-filter">Địa điểm</Label>
        <select
          id="job-location-filter"
          className="w-full rounded-md border bg-background p-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => handleFilterChange("location", e.target.value)}
          value={filters.location}
        >
          <option value="">Tất cả địa điểm</option>
          <option value="HCM">Hồ Chí Minh</option>
          <option value="HN">Hà Nội</option>
          <option value="DN">Đà Nẵng</option>
        </select>
      </div>

      <div className="mb-4">
        <p className="mb-2 block text-sm font-medium text-foreground">Hình thức làm việc</p>
        <div className="flex flex-wrap gap-2">
          {["Remote", "Hybrid", "Onsite"].map((type) => (
            <Button
              type="button"
              key={type}
              onClick={() => handleFilterChange("workType", type)}
              variant={filters.workType === type ? "default" : "outline"}
              size="sm"
              className="rounded-full"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
