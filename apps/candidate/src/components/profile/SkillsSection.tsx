import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import type { ProfileFormValues } from "@/utils/profile-schema";

type SkillsSectionProps = {
  form: UseFormReturn<ProfileFormValues>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export default function SkillsSection({ form }: SkillsSectionProps) {
  const [skillInput, setSkillInput] = useState("");
  const skills = useWatch({ control: form.control, name: "skills" }) ?? [];

  const addSkill = () => {
    const nextSkill = skillInput.trim();
    if (!nextSkill) {
      return;
    }

    if (skills.some((skill) => skill.toLowerCase() === nextSkill.toLowerCase())) {
      setSkillInput("");
      return;
    }

    form.setValue("skills", [...skills, nextSkill], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setSkillInput("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addSkill();
  };

  const removeSkill = (skillToRemove: string) => {
    form.setValue(
      "skills",
      skills.filter((skill) => skill !== skillToRemove),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kỹ năng</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="skillInput">Thêm kỹ năng</Label>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              id="skillInput"
              value={skillInput}
              placeholder="React, TypeScript, Figma..."
              onChange={(event) => setSkillInput(event.target.value)}
              onKeyDown={handleKeyDown}
              className="md:flex-1"
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              Thêm
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {skills.length > 0 ? (
              skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 pr-1.5">
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Xóa kỹ năng ${skill}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Chưa có kỹ năng nào được thêm.</p>
            )}
          </div>
        </div>

        <FieldError message={form.formState.errors.skills?.message} />
      </CardContent>
    </Card>
  );
}
