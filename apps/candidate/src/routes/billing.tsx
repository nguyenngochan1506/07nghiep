import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCircle2,
  CreditCard,
  FileSearch,
  Sparkles,
  TrendingUp,
  Users,
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
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/billing")({
  component: BillingRoute,
});

type SubscriptionRow = {
  id: string;
  currentPeriodEnd: string | Date;
  plan: { name: string; code: string; priceVnd: number };
};

type BillingPlanRow = {
  name: string;
  code: string;
  priceVnd: number;
  durationDays: number;
};

const CANDIDATE_PLUS_FALLBACK_PRICE = 49000;
const EMPLOYER_FALLBACK_PRICE = 299000;

const plusFeatures = [
  "3 lượt phân tích CV bằng AI trong mỗi chu kỳ",
  "Thông báo việc phù hợp qua chuông và email",
  "Xem số lượng ứng viên đã apply trên tin tuyển dụng",
  "Ưu tiên các tín hiệu giúp chọn việc đáng ứng tuyển",
];

const freeFeatures = [
  "Tìm kiếm và lưu việc làm",
  "Ứng tuyển các tin đang mở",
  "Theo dõi trạng thái đơn ứng tuyển",
];

const employerFeatures = [
  "Đăng và quản lý tin tuyển dụng",
  "AI phân tích độ phù hợp CV ứng viên với từng tin",
  "Quản lý hồ sơ, nhắn tin và lịch phỏng vấn",
];

const benefits = [
  {
    icon: FileSearch,
    title: "Đánh giá CV trước khi gửi",
    description: "Nhận gợi ý chỉnh sửa CV theo tin tuyển dụng để hồ sơ rõ trọng tâm hơn.",
  },
  {
    icon: Bell,
    title: "Không bỏ lỡ việc phù hợp",
    description: "Nhận thông báo khi hệ thống tìm thấy cơ hội mới khớp với hồ sơ của bạn.",
  },
  {
    icon: Users,
    title: "Biết mức độ cạnh tranh",
    description: "Xem số lượng ứng viên đã ứng tuyển để quyết định thời điểm nộp hồ sơ.",
  },
];

