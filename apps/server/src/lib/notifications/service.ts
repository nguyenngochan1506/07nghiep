import { prisma, type NotificationType, type Prisma } from "@07nghiep/db";
import { emitNotification } from "./events";
import { sendEmail } from "./email";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const createNotification = async (params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}) => {
  // Check preferences
  const pref = await prisma.notificationPreference.findUnique({
    where: {
      userId_type: {
        userId: params.userId,
        type: params.type,
      },
    },
  });

  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  // Push notification via SSE
  if (!pref || pref.pushEnabled) {
    emitNotification({
      ...notification,
      type: notification.type,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  // Email notification
  if ((!pref || pref.emailEnabled) && notification.user.email) {
    const safeTitle = escapeHtml(params.title);
    const safeBody = escapeHtml(params.body);

    await sendEmail({
      to: notification.user.email,
      subject: params.title,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">${safeTitle}</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">${safeBody}</p>
          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
            Đây là thông báo tự động từ 07nghiep Job Board. Bạn có thể thay đổi cài đặt nhận thông báo trong trang cá nhân.
          </div>
        </div>
      `,
    });
  }

  return notification;
};
