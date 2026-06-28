import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, CheckCircle, ExternalLink, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Textarea } from "@07nghiep/ui/components/textarea";

import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/admin/business-applications/$applicationId")({
  component: BusinessApplicationDetailRoute,
});

type BusinessApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

type BusinessApplicationDetail = {
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
  user: { id: string; name: string; email: string };
  payments: { id: string; status: string; checkoutUrl: string; amountVnd: number; createdAt: Date | string }[];
};

const statusLabels: Record<BusinessApplicationStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value || "Chưa cập nhật"}</div>
    </div>
  );
}

function BusinessApplicationDetailRoute() {
  const { applicationId } = Route.useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const queryOptions = trpc.admin.businessApplications.getById.queryOptions({ id: applicationId });
  const query = useQuery(queryOptions);

  const approveMutation = useMutation({
    mutationFn: (input: { id: string; note?: string }) =>
      trpcClient.admin.businessApplications.approve.mutate(input),
    onSuccess: async () => {
      toast.success("Đã duyệt và gửi email thanh toán");
      await queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: trpc.admin.businessApplications.list.queryKey() });
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (input: { id: string; note: string }) =>
      trpcClient.admin.businessApplications.reject.mutate(input),
    onSuccess: async () => {
      toast.success("Đã từ chối và gửi email thông báo");
      await queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: trpc.admin.businessApplications.list.queryKey() });
    },
    onError: (error) => toast.error(error.message),
  });

  const application = query.data as BusinessApplicationDetail | undefined;
  const currentNote = note || application?.reviewNote || "";
  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="h-40 p-6 text-center text-muted-foreground">Đang tải...</CardContent>
      </Card>
    );
  }

  if (!application) {
    return (
      <Card>
        <CardContent className="flex h-40 flex-col items-center justify-center gap-3 p-6">
          <p className="text-muted-foreground">Không tìm thấy yêu cầu doanh nghiệp.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/admin/business-applications" })}>
            Quay lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link to="/admin/business-applications">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
        <Badge variant={application.status === "APPROVED" ? "default" : "secondary"}>
          {statusLabels[application.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-background">
                {application.logoUrl ? (
                  <img
                    src={application.logoUrl}
                    alt={application.companyName}
                    className="size-full rounded-xl object-contain p-2"
                  />
                ) : (
                  <Building2 className="size-7 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate">{application.companyName}</CardTitle>
                <CardDescription className="mt-1">
                  Người gửi: {application.user.name} · {application.user.email}
                </CardDescription>
                {application.website ? (
                  <a
                    href={application.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Website công ty
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Ngành nghề" value={application.industry} />
            <DetailItem label="Quy mô" value={application.companySize} />
            <DetailItem label="Năm thành lập" value={application.foundedYear} />
            <DetailItem label="Địa điểm" value={application.location} />
          </section>

          <section className="grid gap-2">
            <h2 className="font-semibold">Mô tả doanh nghiệp</h2>
            <p className="whitespace-pre-wrap rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
              {application.description || "Chưa cập nhật"}
            </p>
          </section>

          <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Mã số thuế / mã đăng ký" value={application.taxCode} />
            <DetailItem label="Người đại diện" value={application.legalRepresentative} />
            <DetailItem label="Email xác minh" value={application.contactEmail} />
            <DetailItem label="Số điện thoại" value={application.contactPhone} />
          </section>

          <section className="grid gap-3">
            <h2 className="font-semibold">Tài liệu pháp lý</h2>
            <div className="grid gap-2">
              {application.legalDocumentUrls.length === 0 ? (
                <p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa có tài liệu.</p>
              ) : (
                application.legalDocumentUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm hover:bg-surface-wash"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-primary" />
                      <span className="truncate">Tài liệu {index + 1}</span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="font-semibold">Giao dịch</h2>
            {application.payments.length === 0 ? (
              <p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa có giao dịch.</p>
            ) : (
              <div className="grid gap-2">
                {application.payments.map((payment) => (
                  <a
                    key={payment.id}
                    href={payment.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm hover:bg-surface-wash"
                  >
                    <span>{formatCurrency(payment.amountVnd)}</span>
                    <Badge variant="secondary">{payment.status}</Badge>
                  </a>
                ))}
              </div>
            )}
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ghi chú xét duyệt</CardTitle>
          <CardDescription>Ghi chú sẽ được lưu vào yêu cầu và gửi kèm email khi từ chối.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            value={currentNote}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ghi chú duyệt hoặc lý do từ chối"
            className="min-h-24"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                rejectMutation.mutate({
                  id: application.id,
                  note: currentNote.trim() || "Thông tin doanh nghiệp chưa đủ điều kiện.",
                })
              }
              disabled={isMutating}
            >
              <XCircle className="h-4 w-4" />
              Từ chối
            </Button>
            <Button
              onClick={() =>
                approveMutation.mutate({
                  id: application.id,
                  note: currentNote.trim() || undefined,
                })
              }
              disabled={isMutating || application.status === "APPROVED"}
            >
              <CheckCircle className="h-4 w-4" />
              Duyệt và gửi thanh toán
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
