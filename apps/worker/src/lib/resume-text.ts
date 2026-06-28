import { createHash } from "node:crypto";

import { env } from "@07nghiep/env/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const MIN_READABLE_TEXT_LENGTH = 50;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const PDF_MAGIC_BYTES = "%PDF";
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ResumeKind = "pdf" | "docx" | "text";

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isPdfResponse(resumeUrl: string, contentType: string | null) {
  return (
    contentType?.toLowerCase().includes("application/pdf") ||
    new URL(resumeUrl).pathname.toLowerCase().endsWith(".pdf")
  );
}

function getResumeKind(resumeUrl: string, contentType: string | null): ResumeKind | null {
  const normalizedType = contentType?.toLowerCase() ?? "";
  const pathname = new URL(resumeUrl).pathname.toLowerCase();

  if (normalizedType.includes("application/pdf") || pathname.endsWith(".pdf")) {
    return "pdf";
  }

  if (normalizedType.includes(DOCX_MIME_TYPE) || pathname.endsWith(".docx")) {
    return "docx";
  }

  if (
    normalizedType.includes("text/plain") ||
    normalizedType.includes("text/markdown") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".md")
  ) {
    return "text";
  }

  return null;
}

async function readResponseWithLimit(response: Response, errorSubject = "Resume PDF") {
  const reader = response.body?.getReader();

  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_RESUME_BYTES) {
      throw new Error(`${errorSubject} exceeds the 5 MB limit.`);
    }
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESUME_BYTES) {
      await reader.cancel();
      throw new Error(`${errorSubject} exceeds the 5 MB limit.`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

function assertAllowedResumeUrl(resumeUrl: string) {
  const url = new URL(resumeUrl);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Resume URL must use http or https.");
  }
}

function assertPdfBytes(buffer: Buffer) {
  if (buffer.subarray(0, PDF_MAGIC_BYTES.length).toString("utf8") !== PDF_MAGIC_BYTES) {
    throw new Error("Resume file is not a valid PDF.");
  }
}

async function extractPdfText(buffer: Buffer) {
  assertPdfBytes(buffer);
  const parsed = await pdfParse(buffer);
  return normalizeWhitespace(parsed.text);
}

function buildResult(text: string) {
  if (text.length < MIN_READABLE_TEXT_LENGTH) {
    throw new Error("Resume file does not contain enough readable text.");
  }

  return {
    text,
    hash: createHash("sha256").update(text).digest("hex"),
  };
}

export async function extractPdfTextFromUrl(
  resumeUrl: string,
): Promise<{ text: string; hash: string }> {
  assertAllowedResumeUrl(resumeUrl);

  const response = await fetch(resumeUrl, { signal: AbortSignal.timeout(env.AI_JOB_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Failed to fetch resume PDF: ${response.status} ${response.statusText}`);
  }

  if (!isPdfResponse(resumeUrl, response.headers.get("content-type"))) {
    throw new Error("Resume URL did not return a PDF response.");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESUME_BYTES) {
    throw new Error("Resume PDF exceeds the 5 MB limit.");
  }

  const buffer = await readResponseWithLimit(response);
  const text = await extractPdfText(buffer);

  if (text.length < MIN_READABLE_TEXT_LENGTH) {
    throw new Error("Resume PDF does not contain enough readable text.");
  }

  return {
    text,
    hash: createHash("sha256").update(text).digest("hex"),
  };
}

export async function extractResumeTextFromUrl(
  resumeUrl: string,
): Promise<{ text: string; hash: string }> {
  assertAllowedResumeUrl(resumeUrl);

  const response = await fetch(resumeUrl, { signal: AbortSignal.timeout(env.AI_JOB_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Failed to fetch resume: ${response.status} ${response.statusText}`);
  }

  const kind = getResumeKind(resumeUrl, response.headers.get("content-type"));
  if (!kind) {
    throw new Error("Resume file type is not supported. Upload PDF, DOCX, TXT, or Markdown.");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESUME_BYTES) {
    throw new Error("Resume file exceeds the 5 MB limit.");
  }

  const buffer = await readResponseWithLimit(response, "Resume file");
  const text =
    kind === "pdf"
      ? await extractPdfText(buffer)
      : kind === "docx"
        ? normalizeWhitespace((await mammoth.extractRawText({ buffer })).value)
        : normalizeWhitespace(buffer.toString("utf8"));

  return buildResult(text);
}
