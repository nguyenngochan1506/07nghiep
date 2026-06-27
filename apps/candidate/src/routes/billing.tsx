import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BriefcaseBusiness, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";

import { trpc, trpcClient } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/billing")({
  component: BillingRoute,
});

type SubscriptionRow = {
  id: string;
  currentPeriodEnd: string | Date;
  plan: { name: string; code: string; priceVnd: number };
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function BillingRoute() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;
  const billingQuery = useQuery(
    trpc.billing.me.queryOptions(undefined, {
      enabled: isLoggedIn,
    }),
  );
  const checkoutMutation = useMutation({
    mutationFn: () => trpcClient.billing.createCandidatePlusCheckout.mutate(),
    onSuccess: (payment) => {
      window.location.href = payment.checkoutUrl;
    },
    onError: (error) => toast.error(error.message),
  });

  function handleCandidatePlusCheckout() {
    if (!isLoggedIn) {
      window.location.href = "/login?redirect=/billing";
      return;
    }

    checkoutMutation.mutate();
  }

  const entitlements = billingQuery.data?.entitlements;
  const subscriptions = (billingQuery.data?.subscriptions ?? []) as SubscriptionRow[];
  const plusSubscription = subscriptions.find((subscription) => subscription.plan.code === "CANDIDATE_PLUS_MONTHLY");

  if (billingQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Skeleton className="h-72 rounded-xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit" variant={entitlements?.candidatePlus ? "default" : "secondary"}>
              {entitlements?.candidatePlus ? "Plus đang hoạt động" : "Free tier"}
            </Badge>
            <CardTitle className="text-2xl">Candidate Plus</CardTitle>
            <CardDescription>
              Theo dõi cơ hội tốt hơn với thông báo việc phù hợp và dữ liệu cạnh tranh khi ứng tuyển.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Benefit icon={Sparkles} title="AI phân tích CV" description="Gợi ý chỉnh sửa CV sẽ được mở ở bước tiếp theo." comingSoon />
            <Benefit icon={Bell} title="Thông báo việc phù hợp" description="Nhận thông báo qua chuông và email khi có việc mới phù hợp với hồ sơ." />
            <Benefit icon={BriefcaseBusiness} title="Số lượng ứng viên" description="Xem số lượng người đã apply trên trang chi tiết công việc." />
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {plusSubscription
                ? `Hết hạn: ${formatDate(plusSubscription.currentPeriodEnd)}`
                : "Bạn đang dùng gói Free."}
            </div>
            <Button
              onClick={handleCandidatePlusCheckout}
              disabled={checkoutMutation.isPending}
              className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
            >
              <CreditCard className="h-4 w-4" />
              {entitlements?.candidatePlus ? "Gia hạn Plus" : "Nâng cấp Plus"}
            </Button>
          </CardFooter>
        </Card>
      </section>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trạng thái hiện tại</CardTitle>
            <CardDescription>
              {entitlements?.candidatePlus
                ? "Tài khoản đã có quyền Plus."
                : "Free tier vẫn có thể xem việc và ứng tuyển cơ bản."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plus</span>
              <span className="font-medium">{entitlements?.candidatePlus ? "Có" : "Không"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI CV</span>
              <span className="font-medium">Sắp ra mắt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nhà tuyển dụng</span>
              <span className="font-medium">{entitlements?.employer ? "Đã kích hoạt" : "Chưa"}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              {isLoggedIn ? (
                <Link to="/business-application">Đăng ký nhà tuyển dụng</Link>
              ) : (
                <Link to="/login" search={{ redirect: "/business-application" }}>
                  Đăng ký nhà tuyển dụng
                </Link>
              )}
            </Button>
          </CardFooter>
        </Card>
      </aside>
    </main>
  );
}

function Benefit({
  icon: Icon,
  title,
  description,
  comingSoon,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-surface-wash p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-card text-primary">
          <Icon className="size-4" />
        </div>
        {comingSoon ? <Badge variant="secondary">Sắp ra mắt</Badge> : null}
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
