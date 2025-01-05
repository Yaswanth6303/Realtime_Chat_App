import { WebSocket } from "ws";

export interface Room {
  code: string;
  name: string;
  sockets: Map<WebSocket, string>;
  chatHistory: Message[];
  lastActivityTimestamp: number;
  emptyRoomTimer?: NodeJS.Timeout;
}

export interface Message {
  type: "message" | "info" | "error" | "notification" | "userCount";
  sender?: string;
  content?: string;
  message?: string;
  count?: number;
}
