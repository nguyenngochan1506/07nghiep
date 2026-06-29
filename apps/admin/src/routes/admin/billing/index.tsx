import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Pencil, ReceiptText, Save, TicketPercent } from "lucide-react";
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
import { Checkbox } from "@07nghiep/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@07nghiep/ui/components/dialog";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
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

export const Route = createFileRoute("/admin/billing/")({
  component: AdminBillingRoute,
});

type BillingPlanRow = {
  id: string;
  code: "CANDIDATE_PLUS_MONTHLY" | "CANDIDATE_AI_CV_CREDITS" | "EMPLOYER_MONTHLY";
  name: string;
  priceVnd: number;
  durationDays: number;
  active: boolean;
};

type VoucherRow = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountVnd: number | null;
  startsAt: string | Date | null;
  expiresAt: string | Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  active: boolean;
  plans: { plan: { id: string; code: string; name: string } }[];
  _count: { redemptions: number };
};

type VoucherFormState = {
  code: string;
  description: string;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: string;
  maxDiscountVnd: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  perUserLimit: string;
  planIds: string[];
};

const emptyVoucherForm: VoucherFormState = {
  code: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "",
  maxDiscountVnd: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perUserLimit: "",
  planIds: [],
};

function formatVnd(value: number) {
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function formatDateTime(value: string | Date | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN");
}

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : undefined;
}

function optionalDate(value: string) {
  return value ? new Date(value) : undefined;
}

