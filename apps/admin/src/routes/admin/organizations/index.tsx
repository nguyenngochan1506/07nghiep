import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, XCircle } from "lucide-react";
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
import { Textarea } from "@07nghiep/ui/components/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@07nghiep/ui/components/table";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/organizations/")({
  component: AdminOrganizationsRoute,
});

function AdminOrganizationsRoute() {
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const queryOptions = trpc.admin.organizations.listVerificationRequests.queryOptions({
    status: "PENDING",
    page: 1,
    pageSize: 20,
  });
  const query = useQuery(queryOptions);

  const approveMutation = useMutation(
    trpc.admin.organizations.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Đã duyệt công ty");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const rejectMutation = useMutation(
    trpc.admin.organizations.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Đã từ chối công ty");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const organizations = query.data?.organizations ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duyệt công ty</CardTitle>
        <CardDescription>Kiểm tra các công ty đang chờ xác thực trên nền tảng.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Công ty</TableHead>
              <TableHead>Người quản lý</TableHead>
              <TableHead>Ngành</TableHead>
              <TableHead>Quy mô</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Ghi chú từ chối</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Không có công ty nào đang chờ duyệt.
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell>
                    <div className="font-medium">{organization.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {organization.website ?? organization.location ?? "Chưa cập nhật"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{organization.user.name}</div>
                    <div className="text-xs text-muted-foreground">{organization.user.email}</div>
                  </TableCell>
                  <TableCell>{organization.industry ?? "Chưa cập nhật"}</TableCell>
                  <TableCell>{organization.companySize ?? "Chưa cập nhật"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{organization.jobsCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={rejectNotes[organization.id] ?? ""}
                      onChange={(event) =>
                        setRejectNotes((current) => ({
                          ...current,
                          [organization.id]: event.target.value,
                        }))
                      }
                      placeholder="Lý do nếu từ chối"
                      className="min-h-16"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate({ id: organization.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
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
                            note:
                              rejectNotes[organization.id]?.trim() ||
                              "Thông tin công ty chưa đủ điều kiện xác thực.",
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
