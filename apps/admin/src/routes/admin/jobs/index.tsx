import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@07nghiep/ui/components/table";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/jobs/")({
  component: AdminJobsRoute,
});

type PendingJobRow = {
  id: string;
  title: string;
  location: string;
  jobType: string;
  workType: string;
  salaryMin: unknown;
  salaryMax: unknown;
  salaryNegotiable: boolean;
  skills: string[];
  organization: {
    name: string;
    verified: boolean;
  };
};

function formatSalary(job: {
  salaryMin: unknown;
  salaryMax: unknown;
  salaryNegotiable: boolean;
}) {
  if (job.salaryNegotiable) return "Thỏa thuận";
  const min = job.salaryMin == null ? null : Number(job.salaryMin);
  const max = job.salaryMax == null ? null : Number(job.salaryMax);
  if (min != null && max != null) return `${min.toLocaleString("vi-VN")} - ${max.toLocaleString("vi-VN")}`;
  if (min != null) return `Từ ${min.toLocaleString("vi-VN")}`;
  if (max != null) return `Đến ${max.toLocaleString("vi-VN")}`;
  return "Chưa cập nhật";
}

function AdminJobsRoute() {
  const queryOptions = trpc.admin.jobs.listPending.queryOptions({
    page: 1,
    pageSize: 20,
  });
  const query = useQuery(queryOptions);

  const approveMutation = useMutation(
    trpc.admin.jobs.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Đã duyệt tin tuyển dụng");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const rejectMutation = useMutation(
    trpc.admin.jobs.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Đã trả tin về nháp");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const jobs = (query.data?.jobs ?? []) as PendingJobRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duyệt tin tuyển dụng</CardTitle>
        <CardDescription>Chỉ các tin được duyệt mới xuất hiện ở cổng ứng viên.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tin tuyển dụng</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Lương</TableHead>
              <TableHead>Kỹ năng</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Không có tin tuyển dụng nào đang chờ duyệt.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium">{job.title}</div>
                    <div className="text-xs text-muted-foreground">{job.location}</div>
                  </TableCell>
                  <TableCell>
                    <div>{job.organization.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.organization.verified ? "Đã xác thực" : "Chưa xác thực"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{job.jobType}</div>
                    <div className="text-xs text-muted-foreground">{job.workType}</div>
                  </TableCell>
                  <TableCell>{formatSalary(job)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 4).map((skill: string) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 4 ? <Badge variant="outline">+{job.skills.length - 4}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate({ id: job.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate({ id: job.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                        Trả nháp
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