function toDateTimeLocalValue(value: string | Date | null) {
  if (!value) return "";

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toVoucherForm(voucher: VoucherRow): VoucherFormState {
  return {
    code: voucher.code,
    description: voucher.description ?? "",
    discountType: voucher.discountType,
    discountValue: String(voucher.discountValue),
    maxDiscountVnd: voucher.maxDiscountVnd === null ? "" : String(voucher.maxDiscountVnd),
    startsAt: toDateTimeLocalValue(voucher.startsAt),
    expiresAt: toDateTimeLocalValue(voucher.expiresAt),
    usageLimit: voucher.usageLimit === null ? "" : String(voucher.usageLimit),
    perUserLimit: voucher.perUserLimit === null ? "" : String(voucher.perUserLimit),
    planIds: voucher.plans.map(({ plan }) => plan.id),
  };
}

function toVoucherMutationInput(form: VoucherFormState) {
  return {
    code: form.code,
    description: form.description.trim() || undefined,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    maxDiscountVnd: optionalNumber(form.maxDiscountVnd),
    startsAt: optionalDate(form.startsAt),
    expiresAt: optionalDate(form.expiresAt),
    usageLimit: optionalNumber(form.usageLimit),
    perUserLimit: optionalNumber(form.perUserLimit),
    planIds: form.planIds,
  };
}

function VoucherField({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function VoucherFormFields({
  form,
  setForm,
  plans,
}: {
  form: VoucherFormState;
  setForm: Dispatch<SetStateAction<VoucherFormState>>;
  plans: BillingPlanRow[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <VoucherField label="Mã voucher">
          <Input
            value={form.code}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))
            }
            placeholder="VD: TUITENHAN"
            className="bg-background"
          />
        </VoucherField>
        <VoucherField label="Mô tả nội bộ">
          <Input
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Ghi chú ngắn"
            className="bg-background"
          />
        </VoucherField>
        <VoucherField label="Kiểu giảm">
          <Select
            value={form.discountType}
            onValueChange={(value) =>
              setForm((current) => ({
                ...current,
                discountType: value as VoucherFormState["discountType"],
                maxDiscountVnd: value === "FIXED_AMOUNT" ? "" : current.maxDiscountVnd,
              }))
            }
          >
            <SelectTrigger className="h-10 w-full rounded-md bg-background px-3 text-sm">
              <SelectValue placeholder="Chọn kiểu giảm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">Giảm theo %</SelectItem>
              <SelectItem value="FIXED_AMOUNT">Giảm số tiền</SelectItem>
            </SelectContent>
          </Select>
        </VoucherField>
        <VoucherField
          label={form.discountType === "PERCENT" ? "Phần trăm giảm" : "Số tiền giảm"}
          hint={form.discountType === "PERCENT" ? "Nhập 100 để miễn phí." : undefined}
        >
          <Input
            inputMode="numeric"
            value={form.discountValue}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                discountValue: event.target.value.replace(/\D/g, ""),
              }))
            }
            placeholder={form.discountType === "PERCENT" ? "VD: 100" : "VD: 50000"}
            className="bg-background"
          />
        </VoucherField>
        {form.discountType === "PERCENT" ? (
          <VoucherField label="Trần giảm" hint="Bỏ trống nếu không giới hạn.">
            <Input
              inputMode="numeric"
              value={form.maxDiscountVnd}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maxDiscountVnd: event.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="VND"
              className="bg-background"
            />
          </VoucherField>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <VoucherField label="Bắt đầu">
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              className="bg-background"
            />
          </VoucherField>
          <VoucherField label="Kết thúc">
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, expiresAt: event.target.value }))
              }
              className="bg-background"
            />
          </VoucherField>
          <VoucherField label="Tổng lượt">
            <Input
              inputMode="numeric"
              value={form.usageLimit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  usageLimit: event.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="Không giới hạn"
              className="bg-background"
            />
          </VoucherField>
          <VoucherField label="Lượt mỗi user">
            <Input
              inputMode="numeric"
              value={form.perUserLimit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  perUserLimit: event.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="Không giới hạn"
              className="bg-background"
            />
          </VoucherField>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Gói áp dụng</Label>
          <div className="grid gap-2">
            {plans.map((plan) => {
              const checked = form.planIds.includes(plan.id);

              return (
                <Label
                  key={plan.id}
                  className={`min-h-11 cursor-pointer rounded-lg border bg-background px-3 py-2 text-sm transition-colors ${
                    checked ? "border-primary/60 bg-primary/5 text-primary" : ""
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) =>
                      setForm((current) => ({
                        ...current,
                        planIds: nextChecked
                          ? Array.from(new Set([...current.planIds, plan.id]))
                          : current.planIds.filter((planId) => planId !== plan.id),
                      }))
                    }
                  />
                  <span>{plan.name}</span>
                </Label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminBillingRoute() {
  const queryOptions = trpc.admin.billing.plans.queryOptions();
  const query = useQuery(queryOptions);
  const voucherQueryOptions = trpc.admin.billing.vouchers.queryOptions();
  const vouchersQuery = useQuery(voucherQueryOptions);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [voucherForm, setVoucherForm] = useState<VoucherFormState>(emptyVoucherForm);
  const [editingVoucher, setEditingVoucher] = useState<VoucherRow | null>(null);
  const [editVoucherForm, setEditVoucherForm] = useState<VoucherFormState>(emptyVoucherForm);

  useEffect(() => {
    const nextPrices = Object.fromEntries(
      ((query.data ?? []) as BillingPlanRow[]).map((plan) => [plan.id, String(plan.priceVnd)]),
    );
    setPrices(nextPrices);
  }, [query.data]);

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; priceVnd: number }) =>
      trpcClient.admin.billing.updatePlanPrice.mutate(input),
    onSuccess: () => {
      toast.success("Đã cập nhật giá gói");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const createVoucherMutation = useMutation({
    mutationFn: () =>
      trpcClient.admin.billing.createVoucher.mutate({
        ...toVoucherMutationInput(voucherForm),
      }),
    onSuccess: () => {
      toast.success("Đã tạo voucher");
      setVoucherForm(emptyVoucherForm);
      queryClient.invalidateQueries({ queryKey: voucherQueryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateVoucherMutation = useMutation({
    mutationFn: () => {
      if (!editingVoucher) {
        throw new Error("Không tìm thấy voucher cần sửa");
      }

      return trpcClient.admin.billing.updateVoucher.mutate({
        id: editingVoucher.id,
        ...toVoucherMutationInput(editVoucherForm),
      });
    },
    onSuccess: () => {
      toast.success("Đã cập nhật voucher");
      setEditingVoucher(null);
      setEditVoucherForm(emptyVoucherForm);
      queryClient.invalidateQueries({ queryKey: voucherQueryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateVoucherStatusMutation = useMutation({
    mutationFn: (input: { id: string; active: boolean }) =>
      trpcClient.admin.billing.updateVoucherStatus.mutate(input),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái voucher");
      queryClient.invalidateQueries({ queryKey: voucherQueryOptions.queryKey });
    },
    onError: (error) => toast.error(error.message),
  });

  const plans = (query.data ?? []) as BillingPlanRow[];
  const vouchers = (vouchersQuery.data ?? []) as VoucherRow[];

  function openEditVoucher(voucher: VoucherRow) {
    setEditingVoucher(voucher);
    setEditVoucherForm(toVoucherForm(voucher));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Cấu hình gói thanh toán
            </CardTitle>
            <CardDescription>
              Admin có thể linh động điều chỉnh giá trước khi tạo giao dịch mới.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/billing/payments">
              <ReceiptText className="h-4 w-4" />
              Giao dịch
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gói</TableHead>
                <TableHead>Chu kỳ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Giá hiện tại</TableHead>
                <TableHead className="w-64">Giá mới</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Chưa có gói thanh toán. Hãy chạy seed billing plans.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const priceValue = Number(prices[plan.id] ?? plan.priceVnd);
                  const unchanged = priceValue === plan.priceVnd;

                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-xs text-muted-foreground">{plan.code}</div>
                      </TableCell>
                      <TableCell>{plan.durationDays} ngày</TableCell>
                      <TableCell>
                        <Badge variant={plan.active ? "default" : "secondary"}>
                          {plan.active ? "Đang bán" : "Tạm dừng"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatVnd(plan.priceVnd)}</TableCell>
                      <TableCell>
                        <Input
                          inputMode="numeric"
                          value={prices[plan.id] ?? ""}
                          onChange={(event) =>
                            setPrices((current) => ({
                              ...current,
                              [plan.id]: event.target.value.replace(/\D/g, ""),
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateMutation.mutate({ id: plan.id, priceVnd: priceValue })
                          }
                          disabled={
                            updateMutation.isPending || unchanged || Number.isNaN(priceValue)
                          }
                        >
                          <Save className="h-4 w-4" />
                          Lưu
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-primary" />
            Voucher giảm giá
          </CardTitle>
          <CardDescription>Tạo mã voucher và chọn các gói thanh toán được áp dụng.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="mx-auto w-full max-w-5xl rounded-xl border bg-surface-wash/70 p-4">
            <VoucherFormFields form={voucherForm} setForm={setVoucherForm} plans={plans} />

            <div className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mã sẽ chỉ dùng được cho các gói đã chọn.
              </p>
              <Button
                className="sm:min-w-36"
                onClick={() => createVoucherMutation.mutate()}
                disabled={
                  createVoucherMutation.isPending ||
                  !voucherForm.code.trim() ||
                  !voucherForm.discountValue ||
                  voucherForm.planIds.length === 0
                }
              >
                Tạo voucher
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Giảm</TableHead>
                <TableHead>Gói áp dụng</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Lượt dùng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                    Đang tải voucher...
                  </TableCell>
                </TableRow>
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                    Chưa có voucher giảm giá.
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      <div className="font-medium">{voucher.code}</div>
                      <div className="text-xs text-muted-foreground">{voucher.description}</div>
                    </TableCell>
                    <TableCell>
                      {voucher.discountType === "PERCENT"
                        ? `${voucher.discountValue}%`
                        : formatVnd(voucher.discountValue)}
                      {voucher.maxDiscountVnd ? (
                        <div className="text-xs text-muted-foreground">
                          Tối đa {formatVnd(voucher.maxDiscountVnd)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {voucher.plans.map(({ plan }) => (
                          <Badge key={plan.id} variant="secondary">
                            {plan.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{formatDateTime(voucher.startsAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        đến {formatDateTime(voucher.expiresAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {voucher._count.redemptions}
                      {voucher.usageLimit ? `/${voucher.usageLimit}` : ""}
                      {voucher.perUserLimit ? (
                        <div className="text-xs text-muted-foreground">
                          {voucher.perUserLimit} lượt/user
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={voucher.active ? "default" : "secondary"}>
                        {voucher.active ? "Đang bật" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditVoucher(voucher)}>
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateVoucherStatusMutation.isPending}
                          onClick={() =>
                            updateVoucherStatusMutation.mutate({
                              id: voucher.id,
                              active: !voucher.active,
                            })
                          }
                        >
                          {voucher.active ? "Tắt" : "Bật"}
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

      <Dialog
        open={Boolean(editingVoucher)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVoucher(null);
            setEditVoucherForm(emptyVoucherForm);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Sửa voucher</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin mã và các gói thanh toán được áp dụng.
            </DialogDescription>
          </DialogHeader>

          <VoucherFormFields form={editVoucherForm} setForm={setEditVoucherForm} plans={plans} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingVoucher(null);
                setEditVoucherForm(emptyVoucherForm);
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={
                updateVoucherMutation.isPending ||
                !editVoucherForm.code.trim() ||
                !editVoucherForm.discountValue ||
                editVoucherForm.planIds.length === 0
              }
              onClick={() => updateVoucherMutation.mutate()}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
