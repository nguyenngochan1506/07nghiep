import { beforeEach, describe, expect, it, vi } from "vitest";

import { generatePresignedUploadUrl, isStorageConfigured } from "@07nghiep/storage";

import { businessApplicationRouter } from "./businessApplication";

vi.mock("@07nghiep/storage", () => ({
  generatePresignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: "https://storage.example.com/upload",
    publicUrl: "https://cdn.example.com/logo.png",
    key: "business-logos/user_1/logo.png",
    expiresIn: 900,
  }),
  isStorageConfigured: vi.fn().mockReturnValue(true),
}));

function createUserCtx() {
  return {
    session: { user: { id: "user_1" } },
    user: { id: "user_1" },
    role: "CANDIDATE",
    prisma: {},
  } as never;
}

describe("businessApplicationRouter uploadLogo", () => {
  beforeEach(() => {
    vi.mocked(generatePresignedUploadUrl).mockClear();
    vi.mocked(isStorageConfigured).mockReturnValue(true);
  });

  it.each([
    ["logo.jpg", "image/jpeg"],
    ["logo.png", "image/png"],
    ["logo.webp", "image/webp"],
  ])("accepts %s company logos", async (filename, contentType) => {
    const caller = businessApplicationRouter.createCaller(createUserCtx());

    await expect(caller.uploadLogo({ filename, contentType })).resolves.toEqual(
      expect.objectContaining({
        publicUrl: "https://cdn.example.com/logo.png",
      }),
    );
    expect(generatePresignedUploadUrl).toHaveBeenCalledWith(
      "business-logo",
      "user_1",
      filename,
      contentType,
    );
  });

  it("rejects non-image company logos", async () => {
    const caller = businessApplicationRouter.createCaller(createUserCtx());

    await expect(
      caller.uploadLogo({ filename: "license.pdf", contentType: "application/pdf" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(generatePresignedUploadUrl).not.toHaveBeenCalled();
  });
});
