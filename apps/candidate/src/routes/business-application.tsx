import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Textarea } from "@07nghiep/ui/components/textarea";

import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/business-application")({
  component: BusinessApplicationRoute,
});

type BusinessApplication = {
  id: string;
  companyName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  payments: { id: string; status: string; checkoutUrl: string; amountVnd: number }[];
};

function BusinessApplicationRoute() {
  const queryOptions = trpc.businessApplication.mine.queryOptions();
  const applicationQuery = useQuery(queryOptions);
  const [form, setForm] = useState({
    companyName: "",
    website: "",
    industry: "",
    location: "",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: () => trpcClient.businessApplication.create.mutate(form),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu doanh nghiệp");
      setForm({ companyName: "", website: "", industry: "", location: "", description: "" });
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const application = applicationQuery.data as BusinessApplication | null | undefined;
  const latestPayment = application?.payments[0] ?? null;
  const canCreate = !application || application.status === "REJECTED";

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Building2 className="size-5" />
          </div>
          <CardTitle>Đăng ký nhà tuyển dụng</CardTitle>
          <CardDescription>
            Gửi yêu cầu doanh nghiệp để admin duyệt. Khi được duyệt, bạn sẽ nhận email kèm link thanh toán.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canCreate ? (
            <div className="grid gap-4">
              {application?.status === "REJECTED" ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
                  Yêu cầu trước đó chưa được duyệt: {application.reviewNote ?? "Chưa có ghi chú."}
                </div>
              ) : null}
              <Input
                value={form.companyName}
                onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                placeholder="Tên công ty"
              />
              <Input
                value={form.website}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                placeholder="Website"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  value={form.industry}
                  onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                  placeholder="Ngành nghề"
                />
                <Input
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Địa điểm"
                />
              </div>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Mô tả doanh nghiệp, nhu cầu tuyển dụng và thông tin xác minh"
                className="min-h-32"
              />
            </div>
          ) : (
            <div className="rounded-xl border bg-surface-wash p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="font-semibold">{application.companyName}</h2>
                <Badge variant={application.status === "APPROVED" ? "default" : "secondary"}>
                  {application.status === "PENDING"
                    ? "Chờ admin duyệt"
                    : application.status === "APPROVED"
                      ? "Đã duyệt"
                      : "Từ chối"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {application.status === "PENDING"
                  ? "Admin sẽ kiểm tra yêu cầu và gửi email khi có kết quả."
                  : "Yêu cầu đã được duyệt. Hoàn tất thanh toán để kích hoạt quyền nhà tuyển dụng."}
              </p>
              {latestPayment && latestPayment.status !== "PAID" ? (
                <Button asChild className="mt-4 bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90">
                  <a href={latestPayment.checkoutUrl}>
                    <CreditCard className="h-4 w-4" />
                    Thanh toán gói doanh nghiệp
                  </a>
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
        {canCreate ? (
          <CardFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
            >
              Gửi yêu cầu
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Quy trình</CardTitle>
          <CardDescription>Duyệt trước, thanh toán sau.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Gửi thông tin doanh nghiệp.</p>
          <p>2. Admin duyệt và gửi email kèm link thanh toán.</p>
          <p>3. Thanh toán payOS để kích hoạt quyền nhà tuyển dụng.</p>
        </CardContent>
      </Card>
    </main>
  );
}
