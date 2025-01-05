import { WebSocketServer, WebSocket } from "ws";
import { Room } from "./types";
import { SERVER_PORT, ROOM_CLEANUP_INTERVAL } from "./config/constants";
import { baseSchema } from "./validation/schemas";
import { cleanupInactiveRooms, startEmptyRoomTimer } from "./utils/roomUtils";
import {
  handleCreate,
  handleJoin,
  handleMessage,
} from "./handlers/messageHandlers";

const wss = new WebSocketServer({ port: SERVER_PORT });
const rooms: Map<string, Room> = new Map();
let userCount = 0;

// Set up periodic room cleanup
const roomCleanupInterval = setInterval(
  () => cleanupInactiveRooms(rooms),
  ROOM_CLEANUP_INTERVAL
);

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
          const result = handleCreate(socket, parsedMessage, rooms);
          userRoom = result.userRoom;
          userName = result.userName;
          break;
        }
        case "join": {
          const result = handleJoin(socket, parsedMessage, rooms);
          if (result) {
            userRoom = result.userRoom;
            userName = result.userName;
          }
          break;
        }
        case "message": {
          handleMessage(socket, parsedMessage, userRoom, rooms);
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

        room.sockets.forEach((_, clientSocket) => {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                type: "userCount",
                count: room.sockets.size,
                message: `Current users in room: ${room.sockets.size}`,
              })
            );
          }
        });
      } else {
        console.log(`Room '${userRoom}' is now empty. Starting removal timer.`);
        startEmptyRoomTimer(userRoom, rooms);
      }
    }

    userCount--;
    console.log(`User disconnected. Remaining users: ${userCount}`);
  });
});

process.on("SIGINT", () => {
  clearInterval(roomCleanupInterval);
  wss.close();
  process.exit();
});
