import { createFileRoute } from "@tanstack/react-router";
import { ApplicationStatus } from "@/types/application";
import { trpc, trpcClient, queryClient } from "../../utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Progress } from "@07nghiep/ui/components/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@07nghiep/ui/components/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";
import { Textarea } from "@07nghiep/ui/components/textarea";
import {
  Calendar,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User,
  Plus,
  Clock,
  MapPin as MapPinIcon,
  Link as LinkIcon,
  X,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { getStatusColor, getStatusLabel } from "../../components/applications/application-card";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@07nghiep/ui/components/dialog";

export const Route = createFileRoute("/applications/$applicationId")({
  component: ApplicationDetailPage,
});

type CandidateProfile = {
  avatarUrl: string | null;
  summary: string | null;
  skills: string[] | null;
  experience: unknown;
  education: unknown;
  phone: string | null;
  location: string | null;
  resumeUrl: string | null;
  portfolioUrl: string | null;
};
type ApplicationDetail = {
  id: string;
  status: ApplicationStatus;
  appliedAt: Date | string;
  resumeUrl: string | null;
  coverLetter: string | null;
  answers: unknown;
  notes: string | null;
  candidate: {
    name: string | null;
    email: string;
    image: string | null;
    profile: CandidateProfile | null;
  };
  job: {
    title: string;
  };
  aiScore: ApplicationAiScore | null;
};
type ApplicationAiScore = {
  id: string;
  status: string;
  score: number | null;
  recommendation: string | null;
  summary: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  risks: unknown;
  reasoning: string | null;
  errorMessage: string | null;
};
type InterviewItem = {
  id: string;
  status: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
};
type ProfileExperience = {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
};
type ProfileEducation = {
  degree?: string;
  school?: string;
  location?: string;
  startYear?: string | number;
  endYear?: string | number;
  gpa?: string | number;
};
type UpdateStatusInput = {
  id: string;
  status: ApplicationStatus;
};
type UpdateNotesInput = {
  id: string;
  notes: string;
};

function isApplicationStatus(value: string): value is ApplicationStatus {
  return Object.values(ApplicationStatus).includes(value as ApplicationStatus);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProfileEntries<T extends object>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord) as T[];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function AiFitScoreCard({
  aiScore,
  retrying,
  onRetry,
  wide = false,
}: {
  aiScore: ApplicationAiScore | null;
  retrying: boolean;
  onRetry: () => void;
  wide?: boolean;
}) {
  const score = aiScore?.score ?? 0;
  const risks = asStringArray(aiScore?.risks);
  const completed = aiScore?.status === "COMPLETED";

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="rounded-none border-b bg-secondary/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">Phân tích từ AI</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Đối chiếu CV với yêu cầu tuyển dụng
              </p>
            </div>
          </div>
          <Badge variant={aiScore?.status === "FAILED" ? "destructive" : "secondary"}>
            {getAiStatusLabel(aiScore?.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {completed ? (
          <>
            <div className={wide ? "grid gap-4 md:grid-cols-[220px_1fr]" : "space-y-4"}>
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-3 md:block">
                  <div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-semibold leading-none tabular-nums">
                        {score}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">/ 100</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Điểm tổng hợp</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`md:mt-4 ${getRecommendationBadgeClass(aiScore.recommendation)}`}
                  >
                    {getRecommendationLabel(aiScore.recommendation)}
                  </Badge>
                </div>
                <Progress value={score} className="mt-4 h-2" />
              </div>

              {aiScore.summary ? (
                <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">Nhận định</p>
                  <p className="text-sm leading-6 text-muted-foreground">{aiScore.summary}</p>
                </div>
              ) : null}
            </div>

            <div className="divide-y rounded-xl border bg-muted/10">
              <SkillList title="Điểm khớp" items={aiScore.matchedSkills} />
              <SkillList title="Khoảng thiếu" items={aiScore.missingSkills} />
              <SkillList title="Rủi ro" items={risks} />
            </div>
          </>
        ) : aiScore?.status === "FAILED" ? (
          <div className="space-y-3">
            <p className="max-h-36 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
              {aiScore.errorMessage || "AI chấm điểm thất bại."}
            </p>
            <Button onClick={onRetry} disabled={retrying} className="w-full">
              {retrying ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              Chấm lại
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/25 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {aiScore
                ? "Hồ sơ này đang chờ AI chấm điểm."
                : "Hồ sơ này chưa được đưa vào hàng chờ AI."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex min-w-0 items-start gap-2 text-sm leading-6">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span className="min-w-0 flex-1 break-words text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getRecommendationLabel(value?: string | null) {
  if (value === "STRONG_FIT") return "Rất phù hợp";
  if (value === "POTENTIAL_FIT") return "Có tiềm năng";
  if (value === "WEAK_FIT") return "Ít phù hợp";
  return "Chưa có đề xuất";
}

function getRecommendationBadgeClass(value?: string | null) {
  if (value === "STRONG_FIT") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (value === "POTENTIAL_FIT") {
    return "border-warning/30 bg-warning/10 text-warning";
  }
  if (value === "WEAK_FIT") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "";
}

function getAiStatusLabel(value?: string | null) {
  if (value === "COMPLETED") return "Đã chấm";
  if (value === "FAILED") return "Lỗi";
  if (value === "PROCESSING") return "Đang chấm";
  if (value === "PENDING") return "Đang chờ";
  return "Chưa xếp hàng";
}

function ApplicationDetailPage() {
  const { applicationId } = Route.useParams();
  const { data: rawApplication, isLoading } = useQuery(
    trpc.application.get.queryOptions({ id: applicationId }),
  );

  const [notes, setNotes] = useState("");

  // Interview scheduling
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewDuration, setInterviewDuration] = useState(60);
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  const { data: interviews, isLoading: interviewsLoading } = useQuery(
    trpc.interview.list.queryOptions({ applicationId }),
  );

  const createInterview = useMutation(
    trpc.interview.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Đã lên lịch phỏng vấn");
        setScheduleOpen(false);
        resetInterviewForm();
      },
      onError: (err) => toast.error(err.message || "Không thể lên lịch"),
    }),
  );

  const cancelInterview = useMutation(
    trpc.interview.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Đã hủy lịch phỏng vấn");
      },
      onError: (err) => toast.error(err.message || "Không thể hủy lịch"),
    }),
  );

  const resetInterviewForm = () => {
    setInterviewDate("");
    setInterviewTime("");
    setInterviewDuration(60);
    setInterviewLocation("");
    setInterviewLink("");
    setInterviewNotes("");
  };

  const handleScheduleInterview = () => {
    if (!interviewDate || !interviewTime) {
      toast.error("Vui lòng chọn ngày và giờ phỏng vấn");
      return;
    }
    createInterview.mutate({
      applicationId,
      scheduledAt: `${interviewDate}T${interviewTime}:00`,
      durationMinutes: interviewDuration,
      location: interviewLocation || undefined,
      meetingLink: interviewLink || undefined,
      notes: interviewNotes || undefined,
    });
  };

  useEffect(() => {
    if (rawApplication?.notes) {
      setNotes(rawApplication.notes);
    }
  }, [rawApplication?.notes]);

  const updateStatusMutation = useMutation({
    mutationFn: (input: UpdateStatusInput) => trpcClient.application.updateStatus.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Đã cập nhật trạng thái hồ sơ");
    },
    onError: (err) => {
      toast.error(err.message || "Không thể cập nhật trạng thái");
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: (input: UpdateNotesInput) => trpcClient.application.updateNotes.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Đã lưu ghi chú");
    },
    onError: (err) => {
      toast.error(err.message || "Không thể lưu ghi chú");
    },
  });

  const retryAiScoreMutation = useMutation({
    mutationFn: () => trpcClient.application.retryAiScore.mutate({ applicationId }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Đã đưa vào hàng chờ AI chấm điểm");
    },
    onError: (err) => {
      toast.error(err.message || "Không thể chấm lại bằng AI");
    },
  });

  const handleStatusChange = (status: ApplicationStatus) => {
    updateStatusMutation.mutate({
      id: applicationId,
      status,
    });
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate({
      id: applicationId,
      notes,
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải hồ sơ ứng tuyển...</div>;
  }

  if (!rawApplication) {
    return (
      <div className="p-8 text-center text-muted-foreground">Không tìm thấy hồ sơ ứng tuyển</div>
    );
  }

  const application = rawApplication as unknown as ApplicationDetail;
  const profile: CandidateProfile | null = application.candidate.profile;
  const profileExperience = readProfileEntries<ProfileExperience>(profile?.experience);
  const profileEducation = readProfileEntries<ProfileEducation>(profile?.education);
  const answers = application.answers;
  const interviewItems = (interviews ?? []) as unknown as InterviewItem[];

  return (
    <div className="flex flex-col gap-6 p-8 max-w-[1200px] mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20 ring-4 ring-muted">
            <AvatarImage src={profile?.avatarUrl || application.candidate.image || undefined} />
            <AvatarFallback className="text-2xl">
              {(application.candidate.name || "?")
                .split(" ")
                .slice(0, 2)
                .map((w: string) => w[0] ?? "")
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {application.candidate.name || "Ứng viên chưa rõ"}
            </h1>
            <p className="text-muted-foreground font-medium">
              Ứng tuyển vị trí: <span className="text-foreground">{application.job.title}</span>
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{new Date(application.appliedAt).toLocaleDateString("vi-VN")}</span>
              </div>
              <Badge variant="outline" className={getStatusColor(application.status)}>
                {getStatusLabel(application.status)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Select
            value={application.status}
            onValueChange={(value) => {
              if (value && isApplicationStatus(value)) handleStatusChange(value);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Cập nhật trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Mail className="h-4 w-4 mr-2" />
              Nhắn tin
            </Button>
            {application.resumeUrl && (
              <Button className="flex-1 sm:flex-none" asChild>
                <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  CV ứng tuyển
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
              <TabsTrigger
                value="profile"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
              >
                Hồ sơ ứng viên
              </TabsTrigger>
              <TabsTrigger
                value="cover-letter"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
              >
                Thư ứng tuyển
              </TabsTrigger>
              {!!answers && (
                <TabsTrigger
                  value="questions"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
                >
                  Câu hỏi sàng lọc
                </TabsTrigger>
              )}
              <TabsTrigger
                value="ai-score"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
              >
                Phân tích của AI
              </TabsTrigger>
              <TabsTrigger
                value="interviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
              >
                Phỏng vấn
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="pt-6 outline-none">
              {!profile ? (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                    <User className="h-12 w-12 mb-4 opacity-20" />
                    <p>Ứng viên chưa thiết lập hồ sơ cá nhân.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  {profile.summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Giới thiệu</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {profile.summary}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Skills */}
                  {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Kỹ năng</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="rounded-full">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Experience */}
                  {profileExperience.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Kinh nghiệm</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {profileExperience.map((exp, i) => (
                            <div key={i} className="border-l-2 border-muted pl-4">
                              <h4 className="font-semibold">{exp.title || "Chưa có tiêu đề"}</h4>
                              <p className="text-sm text-muted-foreground">
                                {exp.company}
                                {exp.location ? ` · ${exp.location}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {exp.startDate || "?"} —{" "}
                                {exp.endDate || exp.current ? "Hiện tại" : "?"}
                              </p>
                              {exp.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {exp.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Education */}
                  {profileEducation.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Học vấn</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {profileEducation.map((edu, i) => (
                            <div key={i} className="border-l-2 border-muted pl-4">
                              <h4 className="font-semibold">{edu.degree || "Chưa có tiêu đề"}</h4>
                              <p className="text-sm text-muted-foreground">
                                {edu.school}
                                {edu.location ? ` · ${edu.location}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {edu.startYear || "?"} — {edu.endYear || "Hiện tại"}
                                {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cover-letter" className="pt-6 outline-none">
              <Card>
                <CardContent className="p-8">
                  {application.coverLetter ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                      {application.coverLetter}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Ứng viên chưa gửi thư ứng tuyển.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {!!answers && (
              <TabsContent value="questions" className="pt-6 outline-none">
                <Card>
                  <CardContent className="p-6">
                    <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(answers, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="ai-score" className="pt-6 outline-none">
              <AiFitScoreCard
                aiScore={application.aiScore}
                retrying={retryAiScoreMutation.isPending}
                onRetry={() => retryAiScoreMutation.mutate()}
                wide
              />
            </TabsContent>

            <TabsContent value="interviews" className="pt-6 outline-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Lịch phỏng vấn</h3>
                  <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                    <DialogTrigger render={<Button size="sm" />}>
                      <Plus className="h-4 w-4 mr-1" />
                      Lên lịch
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Lên lịch phỏng vấn</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label>Ngày</Label>
                            <Input
                              type="date"
                              value={interviewDate}
                              onChange={(e) => setInterviewDate(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Giờ</Label>
                            <Input
                              type="time"
                              value={interviewTime}
                              onChange={(e) => setInterviewTime(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Thời lượng (phút)</Label>
                          <Input
                            type="number"
                            value={interviewDuration}
                            onChange={(e) => setInterviewDuration(Number(e.target.value))}
                            min={15}
                            max={480}
                            step={15}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Địa điểm</Label>
                          <Input
                            placeholder="Văn phòng, trực tuyến..."
                            value={interviewLocation}
                            onChange={(e) => setInterviewLocation(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Liên kết họp (Google Meet, Zoom...)</Label>
                          <Input
                            placeholder="https://meet.google.com/..."
                            value={interviewLink}
                            onChange={(e) => setInterviewLink(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Ghi chú</Label>
                          <Textarea
                            placeholder="Ghi chú cho ứng viên..."
                            value={interviewNotes}
                            onChange={(e) => setInterviewNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleScheduleInterview}
                          disabled={createInterview.isPending}
                        >
                          {createInterview.isPending ? "Đang lưu..." : "Lưu lịch phỏng vấn"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {interviewsLoading ? (
                  <p className="text-sm text-muted-foreground">Đang tải...</p>
                ) : interviewItems.length > 0 ? (
                  interviewItems.map((iv) => {
                    const isActive = iv.status !== "CANCELLED" && iv.status !== "COMPLETED";
                    const dateStr = new Date(iv.scheduledAt).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                    const timeStr = new Date(iv.scheduledAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <Card key={iv.id} className={!isActive ? "opacity-60" : ""}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={isActive ? "default" : "secondary"}>
                              {iv.status === "SCHEDULED"
                                ? "Đã lên lịch"
                                : iv.status === "CONFIRMED"
                                  ? "Đã xác nhận"
                                  : iv.status === "CANCELLED"
                                    ? "Đã hủy"
                                    : iv.status === "COMPLETED"
                                      ? "Đã hoàn thành"
                                      : iv.status}
                            </Badge>
                            {isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => cancelInterview.mutate({ id: iv.id })}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Hủy
                              </Button>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {timeStr} · {iv.durationMinutes} phút
                              </span>
                            </div>
                            {iv.location && (
                              <div className="flex items-center gap-2">
                                <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                                <span>{iv.location}</span>
                              </div>
                            )}
                            {iv.meetingLink && (
                              <div className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={iv.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline truncate"
                                >
                                  {iv.meetingLink}
                                </a>
                              </div>
                            )}
                          </div>
                          {iv.notes && (
                            <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                              {iv.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có lịch phỏng vấn nào.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin liên hệ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${application.candidate.email}`}
                  className="hover:text-primary hover:underline"
                >
                  {application.candidate.email}
                </a>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${profile.phone}`} className="hover:text-primary hover:underline">
                    {profile.phone}
                  </a>
                </div>
              )}
              {profile?.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.location}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          {(profile?.portfolioUrl || profile?.resumeUrl || application.resumeUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Liên kết & tệp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {application.resumeUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      CV trong hồ sơ ứng tuyển
                    </a>
                  </Button>
                )}
                {profile?.resumeUrl && profile.resumeUrl !== application.resumeUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      CV trong hồ sơ cá nhân
                    </a>
                  </Button>
                )}
                {profile?.portfolioUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Hồ sơ năng lực / Trang web
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employer Notes */}
          <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900 dark:text-amber-500">
                Ghi chú nội bộ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Thêm ghi chú về ứng viên này... Chỉ đội của bạn nhìn thấy."
                className="min-h-[150px] bg-background resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleSaveNotes}
                disabled={notes === application.notes || updateNotesMutation.isPending}
              >
                {updateNotesMutation.isPending ? "Đang lưu..." : "Lưu ghi chú"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
