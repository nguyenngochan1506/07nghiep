import { EventEmitter } from "events";

export const messageEvents = new EventEmitter();

export type MessagePayload = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export const emitMessage = (conversationId: string, payload: MessagePayload) => {
  messageEvents.emit(`message:${conversationId}`, payload);

  messageEvents.emit(`message:user:${payload.senderId}`, payload);
};

export const emitTyping = (conversationId: string, userId: string, userName: string | null) => {
  messageEvents.emit(`typing:${conversationId}`, { userId, userName });
};
