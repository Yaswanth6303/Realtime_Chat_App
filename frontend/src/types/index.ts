export interface Message {
  type: "message" | "info" | "error" | "notification" | "userCount";
  sender?: string;
  content?: string;
  message?: string;
  count?: number;
}

export interface RoomInfo {
  roomCode: string;
  roomName: string;
  userCount?: number;
}
