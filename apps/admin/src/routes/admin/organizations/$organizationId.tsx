import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@07nghiep/ui/components/card";

import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/admin/organizations/$organizationId")({
  component: AdminOrganizationDetailRoute,
});

type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

type OrganizationDetail = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  foundedYear: number | null;
  location: string | null;
  sourceSite: string | null;
  sourceUrl: string | null;
  externalId: string | null;
  country: string | null;
  companyType: string | null;
  workingDays: string | null;
  overtimePolicy: string | null;
  coverImageUrl: string | null;
  linkedinUrl: string | null;
  jobOpeningsCount: number | null;
  rawPayload: unknown;
  verified: boolean;
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  jobsCount: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  jobs: Array<{
    id: string;
    title: string;
    status: string;
    location: string;
    applicationsCount: number;
    updatedAt: Date | string;
  }>;
};

const statusLabels: Record<VerificationStatus, string> = {
  UNVERIFIED: "Chưa xác minh",
  PENDING: "Chờ xác minh",
  VERIFIED: "Đã xác minh",
  REJECTED: "Từ chối",
};

const statusBadgeVariants: Record<VerificationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  UNVERIFIED: "secondary",
  PENDING: "outline",
  VERIFIED: "default",
  REJECTED: "destructive",
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value || "Chưa cập nhật"}</div>
    </div>
  );
}

type BusinessVerificationPayload = {
  taxCode: string | null;
  legalRepresentative: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  legalDocumentUrls: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function getBusinessVerificationPayload(rawPayload: unknown): BusinessVerificationPayload {
  if (!isRecord(rawPayload)) {
    return {
      taxCode: null,
      legalRepresentative: null,
      contactEmail: null,
      contactPhone: null,
      legalDocumentUrls: [],
    };
  }

  return {
    taxCode: getString(rawPayload.taxCode),
    legalRepresentative: getString(rawPayload.legalRepresentative),
    contactEmail: getString(rawPayload.contactEmail),
    contactPhone: getString(rawPayload.contactPhone),
    legalDocumentUrls: getStringArray(rawPayload.legalDocumentUrls),
  };
}

function AdminOrganizationDetailRoute() {
  const { organizationId } = Route.useParams();
  const navigate = useNavigate();
  const queryOptions = trpc.admin.organizations.getById.queryOptions({ id: organizationId });
  const query = useQuery(queryOptions);

  const approveMutation = useMutation({
    mutationFn: (input: { id: string }) => trpcClient.admin.organizations.approve.mutate(input),
    onSuccess: async () => {
      toast.success("Đã duyệt công ty");
      await queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: trpc.admin.organizations.list.queryKey() });
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (input: { id: string; note: string }) =>
      trpcClient.admin.organizations.reject.mutate(input),
    onSuccess: async () => {
      toast.success("Đã từ chối công ty");
      await queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: trpc.admin.organizations.list.queryKey() });
    },
    onError: (error) => toast.error(error.message),
  });

  const organization = query.data as OrganizationDetail | undefined;
  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="h-40 p-6 text-center text-muted-foreground">Đang tải...</CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="flex h-40 flex-col items-center justify-center gap-3 p-6">
          <p className="text-muted-foreground">Không tìm thấy công ty.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/admin/organizations" })}>
            Quay lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  const verificationPayload = getBusinessVerificationPayload(organization.rawPayload);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link to="/admin/organizations">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
        <Badge variant={statusBadgeVariants[organization.verificationStatus]}>
          {statusLabels[organization.verificationStatus]}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        {organization.coverImageUrl ? (
          <img src={organization.coverImageUrl} alt="" className="h-44 w-full object-cover" />
        ) : null}
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-background">
                {organization.logoUrl ? (
                  <img
                    src={organization.logoUrl}
                    alt={organization.name}
                    className="size-full rounded-xl object-contain p-2"
                  />
                ) : (
                  <Building2 className="size-7 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate">{organization.name}</CardTitle>
                <CardDescription className="mt-1">
                  Quản lý: {organization.user.name} · {organization.user.email}
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  {organization.website ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={organization.website} target="_blank" rel="noreferrer">
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  ) : null}
                  {organization.sourceUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={organization.sourceUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Nguồn dữ liệu
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {organization.verificationStatus !== "VERIFIED" ? (
                <Button
                  onClick={() => approveMutation.mutate({ id: organization.id })}
                  disabled={isMutating}
                >
                  <CheckCircle className="h-4 w-4" />
                  Duyệt công ty
                </Button>
              ) : null}
              {organization.verificationStatus !== "REJECTED" ? (
                <Button
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
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Ngành nghề" value={organization.industry} />
            <DetailItem label="Quy mô" value={organization.companySize} />
            <DetailItem label="Năm thành lập" value={organization.foundedYear} />
            <DetailItem label="Loại công ty" value={organization.companyType} />
            <DetailItem label="Quốc gia" value={organization.country} />
            <DetailItem label="Số job trong hệ thống" value={organization.jobsCount} />
            <DetailItem label="Job từ nguồn" value={organization.jobOpeningsCount} />
            <DetailItem label="Cập nhật" value={formatDate(organization.updatedAt)} />
          </section>

          <section className="grid gap-2">
            <h2 className="font-semibold">Địa điểm</h2>
            <div className="flex gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>{organization.location || "Chưa cập nhật"}</span>
            </div>
          </section>

          <section className="grid gap-2">
            <h2 className="font-semibold">Mô tả công ty</h2>
            <p className="whitespace-pre-wrap rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
              {organization.description || "Chưa cập nhật"}
            </p>
          </section>

          <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Ngày làm việc" value={organization.workingDays} />
            <DetailItem label="Chính sách OT" value={organization.overtimePolicy} />
            <DetailItem label="LinkedIn" value={organization.linkedinUrl} />
            <DetailItem label="Mã ngoài" value={organization.externalId} />
          </section>

          <section className="grid gap-2">
            <h2 className="font-semibold">Xác minh</h2>
            <div className="grid gap-4 rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariants[organization.verificationStatus]}>
                  {statusLabels[organization.verificationStatus]}
                </Badge>
                <Badge variant={organization.verified ? "secondary" : "outline"}>
                  {organization.verified ? "Đã bật xác minh" : "Chưa bật xác minh"}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {organization.verificationNote || "Chưa có ghi chú xác minh."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem label="Mã số thuế / mã đăng ký" value={verificationPayload.taxCode} />
                <DetailItem label="Người đại diện" value={verificationPayload.legalRepresentative} />
                <DetailItem label="Email xác minh" value={verificationPayload.contactEmail} />
                <DetailItem label="Số điện thoại" value={verificationPayload.contactPhone} />
              </div>
              <div className="grid gap-2">
                <h3 className="text-sm font-medium">Tài liệu pháp lý</h3>
                {verificationPayload.legalDocumentUrls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có tài liệu pháp lý trong hồ sơ công ty.</p>
                ) : (
                  <div className="grid gap-2">
                    {verificationPayload.legalDocumentUrls.map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-surface-wash"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FileText className="size-4 shrink-0 text-primary" />
                          <span className="truncate">Tài liệu pháp lý {index + 1}</span>
                        </span>
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="font-semibold">Tin tuyển dụng gần đây</h2>
            {organization.jobs.length === 0 ? (
              <p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa có tin tuyển dụng.</p>
            ) : (
              <div className="grid gap-2">
                {organization.jobs.map((job) => (
                  <div key={job.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{job.title}</div>
                      <Badge variant="secondary">{job.status}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {job.location} · {job.applicationsCount} đơn ứng tuyển · cập nhật {formatDate(job.updatedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
