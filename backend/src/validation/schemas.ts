import { z } from "zod";

export const baseSchema = z.object({
  action: z.union([
    z.literal("create"),
    z.literal("join"),
    z.literal("message"),
  ]),
});

export const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().min(1, "Name is required"),
  roomName: z.string().min(1, "Room name is required"),
});

export const joinSchema = z.object({
  action: z.literal("join"),
  name: z.string().min(1, "Name is required"),
  roomCode: z.string().min(1, "Room code is required"),
});

export const messageSchema = z.object({
  action: z.literal("message"),
  content: z.string().min(1, "Message content is required"),
});
