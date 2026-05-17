import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import type { ProfileFormValues } from "@/utils/profile-schema";

type ExperienceSectionProps = {
  form: UseFormReturn<ProfileFormValues>;
};

const emptyExperience = {
  title: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export default function ExperienceSection({ form }: ExperienceSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "experience",
  });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => {
        const errors = form.formState.errors.experience?.[index];

        return (
          <Card key={field.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Kinh nghiệm {index + 1}</CardTitle>
                  <p className="text-xs text-muted-foreground">Thông tin công việc gần đây nhất của bạn</p>
                </div>

                <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                  Xóa
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`experience.${index}.title`}>Chức danh</Label>
                  <input
                    id={`experience.${index}.title`}
                    placeholder="Frontend Developer"
                    data-invalid={Boolean(errors?.title)}
                    aria-invalid={Boolean(errors?.title)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
                    {...form.register(`experience.${index}.title`)}
                  />
                  <FieldError message={errors?.title?.message} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`experience.${index}.company`}>Công ty</Label>
                  <input
                    id={`experience.${index}.company`}
                    placeholder="ABC Company"
                    data-invalid={Boolean(errors?.company)}
                    aria-invalid={Boolean(errors?.company)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
                    {...form.register(`experience.${index}.company`)}
                  />
                  <FieldError message={errors?.company?.message} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`experience.${index}.location`}>Địa điểm</Label>
                  <input
                    id={`experience.${index}.location`}
                    placeholder="Hà Nội"
                    data-invalid={Boolean(errors?.location)}
                    aria-invalid={Boolean(errors?.location)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
                    {...form.register(`experience.${index}.location`)}
                  />
                  <FieldError message={errors?.location?.message} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`experience.${index}.startDate`}>Từ ngày</Label>
                    <input
                      id={`experience.${index}.startDate`}
                      type="month"
                      data-invalid={Boolean(errors?.startDate)}
                      aria-invalid={Boolean(errors?.startDate)}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
                      {...form.register(`experience.${index}.startDate`)}
                    />
                    <FieldError message={errors?.startDate?.message} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`experience.${index}.endDate`}>Đến ngày</Label>
                    <input
                      id={`experience.${index}.endDate`}
                      type="month"
                      data-invalid={Boolean(errors?.endDate)}
                      aria-invalid={Boolean(errors?.endDate)}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
                      {...form.register(`experience.${index}.endDate`)}
                    />
                    <FieldError message={errors?.endDate?.message} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`experience.${index}.description`}>Mô tả</Label>
                <textarea
                  id={`experience.${index}.description`}
                  placeholder="Mô tả trách nhiệm, thành tựu, công nghệ sử dụng..."
                  data-invalid={Boolean(errors?.description)}
                  aria-invalid={Boolean(errors?.description)}
                  className="min-h-30 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
                  {...form.register(`experience.${index}.description`)}
                />
                <FieldError message={errors?.description?.message} />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                ...emptyExperience,
              })
            }
          >
            Thêm kinh nghiệm
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
