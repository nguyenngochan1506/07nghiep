import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";

import type { ProfileFormValues } from "@/utils/profile-schema";

import AvatarUpload from "./AvatarUpload";

type FormLike = {
  register: (name: keyof ProfileFormValues) => Record<string, unknown>;
  watch: (name: keyof ProfileFormValues) => string | undefined;
  setValue: (
    name: keyof ProfileFormValues,
    value: string,
    options?: { shouldDirty?: boolean; shouldTouch?: boolean; shouldValidate?: boolean },
  ) => void;
  formState: {
    errors: Partial<Record<keyof ProfileFormValues, { message?: string }>>;
  };
};

type BasicInfoSectionProps = {
  form: FormLike;
  email?: string;
  onAvatarChange: (file: File) => void | Promise<void>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export default function BasicInfoSection({ form, email, onAvatarChange }: BasicInfoSectionProps) {
  const avatarUrl = form.watch("avatarUrl");
  const aboutMe = form.watch("aboutMe") ?? "";

  return (
    <div className="flex flex-col gap-6">
      <AvatarUpload
        value={avatarUrl}
        onChange={onAvatarChange}
      />

      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email ?? ""} readOnly className="bg-muted/30" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                placeholder="Nguyễn Văn A"
                data-invalid={Boolean(form.formState.errors.fullName)}
                aria-invalid={Boolean(form.formState.errors.fullName)}
                {...form.register("fullName")}
              />
              <FieldError message={form.formState.errors.fullName?.message} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                placeholder="Frontend Developer"
                data-invalid={Boolean(form.formState.errors.headline)}
                aria-invalid={Boolean(form.formState.errors.headline)}
                {...form.register("headline")}
              />
              <FieldError message={form.formState.errors.headline?.message} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                placeholder="0901234567"
                data-invalid={Boolean(form.formState.errors.phone)}
                aria-invalid={Boolean(form.formState.errors.phone)}
                {...form.register("phone")}
              />
              <FieldError message={form.formState.errors.phone?.message} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Địa điểm</Label>
              <Input
                id="location"
                placeholder="Hà Nội, Việt Nam"
                data-invalid={Boolean(form.formState.errors.location)}
                aria-invalid={Boolean(form.formState.errors.location)}
                {...form.register("location")}
              />
              <FieldError message={form.formState.errors.location?.message} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="aboutMe">About Me</Label>
            <textarea
              id="aboutMe"
              placeholder="Giới thiệu ngắn về kinh nghiệm, thế mạnh và mục tiêu nghề nghiệp của bạn..."
              data-invalid={Boolean(form.formState.errors.aboutMe)}
              aria-invalid={Boolean(form.formState.errors.aboutMe)}
              className="min-h-30 w-full rounded-md border border-input bg-transparent p-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
              {...form.register("aboutMe")}
            />
            <p className="text-xs text-muted-foreground">{aboutMe.length}/2000 ký tự</p>
            <FieldError message={form.formState.errors.aboutMe?.message} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
