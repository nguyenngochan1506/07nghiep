import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { NotificationPreferences } from "@07nghiep/ui/components/notification-preferences";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import type React from "react";
import { trpc } from "../../utils/trpc";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/profile/notifications")({
  component: NotificationPreferencesPage,
});

type NotificationPreferencesProps = React.ComponentProps<typeof NotificationPreferences>;

function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user?.id);
  const { data: preferences = [], isLoading } = useQuery(
    trpc.notification.getPreferences.queryOptions(undefined, { enabled: isLoggedIn }),
  );

  const updatePreference = useMutation(
    trpc.notification.updatePreference.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notification"] });
        toast.success("Cập nhật tùy chọn thông báo thành công");
      },
      onError: (err) => {
        toast.error(err.message || "Không thể cập nhật tùy chọn");
      },
    }),
  );

  const handleUpdate: NotificationPreferencesProps["onUpdate"] = (type, field, value) => {
    const existing = preferences.find((p) => p.type === type);
    updatePreference.mutate({
      type,
      pushEnabled: field === "pushEnabled" ? value : (existing?.pushEnabled ?? true),
      emailEnabled: field === "emailEnabled" ? value : (existing?.emailEnabled ?? true),
    });
  };

  return (
    <div className="container min-h-[100dvh] max-w-2xl bg-background py-8 text-foreground">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt thông báo</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý cách bạn nhận thông báo từ hệ thống.
        </p>
      </div>
      {sessionPending ? (
        <Card>
          <CardContent className="flex flex-col gap-4 py-8">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : !isLoggedIn ? (
        <Card className="border-dashed text-center">
          <CardHeader>
            <CardTitle>Đăng nhập để chỉnh thông báo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5">
            <p className="max-w-sm text-sm text-muted-foreground">
              Tùy chọn thông báo được lưu theo tài khoản ứng viên của bạn.
            </p>
            <Button asChild>
              <Link to="/login">Đăng nhập</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <NotificationPreferences
          preferences={preferences}
          onUpdate={handleUpdate}
          isLoading={isLoading || updatePreference.isPending}
        />
      )}
    </div>
  );
}
