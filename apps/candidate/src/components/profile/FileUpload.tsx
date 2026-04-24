import { Button } from "@07nghiep/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@07nghiep/ui/components/card";
import { Input } from "@07nghiep/ui/components/input";
import { Label } from "@07nghiep/ui/components/label";
import { Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";

type FileUploadProps = {
  value?: string;
  onChange: (nextValue: string, file: File) => void;
  accept?: string;
  maxSize?: number;
  label: string;
};

const IMAGE_MAX_SIZE = 2 * 1024 * 1024;
const PDF_MAX_SIZE = 5 * 1024 * 1024;

function bytesToMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(0);
}

function matchesAccept(file: File, accept?: string) {
  if (!accept || accept.trim().length === 0) {
    return true;
  }

  const acceptedTypes = accept
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  return acceptedTypes.some((type) => {
    if (type.startsWith(".")) {
      return fileName.endsWith(type);
    }

    if (type.endsWith("/*")) {
      const mimePrefix = type.slice(0, -1);
      return fileType.startsWith(mimePrefix);
    }

    return fileType === type;
  });
}

function resolveMaxSize(file: File, maxSize?: number) {
  if (typeof maxSize === "number") {
    return maxSize;
  }

  if (file.type === "application/pdf") {
    return PDF_MAX_SIZE;
  }

  if (file.type.startsWith("image/")) {
    return IMAGE_MAX_SIZE;
  }

  return IMAGE_MAX_SIZE;
}

function isLikelyPdfUrl(url: string) {
  return url.toLowerCase().includes(".pdf");
}

export default function FileUpload({ value, onChange, accept, maxSize, label }: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayedUrl = previewUrl ?? value;
  const isPdfPreview = previewType === "application/pdf" || (!!value && !previewType && isLikelyPdfUrl(value));

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!matchesAccept(selectedFile, accept)) {
      alert("File không đúng định dạng cho phép.");
      event.target.value = "";
      return;
    }

    const allowedMaxSize = resolveMaxSize(selectedFile, maxSize);
    if (selectedFile.size > allowedMaxSize) {
      alert(`File vượt quá ${bytesToMb(allowedMaxSize)}MB.`);
      event.target.value = "";
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setPreviewType(selectedFile.type);
    setFileName(selectedFile.name);
    onChange(objectUrl, selectedFile);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>
          Hỗ trợ định dạng {accept ?? "mọi loại file"}. Ảnh tối đa 2MB, PDF tối đa 5MB.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>Chọn file</Label>
          <Input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleFileChange}
          />
        </div>

        {displayedUrl ? (
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <Label>Preview</Label>
            {isPdfPreview ? (
              <iframe title="File preview" src={displayedUrl} className="h-72 w-full rounded-lg border" />
            ) : (
              <img src={displayedUrl} alt="File preview" className="h-56 w-full rounded-lg object-cover" />
            )}
            {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="justify-end">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload data-icon="inline-start" />
          Chọn lại file
        </Button>
      </CardFooter>
    </Card>
  );
}
