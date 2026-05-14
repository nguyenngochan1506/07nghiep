import { prisma } from "@07nghiep/db";
import { emitNotification } from "./events";

export type NotificationType = 
  | "APPLICATION_RECEIVED"
  | "APPLICATION_STATUS"
  | "MESSAGE"
  | "JOB_ALERT"
  | "SYSTEM";

export const createNotification = async (params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
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
      type: params.type as any,
      title: params.title,
      body: params.body,
      data: params.data,
    },
  });

  if (!pref || pref.pushEnabled) {
    emitNotification({
      ...notification,
      type: notification.type,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  if (!pref || pref.emailEnabled) {
    // TODO: Integrate Email Service (Resend/SendGrid)
    // This will be implemented in the next step
  }

  return notification;
};
