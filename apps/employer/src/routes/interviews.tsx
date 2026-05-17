import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { CalendarDays, Clock, MapPin, Link, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/interviews")({
  component: EmployerInterviewsPage,
});

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Chờ xác nhận", className: "bg-warning/10 text-warning border-warning/20" },
  CONFIRMED: { label: "Đã xác nhận", className: "bg-success/10 text-success border-success/20" },
  COMPLETED: { label: "Đã xong", className: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "Đã hủy", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

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

function EmployerInterviewsPage() {
  const queryClient = useQueryClient();
  const { data: interviews, isLoading } = useQuery(trpc.interview.getMyInterviews.queryOptions());

  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = getWeekStart(new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const interviewsByDay = useMemo(() => {
    if (!interviews) return {};
    const map: Record<string, any[]> = {};
    for (const iv of interviews) {
      const d = new Date(iv.scheduledAt).toDateString();
      if (!map[d]) map[d] = [];
      map[d].push(iv);
    }
    return map;
  }, [interviews]);

  const upcoming = useMemo(() => {
    if (!interviews) return [];
    return (interviews as any[]).filter(
      (iv) => iv.status === "SCHEDULED" || iv.status === "CONFIRMED"
    );
  }, [interviews]);

  const past = useMemo(() => {
    if (!interviews) return [];
    return (interviews as any[]).filter(
      (iv) => iv.status === "COMPLETED" || iv.status === "CANCELLED"
    );
  }, [interviews]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lịch phỏng vấn</h1>
          <p className="text-muted-foreground mt-1">Tất cả lịch phỏng vấn với ứng viên</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Calendar View */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    {weekStart.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                      Hôm nay
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const key = day.toDateString();
                    const dayInterviews = interviewsByDay[key] || [];
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                      <div key={key} className="min-h-[120px]">
                        <p className={`text-xs font-medium mb-1 text-center ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {day.toLocaleDateString("vi-VN", { weekday: "short" })}
                        </p>
                        <p className={`text-lg font-bold text-center mb-2 ${isToday ? "text-primary" : "text-gray-900"}`}>
                          {day.getDate()}
                        </p>
                        <div className="space-y-1">
                          {dayInterviews.map((iv: any) => (
                            <div
                              key={iv.id}
                              className={`text-[10px] rounded px-1 py-0.5 truncate cursor-default ${
                                iv.status === "CONFIRMED" ? "bg-success/20 text-success" :
                                iv.status === "SCHEDULED" ? "bg-warning/20 text-warning" :
                                "bg-muted text-muted-foreground"
                              }`}
                              title={`${iv.application?.candidate?.name} - ${formatTime(new Date(iv.scheduledAt))}`}
                            >
                              {formatTime(new Date(iv.scheduledAt))} {iv.application?.candidate?.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Interviews */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sắp tới</h2>
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
                                  <span className="text-sm text-muted-foreground">cho {job?.title}</span>
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
                                  <a href={iv.meetingLink} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    <Link className="h-3.5 w-3.5" />Link họp
                                  </a>
                                )}
                                {iv.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 border-t pt-2">{iv.notes}</p>
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

            {/* Past Interviews */}
            {past.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Đã qua</h2>
                <div className="space-y-2">
                  {past.map((iv: any) => {
                    const candidate = iv.application?.candidate;
                    const job = iv.application?.job;
                    return (
                      <Card key={iv.id} className="opacity-70">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{candidate?.name} · {job?.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateShort(new Date(iv.scheduledAt))} · {formatTime(new Date(iv.scheduledAt))}
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
          </>
        )}
      </div>
    </div>
  );
}
