import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Input } from "@07nghiep/ui/components/input";
import { Camera } from "lucide-react";
import { useEffect, useId, useState, type ChangeEvent } from "react";

type AvatarUploadProps = {
  value?: string;
  onChange: (nextValue: string, file: File) => void;
  label?: string;
  maxSize?: number;
};

const DEFAULT_MAX_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatMaxSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

function isValidAvatarType(file: File) {
  return ACCEPTED_TYPES.includes(file.type);
}

export default function AvatarUpload({ value, onChange, label = "Ảnh đại diện", maxSize }: AvatarUploadProps) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const allowedMaxSize = maxSize ?? DEFAULT_MAX_SIZE;
  const displayedUrl = previewUrl ?? value;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!isValidAvatarType(selectedFile)) {
      alert("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > allowedMaxSize) {
      alert(`Ảnh vượt quá ${formatMaxSize(allowedMaxSize)}.`);
      event.target.value = "";
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setFileName(selectedFile.name);
    onChange(objectUrl, selectedFile);
  };

  const fallbackText = fileName ? fileName.slice(0, 1).toUpperCase() : "A";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <label
        htmlFor={inputId}
        className="group relative inline-flex w-fit cursor-pointer items-center justify-center rounded-full outline-none"
      >
        <Avatar className="size-24 ring-1 ring-border transition-transform duration-200 group-hover:scale-[1.02] group-focus-within:scale-[1.02]">
          <AvatarImage src={displayedUrl} alt={label} />
          <AvatarFallback>{fallbackText}</AvatarFallback>
        </Avatar>

        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="flex flex-col items-center gap-1 text-xs font-medium text-white drop-shadow-sm">
            <Camera className="size-4" />
            Đổi ảnh
          </span>
        </div>

        <Input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
      </label>

      <p className="text-xs text-muted-foreground">
        JPG, PNG, WebP. Tối đa {formatMaxSize(allowedMaxSize)}.
      </p>
    </div>
  );
}
