import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Progress } from "@07nghiep/ui/components/progress";

import type { ProfileFormValues } from "@/utils/profile-schema";

type ProfileCompletenessProps = {
  data: Partial<ProfileFormValues>;
};

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function calculateCompleteness(data: Partial<ProfileFormValues>) {
  const fields = [
    hasText(data.fullName),
    hasText(data.headline),
    hasText(data.aboutMe),
    (data.experience?.length ?? 0) > 0,
    (data.education?.length ?? 0) > 0,
    (data.skills?.length ?? 0) > 0,
    hasText(data.phone),
    hasText(data.location),
    hasText(data.avatarUrl),
    hasText(data.resumeUrl),
  ];

  const filledCount = fields.filter(Boolean).length;
  return Math.round((filledCount / fields.length) * 100);
}

export default function ProfileCompleteness({ data }: ProfileCompletenessProps) {
  const percentage = calculateCompleteness(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tiến độ hoàn thiện hồ sơ</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{percentage}% hoàn thiện</p>
          <p className="text-sm font-medium">Hãy hoàn tất hồ sơ để tăng khả năng được chú ý</p>
        </div>

        <Progress value={percentage} />
      </CardContent>
    </Card>
  );
}
