import "dotenv/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@07nghiep/env/server";

const isR2Configured =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME;

let r2Client: S3Client | null = null;

function getR2Config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error("R2 is not configured. Please set R2_* environment variables.");
  }

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucketName: R2_BUCKET_NAME,
  };
}

function getR2Client(): S3Client {
  const config = getR2Config();

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return r2Client;
}

export function isStorageConfigured(): boolean {
  return Boolean(isR2Configured && env.R2_PUBLIC_URL);
}

export function getPublicUrl(key: string): string {
  if (!env.R2_PUBLIC_URL) {
    throw new Error("R2_PUBLIC_URL is not configured");
  }
  const base = env.R2_PUBLIC_URL.replace(/\/$/, "");
  if (base.includes("cloudflarestorage.com")) {
    return `${base}/${env.R2_BUCKET_NAME}/${key}`;
  }
  return `${base}/${key}`;
}

export type UploadType = "resume" | "avatar" | "business-document" | "business-logo";

export const RESUME_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

const ALLOWED_MIME_TYPES: Record<UploadType, string[]> = {
  resume: [...RESUME_MIME_TYPES],
  avatar: ["image/jpeg", "image/png", "image/webp"],
  "business-document": [
    ...RESUME_MIME_TYPES,
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  "business-logo": ["image/jpeg", "image/png", "image/webp"],
};

export const MAX_FILE_SIZES: Record<UploadType, number> = {
  resume: 5 * 1024 * 1024, // 5MB
  avatar: 2 * 1024 * 1024, // 2MB
  "business-document": 10 * 1024 * 1024, // 10MB
  "business-logo": 2 * 1024 * 1024, // 2MB
};

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export async function generatePresignedUploadUrl(
  type: UploadType,
  userId: string,
  filename: string,
  contentType: string,
): Promise<PresignedUploadResult> {
  if (!isStorageConfigured()) {
    throw new Error("Storage is not configured");
  }

  const allowed = ALLOWED_MIME_TYPES[type];
  if (!allowed.includes(contentType)) {
    throw new Error(`Invalid content type for ${type}. Allowed: ${allowed.join(", ")}`);
  }

  const extension = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const timestamp = Date.now();
  const key = `${type}s/${userId}/${timestamp}.${extension}`;

  const { bucketName } = getR2Config();
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const expiresIn = 15 * 60; // 15 minutes
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    publicUrl: getPublicUrl(key),
    key,
    expiresIn,
  };
}

export async function deleteFile(key: string): Promise<void> {
  if (!isStorageConfigured()) {
    throw new Error("Storage is not configured");
  }

  const { bucketName } = getR2Config();
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}

export async function getFileUrl(key: string): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("Storage is not configured");
  }

  const { bucketName } = getR2Config();
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}
