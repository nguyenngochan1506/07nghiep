import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { env } from "@07nghiep/env/candidate";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@07nghiep/ui/components/card";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/billing/return")({
  validateSearch: (search) => ({
    paymentId: typeof search.paymentId === "string" ? search.paymentId : undefined,
  }),
  component: BillingReturnRoute,
});

type NotificationPayload = {
  data?: { event?: string; paymentId?: string };
};

function BillingReturnRoute() {
  const { paymentId } = Route.useSearch();
  const [confirmedBySse, setConfirmedBySse] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(Boolean(paymentId));

  const paymentQuery = useQuery(
    trpc.billing.getPaymentStatus.queryOptions(
      { paymentId: paymentId ?? "" },
      {
        enabled: Boolean(paymentId) && pollingEnabled,
        refetchInterval: pollingEnabled ? 3000 : false,
      },
    ),
  );

  useEffect(() => {
    const eventSource = new EventSource(`${env.VITE_SERVER_URL}/api/notifications/sse`, {
      withCredentials: true,
    });

    const handleNotification = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as NotificationPayload;
        if (payload.data?.event === "subscription.activated") {
          setConfirmedBySse(true);
          queryClient.invalidateQueries({ queryKey: trpc.billing.me.queryOptions().queryKey });
        }
      } catch {
        // Ignore malformed SSE payloads from other event types.
      }
    };

    eventSource.addEventListener("notification", handleNotification);

    return () => {
      eventSource.removeEventListener("notification", handleNotification);
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (!paymentId) return;

    const timeout = window.setTimeout(() => setPollingEnabled(false), 60_000);
    return () => window.clearTimeout(timeout);
  }, [paymentId]);

  const paid = confirmedBySse || paymentQuery.data?.status === "PAID";

  useEffect(() => {
    if (paid) {
      queryClient.invalidateQueries({ queryKey: trpc.billing.me.queryOptions().queryKey });
    }
  }, [paid]);

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-xl items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {paid ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {paid ? "Thanh toán đã được xác nhận" : "Đang xác nhận thanh toán"}
          </CardTitle>
          <CardDescription>
            {paid
              ? "Gói đăng ký đã được kích hoạt trên tài khoản của bạn."
              : "Hệ thống đang chờ webhook payOS. Bạn có thể quay lại trang gói sau ít phút nếu trạng thái chưa cập nhật."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90">
            <Link to="/billing">Xem gói của tôi</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/jobs">Tiếp tục tìm việc</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
