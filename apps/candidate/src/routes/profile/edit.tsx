import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Skeleton } from "@07nghiep/ui/components/skeleton";
import BasicInfoSection from "@/components/profile/BasicInfoSection";
import EducationSection from "@/components/profile/EducationSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import PortfolioSection from "@/components/profile/PortfolioSection";
import ProfileCompleteness from "@/components/profile/ProfileCompleteness";
import ResumeUpload from "@/components/profile/ResumeUpload";
import SkillsSection from "@/components/profile/SkillsSection";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";
import { profileSchema, type ProfileFormValues } from "@/utils/profile-schema";

import { createSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/profile/edit")({
  head: () =>
    createSeoHead({
      title: "Chỉnh sửa hồ sơ | 07nghiep",
      description: "Cập nhật thông tin cá nhân, CV, kỹ năng và kinh nghiệm làm việc.",
      url: `${SITE_URL}/profile/edit`,
    }),
  component: ProfileEditPage,
});

const defaultValues: ProfileFormValues = {
  avatarUrl: "",
  resumeUrl: "",
  headline: "",
  fullName: "",
  phone: "",
  location: "",
  aboutMe: "",
  skills: [],
  experience: [],
  education: [],
  portfolio: {
    linkedin: "",
    github: "",
    website: "",
  },
};

