import { Badge } from "@07nghiep/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { ArrowDownToLine, Briefcase, GraduationCap, Github, Globe, Linkedin, MapPin, Phone } from "lucide-react";

import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

const profile = {
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop",
  fullName: "Nguyễn Minh Anh",
  headline: "Senior Frontend Engineer | React, TypeScript, Design Systems",
  phone: "+84 912 345 678",
  location: "Hà Nội, Việt Nam",
  aboutMe:
    "Tôi là một frontend engineer tập trung vào trải nghiệm người dùng, kiến trúc component và hiệu năng web. Tôi thích xây dựng sản phẩm có chiều sâu, gọn gàng và dễ mở rộng.",
  skills: ["React", "TypeScript", "TanStack Router", "TailwindCSS", "Design System", "Zod", "Accessibility"],
  experience: [
    {
      title: "Senior Frontend Engineer",
      company: "07nghiep Studio",
      location: "Hà Nội",
      startDate: "2023-01",
      endDate: "Present",
      description:
        "Thiết kế hệ thống UI dùng chung, tối ưu luồng form và chuẩn hóa kiến trúc router cho toàn bộ sản phẩm.",
    },
    {
      title: "Frontend Developer",
      company: "NextWave Labs",
      location: "Remote",
      startDate: "2020-06",
      endDate: "2022-12",
      description:
        "Xây dựng dashboard sản phẩm, đồng bộ design system và cải thiện hiệu năng hiển thị trên các trang dữ liệu lớn.",
    },
  ],
  education: [
    {
      degree: "Cử nhân Công nghệ thông tin",
      school: "Đại học Bách Khoa Hà Nội",
      location: "Hà Nội",
      startDate: "2016-09",
      endDate: "2020-06",
      gpa: "3.5/4.0",
    },
    {
      degree: "Chứng chỉ UI Engineering",
      school: "Frontend Masters",
      location: "Online",
      startDate: "2021-03",
      endDate: "2021-08",
      gpa: "4.0/4.0",
    },
  ],
  portfolio: {
    linkedin: "https://www.linkedin.com/in/nguyen-minh-anh",
    github: "https://github.com/nguyen-minh-anh",
    website: "https://minhanh.dev",
  },
  resumeUrl: "https://example.com/minh-anh-resume.pdf",
};

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session } = authClient.useSession();

  const fullName = session?.user.name ?? profile.fullName;
  const email = session?.user.email ?? "Chưa cập nhật email";
  const avatarUrl = session?.user.image ?? profile.avatarUrl;

  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  const hasSkills = profile.skills.length > 0;
  const hasResume = Boolean(profile.resumeUrl);
  const hasPortfolioLinks = Boolean(profile.portfolio.linkedin || profile.portfolio.github || profile.portfolio.website);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-foreground">
      <div className="flex flex-col gap-10 font-sans">
        <Card className="overflow-hidden rounded-xl border-border/60 bg-card shadow-sm">
          <CardContent className="flex flex-col gap-8 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <Avatar className="size-28 rounded-full ring-2 ring-border md:size-32">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{fullName}</h1>
                  <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{profile.headline}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
                    <Phone className="size-4" />
                    {profile.phone}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
                    <Globe className="size-4" />
                    {email}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
                    <MapPin className="size-4" />
                    {profile.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.portfolio.linkedin ? (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={profile.portfolio.linkedin} target="_blank" rel="noreferrer">
                    <Linkedin data-icon="inline-start" />
                    LinkedIn
                  </a>
                </Button>
              ) : null}
              {profile.portfolio.github ? (
                <Button asChild variant="outline" className="rounded-full">
                  <a href={profile.portfolio.github} target="_blank" rel="noreferrer">
                    <Github data-icon="inline-start" />
                    GitHub
                  </a>
                </Button>
              ) : null}
              {hasResume ? (
                <Button asChild className="rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                  <a href={profile.resumeUrl} download>
                    <ArrowDownToLine data-icon="inline-start" />
                    Download CV
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm leading-7 text-muted-foreground">
              {/* Sẽ kết nối với API từ Task #3 sau */}
              <p>{profile.aboutMe}</p>
              <div className="pt-2">
                {hasSkills ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-primary"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                    Thông tin chưa được cập nhật
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Sẽ kết nối với API từ Task #3 sau */}
              {hasPortfolioLinks ? (
                <>
                  {profile.portfolio.linkedin ? (
                    <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                      <a href={profile.portfolio.linkedin} target="_blank" rel="noreferrer" className="w-full">
                        <Linkedin data-icon="inline-start" />
                        LinkedIn
                      </a>
                    </Button>
                  ) : null}
                  {profile.portfolio.github ? (
                    <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                      <a href={profile.portfolio.github} target="_blank" rel="noreferrer" className="w-full">
                        <Github data-icon="inline-start" />
                        GitHub
                      </a>
                    </Button>
                  ) : null}
                  {profile.portfolio.website ? (
                    <Button asChild variant="outline" className="w-full justify-start rounded-xl">
                      <a href={profile.portfolio.website} target="_blank" rel="noreferrer" className="w-full">
                        <Globe data-icon="inline-start" />
                        Website
                      </a>
                    </Button>
                  ) : null}
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                  Thông tin chưa được cập nhật
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Sẽ kết nối với API từ Task #3 sau */}
          <TimelineCard title="Experience" icon={Briefcase} items={profile.experience} />
          {/* Sẽ kết nối với API từ Task #3 sau */}
          <TimelineCard title="Education" icon={GraduationCap} items={profile.education} />
        </div>
      </div>
    </div>
  );
}

// Timeline Component
function TimelineCard({ title, icon: Icon, items }: { title: string; icon: any; items: any[] }) {
  return (
    <Card className="rounded-xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          <div className="absolute left-2 top-1 h-full w-px bg-border" />
          <div className="flex flex-col gap-6">
            {items.map((item, index) => {
              const isExperience = "company" in item;

              return (
                <div key={`${title}-${index}`} className="relative">
                  <span className="absolute -left-[1.15rem] top-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-secondary/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {isExperience ? item.title : item.degree}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isExperience ? item.company : item.school}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>
                          {item.startDate} - {item.endDate}
                        </p>
                        <p>{item.location}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {isExperience ? item.description : `GPA: ${item.gpa}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}