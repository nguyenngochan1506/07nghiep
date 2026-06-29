import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createSeoHead, SITE_URL } from "@/lib/seo";
import { Building2, CreditCard, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@07nghiep/ui/components/select";
import { Textarea } from "@07nghiep/ui/components/textarea";

import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/business-application")({
  head: () =>
    createSeoHead({
      title: "Đăng ký doanh nghiệp | 07nghiep",
      description: "Đăng ký tài khoản doanh nghiệp để đăng tin tuyển dụng và quản lý ứng viên.",
      url: `${SITE_URL}/business-application`,
    }),
  component: BusinessApplicationRoute,
});

type BusinessApplication = {
  id: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  foundedYear: number | null;
  location: string | null;
  logoUrl: string | null;
  taxCode: string | null;
  legalRepresentative: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  legalDocumentUrls: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  payments: { id: string; status: string; checkoutUrl: string; amountVnd: number }[];
};

const companySizes = [
  { value: "STARTUP", label: "Startup (1-10 nhân viên)" },
  { value: "SMALL", label: "Nhỏ (11-50 nhân viên)" },
  { value: "MEDIUM", label: "Vừa (51-200 nhân viên)" },
  { value: "LARGE", label: "Lớn (201-1000 nhân viên)" },
  { value: "ENTERPRISE", label: "Tập đoàn (>1000 nhân viên)" },
] as const;

const emptyForm = {
  companyName: "",
  website: "",
  industry: "",
  companySize: "",
  foundedYear: "",
  location: "",
  logoUrl: "",
  description: "",
  taxCode: "",
  legalRepresentative: "",
  contactEmail: "",
  contactPhone: "",
  legalDocumentUrls: [] as string[],
};

