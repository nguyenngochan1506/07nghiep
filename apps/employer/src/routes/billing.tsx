import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
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

export const Route = createFileRoute("/billing")({
  component: EmployerBillingRoute,
});

type SubscriptionRow = {
  id: string;
  currentPeriodEnd: string | Date;
  plan: { name: string; code: string; priceVnd: number };
};

const EMPLOYER_FALLBACK_PRICE = 299000;

const employerFeatures = [
  "Đăng và quản lý tin tuyển dụng đang mở",
  "Xem, cập nhật trạng thái và lọc đơn ứng tuyển",
  "Lên lịch phỏng vấn với ứng viên",
  "Nhắn tin trực tiếp trong hệ thống",
];

const workflowItems = [
  {
    icon: Briefcase,
    title: "Đăng tin nhanh",
    description: "Tạo tin tuyển dụng có đầy đủ thông tin vị trí, địa điểm, mức lương và kỹ năng.",
  },
  {
    icon: UsersRound,
    title: "Quản lý quy trình",
    description: "Theo dõi ứng viên theo từng trạng thái để không bỏ sót hồ sơ cần xử lý.",
  },
  {
    icon: CalendarClock,
    title: "Điều phối phỏng vấn",
    description: "Tạo lịch phỏng vấn và giữ mọi trao đổi trong cùng một luồng làm việc.",
  },
];

const faqs = [
  {
    question: "Gói này dành cho ai?",
    answer:
      "Dành cho tài khoản doanh nghiệp đã được admin duyệt và cần vận hành tuyển dụng trên 07nghiep.",
  },
  {
    question: "Hết hạn thì chuyện gì xảy ra?",
    answer: "Quyền nhà tuyển dụng sẽ bị giới hạn cho đến khi bạn gia hạn gói.",
  },
  {
    question: "Thanh toán có kích hoạt ngay không?",
    answer:
      "Sau khi payOS gửi xác nhận thành công, hệ thống sẽ kích hoạt hoặc gia hạn gói đăng ký.",
  },
];

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
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
  const employerSubscription = subscriptions.find(
    (subscription) => subscription.plan.code === "EMPLOYER_MONTHLY",
  );
  const employerActive = entitlements?.employer ?? false;
  const employerPrice = employerSubscription?.plan.priceVnd ?? EMPLOYER_FALLBACK_PRICE;

  if (billingQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-surface-wash/70 px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="max-w-3xl">
            <Badge className="mb-4" variant={employerActive ? "default" : "secondary"}>
              {employerActive ? "Gói đang hoạt động" : "Bảng giá nhà tuyển dụng"}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
              Một gói để vận hành tuyển dụng từ tin đăng đến phỏng vấn
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Kích hoạt quyền nhà tuyển dụng để đăng tin, quản lý hồ sơ, trao đổi với ứng viên và
              điều phối lịch phỏng vấn trong cùng một cổng tuyển dụng.
            </p>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Metric value="30" label="ngày mỗi chu kỳ" />
              <Metric value="4" label="nhóm quyền tuyển dụng" />
              <Metric value="1" label="không gian làm việc doanh nghiệp" />
            </div>
          </div>

          <StatusPanel active={employerActive} subscription={employerSubscription} />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[380px_minmax(0,1fr)]">
        <PlanCard
          active={employerActive}
          price={`${formatVnd(employerPrice)}đ`}
          period="/30 ngày"
          features={employerFeatures}
          action={
            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              size="lg"
              className="w-full bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
            >
              <CreditCard className="size-4" />
              {employerActive ? "Gia hạn gói" : "Thanh toán để kích hoạt"}
            </Button>
          }
        />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Quyền lợi chính
              </CardTitle>
              <CardDescription>
                Gói này tập trung vào các bước vận hành tuyển dụng hằng ngày của doanh nghiệp.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {workflowItems.map((item) => (
                <WorkflowItem key={item.title} {...item} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-primary" />
                Trước khi thanh toán
              </CardTitle>
              <CardDescription>
                Tài khoản cần được duyệt vai trò doanh nghiệp trước khi tạo phiên thanh toán.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {faqs.map((item) => (
                <div key={item.question} className="border-t pt-4">
                  <h3 className="font-medium">{item.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function StatusPanel({
  active,
  subscription,
}: {
  active: boolean;
  subscription: SubscriptionRow | undefined;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">Trạng thái hiện tại</p>
      <div className="mt-3 flex items-center gap-3">
        <div
          className={
            active
              ? "flex size-10 items-center justify-center rounded-lg bg-success text-primary-foreground"
              : "flex size-10 items-center justify-center rounded-lg bg-warning text-brand-orange-foreground"
          }
        >
          {active ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
        </div>
        <div>
          <p className="font-semibold">{active ? "Đang hoạt động" : "Chưa kích hoạt"}</p>
          <p className="text-sm text-muted-foreground">
            {subscription
              ? `Hiệu lực đến ${formatDate(subscription.currentPeriodEnd)}`
              : "Chưa có chu kỳ thanh toán"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="text-xl font-semibold text-primary">{value}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{label}</div>
    </div>
  );
}

function PlanCard({
  active,
  price,
  period,
  features,
  action,
}: {
  active: boolean;
  price: string;
  period: string;
  features: string[];
  action: ReactNode;
}) {
  return (
    <Card className={active ? "border-success/40 shadow-md" : "border-primary/30 shadow-md"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Gói nhà tuyển dụng hằng tháng</CardTitle>
            <CardDescription className="mt-1">
              Gói tuyển dụng theo tháng cho doanh nghiệp đã được duyệt.
            </CardDescription>
          </div>
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "Đang dùng" : "Cần kích hoạt"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <span className="text-3xl font-semibold text-foreground">{price}</span>
          <span className="ml-1 text-sm text-muted-foreground">{period}</span>
          <p className="mt-2 text-xs text-muted-foreground">
            Giá hiển thị theo dữ liệu mặc định; phiên thanh toán sẽ xác nhận giá hiện hành.
          </p>
        </div>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm leading-6">
              <Check className="mt-1 size-4 shrink-0 text-success" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>{action}</CardFooter>
    </Card>
  );
}

function WorkflowItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Briefcase;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-surface-wash p-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-card text-primary">
        <Icon className="size-4" />
      </div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
