import { Label } from "@07nghiep/ui/components/label";
import { Input } from "@07nghiep/ui/components/input";
import { CalendarDays, Info } from "lucide-react";

export interface Step4Data {
  expiresAt: string; // ISO string or empty
}

interface JobStep4Props {
  data: Step4Data;
  errors: Partial<Record<keyof Step4Data, string>>;
  onChange: (field: keyof Step4Data, value: string) => void;
}

// Returns min date string for date input (today + 1 day)
function getMinDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// Returns suggested deadline (today + 30 days)
function getSuggestedDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export function JobStep4({ data, errors, onChange }: JobStep4Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Thông tin bổ sung</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cấu hình thêm về thời hạn và thông tin bổ sung của tin tuyển dụng
        </p>
      </div>

      {/* Expiry date */}
      <div className="space-y-2">
        <Label htmlFor="expires-at" className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Ngày hết hạn ứng tuyển
        </Label>
        <Input
          id="expires-at"
          type="date"
          min={getMinDate()}
          value={data.expiresAt}
          onChange={(e) => onChange("expiresAt", e.target.value)}
          className={errors.expiresAt ? "border-destructive" : ""}
        />
        {errors.expiresAt ? (
          <p className="text-sm text-destructive">{errors.expiresAt}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Khuyến nghị: {getSuggestedDate()} (30 ngày kể từ hôm nay). Để trống nếu không giới hạn
            thời gian.
          </p>
        )}
      </div>

      {/* Info tip */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Lưu ý</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
            <li>Tin tuyển dụng sẽ tự động đóng sau ngày hết hạn</li>
            <li>Bạn có thể đăng lại hoặc gia hạn tin trong phần Quản lý tin đăng</li>
            <li>Draft sẽ được tự động lưu mỗi 30 giây</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
