import { useMemo, useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useLocation, useNavigate, Link } from "@tanstack/react-router";
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
import { Skeleton } from "@07nghiep/ui/components/skeleton";

import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/users/")({
  component: UsersRoute,
});

type UserStatus = "ACTIVE" | "SUSPENDED";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYER" | "CANDIDATE";
  status: UserStatus;
  joined: string | Date;
};

function UsersRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(() => {
    const s = new URLSearchParams(location.search);
    return {
      page: Number(s.get("page") ?? "1"),
      limit: Number(s.get("limit") ?? "20"),
      search: s.get("search") ?? "",
      role: s.get("role") ?? "ALL",
      status: s.get("status") ?? "ALL",
      sortBy: s.get("sortBy") ?? "createdAt",
      order: s.get("order") ?? "desc",
    };
  }, [location.search]);

  const [searchInput, setSearchInput] = useState(searchParams.search);
  const [debouncedInput, setDebouncedInput] = useState(searchParams.search);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = setTimeout(() => setDebouncedInput(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const suggestionsQuery = useQuery({
    ...trpc.admin.users.suggestions.queryOptions({ q: debouncedInput }),
    enabled: debouncedInput.length >= 2 && showSuggestions,
  });

  const query = useQuery(
    trpc.admin.users.list.queryOptions({
      // trpc.admin.user.getUsers.queryOptions({
      page: searchParams.page,
      limit: searchParams.limit,
      search: searchParams.search || undefined,
      role:
        searchParams.role === "ALL"
          ? undefined
          : (searchParams.role as "ADMIN" | "EMPLOYER" | "CANDIDATE"),
      status: searchParams.status === "ALL" ? undefined : (searchParams.status as UserStatus),
      sortBy: (searchParams.sortBy as "createdAt" | "name" | "email") ?? "createdAt",
      order: (searchParams.order as "asc" | "desc") ?? "desc",
    }),
  );

  const updateStatusMutation = useMutation(trpc.admin.users.updateStatus.mutationOptions());

  const rows = (query.data?.data ?? []) as UserRow[];
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function pushSearch(
    next: Partial<{
      page: number;
      limit: number;
      search: string;
      role: string;
      status: string;
      sortBy: string;
      order: string;
    }>,
  ) {
    const s = new URLSearchParams(location.search);

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === null || value === "" || value === "ALL") {
        s.delete(key);
      } else {
        s.set(key, String(value));
      }
    }

    const qs = s.toString();
    navigate({ to: `/admin/users/${qs ? `?${qs}` : ""}` });
  }

  async function handleSingleStatus(row: UserRow) {
    try {
      await updateStatusMutation.mutateAsync({
        userIds: [row.id],
        action: row.status === "ACTIVE" ? "suspend" : "activate",
      });
      toast.success(row.status === "ACTIVE" ? "Đã khóa tài khoản" : "Đã kích hoạt tài khoản");
      await queryClient.invalidateQueries({
        queryKey: trpc.admin.users.list.queryOptions({
          // queryKey: trpc.admin.user.getUsers.queryOptions({
          page: searchParams.page,
          limit: searchParams.limit,
        }).queryKey,
      });
      query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái");
    }
  }

  async function handleBulkStatus(action: "suspend" | "activate") {
    if (selectedIds.length === 0) {
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({ userIds: selectedIds, action });
      toast.success(
        action === "suspend"
          ? "Đã khóa các tài khoản đã chọn"
          : "Đã kích hoạt các tài khoản đã chọn",
      );
      setSelected({});
      await queryClient.invalidateQueries({
        queryKey: trpc.admin.users.list.queryOptions({
          // queryKey: trpc.admin.user.getUsers.queryOptions({
          page: searchParams.page,
          limit: searchParams.limit,
        }).queryKey,
      });
      query.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể thực hiện thao tác hàng loạt",
      );
    }
  }

  function exportCsv() {
    if (rows.length === 0) {
      toast.info("Không có dữ liệu để xuất CSV");
      return;
    }

    const csvHeader = ["id", "name", "email", "role", "status", "joined"].join(",") + "\n";
    const csvRows = rows
      .map((row) =>
        [
          row.id,
          row.name,
          row.email,
          row.role,
          row.status,
          new Date(row.joined).toISOString(),
        ].join(","),
      )
      .join("\n");

    const blob = new Blob([csvHeader + csvRows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `users-page-${searchParams.page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const allSelected = rows.length > 0 && rows.every((row) => selected[row.id]);

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Quản lý Người dùng</CardTitle>
            <CardDescription>Quản lý tài khoản, vai trò và trạng thái truy cập</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="relative w-full md:w-72">
                  <Input
                    ref={(el) => {
                      inputRef.current = el;
                    }}
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setShowSuggestions(true);
                      setActiveIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (
                          activeIndex >= 0 &&
                          suggestionsQuery.data &&
                          suggestionsQuery.data[activeIndex]
                        ) {
                          const s = suggestionsQuery.data[activeIndex];
                          setSearchInput(s.label);
                          pushSearch({ search: s.label, page: 1 });
                          setShowSuggestions(false);
                          return;
                        }
                        pushSearch({ search: searchInput.trim(), page: 1 });
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const len = suggestionsQuery.data?.length ?? 0;
                        setActiveIndex((i) => Math.min(len - 1, i + 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.max(-1, i - 1));
                      } else if (e.key === "Escape") {
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Tìm kiếm theo tên hoặc email"
                    className="w-full"
                  />

                  {showSuggestions && suggestionsQuery.data && suggestionsQuery.data.length > 0 ? (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-background shadow-md">
                      {suggestionsQuery.data.map((s, idx) => (
                        <button
                          type="button"
                          key={s.id}
                          className={`block w-full px-3 py-2 text-left hover:bg-muted/30 ${idx === activeIndex ? "bg-muted/30" : ""}`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseLeave={() => setActiveIndex(-1)}
                          onClick={() => {
                            setSearchInput(s.label);
                            pushSearch({ search: s.label, page: 1 });
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="font-medium">{s.label}</div>
                          <div className="text-muted-foreground text-xs">{s.email}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <Select
                  value={searchParams.role}
                  onValueChange={(value) => pushSearch({ role: value ?? "ALL", page: 1 })}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Lọc vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả vai trò</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="EMPLOYER">EMPLOYER</SelectItem>
                    <SelectItem value="CANDIDATE">CANDIDATE</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={searchParams.status}
                  onValueChange={(value) => pushSearch({ status: value ?? "ALL", page: 1 })}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Lọc trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={searchParams.sortBy}
                  onValueChange={(value) => pushSearch({ sortBy: value ?? "createdAt", page: 1 })}
                >
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Ngày tạo</SelectItem>
                    <SelectItem value="name">Tên</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={searchParams.order}
                  onValueChange={(value) => pushSearch({ order: value ?? "desc", page: 1 })}
                >
                  <SelectTrigger className="w-full md:w-36">
                    <SelectValue placeholder="Thứ tự" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Tăng dần</SelectItem>
                    <SelectItem value="desc">Giảm dần</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={exportCsv}>
                Xuất CSV
              </Button>
            </div>

            {selectedIds.length > 0 ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span>{selectedIds.length} người dùng đã chọn</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkStatus("suspend")}>
                    Khóa hàng loạt
                  </Button>
                  <Button size="sm" onClick={() => handleBulkStatus("activate")}>
                    Kích hoạt hàng loạt
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-md border">
              {query.isLoading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Không có người dùng phù hợp.
                </div>
              ) : (
                <table className="w-full min-w-215 border-collapse text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="p-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const next: Record<string, boolean> = {};
                              for (const row of rows) {
                                next[row.id] = true;
                              }
                              setSelected(next);
                              return;
                            }
                            setSelected({});
                          }}
                          aria-label="select-all"
                        />
                      </th>
                      <th className="p-3">Tên / Email</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Ngày tham gia</th>
                      <th className="p-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-3 align-top">
                          <input
                            type="checkbox"
                            checked={Boolean(selected[row.id])}
                            onChange={(e) => {
                              setSelected((prev) => ({
                                ...prev,
                                [row.id]: e.target.checked,
                              }));
                            }}
                            aria-label={`select-${row.id}`}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-muted-foreground">{row.email}</div>
                        </td>
                        <td className="p-3 align-top">
                          <Badge
                            variant={
                              row.role === "ADMIN"
                                ? "destructive"
                                : row.role === "EMPLOYER"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {row.role}
                          </Badge>
                        </td>
                        <td className="p-3 align-top">
                          <Badge variant={row.status === "ACTIVE" ? "default" : "outline"}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-3 align-top">
                          {new Date(row.joined).toLocaleDateString()}
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex items-center gap-2">
                            <Link
                              to="/admin/users/$userId"
                              params={{ userId: row.id }}
                              className="text-primary underline font-medium hover:text-primary/80"
                            >
                              Xem
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSingleStatus(row)}
                              disabled={updateStatusMutation.isPending}
                            >
                              {row.status === "ACTIVE" ? "Khóa" : "Kích hoạt"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                Tổng: {query.data?.total ?? 0} người dùng
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => pushSearch({ page: Math.max(1, searchParams.page - 1) })}
                  disabled={searchParams.page <= 1}
                >
                  Trước
                </Button>
                <span>
                  Trang {searchParams.page} / {query.data?.totalPages ?? 1}
                </span>
                <Button
                  variant="outline"
                  onClick={() => pushSearch({ page: searchParams.page + 1 })}
                  disabled={searchParams.page >= (query.data?.totalPages ?? 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default UsersRoute;
