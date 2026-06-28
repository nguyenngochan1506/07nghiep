import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@07nghiep/ui/components/alert-dialog";
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
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@07nghiep/ui/components/tabs";
import { Textarea } from "@07nghiep/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCog,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/users/$userId")({
  component: AdminUserDetailPage,
});

const adminNoteSchema = z.object({
  content: z.string().trim().min(1, "Ghi chú không được để trống").max(2000, "Tối đa 2000 ký tự"),
});

type AdminNoteFormValues = z.infer<typeof adminNoteSchema>;

type UserRole = "ADMIN" | "EMPLOYER" | "CANDIDATE";

function pickRandom(characters: string): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return characters[random[0] % characters.length];
}

function generateQuickPassword(): string {
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const allCharacters = lowercase + uppercase + digits + symbols;
  const password = [
    pickRandom(lowercase),
    pickRandom(uppercase),
    pickRandom(digits),
    pickRandom(symbols),
    ...Array.from({ length: 10 }, () => pickRandom(allCharacters)),
  ];

  for (let index = password.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const swapIndex = random[0] % (index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join("");
}

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const detailQuery = useQuery(trpc.admin.users.getDetail.queryOptions({ id: userId }));
  const updateRoleMutation = useMutation(trpc.admin.users.updateRole.mutationOptions());
  const updateStatusMutation = useMutation(trpc.admin.users.updateStatus.mutationOptions());
  const resetPasswordMutation = useMutation(trpc.admin.users.resetPassword.mutationOptions());
  const deleteUserMutation = useMutation(trpc.admin.users.deleteUser.mutationOptions());
  const addAdminNoteMutation = useMutation(trpc.admin.users.addAdminNote.mutationOptions());

  const form = useForm<AdminNoteFormValues>({
    resolver: zodResolver(adminNoteSchema),
    defaultValues: {
      content: "",
    },
  });

  const user = detailQuery.data?.user;
  const timeline = detailQuery.data?.activity.timeline ?? [];
  const notes = detailQuery.data?.adminNotes ?? [];
  const roleHistory = detailQuery.data?.roleHistory ?? [];
  const status = detailQuery.data?.status ?? "SUSPENDED";

  const roleBadgeVariant = useMemo(() => {
    if (!user?.role) {
      return "secondary" as const;
    }
    if (user.role === "ADMIN") {
      return "destructive" as const;
    }
    if (user.role === "EMPLOYER") {
      return "default" as const;
    }
    return "secondary" as const;
  }, [user?.role]);

  const formatRole = (role?: string | null) => {
    if (!role) {
      return "Unknown";
    }
    return `${role.charAt(0)}${role.slice(1).toLowerCase()}`;
  };

  const onChangeRole = async (value: UserRole | null) => {
    if (!user) {
      return;
    }

    if (!value) {
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        userId: user.id,
        role: value,
      });
      toast.success("Đã cập nhật vai trò");
      await detailQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật vai trò");
    }
  };

  const onToggleStatus = async () => {
    if (!user) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        userIds: [user.id],
        action: status === "ACTIVE" ? "suspend" : "activate",
      });
      toast.success(status === "ACTIVE" ? "Đã khóa tài khoản" : "Đã kích hoạt tài khoản");
      await detailQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái");
    }
  };

  const onResetPassword = async () => {
    if (!user) {
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ userId: user.id, password: newPassword });
      toast.success("Đã đặt mật khẩu mới", {
        description: "Tất cả phiên đăng nhập hiện tại của người dùng đã bị thu hồi.",
      });
      setResetPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể reset mật khẩu");
    }
  };

  const onCopyPassword = async () => {
    if (!newPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success("Đã sao chép mật khẩu");
    } catch {
      toast.error("Không thể sao chép mật khẩu");
    }
  };

  const onDeleteUser = async () => {
    if (!user) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync({ userId: user.id });
      toast.success("Đã xóa tài khoản");
      navigate({ to: "/admin/users" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa tài khoản");
    }
  };

  const onSubmitNote = form.handleSubmit(async (values) => {
    if (!user) {
      return;
    }

    try {
      await addAdminNoteMutation.mutateAsync({
        userId: user.id,
        content: values.content,
      });
      form.reset({ content: "" });
      toast.success("Đã lưu ghi chú");
      await detailQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu ghi chú");
    }
  });

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-7xl gap-6 p-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-44" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || detailQuery.error) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 p-10 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <h2 className="text-xl font-semibold">Không tìm thấy người dùng</h2>
        <p className="text-sm text-muted-foreground">
          Người dùng có thể đã bị xóa hoặc bạn không có quyền xem thông tin này.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/admin/users" })}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 pt-6">
        <Button variant="outline" onClick={() => navigate({ to: "/admin/users" })}>
          Quay lại danh sách
        </Button>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 p-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
              <CardDescription>Tổng quan tài khoản người dùng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-16 border">
                  <AvatarImage src={user.image ?? undefined} alt={user.name || user.email} />
                  <AvatarFallback>
                    {(user.name || user.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <Badge variant={roleBadgeVariant}>{user.role}</Badge>
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 text-foreground">
                  <CalendarDays className="size-4" />
                  <span className="font-medium">Ngày tham gia</span>
                </div>
                <p>{new Date(user.createdAt).toLocaleString()}</p>
                <p className="mt-1">
                  Trạng thái: <span className="font-medium text-foreground">{status}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Điều khiển vai trò và trạng thái tài khoản</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium">Thay đổi vai trò</p>
                <Select value={user.role} onValueChange={onChangeRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="EMPLOYER">EMPLOYER</SelectItem>
                    <SelectItem value="CANDIDATE">CANDIDATE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full justify-start"
                variant={status === "ACTIVE" ? "outline" : "default"}
                onClick={onToggleStatus}
                disabled={updateStatusMutation.isPending}
              >
                <UserCog className="mr-2" />
                {status === "ACTIVE" ? "Khóa tài khoản" : "Kích hoạt tài khoản"}
              </Button>

              <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setResetPasswordDialogOpen(true)}
                  disabled={resetPasswordMutation.isPending}
                >
                  <KeyRound className="mr-2" />
                  Reset Mật khẩu
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Đặt mật khẩu mới</DialogTitle>
                    <DialogDescription>
                      Admin có thể nhập mật khẩu trực tiếp hoặc tạo nhanh một mật khẩu mạnh cho
                      người dùng này.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="admin-reset-password">Mật khẩu mới</Label>
                      <Input
                        id="admin-reset-password"
                        type="text"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="Nhập mật khẩu mới"
                      />
                      <p className="text-xs text-muted-foreground">
                        Tối thiểu 8 ký tự. Sau khi lưu, user sẽ phải đăng nhập lại.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewPassword(generateQuickPassword())}
                      >
                        <RefreshCw className="mr-2" />
                        Gen mật khẩu
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onCopyPassword}
                        disabled={!newPassword}
                      >
                        <Copy className="mr-2" />
                        Sao chép
                      </Button>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setResetPasswordDialogOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      onClick={onResetPassword}
                      disabled={resetPasswordMutation.isPending || newPassword.length < 8}
                    >
                      Lưu mật khẩu
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button className="w-full justify-start" variant="destructive" />}
                >
                  <Trash2 className="mr-2" />
                  Xóa tài khoản
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa tài khoản?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Hành động này không thể hoàn tác. Toàn bộ dữ liệu liên quan tới người dùng sẽ
                      bị xóa.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={onDeleteUser}
                      disabled={deleteUserMutation.isPending}
                    >
                      Xác nhận xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </aside>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chi tiết</CardTitle>
              <CardDescription>Lịch sử hoạt động và ghi chú nội bộ</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="activity" className="w-full">
                <TabsList variant="line" className="mb-4">
                  <TabsTrigger value="activity">Lịch sử hoạt động</TabsTrigger>
                  <TabsTrigger value="notes">Ghi chú Admin</TabsTrigger>
                  <TabsTrigger value="roles">Lịch sử vai trò</TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="space-y-3">
                  {timeline.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Chưa có dữ liệu hoạt động.
                    </div>
                  ) : (
                    timeline.map((item) => (
                      <div
                        key={`${item.type}-${item.occurredAt}`}
                        className="rounded-md border p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.occurredAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{item.label}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <form className="space-y-3" onSubmit={onSubmitNote}>
                    <Textarea
                      rows={5}
                      placeholder="Nhập ghi chú nội bộ cho người dùng này..."
                      {...form.register("content")}
                    />
                    {form.formState.errors.content ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.content.message}
                      </p>
                    ) : null}
                    <div className="flex justify-end">
                      <Button type="submit" disabled={addAdminNoteMutation.isPending}>
                        Lưu ghi chú
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Chưa có ghi chú nội bộ.
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="rounded-md border bg-muted/20 p-3">
                          <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {note.createdAt ? new Date(note.createdAt).toLocaleString() : "N/A"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="roles" className="space-y-3">
                  {roleHistory.length > 0 ? (
                    roleHistory.map((r) => (
                      <div key={r.id} className="rounded-md border p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Badge variant="outline">ROLE_CHANGE</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">
                          {r.adminId ? "Bởi admin: " : ""}
                          <strong>{formatRole(r.previousRole ?? "UNKNOWN")}</strong> →{" "}
                          <strong>{formatRole(r.newRole ?? "UNKNOWN")}</strong>
                        </p>
                        {r.note ? (
                          <p className="mt-2 text-sm text-muted-foreground">{r.note}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Chưa có lịch sử thay đổi vai trò.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