function BusinessApplicationRoute() {
  const [form, setForm] = useState(emptyForm);
  const [documentUrl, setDocumentUrl] = useState("");

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Logo công ty không được vượt quá 2MB.");
      }

      const contentType = file.type || "application/octet-stream";
      const upload = await trpcClient.businessApplication.uploadLogo.mutate({
        filename: file.name,
        contentType,
      });
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Không thể tải logo lên storage.");
      }

      return upload.publicUrl;
    },
    onSuccess: (url) => {
      setForm((current) => ({ ...current, logoUrl: url }));
      toast.success("Đã tải logo công ty");
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Tài liệu pháp lý không được vượt quá 10MB.");
      }

      const contentType = file.type || "application/octet-stream";
      const upload = await trpcClient.businessApplication.uploadLegalDocument.mutate({
        filename: file.name,
        contentType,
      });
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Không thể tải tài liệu pháp lý lên storage.");
      }

      return upload.publicUrl;
    },
    onSuccess: (url) => {
      setForm((current) => ({
        ...current,
        legalDocumentUrls: [...current.legalDocumentUrls, url],
      }));
      toast.success("Đã tải tài liệu pháp lý");
    },
    onError: (error) => toast.error(error.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      trpcClient.businessApplication.create.mutate({
        companyName: form.companyName,
        website: form.website,
        industry: form.industry || undefined,
        companySize: form.companySize
          ? (form.companySize as "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE")
          : undefined,
        foundedYear: form.foundedYear ? Number.parseInt(form.foundedYear, 10) : undefined,
        location: form.location || undefined,
        logoUrl: form.logoUrl,
        description: form.description,
        taxCode: form.taxCode,
        legalRepresentative: form.legalRepresentative,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        legalDocumentUrls: form.legalDocumentUrls,
      }),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu doanh nghiệp");
      setForm(emptyForm);
    },
    onError: (error) => toast.error(error.message),
  });

  const application = null as BusinessApplication | null;
  const latestPayment = application?.payments[0] ?? null;
  const canCreate = !application || application.status === "REJECTED";

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
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
            <div className="grid gap-5">
              {application?.status === "REJECTED" ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
                  Yêu cầu trước đó chưa được duyệt: {application.reviewNote ?? "Chưa có ghi chú."}
                </div>
              ) : null}
              <section className="grid gap-4">
                <div>
                  <h2 className="text-base font-semibold">Thông tin công ty</h2>
                  <p className="text-sm text-muted-foreground">
                    Các thông tin này sẽ được dùng để tạo sẵn hồ sơ công ty sau khi thanh toán thành công.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Tên công ty</Label>
                    <Input
                      id="companyName"
                      value={form.companyName}
                      onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                      placeholder="VD: Google"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={form.website}
                      onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="industry">Ngành nghề</Label>
                    <Input
                      id="industry"
                      value={form.industry}
                      onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                      placeholder="Công nghệ giáo dục"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quy mô</Label>
                    <Select
                      value={form.companySize}
                      onValueChange={(value) => setForm((current) => ({ ...current, companySize: value ?? "" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn quy mô công ty" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="foundedYear">Năm thành lập</Label>
                    <Input
                      id="foundedYear"
                      inputMode="numeric"
                      value={form.foundedYear}
                      onChange={(event) => setForm((current) => ({ ...current, foundedYear: event.target.value }))}
                      placeholder="2024"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Địa điểm</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                      placeholder="Hồ Chí Minh"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border bg-surface-wash/50 p-3 sm:flex-row sm:items-center">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-background">
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logo công ty"
                        className="size-full rounded-lg object-contain p-1.5"
                      />
                    ) : (
                      <Building2 className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label>Logo công ty</Label>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG hoặc WebP. Tối đa 2MB.
                    </p>
                    {form.logoUrl ? (
                      <a
                        href={form.logoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {form.logoUrl.split("/").pop() || "Logo công ty"}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Chưa có logo.</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {form.logoUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                        aria-label="Xoá logo"
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                    <Button asChild variant="outline" disabled={uploadLogoMutation.isPending}>
                      <label>
                        <Upload data-icon="inline-start" />
                        {uploadLogoMutation.isPending ? "Đang tải..." : form.logoUrl ? "Đổi logo" : "Tải logo"}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) uploadLogoMutation.mutate(file);
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Mô tả doanh nghiệp</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Mô tả doanh nghiệp, sản phẩm, văn hoá và nhu cầu tuyển dụng"
                    className="min-h-32"
                  />
                </div>
              </section>

              <section className="grid gap-4">
                <div>
                  <h2 className="text-base font-semibold">Thông tin pháp lý</h2>
                  <p className="text-sm text-muted-foreground">
                    Admin dùng phần này để đối chiếu trước khi duyệt quyền nhà tuyển dụng.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="taxCode">Mã số thuế / mã đăng ký</Label>
                    <Input
                      id="taxCode"
                      value={form.taxCode}
                      onChange={(event) => setForm((current) => ({ ...current, taxCode: event.target.value }))}
                      placeholder="0312345678"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="legalRepresentative">Người đại diện pháp luật</Label>
                    <Input
                      id="legalRepresentative"
                      value={form.legalRepresentative}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, legalRepresentative: event.target.value }))
                      }
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactEmail">Email liên hệ xác minh</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                      placeholder="hr@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPhone">Số điện thoại liên hệ</Label>
                    <Input
                      id="contactPhone"
                      value={form.contactPhone}
                      onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                      placeholder="0867435475"
                    />
                  </div>
                </div>
                <div className="grid gap-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">Tài liệu pháp lý</h3>
                      <p className="text-sm text-muted-foreground">
                        Giấy phép kinh doanh, giấy uỷ quyền hoặc tài liệu xác minh tương đương.
                      </p>
                    </div>
                    <Button asChild variant="outline" disabled={uploadDocumentMutation.isPending}>
                      <label>
                        <Upload data-icon="inline-start" />
                        {uploadDocumentMutation.isPending ? "Đang tải..." : "Tải tệp lên"}
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) uploadDocumentMutation.mutate(file);
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={documentUrl}
                      onChange={(event) => setDocumentUrl(event.target.value)}
                      placeholder="Hoặc dán URL tài liệu pháp lý"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const value = documentUrl.trim();
                        if (!value) return;
                        setForm((current) => ({
                          ...current,
                          legalDocumentUrls: [...current.legalDocumentUrls, value],
                        }));
                        setDocumentUrl("");
                      }}
                    >
                      Thêm
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {form.legalDocumentUrls.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có tài liệu nào.</p>
                    ) : (
                      form.legalDocumentUrls.map((url) => (
                        <div key={url} className="flex items-center justify-between gap-3 rounded-lg border p-2 text-sm">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 items-center gap-2 text-primary underline-offset-4 hover:underline"
                          >
                            <FileText className="size-4 shrink-0" />
                            <span className="truncate">{url.split("/").pop() || url}</span>
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                legalDocumentUrls: current.legalDocumentUrls.filter((item) => item !== url),
                              }))
                            }
                            aria-label="Xoá tài liệu"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
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
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <span>Website: {application.website ?? "Chưa cập nhật"}</span>
                <span>Ngành: {application.industry ?? "Chưa cập nhật"}</span>
                <span>MST: {application.taxCode ?? "Chưa cập nhật"}</span>
                <span>Tài liệu: {application.legalDocumentUrls.length}</span>
              </div>
              {latestPayment && latestPayment.status !== "PAID" ? (
                <Button asChild className="mt-4 bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90">
                  <a href={latestPayment.checkoutUrl}>
                    <CreditCard data-icon="inline-start" />
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
              disabled={
                createMutation.isPending ||
                uploadDocumentMutation.isPending ||
                uploadLogoMutation.isPending
              }
              className="bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90"
            >
              {createMutation.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
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
