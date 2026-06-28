import type { CompanySize } from "@07nghiep/db";
import { Button } from "@07nghiep/ui/components/button";
import { Card } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";
import { Textarea } from "@07nghiep/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Building, Calendar, Globe, Image as ImageIcon, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { authorizedRoles } from "@/lib/role-guard";
import { trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/settings/organization")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) redirect({ to: "/login", throw: true });
    const role = (session.data?.user as { role?: string }).role ?? "CANDIDATE";
    if (!authorizedRoles(role)) {
      await authClient.signOut();
      redirect({ to: "/login", throw: true });
    }
    return { session };
  },
  component: OrganizationSettingsPage,
});

const COMPANY_SIZES = [
  { value: "STARTUP", label: "Startup (1-10 nhân viên)" },
  { value: "SMALL", label: "Nhỏ (11-50 nhân viên)" },
  { value: "MEDIUM", label: "Vừa (51-200 nhân viên)" },
  { value: "LARGE", label: "Lớn (201-1000 nhân viên)" },
  { value: "ENTERPRISE", label: "Tập đoàn (>1000 nhân viên)" },
] as const;

type ErrorWithTRPCCode = {
  data?: {
    code?: string;
  };
};

type OrganizationFormPayload = {
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  companySize?: CompanySize;
  foundedYear?: number;
  location?: string;
  logoUrl?: string;
};

function isCompanySize(value: string): value is CompanySize {
  return COMPANY_SIZES.some((size) => size.value === value);
}

function OrganizationSettingsPage() {
  const queryClient = useQueryClient();
  const orgQuery = useQuery({
    ...trpc.organization.getMyOrganization.queryOptions(),
    retry: false, // Don't retry on 404
  });

  const isNotFound =
    orgQuery.isError && (orgQuery.error as unknown as ErrorWithTRPCCode).data?.code === "NOT_FOUND";
  const isLoading = orgQuery.isLoading;
  const isEditing = !isNotFound && !!orgQuery.data;

  const createMutation = useMutation({
    mutationFn: (input: OrganizationFormPayload) => trpcClient.organization.create.mutate(input),
    onSuccess: () => {
      toast.success("Tạo thông tin tổ chức thành công!");
      queryClient.invalidateQueries(trpc.organization.getMyOrganization.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: OrganizationFormPayload) => trpcClient.organization.update.mutate(input),
    onSuccess: () => {
      toast.success("Cập nhật thông tin tổ chức thành công!");
      queryClient.invalidateQueries(trpc.organization.getMyOrganization.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm({
    defaultValues: {
      name: orgQuery.data?.name || "",
      description: orgQuery.data?.description || "",
      website: orgQuery.data?.website || "",
      industry: orgQuery.data?.industry || "",
      companySize: (orgQuery.data?.companySize as string) || "",
      foundedYear: orgQuery.data?.foundedYear?.toString() || "",
      location: orgQuery.data?.location || "",
      logoUrl: orgQuery.data?.logoUrl || "",
    },
    onSubmit: async ({ value }) => {
      const payload = {
        name: value.name,
        description: value.description || undefined,
        website: value.website || undefined,
        industry: value.industry || undefined,
        companySize: isCompanySize(value.companySize) ? value.companySize : undefined,
        foundedYear: value.foundedYear ? parseInt(value.foundedYear, 10) : undefined,
        location: value.location || undefined,
        logoUrl: value.logoUrl || undefined,
      };

      if (isEditing) {
        updateMutation.mutate(payload);
      } else {
        createMutation.mutate(payload);
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Tên công ty phải có ít nhất 2 ký tự"),
        description: z.string(),
        website: z.union([z.literal(""), z.string().url("Trang web không hợp lệ")]),
        industry: z.string(),
        companySize: z.string(),
        foundedYear: z.union([
          z.literal(""),
          z
            .string()
            .regex(/^\d{4}$/, "Năm phải có 4 chữ số")
            .refine(
              (v) => !v || (parseInt(v, 10) >= 1800 && parseInt(v, 10) <= new Date().getFullYear()),
              "Năm thành lập không hợp lệ",
            ),
        ]),
        location: z.string(),
        logoUrl: z.union([z.literal(""), z.string().url("URL không hợp lệ")]),
      }),
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto max-w-4xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Hồ sơ công ty</h1>
        <p className="text-muted-foreground mt-2">
          {isEditing
            ? "Quản lý thông tin công ty của bạn để thu hút ứng viên."
            : "Tạo hồ sơ công ty để bắt đầu đăng tin tuyển dụng."}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
          <Card className="p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Thông tin cơ bản
            </h2>
            <div className="space-y-5">
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Tên công ty <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      placeholder="VD: Công ty TNHH ABC"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={field.state.meta.errors.length ? "border-destructive" : ""}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-sm text-destructive">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Mô tả công ty</Label>
                    <Textarea
                      id={field.name}
                      placeholder="Giới thiệu về công ty, môi trường làm việc, văn hoá..."
                      className={`min-h-[150px] ${
                        field.state.meta.errors.length ? "border-destructive" : ""
                      }`}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-sm text-destructive">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <form.Field name="industry">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Ngành nghề chính</Label>
                      <Input
                        id={field.name}
                        placeholder="VD: Công nghệ thông tin, Bán lẻ..."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="companySize">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Quy mô nhân sự</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => field.handleChange(val ?? "")}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Chọn quy mô" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
          </Card>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Liên hệ & Mạng xã hội
              </h2>
              <div className="space-y-4">
                <form.Field name="website">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className="flex items-center gap-2">
                        Trang web
                      </Label>
                      <Input
                        id={field.name}
                        placeholder="https://example.com"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className={field.state.meta.errors.length ? "border-destructive" : ""}
                      />
                      {field.state.meta.errors.map((error) => (
                        <p key={error?.message} className="text-sm text-destructive">
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>

                <form.Field name="location">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        Trụ sở chính
                      </Label>
                      <Input
                        id={field.name}
                        placeholder="Địa chỉ công ty"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="foundedYear">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Năm thành lập
                      </Label>
                      <Input
                        id={field.name}
                        placeholder="VD: 2020"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className={field.state.meta.errors.length ? "border-destructive" : ""}
                      />
                      {field.state.meta.errors.map((error) => (
                        <p key={error?.message} className="text-sm text-destructive">
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Logo công ty
              </h2>
              <form.Field name="logoUrl">
                {(field) => (
                  <div className="space-y-4">
                    {field.state.value ? (
                      <div className="flex justify-center">
                        <img
                          src={field.state.value}
                          alt="Xem trước logo công ty"
                          className="h-24 w-24 object-contain rounded-md border p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/150?text=L%E1%BB%97i+Logo";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-md border border-dashed bg-muted">
                        <Building className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Đường dẫn logo</Label>
                      <Input
                        id={field.name}
                        placeholder="https://..."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className={field.state.meta.errors.length ? "border-destructive" : ""}
                      />
                      {field.state.meta.errors.map((error) => (
                        <p key={error?.message} className="text-sm text-destructive">
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </form.Field>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isDirty: state.isDirty,
            })}
          >
            {({ canSubmit }) => (
              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit || isSubmitting}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Hoàn tất tạo hồ sơ"}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
