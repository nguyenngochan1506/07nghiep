import { Label } from "@07nghiep/ui/components/label";
import { Input } from "@07nghiep/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";
import { Switch } from "@07nghiep/ui/components/switch";

export interface Step3Data {
  salaryNegotiable: boolean;
  salaryType: string;
  salaryMin: string;
  salaryMax: string;
}

interface JobStep3Props {
  data: Step3Data;
  errors: Partial<Record<keyof Step3Data, string>>;
  onChange: (field: keyof Step3Data, value: string | boolean) => void;
}

const SALARY_TYPES = [
  { value: "MONTHLY", label: "Theo tháng" },
  { value: "YEARLY", label: "Theo năm" },
  { value: "HOURLY", label: "Theo giờ" },
];

export function JobStep3({ data, errors, onChange }: JobStep3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Lương & Điều kiện</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thông tin về mức lương và điều kiện làm việc
        </p>
      </div>

      {/* Negotiable toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Lương thỏa thuận</p>
          <p className="text-sm text-muted-foreground">
            Bật nếu mức lương được thỏa thuận trực tiếp với ứng viên
          </p>
        </div>
        <Switch
          id="salary-negotiable"
          checked={data.salaryNegotiable}
          onCheckedChange={(v) => onChange("salaryNegotiable", v)}
        />
      </div>

      {!data.salaryNegotiable && (
        <>
          {/* Salary Type */}
          <div className="space-y-2">
            <Label htmlFor="salary-type">Đơn vị lương</Label>
            <Select value={data.salaryType} onValueChange={(v) => onChange("salaryType", v || "")}>
              <SelectTrigger id="salary-type">
                <SelectValue placeholder="Chọn đơn vị lương" />
              </SelectTrigger>
              <SelectContent>
                {SALARY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary-min">
                Lương tối thiểu <span className="text-muted-foreground text-xs">(VNĐ)</span>
              </Label>
              <Input
                id="salary-min"
                type="number"
                min={0}
                placeholder="Ví dụ: 10000000"
                value={data.salaryMin}
                onChange={(e) => onChange("salaryMin", e.target.value)}
                className={errors.salaryMin ? "border-destructive" : ""}
              />
              {errors.salaryMin && <p className="text-sm text-destructive">{errors.salaryMin}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary-max">
                Lương tối đa <span className="text-muted-foreground text-xs">(VNĐ)</span>
              </Label>
              <Input
                id="salary-max"
                type="number"
                min={0}
                placeholder="Ví dụ: 20000000"
                value={data.salaryMax}
                onChange={(e) => onChange("salaryMax", e.target.value)}
                className={errors.salaryMax ? "border-destructive" : ""}
              />
              {errors.salaryMax && <p className="text-sm text-destructive">{errors.salaryMax}</p>}
            </div>
          </div>

          {data.salaryMin && data.salaryMax && (
            <p className="text-sm text-muted-foreground">
              💰 Khoảng:{" "}
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(Number(data.salaryMin))}{" "}
              -{" "}
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(Number(data.salaryMax))}
            </p>
          )}
        </>
      )}

      {data.salaryNegotiable && (
        <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
          ℹ️ Mức lương sẽ được thỏa thuận trực tiếp với ứng viên phù hợp trong quá trình phỏng vấn.
        </div>
      )}
    </div>
  );
}
