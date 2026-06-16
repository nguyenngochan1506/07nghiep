import React from "react";

interface JobFiltersProps {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

export function JobFilters({ filters, setFilters }: JobFiltersProps) {
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-64 p-4 border-r hidden md:block">
      <h3 className="font-semibold text-lg mb-4">Bộ lọc</h3>

      <div className="mb-4">
        <label htmlFor="job-location-filter" className="block text-sm font-medium mb-2">
          Địa điểm
        </label>
        <select
          id="job-location-filter"
          className="w-full border rounded-md p-2 text-sm"
          onChange={(e) => handleFilterChange("location", e.target.value)}
        >
          <option value="">Tất cả địa điểm</option>
          <option value="HCM">Hồ Chí Minh</option>
          <option value="HN">Hà Nội</option>
          <option value="DN">Đà Nẵng</option>
        </select>
      </div>

      <div className="mb-4">
        <p className="block text-sm font-medium mb-2">Hình thức làm việc</p>
        <div className="flex flex-wrap gap-2">
          {["Remote", "Hybrid", "Onsite"].map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => handleFilterChange("workType", type)}
              className={`text-xs px-3 py-1 border rounded-full ${filters.workType === type ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
