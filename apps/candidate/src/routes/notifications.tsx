import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { trpc } from "../utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Button } from "@07nghiep/ui/components/button";
import { Badge } from "@07nghiep/ui/components/badge";
import { Check, Trash2, BellOff } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { createSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/notifications")({
  head: () =>
    createSeoHead({
      title: "Thông báo | 07nghiep",
      description: "Xem thông báo việc làm, ứng tuyển và cập nhật từ nhà tuyển dụng.",
      url: `${SITE_URL}/notifications`,
      noIndex: true,
    }),
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
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user?.id);
  const { data, isLoading } = useQuery(
    trpc.notification.list.queryOptions({ limit: 50 }, { enabled: isLoggedIn }),
  );
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

  return (
    <div className="container min-h-[100dvh] max-w-4xl bg-background py-8 text-foreground">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thông báo</h1>
          <p className="text-muted-foreground">Xem tất cả các cập nhật về ứng tuyển và hệ thống.</p>
        </div>
        {notifications.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            <Check className="mr-2 h-4 w-4" />
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {sessionPending ? (
          <Card>
            <CardContent className="flex flex-col gap-4 py-12">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ) : !isLoggedIn ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Đăng nhập để xem thông báo</p>
                <p className="text-sm text-muted-foreground">
                  Thông báo ứng tuyển và hệ thống được gắn với tài khoản của bạn.
                </p>
              </div>
              <Button asChild>
                <Link to="/login">Đăng nhập</Link>
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="flex flex-col gap-4 py-12">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
              <p className="text-lg font-medium">Bạn chưa có thông báo nào</p>
              <p className="text-sm text-muted-foreground">
                Các cập nhật quan trọng sẽ xuất hiện ở đây.
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
