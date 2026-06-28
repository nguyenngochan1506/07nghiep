import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Eye } from "lucide-react";
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

import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/admin/business-applications/")({
  component: AdminBusinessApplicationsRoute,
});

type BusinessApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

type BusinessApplicationRow = {
  id: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  foundedYear: number | null;
  location: string | null;
  logoUrl: string | null;
  description: string | null;
  taxCode: string | null;
  legalRepresentative: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  legalDocumentUrls: string[];
  status: BusinessApplicationStatus;
  reviewNote: string | null;
  user: { name: string; email: string };
  payments: { id: string; status: string; checkoutUrl: string; amountVnd: number }[];
};

const statusLabels: Record<BusinessApplicationStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

function AdminBusinessApplicationsRoute() {
  const [status, setStatus] = useState<BusinessApplicationStatus | "ALL">("PENDING");
  const queryOptions = trpc.admin.businessApplications.list.queryOptions({
    status: status === "ALL" ? undefined : status,
  });
  const query = useQuery(queryOptions);

  const approveMutation = useMutation({
    mutationFn: (input: { id: string; note?: string }) =>
      trpcClient.admin.businessApplications.approve.mutate(input),
    onSuccess: () => {
      toast.success("Đã duyệt và gửi email thanh toán");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const applications = (query.data ?? []) as BusinessApplicationRow[];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Yêu cầu doanh nghiệp</CardTitle>
          <CardDescription>Duyệt yêu cầu trở thành nhà tuyển dụng và gửi link thanh toán qua email.</CardDescription>
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as BusinessApplicationStatus | "ALL")}>
          <SelectTrigger className="w-44">
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
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Công ty</TableHead>
              <TableHead className="w-[22%]">Người gửi</TableHead>
              <TableHead className="w-[22%]">Xác minh</TableHead>
              <TableHead className="w-[10%]">Trạng thái</TableHead>
              <TableHead className="w-[16%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Không có yêu cầu phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((application) => {
                const latestPayment = application.payments[0] ?? null;

                return (
                  <TableRow key={application.id}>
                    <TableCell className="whitespace-normal">
                      <div className="line-clamp-1 font-medium">{application.companyName}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {application.website ?? application.location ?? "Chưa cập nhật"}
                      </div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {application.industry ?? "Chưa có ngành"}
                        {" · "}
                        {application.companySize ?? "Chưa có quy mô"}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="line-clamp-1">{application.user.name}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{application.user.email}</div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="line-clamp-1 text-sm">MST: {application.taxCode ?? "Chưa cập nhật"}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        Đại diện: {application.legalRepresentative ?? "Chưa cập nhật"}
                      </div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {application.legalDocumentUrls.length} tài liệu pháp lý
                      </div>
                      {latestPayment ? (
                        <a
                          className="text-xs text-primary underline-offset-4 hover:underline"
                          href={latestPayment.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Giao dịch gần nhất: {latestPayment.status}
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={application.status === "APPROVED" ? "default" : "secondary"}>
                        {statusLabels[application.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/admin/business-applications/$applicationId"
                            params={{ applicationId: application.id }}
                          >
                            <Eye className="h-4 w-4" />
                            Chi tiết
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            approveMutation.mutate({
                              id: application.id,
                            })
                          }
                          disabled={
                            approveMutation.isPending ||
                            application.status === "APPROVED"
                          }
                        >
                          <CheckCircle className="h-4 w-4" />
                          Duyệt
                        </Button>
                      </div>
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
