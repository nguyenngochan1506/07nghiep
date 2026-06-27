import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

import { trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/billing")({
  component: EmployerBillingRoute,
});

type SubscriptionRow = {
  id: string;
  currentPeriodEnd: string | Date;
  plan: { name: string; code: string; priceVnd: number };
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function EmployerBillingRoute() {
  const billingQuery = useQuery(trpc.billing.me.queryOptions());
  const checkoutMutation = useMutation({
    mutationFn: () => trpcClient.billing.createEmployerCheckout.mutate(),
    onSuccess: (payment) => {
      window.location.href = payment.checkoutUrl;
    },
    onError: (error) => toast.error(error.message),
  });

  const entitlements = billingQuery.data?.entitlements;
  const subscriptions = (billingQuery.data?.subscriptions ?? []) as SubscriptionRow[];
  const employerSubscription = subscriptions.find((subscription) => subscription.plan.code === "EMPLOYER_MONTHLY");

  if (billingQuery.isLoading) {
    return (
      <main className="min-h-screen bg-secondary/30 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Card className={entitlements?.employer ? "border-success/30" : "border-warning/40"}>
          <CardHeader>
            <Badge className="w-fit" variant={entitlements?.employer ? "default" : "secondary"}>
              {entitlements?.employer ? "Đang hoạt động" : "Chưa kích hoạt"}
            </Badge>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {entitlements?.employer ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <AlertCircle className="h-6 w-6 text-warning" />
              )}
              Gói nhà tuyển dụng
            </CardTitle>
            <CardDescription>
              Gia hạn gói để tiếp tục đăng tin, cập nhật ứng tuyển, lên lịch phỏng vấn và nhắn tin với ứng viên.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Trạng thái</p>
              <p className="mt-1 font-semibold">{entitlements?.employer ? "Active" : "Expired / Inactive"}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Hết hạn</p>
              <p className="mt-1 font-semibold">
                {employerSubscription ? formatDate(employerSubscription.currentPeriodEnd) : "Chưa có"}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Chu kỳ</p>
              <p className="mt-1 font-semibold">30 ngày</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
            >
              <CreditCard className="h-4 w-4" />
              {entitlements?.employer ? "Gia hạn gói" : "Thanh toán để kích hoạt"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
