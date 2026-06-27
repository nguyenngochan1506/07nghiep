import { env } from "@07nghiep/env/server";
import { Resend } from "resend";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!resend) {
      console.log("[Email] RESEND_API_KEY not configured, logging email instead:");
      console.log(`  To: ${options.to}`);
      console.log(`  Subject: ${options.subject}`);
      console.log(`  Body preview: ${options.html.substring(0, 200)}...`);
      return true;
    }

    const { error } = await resend.emails.send({
      from: env.RESEND_FROM ?? "onboarding@resend.dev",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }

    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

export type OTPType = "sign-in" | "email-verification" | "forget-password";

export function generateOTPEmail(otp: string, type: OTPType) {
  let title = "";
  let message = "";

  switch (type) {
    case "sign-in":
      title = "Your Sign-In Code";
      message = "Enter the following code to sign in to your account:";
      break;
    case "email-verification":
      title = "Verify Your Email";
      message = "Enter the following code to verify your email address:";
      break;
    case "forget-password":
      title = "Reset Your Password";
      message = "Enter the following code to reset your password:";
      break;
  }

  return {
    subject: `Your ${title}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>${title}</h2>
    <p>Hello,</p>
    <p>${message}</p>
    <div class="code">${otp}</div>
    <p>This code expires in 5 minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
    <div class="footer">
      <p>Best regards,<br>The App Team</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}
