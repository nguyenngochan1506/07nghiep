import { createPrismaClient } from "@07nghiep/db";
import { env } from "@07nghiep/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, emailOTP, organization } from "better-auth/plugins";
import { sendEmail, generateOTPEmail, type OTPType } from "./plugins/email-templates";

export function createAuth() {
  const prisma = createPrismaClient();
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET;

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),

    session: {
      expiresIn: (env.SESSION_EXPIRY_DAYS ?? 7) * 24 * 60 * 60,
    },
    trustedOrigins: env.CORS_ORIGIN,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : undefined,
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "CANDIDATE",
          input: false,
        },
        isSuspended: {
          type: "boolean",
          defaultValue: false,
          input: false,
        },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
    plugins: [
      emailOTP({
        expiresIn: 300,
        async sendVerificationOTP({ email, otp, type }) {
          const { subject, html } = generateOTPEmail(otp, type as OTPType);
          await sendEmail({ to: email, subject, html });
        },
      }),
      organization({
        allowUserToCreateOrganization: false,
        organizationOwnershipRequired: false,
      }),
      customSession(async ({ user }) => {
        return {
          user: {
            ...user,
            role: (user as { role?: string }).role ?? "CANDIDATE",
          },
        };
      }),
    ],
  });
}

export const auth = createAuth();
