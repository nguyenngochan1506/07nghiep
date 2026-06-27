import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, ReceiptText } from "lucide-react";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@07nghiep/ui/components/table";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/billing/payments")({
  component: AdminBillingPaymentsRoute,
});

type PaymentStatus = "PENDING" | "PAID" | "CANCELLED" | "FAILED" | "REVIEW_REQUIRED";

type PaymentRow = {
  id: string;
  orderCode: string;
  amountVnd: number;
  status: PaymentStatus;
  checkoutUrl: string;
  createdAt: string | Date;
  paidAt: string | Date | null;
  user: { name: string; email: string };
  plan: { name: string; code: string };
  businessApplication: { companyName: string } | null;
};

const statusLabels: Record<PaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
  FAILED: "Thất bại",
  REVIEW_REQUIRED: "Cần kiểm tra",
};

function formatVnd(value: number) {
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function formatDate(value: string | Date | null) {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN");
}

function AdminBillingPaymentsRoute() {
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const query = useQuery(
    trpc.admin.billing.payments.queryOptions({
      status: status === "ALL" ? undefined : status,
      page: 1,
      pageSize: 50,
    }),
  );

  const payments = (query.data?.payments ?? []) as PaymentRow[];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Theo dõi giao dịch
          </CardTitle>
          <CardDescription>Kiểm tra checkout payOS, trạng thái webhook và giao dịch cần đối soát.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(value) => setStatus(value as PaymentStatus | "ALL")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link to="/admin/billing">
              <CreditCard className="h-4 w-4" />
              Gói
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead>Gói</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Chưa có giao dịch phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="font-medium">{payment.orderCode}</div>
                    <a
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      href={payment.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở checkout
                    </a>
                  </TableCell>
                  <TableCell>
                    <div>{payment.user.name}</div>
                    <div className="text-xs text-muted-foreground">{payment.user.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{payment.plan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {payment.businessApplication?.companyName ?? payment.plan.code}
                    </div>
                  </TableCell>
                  <TableCell>{formatVnd(payment.amountVnd)}</TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "PAID" ? "default" : "secondary"}>
                      {statusLabels[payment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>{formatDate(payment.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">Paid: {formatDate(payment.paidAt)}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
