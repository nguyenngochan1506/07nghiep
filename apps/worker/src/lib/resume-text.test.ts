import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfParseMock = vi.hoisted(() => vi.fn());

vi.mock("pdf-parse", () => ({
  default: pdfParseMock,
}));

async function importResumeText() {
  vi.resetModules();
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/07nghiep";
  process.env.BETTER_AUTH_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.AI_JOB_TIMEOUT_MS = "120000";

  return import("./resume-text");
}

describe("extractPdfTextFromUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    pdfParseMock.mockReset();
  });

  it("rejects oversized resume responses from content length", async () => {
    const { extractPdfTextFromUrl } = await importResumeText();
    vi.mocked(fetch).mockResolvedValue(
      new Response("%PDF-1.7", {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-length": String(5 * 1024 * 1024 + 1),
        },
      }),
    );

    await expect(extractPdfTextFromUrl("https://cdn.example.com/resume.pdf")).rejects.toThrow(
      "Resume PDF exceeds the 5 MB limit.",
    );
    expect(pdfParseMock).not.toHaveBeenCalled();
  });

  it("rejects non-PDF bytes even when the URL ends with pdf", async () => {
    const { extractPdfTextFromUrl } = await importResumeText();
    vi.mocked(fetch).mockResolvedValue(
      new Response("not a pdf", {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    );

    await expect(extractPdfTextFromUrl("https://cdn.example.com/resume.pdf")).rejects.toThrow(
      "Resume file is not a valid PDF.",
    );
    expect(pdfParseMock).not.toHaveBeenCalled();
  });
});
