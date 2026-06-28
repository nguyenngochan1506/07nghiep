import { beforeEach, describe, expect, it, vi } from "vitest";

import { generatePresignedUploadUrl, isStorageConfigured } from "@07nghiep/storage";

import { profileRouter } from "./profile";

vi.mock("@07nghiep/storage", () => ({
  RESUME_MIME_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
  generatePresignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: "https://storage.example.com/upload",
    publicUrl: "https://cdn.example.com/resume.docx",
    key: "resumes/user_1/resume.docx",
    expiresIn: 900,
  }),
  getFileUrl: vi.fn(),
  isStorageConfigured: vi.fn().mockReturnValue(true),
}));

function createCandidateCtx() {
  return {
    session: { user: { id: "user_1" } },
    user: { id: "user_1" },
    role: "CANDIDATE",
    prisma: {},
  } as never;
}

describe("profileRouter uploadResume", () => {
  beforeEach(() => {
    vi.mocked(generatePresignedUploadUrl).mockClear();
    vi.mocked(isStorageConfigured).mockReturnValue(true);
  });

  it.each([
    ["resume.pdf", "application/pdf"],
    [
      "resume.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["resume.txt", "text/plain"],
    ["resume.md", "text/markdown"],
  ])("accepts %s resumes", async (filename, contentType) => {
    const caller = profileRouter.createCaller(createCandidateCtx());

    await expect(caller.uploadResume({ filename, contentType })).resolves.toEqual(
      expect.objectContaining({
        uploadUrl: "https://storage.example.com/upload",
      }),
    );
    expect(generatePresignedUploadUrl).toHaveBeenCalledWith(
      "resume",
      "user_1",
      filename,
      contentType,
    );
  });

  it("rejects unsupported resume file types", async () => {
    const caller = profileRouter.createCaller(createCandidateCtx());

    await expect(
      caller.uploadResume({ filename: "resume.png", contentType: "image/png" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(generatePresignedUploadUrl).not.toHaveBeenCalled();
  });
});
