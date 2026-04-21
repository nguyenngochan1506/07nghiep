import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Upload, Eye, Trash2, FileText } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type ChangeEvent } from "react";

type ResumeUploadProps = {
  value?: string;
  onChange: (file: File) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  label?: string;
  fileName?: string;
  fileSize?: number;
};

const MAX_SIZE = 5 * 1024 * 1024;

function formatFileSize(bytes?: number) {
  if (!bytes && bytes !== 0) {
    return "";
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileNameFromUrl(url?: string) {
  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    return decodeURIComponent(pathname.split("/").pop() ?? "resume.pdf");
  } catch {
    return decodeURIComponent(url.split("/").pop() ?? "resume.pdf");
  }
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export default function ResumeUpload({ value, onChange, onRemove, label = "Resume Upload", fileName, fileSize }: ResumeUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState(fileName ?? "");
  const [selectedSize, setSelectedSize] = useState(fileSize);
  const [isDragging, setIsDragging] = useState(false);

  const displayedUrl = previewUrl ?? value;
  const displayedName = selectedName || fileName || getFileNameFromUrl(value) || "resume.pdf";
  const displayedSize = selectedSize ?? fileSize;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleSelectedFile = (selectedFile?: File | null) => {
    if (!selectedFile) {
      return;
    }

    if (!isPdfFile(selectedFile)) {
      alert("Chỉ chấp nhận file PDF.");
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      alert("File vượt quá 5MB.");
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setSelectedName(selectedFile.name);
    setSelectedSize(selectedFile.size);
    onChange(selectedFile);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleSelectedFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleSelectedFile(event.dataTransfer.files?.[0]);
  };

  const handleRemove = async () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setSelectedName("");
    setSelectedSize(undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    await onRemove?.();
  };

  const emptyState = useMemo(
    () => (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Upload className="size-5" />
        </div>
        <p className="text-sm font-medium text-foreground">Kéo thả hoặc click để tải lên CV</p>
        <p className="text-xs text-muted-foreground">Chỉ hỗ trợ PDF, dung lượng tối đa 5MB</p>
      </div>
    ),
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleInputChange}
        />

        {!displayedUrl ? (
          <div
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFilePicker();
              }
            }}
            className={[
              "cursor-pointer rounded-2xl border-2 border-dashed p-2 transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
            ].join(" ")}
          >
            {emptyState}
          </div>
        ) : (
          <div className="rounded-2xl border bg-background p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <FileText className="size-5" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">{displayedName}</p>
                <p className="text-xs text-muted-foreground">{displayedSize ? formatFileSize(displayedSize) : "File PDF"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => displayedUrl && window.open(displayedUrl, "_blank", "noopener,noreferrer") }>
                <Eye data-icon="inline-start" />
                Preview
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleRemove}>
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={openFilePicker}>
                <Upload data-icon="inline-start" />
                Chọn lại file
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
