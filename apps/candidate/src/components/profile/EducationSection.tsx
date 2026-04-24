import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import type { ProfileFormValues } from "@/utils/profile-schema";

type EducationSectionProps = {
  form: UseFormReturn<ProfileFormValues>;
};

const emptyEducation = {
  degree: "",
  school: "",
  location: "",
  startDate: "",
  endDate: "",
  gpa: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export default function EducationSection({ form }: EducationSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "education",
  });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => {
        const errors = form.formState.errors.education?.[index];

        return (
          <Card key={field.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Học vấn {index + 1}</CardTitle>
                  <p className="text-xs text-muted-foreground">Thông tin học tập và bằng cấp</p>
                </div>

                <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                  Xóa
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`education.${index}.school`}>Trường học</Label>
                  <Input
                    id={`education.${index}.school`}
                    placeholder="Đại học Bách Khoa Hà Nội"
                    data-invalid={Boolean(errors?.school)}
                    aria-invalid={Boolean(errors?.school)}
                    {...form.register(`education.${index}.school`)}
                  />
                  <FieldError message={errors?.school?.message} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`education.${index}.degree`}>Bằng cấp</Label>
                  <Input
                    id={`education.${index}.degree`}
                    placeholder="Cử nhân Công nghệ thông tin"
                    data-invalid={Boolean(errors?.degree)}
                    aria-invalid={Boolean(errors?.degree)}
                    {...form.register(`education.${index}.degree`)}
                  />
                  <FieldError message={errors?.degree?.message} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`education.${index}.location`}>Địa điểm</Label>
                  <Input
                    id={`education.${index}.location`}
                    placeholder="Hà Nội"
                    data-invalid={Boolean(errors?.location)}
                    aria-invalid={Boolean(errors?.location)}
                    {...form.register(`education.${index}.location`)}
                  />
                  <FieldError message={errors?.location?.message} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`education.${index}.startDate`}>Từ ngày</Label>
                    <Input
                      id={`education.${index}.startDate`}
                      type="month"
                      data-invalid={Boolean(errors?.startDate)}
                      aria-invalid={Boolean(errors?.startDate)}
                      {...form.register(`education.${index}.startDate`)}
                    />
                    <FieldError message={errors?.startDate?.message} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`education.${index}.endDate`}>Đến ngày</Label>
                    <Input
                      id={`education.${index}.endDate`}
                      type="month"
                      data-invalid={Boolean(errors?.endDate)}
                      aria-invalid={Boolean(errors?.endDate)}
                      {...form.register(`education.${index}.endDate`)}
                    />
                    <FieldError message={errors?.endDate?.message} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`education.${index}.gpa`}>GPA</Label>
                <Input
                  id={`education.${index}.gpa`}
                  placeholder="3.6/4.0"
                  data-invalid={Boolean(errors?.gpa)}
                  aria-invalid={Boolean(errors?.gpa)}
                  {...form.register(`education.${index}.gpa`)}
                />
                <FieldError message={errors?.gpa?.message} />
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
                ...emptyEducation,
              })
            }
          >
            Thêm học vấn
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
