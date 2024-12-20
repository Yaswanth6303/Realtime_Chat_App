import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";

const wss = new WebSocketServer({ port: 8080 });

interface Room {
  code: string;
  name: string;
  sockets: Map<WebSocket, string>;
  chatHistory: Message[];
  lastActivityTimestamp: number;
  emptyRoomTimer?: NodeJS.Timeout;
}

interface Message {
  type: 'message' | 'info' | 'error' | 'notification' | 'userCount';
  sender?: string;
  content?: string;
  message?: string;
  count?: number;
}

// Configuration for room cleanup
const ROOM_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ROOM_INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const EMPTY_ROOM_TIMEOUT = 10 * 60 * 1000; // 10 minutes before removing an empty room

let userCount = 0;
const rooms: Map<string, Room> = new Map();

// Function to generate a unique room code
const generateRoomCode = (): string => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

// Define Zod schemas for validation
const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().min(1, "Name is required"),
  roomName: z.string().min(1, "Room name is required"),
});

const joinSchema = z.object({
  action: z.literal("join"),
  name: z.string().min(1, "Name is required"),
  roomCode: z.string().min(1, "Room code is required"),
});

const messageSchema = z.object({
  action: z.literal("message"),
  content: z.string().min(1, "Message content is required"),
});

// Base schema to identify action type
const baseSchema = z.object({
  action: z.union([
    z.literal("create"),
    z.literal("join"),
    z.literal("message"),
  ]),
});

// Function to broadcast user count to a room
const broadcastUserCount = (room: Room) => {
  const userCountMessage: Message = {
    type: 'userCount',
    count: room.sockets.size,
    message: `Current users in room: ${room.sockets.size}`
  };

  room.sockets.forEach((_, clientSocket) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(JSON.stringify(userCountMessage));
    }
  });
};

// Function to start an empty room removal timer
const startEmptyRoomTimer = (roomCode: string) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Clear any existing timer to prevent multiple timers
  if (room.emptyRoomTimer) {
    clearTimeout(room.emptyRoomTimer);
  }

  // Set a timer to remove the room if it remains empty
  room.emptyRoomTimer = setTimeout(() => {
    if (room.sockets.size === 0) {
      console.log(`Removing empty room after timeout: ${roomCode}`);
      rooms.delete(roomCode);
    }
  }, EMPTY_ROOM_TIMEOUT);
};

// Function to clean up inactive rooms
const cleanupInactiveRooms = () => {
  const now = Date.now();
  
  rooms.forEach((room, roomCode) => {
    // Remove room if no sockets and inactive for too long
    if (room.sockets.size === 0 && 
        now - room.lastActivityTimestamp > ROOM_INACTIVE_TIMEOUT) {
      console.log(`Removing inactive room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  });
};

// Set up periodic room cleanup
const roomCleanupInterval = setInterval(cleanupInactiveRooms, ROOM_CLEANUP_INTERVAL);

wss.on("connection", (socket) => {
  userCount++;
  console.log(`User connected. Total users: ${userCount}`);

  let userRoom: string | null = null;
  let userName: string | null = null;

  socket.on("message", (message) => {
    const messageText = message.toString();
    console.log(`Received message: ${messageText}`);

    try {
      const parsedMessage = JSON.parse(messageText);

      const baseValidation = baseSchema.safeParse(parsedMessage);
      if (!baseValidation.success) {
        throw new Error("Invalid action type");
      }

      switch (baseValidation.data.action) {
        case "create": {
          const validation = createSchema.parse(parsedMessage);
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

          userRoom = newRoomCode;
          userName = name;

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

          console.log(`Room '${newRoomCode}' created by '${name}' with name '${roomName}'.`);
          break;
        }

        case "join": {
          const validation = joinSchema.parse(parsedMessage);
          const { name, roomCode } = validation;

          const roomToJoin = rooms.get(roomCode);

          if (roomToJoin) {
            // If there's an empty room timer, clear it as the room is no longer empty
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
              return;
            }

            roomToJoin.sockets.set(socket, name);
            roomToJoin.lastActivityTimestamp = Date.now(); // Update last activity
            userRoom = roomCode;
            userName = name;

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
            console.log(`User '${name}' joined room '${roomCode}'.`);

            roomToJoin.sockets.forEach((_, clientSocket) => {
              if (
                clientSocket !== socket &&
                clientSocket.readyState === WebSocket.OPEN
              ) {
                clientSocket.send(
                  JSON.stringify({
                    type: "notification",
                    message: `${name} has joined the room.`,
                  })
                );
              }
            });

            broadcastUserCount(roomToJoin);
          } else {
            socket.send(
              JSON.stringify({
                type: "error",
                message: `Room with code '${roomCode}' does not exist.`,
              })
            );
          }
          break;
        }

        case "message": {
          const validation = messageSchema.parse(parsedMessage);
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

          // Update last activity timestamp
          room.lastActivityTimestamp = Date.now();

          const messageObj: Message = {
            type: 'message',
            sender: senderName,
            content
          };

          room.chatHistory.push(messageObj);

          room.sockets.forEach((_, clientSocket) => {
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify(messageObj));
            }
          });
          break;
        }

        default:
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid action. Use 'create', 'join', or 'message'.",
            })
          );
      }
    } catch (error: any) {
      console.error("Error processing message:", error);
      socket.send(
        JSON.stringify({
          type: "error",
          message: error.message || "Invalid message format.",
        })
      );
    }
  });

  socket.on("close", () => {
    if (userRoom && rooms.has(userRoom)) {
      const room = rooms.get(userRoom)!;
      const disconnectedUserName = room.sockets.get(socket) || "A user";

      room.sockets.delete(socket);
      
      // Update last activity timestamp when a user disconnects
      room.lastActivityTimestamp = Date.now();

      if (room.sockets.size > 0) {
        room.sockets.forEach((_, clientSocket) => {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                type: "notification",
                message: `${disconnectedUserName} has left the room.`,
              })
            );
          }
        });

        broadcastUserCount(room);
      } else {
        // Room is now empty, start a timer to potentially remove it
        console.log(`Room '${userRoom}' is now empty. Starting removal timer.`);
        startEmptyRoomTimer(userRoom);
      }
    }

    userCount--;
    console.log(`User disconnected. Remaining users: ${userCount}`);
  });
});

// Cleanup interval to prevent memory leaks
process.on('SIGINT', () => {
  clearInterval(roomCleanupInterval);
  wss.close();
  process.exit();
});