import { createHmac, timingSafeEqual } from "node:crypto";
import { PayOS } from "@payos/node";
import type { CreatePaymentLinkRequest } from "@payos/node";
import { env } from "@07nghiep/env/server";

export type PayosCheckoutInput = CreatePaymentLinkRequest;

export type PayosCheckoutResult = {
  checkoutUrl: string;
  paymentLinkId: string;
};

function requirePayosEnv(name: "PAYOS_CLIENT_ID" | "PAYOS_API_KEY" | "PAYOS_CHECKSUM_KEY") {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required to create a payOS client`);
  }

  return value;
}

export function createPayosClient() {
  const clientId = requirePayosEnv("PAYOS_CLIENT_ID");
  const apiKey = requirePayosEnv("PAYOS_API_KEY");
  const checksumKey = requirePayosEnv("PAYOS_CHECKSUM_KEY");

  return new PayOS({ clientId, apiKey, checksumKey });
}

export function buildPayosSignatureData(data: Record<string, unknown>) {
  return Object.keys(data)
    .sort()
    .map((key) => `${key}=${String(data[key] ?? "")}`)
    .join("&");
}

export function verifyPayosWebhookSignature({
  data,
  signature,
  checksumKey = env.PAYOS_CHECKSUM_KEY,
}: {
  data: Record<string, unknown>;
  signature: string;
  checksumKey?: string;
}) {
  if (!checksumKey || signature.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(signature)) {
    return false;
  }

  const signatureData = buildPayosSignatureData(data);
  const expectedSignature = createHmac("sha256", checksumKey).update(signatureData).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function createPayosCheckout(input: PayosCheckoutInput): Promise<PayosCheckoutResult> {
  const payos = createPayosClient();
  const paymentLink = await payos.paymentRequests.create(input);

  return {
    checkoutUrl: paymentLink.checkoutUrl,
    paymentLinkId: paymentLink.paymentLinkId,
  };
}
