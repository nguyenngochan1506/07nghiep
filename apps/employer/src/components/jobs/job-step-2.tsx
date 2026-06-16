import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { Label } from "@07nghiep/ui/components/label";
import { Textarea } from "@07nghiep/ui/components/textarea";
import { Input } from "@07nghiep/ui/components/input";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";

export interface Step2Data {
  description: string;
  requirements: string;
  benefits: string;
  skills: string[];
}

interface JobStep2Props {
  data: Step2Data;
  errors: Partial<Record<keyof Step2Data, string>>;
  onChange: (field: keyof Step2Data, value: string | string[]) => void;
}

export function JobStep2({ data, errors, onChange }: JobStep2Props) {
  const [skillInput, setSkillInput] = useState("");
  const skillInputRef = useRef<HTMLInputElement>(null);

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !data.skills.includes(trimmed) && data.skills.length < 20) {
      onChange("skills", [...data.skills, trimmed]);
      setSkillInput("");
    }
  }

  function removeSkill(skill: string) {
    onChange(
      "skills",
      data.skills.filter((s) => s !== skill)
    );
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
    if (e.key === "Backspace" && skillInput === "" && data.skills.length > 0) {
      removeSkill(data.skills[data.skills.length - 1]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Mô tả công việc</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cung cấp thông tin chi tiết về công việc để thu hút ứng viên phù hợp
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="job-desc">
          Mô tả công việc <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="job-desc"
          placeholder="Mô tả trách nhiệm, môi trường làm việc, cơ hội phát triển..."
          rows={8}
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          className={errors.description ? "border-destructive" : ""}
        />
        <div className="flex justify-between">
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted-foreground">
            {data.description.length} ký tự
          </p>
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-2">
        <Label htmlFor="job-requirements">Yêu cầu ứng viên</Label>
        <Textarea
          id="job-requirements"
          placeholder="Liệt kê các yêu cầu về kỹ năng, kinh nghiệm, bằng cấp..."
          rows={6}
          value={data.requirements}
          onChange={(e) => onChange("requirements", e.target.value)}
        />
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        <Label htmlFor="job-benefits">Quyền lợi</Label>
        <Textarea
          id="job-benefits"
          placeholder="Mô tả các phúc lợi: bảo hiểm, thưởng, cơ hội học tập..."
          rows={5}
          value={data.benefits}
          onChange={(e) => onChange("benefits", e.target.value)}
        />
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label htmlFor="skills-input">
          Kỹ năng yêu cầu{" "}
          <span className="text-muted-foreground">
            ({data.skills.length}/20)
          </span>
        </Label>

        {/* Tag display + input */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: composite tag input focuses the nested text input when the container is clicked. */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users can tab directly to the nested input. */}
        <div
          className="flex min-h-[44px] flex-wrap gap-2 rounded-md border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring cursor-text"
          onClick={() => skillInputRef.current?.focus()}
        >
          {data.skills.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {skill}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSkill(skill);
                }}
                className="ml-1 rounded-full hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            id="skills-input"
            ref={skillInputRef}
            type="text"
            placeholder={data.skills.length === 0 ? "Nhập kỹ năng và nhấn Enter..." : ""}
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSkill}
            disabled={!skillInput.trim() || data.skills.length >= 20}
          >
            <Plus className="mr-1 h-3 w-3" />
            Thêm
          </Button>
          <p className="text-xs text-muted-foreground">
            Nhấn Enter hoặc dấu phẩy để thêm kỹ năng
          </p>
        </div>
      </div>
    </div>
  );
}
