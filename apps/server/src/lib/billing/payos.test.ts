import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPayosSignatureData, verifyPayosWebhookSignature } from "./payos";

describe("buildPayosSignatureData", () => {
  it("sorts keys alphabetically and joins key value pairs", () => {
    expect(buildPayosSignatureData({ orderCode: 123, amount: 3000, desc: "success" })).toBe(
      "amount=3000&desc=success&orderCode=123",
    );
  });
});

describe("verifyPayosWebhookSignature", () => {
  it("verifies a valid HMAC SHA256 signature", () => {
    const checksumKey = "test-checksum-key";
    const data = { orderCode: 123, amount: 3000, desc: "success" };
    const signatureData = buildPayosSignatureData(data);
    const signature = createHmac("sha256", checksumKey).update(signatureData).digest("hex");

    expect(verifyPayosWebhookSignature({ data, signature, checksumKey })).toBe(true);
  });

  it("rejects a bad signature", () => {
    const checksumKey = "test-checksum-key";
    const data = { orderCode: 123, amount: 3000, desc: "success" };

    expect(verifyPayosWebhookSignature({ data, signature: "0".repeat(64), checksumKey })).toBe(false);
  });

  it("rejects an overlong even-length hex signature", () => {
    const checksumKey = "test-checksum-key";
    const data = { orderCode: 123, amount: 3000, desc: "success" };

    expect(verifyPayosWebhookSignature({ data, signature: "0".repeat(66), checksumKey })).toBe(false);
  });
});
