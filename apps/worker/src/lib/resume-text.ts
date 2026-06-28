import { createHash } from "node:crypto";

import { env } from "@07nghiep/env/server";
import pdfParse from "pdf-parse";

const MIN_READABLE_TEXT_LENGTH = 50;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const PDF_MAGIC_BYTES = "%PDF";

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isPdfResponse(resumeUrl: string, contentType: string | null) {
  return (
    contentType?.toLowerCase().includes("application/pdf") ||
    new URL(resumeUrl).pathname.toLowerCase().endsWith(".pdf")
  );
}

async function readResponseWithLimit(response: Response) {
  const reader = response.body?.getReader();

  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_RESUME_BYTES) {
      throw new Error("Resume PDF exceeds the 5 MB limit.");
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
      throw new Error("Resume PDF exceeds the 5 MB limit.");
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
  assertPdfBytes(buffer);

  const parsed = await pdfParse(buffer);
  const text = normalizeWhitespace(parsed.text);

  if (text.length < MIN_READABLE_TEXT_LENGTH) {
    throw new Error("Resume PDF does not contain enough readable text.");
  }

  return {
    text,
    hash: createHash("sha256").update(text).digest("hex"),
  };
}
