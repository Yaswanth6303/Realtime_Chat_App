import React from "react";
import { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  currentUserName: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserName,
}) => {
  switch (message.type) {
    case "message":
      const isCurrentUser = message.sender === currentUserName;
      return (
        <div
          className={`flex ${
            isCurrentUser ? "justify-end" : "justify-start"
          } mb-2`}
        >
          <div
            className={`max-w-[70%] px-3 py-2 rounded-lg ${
              isCurrentUser
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            {!isCurrentUser && (
              <div className="text-sm font-semibold text-gray-700 mb-1">
                {message.sender}
              </div>
            )}
            <div>{message.content}</div>
          </div>
        </div>
      );
    case "info":
      return (
        <div className="text-center text-green-600 mb-2">{message.message}</div>
      );
    case "error":
      return (
        <div className="text-center text-red-600 mb-2">{message.message}</div>
      );
    case "notification":
      return (
        <div className="text-center text-yellow-600 mb-2">
          {message.message}
        </div>
      );
    default:
      return null;
  }
};

export default MessageBubble;