type ProfileApiData = {
  avatarUrl?: string | null;
  resumeUrl?: string | null;
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  location?: string | null;
  skills?: string[] | null;
  portfolioUrl?: string | null;
  experience?: unknown;
  education?: unknown;
  gpa?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapProfileApiToFormValues(
  data: ProfileApiData,
  sessionName?: string | null,
): ProfileFormValues {
  const experience = Array.isArray(data.experience)
    ? data.experience
        .filter(isRecord)
        .map((item) => ({
          title: typeof item.title === "string" ? item.title : "",
          company: typeof item.company === "string" ? item.company : "",
          location: typeof item.location === "string" ? item.location : "",
          startDate: typeof item.startDate === "string" ? item.startDate : "",
          endDate: typeof item.endDate === "string" ? item.endDate : "",
          description: typeof item.description === "string" ? item.description : "",
        }))
        .filter(
          (item) =>
            item.title ||
            item.company ||
            item.location ||
            item.startDate ||
            item.endDate ||
            item.description,
        )
    : [];

  const education = Array.isArray(data.education)
    ? data.education
        .filter(isRecord)
        .map((item) => ({
          degree: typeof item.degree === "string" ? item.degree : "",
          school: typeof item.school === "string" ? item.school : "",
          location: typeof item.location === "string" ? item.location : "",
          startDate: typeof item.startYear === "number" ? `${item.startYear}-01-01` : "",
          endDate: typeof item.endYear === "number" ? `${item.endYear}-01-01` : "",
          gpa: typeof item.gpa === "string" ? item.gpa : "",
        }))
        .filter(
          (item) => item.degree || item.school || item.location || item.startDate || item.endDate,
        )
    : [];

  return {
    avatarUrl: data.avatarUrl ?? "",
    resumeUrl: data.resumeUrl ?? "",
    headline: data.headline ?? "",
    fullName: sessionName ?? "",
    phone: data.phone ?? "",
    location: data.location ?? "",
    aboutMe: data.summary ?? "",
    skills: data.skills ?? [],
    experience: experience.length > 0 ? experience : defaultValues.experience,
    education: education.length > 0 ? education : defaultValues.education,
    portfolio: {
      linkedin: "",
      github: "",
      website: data.portfolioUrl ?? "",
    },
  };
}

function mapFormValuesToProfileUpdateInput(values: ProfileFormValues) {
  return {
    avatarUrl: values.avatarUrl || undefined,
    resumeUrl: values.resumeUrl || undefined,
    headline: values.headline || undefined,
    summary: values.aboutMe || undefined,
    phone: values.phone || undefined,
    location: values.location || undefined,
    skills: values.skills,
    portfolioUrl:
      values.portfolio.website || values.portfolio.linkedin || values.portfolio.github || undefined,
    experience: values.experience
      .filter((item) => Boolean(item.title || item.company))
      .map((item) => ({
        title: item.title || "",
        company: item.company || "",
        location: item.location || undefined,
        startDate: item.startDate ? item.startDate.slice(0, 7) : "",
        endDate: item.endDate ? item.endDate.slice(0, 7) : undefined,
        current: !item.endDate,
        description: item.description || undefined,
      })),
    education: values.education
      .map((item) => {
        const startYear = item.startDate
          ? Number.parseInt(item.startDate.slice(0, 4), 10)
          : Number.NaN;
        const endYear = item.endDate ? Number.parseInt(item.endDate.slice(0, 4), 10) : Number.NaN;

        if (Number.isNaN(startYear)) {
          return null;
        }

        return {
          degree: item.degree || "",
          school: item.school || "",
          location: item.location || undefined,
          startYear,
          endYear: Number.isNaN(endYear) ? undefined : endYear,
          gpa: item.gpa || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}

function ProfileEditPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user?.id);
  const sessionName = typeof session?.user?.name === "string" ? session.user.name : null;
  const initializedRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: "onChange",
  });

  const profileQuery = useQuery(
    trpc.profile.getMyProfile.queryOptions(undefined, { enabled: isLoggedIn }),
  );
  const profileData = profileQuery.data as ProfileApiData | undefined;
  const { mutate } = useMutation(trpc.profile.updateMyProfile.mutationOptions());
  const { mutateAsync: requestAvatarUpload } = useMutation(
    trpc.profile.uploadAvatar.mutationOptions(),
  );
  const { mutateAsync: requestResumeUpload } = useMutation(
    trpc.profile.uploadResume.mutationOptions(),
  );
  const { mutateAsync: deleteResume } = useMutation(trpc.profile.deleteResume.mutationOptions());
  const { mutateAsync: updateUserName } = useMutation(trpc.user.updateMe.mutationOptions());

  const isDirty = form.formState.isDirty;

  const handleBackToProfileClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) {
      return;
    }

    const shouldLeave = window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời trang?");
    if (!shouldLeave) {
      event.preventDefault();
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      toast.info("Đang tải ảnh đại diện...");

      const uploadResult = await requestAvatarUpload({
        filename: file.name,
        contentType: file.type,
      });

      const uploadResponse = await fetch(uploadResult.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Không thể tải file lên máy chủ lưu trữ.");
      }

      form.setValue("avatarUrl", uploadResult.publicUrl, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      toast.success("Tải ảnh đại diện thành công");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
      toast.error(`Không thể tải ảnh đại diện: ${message}`);
    }
  };

  const handleResumeUpload = async (file: File) => {
    try {
      toast.info("Đang tải CV...");

      const uploadResult = await requestResumeUpload({
        filename: file.name,
        contentType: file.type,
      });

      const uploadResponse = await fetch(uploadResult.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Không thể tải CV lên máy chủ lưu trữ.");
      }

      form.setValue("resumeUrl", uploadResult.publicUrl, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      toast.success("Tải CV thành công");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
      toast.error(`Không thể tải CV: ${message}`);
    }
  };

  const handleResumeRemove = async () => {
    try {
      await deleteResume();
      form.setValue("resumeUrl", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success("Đã xóa CV");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
      toast.error(`Không thể xóa CV: ${message}`);
    }
  };

  useEffect(() => {
    if (!profileData || initializedRef.current) {
      return;
    }

    form.reset(mapProfileApiToFormValues(profileData, sessionName));
    initializedRef.current = true;
  }, [form, profileData, sessionName]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    const subscription = form.watch((data) => {
      if (!initializedRef.current) {
        return;
      }

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(async () => {
        const parsed = profileSchema.safeParse(data);
        if (!parsed.success) {
          return;
        }

        const input = mapFormValuesToProfileUpdateInput(parsed.data);

        if (data.fullName && data.fullName !== sessionName) {
          await updateUserName({ name: data.fullName });
        }

        mutate(input, {
          onSuccess: () => {
            toast.success("Đã lưu thay đổi");

            queryClient.invalidateQueries();
          },
          onError: (error) => {
            toast.error(`Không thể lưu: ${error.message}`);
          },
        });
      }, 500);
    });

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, [form, mutate]);

  const handleSave = async () => {
    const data = form.getValues();
    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    const input = mapFormValuesToProfileUpdateInput(parsed.data);

    if (data.fullName && data.fullName !== sessionName) {
      await updateUserName({ name: data.fullName });
    }

    mutate(input, {
      onSuccess: () => {
        toast.success("Đã lưu thay đổi");
        queryClient.invalidateQueries();
      },
      onError: (error) => {
        toast.error(`Không thể lưu: ${error.message}`);
      },
    });
  };

  const watchedValues = form.watch();

  if (sessionPending) {
    return (
      <div className="container mx-auto min-h-[100dvh] max-w-4xl bg-background py-8 text-foreground">
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 text-foreground">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Đăng nhập để chỉnh hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Trang chỉnh sửa hồ sơ chỉ khả dụng sau khi bạn đăng nhập vào tài khoản ứng viên.
            </p>
            <Button asChild>
              <Link to="/login">Đăng nhập</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[100dvh] max-w-4xl flex-col gap-8 bg-background py-8 text-foreground">
      <form className="flex flex-col gap-8" onSubmit={form.handleSubmit(() => undefined)}>
        <div className="flex flex-col gap-4">
          <Button asChild variant="outline" className="w-fit">
            <Link to="/profile" onClick={handleBackToProfileClick}>
              Quay lại Profile
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Chỉnh sửa hồ sơ</h1>
            <p className="text-sm text-muted-foreground">
              Cập nhật thông tin cá nhân, kinh nghiệm và kỹ năng của bạn.
            </p>
          </div>

          <ProfileCompleteness data={watchedValues} />
        </div>

        <BasicInfoSection
          form={form}
          email={session?.user.email}
          onAvatarChange={handleAvatarUpload}
        />
        <ExperienceSection form={form} />
        <EducationSection form={form} />
        <SkillsSection form={form} />
        <PortfolioSection form={form} />
        <ResumeUpload
          value={form.watch("resumeUrl")}
          onChange={handleResumeUpload}
          onRemove={handleResumeRemove}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button asChild variant="outline">
            <Link to="/profile" onClick={handleBackToProfileClick}>
              Hủy
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={!isDirty}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}
