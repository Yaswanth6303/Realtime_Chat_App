import { WebSocket } from "ws";
import { Room, Message } from "../types";
import { EMPTY_ROOM_TIMEOUT, ROOM_INACTIVE_TIMEOUT } from "../config/constants";

export const generateRoomCode = (): string => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

export const broadcastUserCount = (room: Room) => {
  const userCountMessage: Message = {
    type: "userCount",
    count: room.sockets.size,
    message: `Current users in room: ${room.sockets.size}`,
  };

  room.sockets.forEach((_, clientSocket) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(JSON.stringify(userCountMessage));
    }
  });
};

export const startEmptyRoomTimer = (
  roomCode: string,
  rooms: Map<string, Room>
) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.emptyRoomTimer) {
    clearTimeout(room.emptyRoomTimer);
  }

  room.emptyRoomTimer = setTimeout(() => {
    if (room.sockets.size === 0) {
      console.log(`Removing empty room after timeout: ${roomCode}`);
      rooms.delete(roomCode);
    }
  }, EMPTY_ROOM_TIMEOUT);
};

export const cleanupInactiveRooms = (rooms: Map<string, Room>) => {
  const now = Date.now();

  rooms.forEach((room, roomCode) => {
    if (
      room.sockets.size === 0 &&
      now - room.lastActivityTimestamp > ROOM_INACTIVE_TIMEOUT
    ) {
      console.log(`Removing inactive room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  });
};
