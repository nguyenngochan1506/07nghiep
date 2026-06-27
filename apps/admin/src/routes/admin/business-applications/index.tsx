import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, XCircle } from "lucide-react";
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
import { Textarea } from "@07nghiep/ui/components/textarea";

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
  location: string | null;
  description: string | null;
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
  const [notes, setNotes] = useState<Record<string, string>>({});
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

  const rejectMutation = useMutation({
    mutationFn: (input: { id: string; note: string }) =>
      trpcClient.admin.businessApplications.reject.mutate(input),
    onSuccess: () => {
      toast.success("Đã từ chối và gửi email thông báo");
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Công ty</TableHead>
              <TableHead>Người gửi</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Không có yêu cầu phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((application) => {
                const note = notes[application.id] ?? application.reviewNote ?? "";
                const latestPayment = application.payments[0] ?? null;

                return (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="font-medium">{application.companyName}</div>
                      <div className="text-xs text-muted-foreground">
                        {application.website ?? application.location ?? "Chưa cập nhật"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {application.industry ?? "Chưa có ngành"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{application.user.name}</div>
                      <div className="text-xs text-muted-foreground">{application.user.email}</div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {application.description}
                      </p>
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
                      <Textarea
                        value={note}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))
                        }
                        placeholder="Ghi chú duyệt hoặc lý do từ chối"
                        className="min-h-16"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            approveMutation.mutate({
                              id: application.id,
                              note: note.trim() || undefined,
                            })
                          }
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending ||
                            application.status === "APPROVED"
                          }
                        >
                          <CheckCircle className="h-4 w-4" />
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            rejectMutation.mutate({
                              id: application.id,
                              note: note.trim() || "Thông tin doanh nghiệp chưa đủ điều kiện.",
                            })
                          }
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                          Từ chối
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
