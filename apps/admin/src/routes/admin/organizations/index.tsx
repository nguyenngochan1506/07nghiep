import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Eye, Search, XCircle } from "lucide-react";
import { useState } from "react";
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

type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

type AdminOrganizationRow = {
  id: string;
  name: string;
  website: string | null;
  location: string | null;
  industry: string | null;
  companySize: string | null;
  verified: boolean;
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  updatedAt: Date | string;
  jobsCount: number;
  user: {
    name: string;
    email: string;
  };
};

const statusLabels: Record<VerificationStatus, string> = {
  UNVERIFIED: "Chưa xác minh",
  PENDING: "Chờ xác minh",
  VERIFIED: "Đã xác minh",
  REJECTED: "Từ chối",
};

const statusBadgeVariants: Record<
  VerificationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  UNVERIFIED: "secondary",
  PENDING: "outline",
  VERIFIED: "default",
  REJECTED: "destructive",
};

export const Route = createFileRoute("/admin/organizations/")({
  component: AdminOrganizationsRoute,
});

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function AdminOrganizationsRoute() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VerificationStatus | "ALL">("ALL");

  const queryOptions = trpc.admin.organizations.list.queryOptions({
    status: status === "ALL" ? undefined : status,
    page,
    pageSize: 20,
    search: search || undefined,
  });
  const query = useQuery(queryOptions);

  const approveMutation = useMutation({
    mutationFn: (input: { id: string }) => trpcClient.admin.organizations.approve.mutate(input),
    onSuccess: () => {
      toast.success("Đã duyệt công ty");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (input: { id: string; note: string }) =>
      trpcClient.admin.organizations.reject.mutate(input),
    onSuccess: () => {
      toast.success("Đã từ chối công ty");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const organizations = (query.data?.organizations ?? []) as unknown as AdminOrganizationRow[];
  const pagination = query.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div>
          <CardTitle>Danh sách công ty</CardTitle>
          <CardDescription>
            Theo dõi hồ sơ công ty, trạng thái xác minh và số lượng tin tuyển dụng.
          </CardDescription>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(18rem,1fr)_12rem]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên công ty, email, ngành hoặc địa điểm"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as VerificationStatus | "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">Công ty</TableHead>
              <TableHead className="w-[24%]">Người quản lý</TableHead>
              <TableHead className="w-[14%]">Trạng thái</TableHead>
              <TableHead className="w-[8%]">Job</TableHead>
              <TableHead className="w-[10%]">Cập nhật</TableHead>
              <TableHead className="w-[10%]">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Không có công ty phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((organization) => {
                const canReview = organization.verificationStatus !== "VERIFIED";

                return (
                  <TableRow key={organization.id}>
                    <TableCell className="whitespace-normal">
                      <div className="line-clamp-1 font-medium">{organization.name}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {organization.website ?? "Chưa có website"}
                      </div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {organization.industry ?? "Chưa cập nhật ngành"} ·{" "}
                        {organization.location ?? "Chưa cập nhật địa điểm"}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="line-clamp-1">{organization.user.name}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {organization.user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariants[organization.verificationStatus]}>
                        {statusLabels[organization.verificationStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{organization.jobsCount}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(organization.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/admin/organizations/$organizationId"
                            params={{ organizationId: organization.id }}
                          >
                            <Eye className="h-4 w-4" />
                            Chi tiết
                          </Link>
                        </Button>
                        {canReview ? (
                          <>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: organization.id })}
                            disabled={isMutating}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              rejectMutation.mutate({
                                id: organization.id,
                                note: "Thông tin công ty chưa đủ điều kiện xác thực.",
                              })
                            }
                            disabled={isMutating}
                          >
                            <XCircle className="h-4 w-4" />
                            Từ chối
                          </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination
              ? `Hiển thị ${organizations.length} / ${pagination.total} công ty`
              : "Đang tải dữ liệu"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || query.isLoading}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || query.isLoading}
            >
              Sau
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
