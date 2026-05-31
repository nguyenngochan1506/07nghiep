import { Switch } from "./switch";
import { Label } from "./label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export type NotificationType = "APPLICATION_RECEIVED" | "APPLICATION_STATUS" | "MESSAGE" | "JOB_ALERT" | "SYSTEM" | "INTERVIEW_INVITATION";

export interface Preference {
  type: NotificationType;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

interface NotificationPreferencesProps {
  preferences: Preference[];
  onUpdate: (type: NotificationType, field: "pushEnabled" | "emailEnabled", value: boolean) => void;
  isLoading?: boolean;
}

const TYPE_LABELS: Record<string, { label: string; description: string }> = {
  APPLICATION_RECEIVED: {
    label: "Đơn ứng tuyển mới",
    description: "Nhận thông báo khi có người ứng tuyển vào vị trí của bạn.",
  },
  APPLICATION_STATUS: {
    label: "Trạng thái ứng tuyển",
    description: "Nhận thông báo khi trạng thái đơn ứng tuyển của bạn thay đổi.",
  },
  MESSAGE: {
    label: "Tin nhắn mới",
    description: "Nhận thông báo khi có tin nhắn mới từ người dùng khác.",
  },
  JOB_ALERT: {
    label: "Gợi ý việc làm",
    description: "Nhận thông báo về các công việc phù hợp với hồ sơ của bạn.",
  },
  SYSTEM: {
    label: "Hệ thống",
    description: "Thông báo về tài khoản và cập nhật từ hệ thống.",
  },
  INTERVIEW_INVITATION: {
    label: "Lịch phỏng vấn",
    description: "Nhận thông báo khi có lịch phỏng vấn mới hoặc thay đổi.",
  },
};

export function NotificationPreferences({
  preferences,
  onUpdate,
  isLoading,
}: NotificationPreferencesProps) {
  return (
    <div className="grid gap-6">
      {Object.entries(TYPE_LABELS).map(([type, { label, description }]) => {
        const pref = preferences.find((p) => p.type === type) || {
          type: type as NotificationType,
          pushEnabled: true,
          emailEnabled: true,
        };

        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor={`${type}-push`} className="flex flex-col gap-1 cursor-pointer">
                  <span className="text-sm font-medium">Thông báo đẩy</span>
                  <span className="font-normal text-muted-foreground text-xs">Nhận thông báo trực tiếp trên trình duyệt</span>
                </Label>
                <Switch
                  id={`${type}-push`}
                  checked={pref.pushEnabled}
                  onCheckedChange={(val) => onUpdate(type as NotificationType, "pushEnabled", val)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor={`${type}-email`} className="flex flex-col gap-1 cursor-pointer">
                  <span className="text-sm font-medium">Thông báo qua Email</span>
                  <span className="font-normal text-muted-foreground text-xs">Nhận thông báo qua email của bạn</span>
                </Label>
                <Switch
                  id={`${type}-email`}
                  checked={pref.emailEnabled}
                  onCheckedChange={(val) => onUpdate(type as NotificationType, "emailEnabled", val)}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
