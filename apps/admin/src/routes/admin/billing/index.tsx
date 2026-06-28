import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, ReceiptText, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@07nghiep/ui/components/table";

import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/admin/billing/")({
  component: AdminBillingRoute,
});

type BillingPlanRow = {
  id: string;
  code: "CANDIDATE_PLUS_MONTHLY" | "CANDIDATE_AI_CV_CREDITS" | "EMPLOYER_MONTHLY";
  name: string;
  priceVnd: number;
  durationDays: number;
  active: boolean;
};

function formatVnd(value: number) {
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function AdminBillingRoute() {
  const queryOptions = trpc.admin.billing.plans.queryOptions();
  const query = useQuery(queryOptions);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextPrices = Object.fromEntries(
      ((query.data ?? []) as BillingPlanRow[]).map((plan) => [plan.id, String(plan.priceVnd)]),
    );
    setPrices(nextPrices);
  }, [query.data]);

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; priceVnd: number }) =>
      trpcClient.admin.billing.updatePlanPrice.mutate(input),
    onSuccess: () => {
      toast.success("Đã cập nhật giá gói");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const plans = (query.data ?? []) as BillingPlanRow[];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Cấu hình gói thanh toán
          </CardTitle>
          <CardDescription>Admin có thể linh động điều chỉnh giá trước khi tạo giao dịch mới.</CardDescription>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/billing/payments">
            <ReceiptText className="h-4 w-4" />
            Giao dịch
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gói</TableHead>
              <TableHead>Chu kỳ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Giá hiện tại</TableHead>
              <TableHead className="w-64">Giá mới</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Chưa có gói thanh toán. Hãy chạy seed billing plans.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => {
                const priceValue = Number(prices[plan.id] ?? plan.priceVnd);
                const unchanged = priceValue === plan.priceVnd;

                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.code}</div>
                    </TableCell>
                    <TableCell>{plan.durationDays} ngày</TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? "default" : "secondary"}>
                        {plan.active ? "Đang bán" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatVnd(plan.priceVnd)}</TableCell>
                    <TableCell>
                      <Input
                        inputMode="numeric"
                        value={prices[plan.id] ?? ""}
                        onChange={(event) =>
                          setPrices((current) => ({
                            ...current,
                            [plan.id]: event.target.value.replace(/\D/g, ""),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({ id: plan.id, priceVnd: priceValue })}
                        disabled={updateMutation.isPending || unchanged || Number.isNaN(priceValue)}
                      >
                        <Save className="h-4 w-4" />
                        Lưu
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
