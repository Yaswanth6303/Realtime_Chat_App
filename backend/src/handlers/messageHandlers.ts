import { WebSocket } from "ws";
import { Room, Message } from "../types";
import { createSchema, joinSchema, messageSchema } from "../validation/schemas";
import { generateRoomCode, broadcastUserCount } from "../utils/roomUtils";

export const handleCreate = (
  socket: WebSocket,
  data: any,
  rooms: Map<string, Room>
): { userRoom: string; userName: string } => {
  const validation = createSchema.parse(data);
  const { name, roomName } = validation;

  const newRoomCode = generateRoomCode();
  const newRoom: Room = {
    code: newRoomCode,
    name: roomName,
    sockets: new Map(),
    chatHistory: [],
    lastActivityTimestamp: Date.now(),
  };

  newRoom.sockets.set(socket, name);
  rooms.set(newRoomCode, newRoom);

  socket.send(
    JSON.stringify({
      type: "info",
      message: `Room '${roomName}' created with code '${newRoomCode}'. You have joined the room as '${name}'.`,
      roomCode: newRoomCode,
      roomName: roomName,
      chatHistory: [],
      userCount: newRoom.sockets.size,
    })
  );

  broadcastUserCount(newRoom);
  console.log(
    `Room '${newRoomCode}' created by '${name}' with name '${roomName}'.`
  );

  return { userRoom: newRoomCode, userName: name };
};

export const handleJoin = (
  socket: WebSocket,
  data: any,
  rooms: Map<string, Room>
): { userRoom: string; userName: string } | null => {
  const validation = joinSchema.parse(data);
  const { name, roomCode } = validation;

  const roomToJoin = rooms.get(roomCode);

  if (!roomToJoin) {
    socket.send(
      JSON.stringify({
        type: "error",
        message: `Room with code '${roomCode}' does not exist.`,
      })
    );
    return null;
  }

  if (roomToJoin.emptyRoomTimer) {
    clearTimeout(roomToJoin.emptyRoomTimer);
    roomToJoin.emptyRoomTimer = undefined;
  }

  if (roomToJoin.sockets.has(socket)) {
    socket.send(
      JSON.stringify({
        type: "error",
        message: `You are already in the room '${roomCode}'.`,
      })
    );
    return null;
  }

  roomToJoin.sockets.set(socket, name);
  roomToJoin.lastActivityTimestamp = Date.now();

  socket.send(
    JSON.stringify({
      type: "info",
      message: `You have joined the room '${roomToJoin.name}' (${roomCode}) as '${name}'.`,
      roomCode: roomCode,
      roomName: roomToJoin.name,
      chatHistory: roomToJoin.chatHistory,
      userCount: roomToJoin.sockets.size,
    })
  );

  roomToJoin.sockets.forEach((_, clientSocket) => {
    if (clientSocket !== socket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          type: "notification",
          message: `${name} has joined the room.`,
        })
      );
    }
  });

  broadcastUserCount(roomToJoin);
  console.log(`User '${name}' joined room '${roomCode}'.`);

  return { userRoom: roomCode, userName: name };
};

export const handleMessage = (
  socket: WebSocket,
  data: any,
  userRoom: string | null,
  rooms: Map<string, Room>
): void => {
  const validation = messageSchema.parse(data);
  const { content } = validation;

  if (!userRoom || !rooms.has(userRoom)) {
    socket.send(
      JSON.stringify({
        type: "error",
        message: "You are not in a room. Join or create a room first.",
      })
    );
    return;
  }

  const room = rooms.get(userRoom)!;
  const senderName = room.sockets.get(socket) || "Unknown";

  room.lastActivityTimestamp = Date.now();

  const messageObj: Message = {
    type: "message",
    sender: senderName,
    content,
  };

  room.chatHistory.push(messageObj);

  room.sockets.forEach((_, clientSocket) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(JSON.stringify(messageObj));
    }
  });
};