const faqs = [
  {
    question: "Plus có bắt buộc để ứng tuyển không?",
    answer: "Không. Gói Free vẫn cho phép tìm việc, lưu việc và gửi hồ sơ cơ bản.",
  },
  {
    question: "Khi nào gói được kích hoạt?",
    answer: "Sau khi payOS xác nhận thanh toán, quyền Plus được cập nhật cho tài khoản của bạn.",
  },
  {
    question: "Nếu đã có Plus thì nút thanh toán làm gì?",
    answer: "Nút sẽ tạo giao dịch gia hạn, giúp cộng thêm chu kỳ sử dụng tiếp theo.",
  },
];

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function BillingRoute() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session;
  const plansQuery = useQuery(trpc.billing.plans.queryOptions());
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
  const plans = (plansQuery.data ?? []) as BillingPlanRow[];
  const plusPlan = plans.find((plan) => plan.code === "CANDIDATE_PLUS_MONTHLY");
  const employerPlan = plans.find((plan) => plan.code === "EMPLOYER_MONTHLY");
  const plusSubscription = subscriptions.find(
    (subscription) => subscription.plan.code === "CANDIDATE_PLUS_MONTHLY",
  );
  const plusPrice =
    plusPlan?.priceVnd ?? plusSubscription?.plan.priceVnd ?? CANDIDATE_PLUS_FALLBACK_PRICE;
  const employerPrice = employerPlan?.priceVnd ?? EMPLOYER_FALLBACK_PRICE;
  const plusIsActive = entitlements?.candidatePlus ?? false;

  if (plansQuery.isLoading || billingQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-6xl">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-surface-wash/70 px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
          <div className="max-w-3xl">
            <Badge className="mb-4" variant={plusIsActive ? "default" : "secondary"}>
              {plusIsActive ? "Plus đang hoạt động" : "Pricing cho ứng viên"}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
              Chọn gói giúp bạn ứng tuyển có chiến lược hơn
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Free đủ để bắt đầu tìm việc. Candidate Plus thêm dữ liệu cạnh tranh, thông báo phù hợp
              và công cụ hỗ trợ CV để bạn tập trung vào những cơ hội đáng theo đuổi.
            </p>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Metric value="3" label="lượt AI CV mỗi tháng" />
              <Metric value="30" label="ngày cho mỗi chu kỳ" />
              <Metric value="1" label="tài khoản ứng viên" />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Trạng thái tài khoản</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                {plusIsActive ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Sparkles className="size-5" />
                )}
              </div>
              <div>
                <p className="font-semibold">{plusIsActive ? "Candidate Plus" : "Free"}</p>
                <p className="text-sm text-muted-foreground">
                  {plusSubscription
                    ? `Hiệu lực đến ${formatDate(plusSubscription.currentPeriodEnd)}`
                    : "Có thể nâng cấp bất cứ lúc nào"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <PlanCard
            title="Free"
            description="Dành cho ứng viên mới bắt đầu theo dõi cơ hội."
            price="0đ"
            period="/tháng"
            features={freeFeatures}
            action={
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/jobs">Xem việc làm</Link>
              </Button>
            }
          />

          <PlanCard
            title="Candidate Plus"
            description="Dành cho ứng viên muốn ra quyết định ứng tuyển tốt hơn."
            price={`${formatVnd(plusPrice)}đ`}
            period="/30 ngày"
            featured
            badge={plusIsActive ? "Đang dùng" : "Khuyên dùng"}
            features={plusFeatures}
            action={
              <Button
                onClick={handleCandidatePlusCheckout}
                disabled={checkoutMutation.isPending}
                size="lg"
                className="w-full"
              >
                <CreditCard className="size-4" />
                {plusIsActive ? "Gia hạn Plus" : "Nâng cấp Plus"}
              </Button>
            }
          />

          <PlanCard
            title="Nhà tuyển dụng"
            description="Dành cho doanh nghiệp cần đăng tin và sàng lọc hồ sơ ứng viên."
            price={`${formatVnd(employerPrice)}đ`}
            period="/30 ngày"
            badge="Doanh nghiệp"
            features={employerFeatures}
            action={
              <Button asChild variant="outline" size="lg" className="w-full">
                {isLoggedIn ? (
                  <Link to="/business-application">Đăng ký nhà tuyển dụng</Link>
                ) : (
                  <Link to="/login" search={{ redirect: "/business-application" }}>
                    Đăng ký nhà tuyển dụng
                  </Link>
                )}
              </Button>
            }
          />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Gói Plus mở khóa gì?
            </CardTitle>
            <CardDescription>
              Các quyền lợi tập trung vào việc giúp bạn chọn đúng tin và gửi hồ sơ tốt hơn.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {benefits.map((benefit) => (
              <Benefit key={benefit.title} {...benefit} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Câu hỏi thường gặp</h2>
            <p className="text-sm text-muted-foreground">
              Những điểm cần biết trước khi tạo giao dịch thanh toán.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {faqs.map((item) => (
              <div key={item.question} className="border-t pt-4">
                <h3 className="font-medium">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
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
  title,
  description,
  price,
  period,
  features,
  action,
  badge,
  featured,
}: {
  title: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  action: ReactNode;
  badge?: string;
  featured?: boolean;
}) {
  return (
    <Card className={featured ? "h-fit border-primary/40 shadow-md" : "h-fit"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {badge ? <Badge variant={featured ? "default" : "secondary"}>{badge}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <span className="text-3xl font-semibold text-foreground">{price}</span>
          <span className="ml-1 text-sm text-muted-foreground">{period}</span>
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

function Benefit({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-surface-wash p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
