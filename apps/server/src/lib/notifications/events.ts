import { EventEmitter } from "node:events";
import type { Prisma } from "@07nghiep/db";

export const notificationEvents = new EventEmitter();

export type NotificationPayload = {
  userId: string;
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Prisma.JsonValue;
  createdAt: string;
};

export const emitNotification = (payload: NotificationPayload) => {
  notificationEvents.emit(`notification:${payload.userId}`, payload);
};
