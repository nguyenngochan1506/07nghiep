import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import {
  CalendarDays,
  Clock,
  MapPin,
  Link,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/interviews")({
  component: EmployerInterviewsPage,
});

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Chờ xác nhận", className: "bg-warning/10 text-warning border-warning/20" },
  CONFIRMED: { label: "Đã xác nhận", className: "bg-success/10 text-success border-success/20" },
  COMPLETED: { label: "Đã xong", className: "bg-muted text-muted-foreground border-border" },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const HOUR_HEIGHT = 80;
const START_HOUR = 7;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatDateShort(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDayIndex(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function EmployerInterviewsPage() {
  const queryClient = useQueryClient();
  const { data: interviews, isLoading } = useQuery(trpc.interview.getMyInterviews.queryOptions());

  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();

  // Week view
  const weekStart = getWeekStart(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7),
  );
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Month view
  const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthStart = getMonthStart(monthDate);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const monthStartDay = getDayIndex(monthStart);
  const totalDays = monthEnd.getDate();
  const totalCells = monthStartDay + totalDays;
  const weeks = Math.ceil(totalCells / 7);

  const interviewsByDate = useMemo(() => {
    if (!interviews) return {};
    const map: Record<string, any[]> = {};
    for (const iv of interviews) {
      const d = new Date(iv.scheduledAt).toDateString();
      if (!map[d]) map[d] = [];
      map[d].push(iv);
    }
    return map;
  }, [interviews]);

  const weekInterviews = useMemo(() => {
    if (!interviews) return [];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return (interviews as any[]).filter((iv) => {
      const d = new Date(iv.scheduledAt);
      return d >= weekStart && d < weekEnd;
    });
  }, [interviews, weekStart]);

  const upcoming = useMemo(() => {
    if (!interviews) return [];
    return (interviews as any[]).filter(
      (iv) => iv.status === "SCHEDULED" || iv.status === "CONFIRMED",
    );
  }, [interviews]);

  const past = useMemo(() => {
    if (!interviews) return [];
    return (interviews as any[]).filter(
      (iv) => iv.status === "COMPLETED" || iv.status === "CANCELLED",
    );
  }, [interviews]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lịch phỏng vấn</h1>
        <p className="text-muted-foreground mt-1">Tất cả lịch phỏng vấn với ứng viên</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border bg-muted p-0.5">
          {(["week", "month", "list"] as const).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode(mode)}
            >
              {mode === "week" ? (
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              ) : mode === "month" ? (
                <CalendarDays className="h-3.5 w-3.5 mr-1" />
              ) : (
                <List className="h-3.5 w-3.5 mr-1" />
              )}
              {mode === "week" ? "Tuần" : mode === "month" ? "Tháng" : "Danh sách"}
            </Button>
          ))}
        </div>
      </div>

      {/* ============== WEEK VIEW ============== */}
      {viewMode === "week" && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {weekStart.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                  Hôm nay
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[calc(100vh-220px)] overflow-auto">
              <div className="min-w-[900px]">
                {/* Day Headers */}
                <div className="flex border-b sticky top-0 bg-card z-20">
                  <div className="w-14 shrink-0" />
                  {weekDays.map((day, idx) => {
                    const isToday = day.toDateString() === now.toDateString();
                    return (
                      <div
                        key={idx}
                        className={`flex-1 text-center py-2 border-l ${isToday ? "bg-primary/5" : ""}`}
                      >
                        <p
                          className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {DAY_LABELS[idx]}
                        </p>
                        <p
                          className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}
                        >
                          {day.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Time Grid */}
                <div className="flex relative">
                  <div className="w-14 shrink-0">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: HOUR_HEIGHT }}
                        className="border-b border-border/50 pr-2 relative"
                      >
                        <span className="text-xs text-muted-foreground absolute -top-2.5 right-2 leading-none">
                          {String(hour).padStart(2, "0")}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day, dayIdx) => {
                    const isToday = day.toDateString() === now.toDateString();
                    const dayEvents = weekInterviews.filter(
                      (iv) => getDayIndex(new Date(iv.scheduledAt)) === dayIdx,
                    );

                    return (
                      <div
                        key={dayIdx}
                        className={`flex-1 relative border-l ${isToday ? "bg-primary/[0.02]" : ""}`}
                      >
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            style={{ height: HOUR_HEIGHT }}
                            className="border-b border-border/30"
                          />
                        ))}

                        {isToday && now.getHours() >= START_HOUR && now.getHours() < END_HOUR && (
                          <div
                            className="absolute left-0 right-0 z-20 border-t-2 border-red-500 pointer-events-none"
                            style={{
                              top:
                                (((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60) *
                                HOUR_HEIGHT,
                            }}
                          >
                            <div className="h-2 w-2 rounded-full bg-red-500 -mt-1 -ml-1" />
                          </div>
                        )}

                        {dayEvents.map((iv: any) => {
                          const scheduledDate = new Date(iv.scheduledAt);
                          const startMinutes =
                            (scheduledDate.getHours() - START_HOUR) * 60 +
                            scheduledDate.getMinutes();
                          const top = (startMinutes / 60) * HOUR_HEIGHT;
                          const height = Math.max((iv.durationMinutes / 60) * HOUR_HEIGHT, 28);
                          const candidate = iv.application?.candidate;
                          const job = iv.application?.job;
                          const profile = candidate?.profile;
                          const initials = (candidate?.name || "?")
                            .split(" ")
                            .slice(0, 2)
                            .map((w: string) => w[0] ?? "")
                            .join("")
                            .toUpperCase();
                          const isConfirmed = iv.status === "CONFIRMED";
                          const isScheduled = iv.status === "SCHEDULED";

                          if (top < 0) return null;

                          return (
                            <div
                              key={iv.id}
                              className={`absolute inset-x-1 rounded-md px-2 py-1 overflow-hidden z-10 border text-xs leading-tight cursor-pointer transition-opacity hover:opacity-90 ${
                                isConfirmed
                                  ? "bg-primary/20 text-primary border-primary/40"
                                  : isScheduled
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-muted/50 text-muted-foreground border-border"
                              }`}
                              style={{
                                top,
                                height: Math.min(height, HOUR_HEIGHT * HOURS.length - top),
                              }}
                              title={`${candidate?.name} - ${job?.title}`}
                            >
                              <span className="font-semibold">{formatTime(scheduledDate)}</span>{" "}
                              <span className="truncate">{candidate?.name}</span>
                              {height >= 48 && (
                                <div className="text-[11px] opacity-80 mt-0.5 truncate">
                                  {job?.title}
                                  {iv.location ? ` · ${iv.location}` : ""}
                                </div>
                              )}
                              {height >= 64 && iv.meetingLink && (
                                <div className="text-[11px] opacity-70 mt-0.5 truncate">
                                  {iv.meetingLink}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============== MONTH VIEW ============== */}
      {viewMode === "month" && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                {monthStart.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setMonthOffset((m) => m - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>
                  Hôm nay
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setMonthOffset((m) => m + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
                <div
                  key={label}
                  className="text-center py-2 text-xs font-medium text-muted-foreground border-b"
                >
                  {label}
                </div>
              ))}

              {Array.from({ length: weeks * 7 }, (_, i) => {
                const dayNum = i - monthStartDay + 1;
                const isValid = dayNum >= 1 && dayNum <= totalDays;
                const date = isValid
                  ? new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNum)
                  : null;
                const dateStr = date?.toDateString();
                const dayInterviews = dateStr ? interviewsByDate[dateStr] || [] : [];
                const isToday = date?.toDateString() === now.toDateString();
                const hasConfirmed = dayInterviews.some((iv: any) => iv.status === "CONFIRMED");
                const hasScheduled = dayInterviews.some((iv: any) => iv.status === "SCHEDULED");
                const hasInterviews = dayInterviews.length > 0;

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-b border-r p-1 transition-colors group relative ${
                      !isValid ? "bg-muted/20" : ""
                    } ${
                      isToday
                        ? "bg-primary/5 ring-2 ring-primary ring-inset"
                        : hasConfirmed
                          ? "bg-success/5 border-l-2 border-l-success"
                          : hasScheduled
                            ? "bg-warning/5 border-l-2 border-l-warning"
                            : hasInterviews
                              ? "bg-muted/20"
                              : ""
                    }`}
                  >
                    {/* Hover tooltip */}
                    {hasInterviews && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
                        <div className="bg-card border shadow-lg rounded-lg p-3 min-w-[220px] max-w-[300px] text-left">
                          <p className="text-xs font-semibold text-foreground mb-2">
                            {date!.toLocaleDateString("vi-VN", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </p>
                          <div className="space-y-2">
                            {dayInterviews.map((iv: any) => (
                              <div key={iv.id} className="flex items-start gap-2">
                                <span
                                  className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                                    iv.status === "CONFIRMED"
                                      ? "bg-success"
                                      : iv.status === "SCHEDULED"
                                        ? "bg-warning"
                                        : "bg-muted-foreground"
                                  }`}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {iv.application?.candidate?.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {iv.application?.job?.title}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {formatTime(new Date(iv.scheduledAt))} · {iv.durationMinutes}{" "}
                                    phút
                                  </p>
                                  {iv.location && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {iv.location}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="h-2 w-2 bg-card border-b border-r rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                      </div>
                    )}
                    {isValid && (
                      <>
                        <p
                          className={`text-xs font-semibold mb-0.5 px-0.5 ${
                            isToday
                              ? "text-primary"
                              : hasInterviews
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {dayNum}
                        </p>
                        <div className="space-y-0.5">
                          {dayInterviews.slice(0, 3).map((iv: any) => (
                            <div
                              key={iv.id}
                              className={`text-[10px] rounded px-1 py-0.5 truncate cursor-default ${
                                iv.status === "CONFIRMED"
                                  ? "bg-success/20 text-success"
                                  : iv.status === "SCHEDULED"
                                    ? "bg-warning/20 text-warning"
                                    : "bg-muted/40 text-muted-foreground"
                              }`}
                              title={`${formatTime(new Date(iv.scheduledAt))} - ${iv.application?.candidate?.name} - ${iv.application?.job?.title}`}
                            >
                              {formatTime(new Date(iv.scheduledAt))}{" "}
                              {iv.application?.candidate?.name}
                            </div>
                          ))}
                          {dayInterviews.length > 3 && (
                            <p className="text-[10px] text-muted-foreground px-1">
                              +{dayInterviews.length - 3} thêm
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============== LIST VIEW ============== */}
      {viewMode === "list" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sắp tới</h2>
            {upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.map((iv: any) => {
                  const candidate = iv.application?.candidate;
                  const job = iv.application?.job;
                  const profile = candidate?.profile;
                  const initials = (candidate?.name || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((w: string) => w[0] ?? "")
                    .join("")
                    .toUpperCase();

                  return (
                    <Card key={iv.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile?.avatarUrl || candidate?.image} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{candidate?.name}</h3>
                                <span className="text-sm text-muted-foreground">
                                  cho {job?.title}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {formatDateShort(new Date(iv.scheduledAt))}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTime(new Date(iv.scheduledAt))} · {iv.durationMinutes} phút
                                </span>
                                {iv.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {iv.location}
                                  </span>
                                )}
                              </div>
                              {iv.meetingLink && (
                                <a
                                  href={iv.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  <Link className="h-3.5 w-3.5" />
                                  Link họp
                                </a>
                              )}
                              {iv.notes && (
                                <p className="text-xs text-muted-foreground mt-1 border-t pt-2">
                                  {iv.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={STATUS_CONFIG[iv.status]?.className}>
                            {STATUS_CONFIG[iv.status]?.label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Chưa có lịch phỏng vấn nào sắp tới</p>
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Đã qua</h2>
              <div className="space-y-2">
                {past.map((iv: any) => {
                  const candidate = iv.application?.candidate;
                  const job = iv.application?.job;
                  const initials = (candidate?.name || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((w: string) => w[0] ?? "")
                    .join("")
                    .toUpperCase();
                  return (
                    <Card key={iv.id} className="opacity-70">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {candidate?.name} · {job?.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateShort(new Date(iv.scheduledAt))} ·{" "}
                              {formatTime(new Date(iv.scheduledAt))}
                            </p>
                          </div>
                        </div>
                        <Badge className={STATUS_CONFIG[iv.status]?.className}>
                          {STATUS_CONFIG[iv.status]?.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
