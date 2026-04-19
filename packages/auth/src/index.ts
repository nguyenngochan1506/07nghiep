import { createPrismaClient } from "@07nghiep/db";
import { env } from "@07nghiep/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, organization } from "better-auth/plugins";
import { sendEmail, generateOTPEmail, type OTPType } from "./plugins/email-templates";

export function createAuth() {
  const prisma = createPrismaClient();

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),

    session: {
      expiresIn: (env.SESSION_EXPIRY_DAYS ?? 7) * 24 * 60 * 60, // Convert days to seconds
    },
    trustedOrigins: env.CORS_ORIGIN,
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      emailOTP({
        expiresIn: 300, // 5 minutes for OTP
        async sendVerificationOTP({ email, otp, type }) {
          const { subject, html } = generateOTPEmail(otp, type as OTPType);
          await sendEmail({ to: email, subject, html });
        },
      }),
      organization({
        allowUserToCreateOrganization: false,
        organizationOwnershipRequired: false,
      }),
    ],
  });
}

export const auth = createAuth();
