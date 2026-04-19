import nodemailer from "nodemailer";
import { env } from "@07nghiep/env/server";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // Fallback: just log emails in development
      return null;
    }
  }
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailTransporter = getTransporter();

    if (!mailTransporter) {
      console.log("[Email] SMTP not configured, logging email instead:");
      console.log(`  To: ${options.to}`);
      console.log(`  Subject: ${options.subject}`);
      console.log(`  Body preview: ${options.html.substring(0, 200)}...`);
      return true;
    }

    await mailTransporter.sendMail({
      from: env.SMTP_FROM ?? "noreply@app.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

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
