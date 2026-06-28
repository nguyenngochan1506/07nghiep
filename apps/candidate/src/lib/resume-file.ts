export const RESUME_ACCEPT =
  ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

const RESUME_MIME_BY_EXTENSION = new Map<string, string>([
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".txt", "text/plain"],
  [".md", "text/markdown"],
]);

const RESUME_MIME_TYPES = new Set(RESUME_MIME_BY_EXTENSION.values());

function getFileExtension(fileName: string) {
  const normalizedName = fileName.toLowerCase();
  const dotIndex = normalizedName.lastIndexOf(".");

  return dotIndex >= 0 ? normalizedName.slice(dotIndex) : "";
}

export function getResumeContentType(file: File) {
  if (RESUME_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  return RESUME_MIME_BY_EXTENSION.get(getFileExtension(file.name)) ?? null;
}

export function isAllowedResumeFile(file: File) {
  return getResumeContentType(file) !== null;
}
