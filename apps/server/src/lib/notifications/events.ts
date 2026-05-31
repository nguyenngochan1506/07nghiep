import { EventEmitter } from "events";

export const notificationEvents = new EventEmitter();

export type NotificationPayload = {
  userId: string;
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  createdAt: string;
};

export const emitNotification = (payload: NotificationPayload) => {
  notificationEvents.emit(`notification:${payload.userId}`, payload);
};
