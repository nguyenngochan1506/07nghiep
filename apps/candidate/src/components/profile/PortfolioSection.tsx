import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { type UseFormReturn } from "react-hook-form";

import type { ProfileFormValues } from "@/utils/profile-schema";

type PortfolioSectionProps = {
  form: UseFormReturn<ProfileFormValues>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export default function PortfolioSection({ form }: PortfolioSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="portfolio.linkedin">LinkedIn</Label>
          <Input
            id="portfolio.linkedin"
            placeholder="https://www.linkedin.com/in/ten-ban"
            data-invalid={Boolean(form.formState.errors.portfolio?.linkedin)}
            aria-invalid={Boolean(form.formState.errors.portfolio?.linkedin)}
            {...form.register("portfolio.linkedin")}
          />
          <FieldError message={form.formState.errors.portfolio?.linkedin?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="portfolio.github">GitHub</Label>
          <Input
            id="portfolio.github"
            placeholder="https://github.com/ten-ban"
            data-invalid={Boolean(form.formState.errors.portfolio?.github)}
            aria-invalid={Boolean(form.formState.errors.portfolio?.github)}
            {...form.register("portfolio.github")}
          />
          <FieldError message={form.formState.errors.portfolio?.github?.message} />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="portfolio.website">Website cá nhân</Label>
          <Input
            id="portfolio.website"
            placeholder="https://ten-ban.dev"
            data-invalid={Boolean(form.formState.errors.portfolio?.website)}
            aria-invalid={Boolean(form.formState.errors.portfolio?.website)}
            {...form.register("portfolio.website")}
          />
          <FieldError message={form.formState.errors.portfolio?.website?.message} />
        </div>
      </CardContent>
    </Card>
  );
}
