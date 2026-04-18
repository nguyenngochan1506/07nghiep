import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import BasicInfoSection from "@/components/profile/BasicInfoSection";
import EducationSection from "@/components/profile/EducationSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import PortfolioSection from "@/components/profile/PortfolioSection";
import ProfileCompleteness from "@/components/profile/ProfileCompleteness";
import ResumeUpload from "@/components/profile/ResumeUpload";
import SkillsSection from "@/components/profile/SkillsSection";
import { authClient } from "@/lib/auth-client";
import { profileSchema, type ProfileFormValues } from "@/utils/profile-schema";

export const Route = createFileRoute("/profile/edit")({
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
  experience: [
    {
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  ],
  education: [
    {
      degree: "",
      school: "",
      location: "",
      startDate: "",
      endDate: "",
      gpa: "",
    },
  ],
  portfolio: {
    linkedin: "",
    github: "",
    website: "",
  },
};

function ProfileEditPage() {
  const { data: session } = authClient.useSession();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((data) => {
      console.log("Đang lưu tự động...", data);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form]);

  const watchedValues = form.watch();

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-8 py-8">
      <form className="flex flex-col gap-8" onSubmit={form.handleSubmit(() => undefined)}>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Chỉnh sửa hồ sơ</h1>
            <p className="text-sm text-muted-foreground">Cập nhật thông tin cá nhân, kinh nghiệm và kỹ năng của bạn.</p>
          </div>

          <ProfileCompleteness data={watchedValues} />
        </div>

        <BasicInfoSection form={form} email={session?.user.email} />
        <ExperienceSection form={form} />
        <EducationSection form={form} />
        <SkillsSection form={form} />
        <PortfolioSection form={form} />

        <ResumeUpload
          value={form.watch("resumeUrl")}
          onChange={(nextValue) => {
            form.setValue("resumeUrl", nextValue, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          }}
        />
      </form>
    </div>
  );
}
