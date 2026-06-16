import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "../utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Button } from "@07nghiep/ui/components/button";
import { Badge } from "@07nghiep/ui/components/badge";
import { Check, Trash2, BellOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}

function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(trpc.notification.list.queryOptions({ limit: 50 }));
  const notifications = data?.items || [];

  const markAsRead = useMutation(
    trpc.notification.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notification"] });
      },
    }),
  );

  const markAllAsRead = useMutation(
    trpc.notification.markAllAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notification"] });
        toast.success("Đã đánh dấu tất cả là đã đọc");
      },
    }),
  );

  const deleteNotification = useMutation(
    trpc.notification.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["notification"] });
        toast.success("Đã xóa thông báo");
      },
    }),
  );

  if (isLoading) {
    return <div className="p-8">Đang tải thông báo...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thông báo</h1>
          <p className="text-muted-foreground">
            Quản lý các cập nhật quan trọng từ ứng viên và hệ thống.
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            <Check className="mr-2 h-4 w-4" />
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
              <p className="text-lg font-medium">Bạn chưa có thông báo nào</p>
              <p className="text-sm text-muted-foreground">
                Các ứng tuyển mới và cập nhật sẽ xuất hiện ở đây.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className={!n.read ? "border-l-4 border-l-primary bg-primary/5" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{n.title}</CardTitle>
                    {!n.read && <Badge>Mới</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getRelativeTime(n.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead.mutate({ id: n.id })}
                      title="Đánh dấu đã đọc"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNotification.mutate({ id: n.id })}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{n.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
