import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { NotificationPreferences } from "@07nghiep/ui/components/notification-preferences";
import { trpc } from "../../utils/trpc";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/notifications")({
  component: NotificationPreferencesPage,
});

function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const { data: preferences = [], isLoading } = useQuery(trpc.notification.getPreferences.queryOptions());

  const updatePreference = useMutation(
    trpc.notification.updatePreference.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notification"] });
        toast.success("Cập nhật tùy chọn thông báo thành công");
      },
      onError: (err) => {
        toast.error(err.message || "Không thể cập nhật tùy chọn");
      },
    })
  );

  const handleUpdate = (type: any, field: any, value: boolean) => {
    const existing = preferences.find((p: any) => p.type === type);
    updatePreference.mutate({
      type,
      pushEnabled: field === "pushEnabled" ? value : existing?.pushEnabled ?? true,
      emailEnabled: field === "emailEnabled" ? value : existing?.emailEnabled ?? true,
    });
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt thông báo</h1>
        <p className="text-sm text-muted-foreground">Quản lý cách bạn nhận thông báo từ hệ thống.</p>
      </div>
      <NotificationPreferences
        preferences={preferences as any}
        onUpdate={handleUpdate}
        isLoading={isLoading || updatePreference.isPending}
      />
    </div>
  );
}
