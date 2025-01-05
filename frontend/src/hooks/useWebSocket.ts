import { useState, useEffect } from 'react';
import { Message, RoomInfo } from '../types';

interface UseWebSocketReturn {
  isConnected: boolean;
  messages: Message[];
  userCount: number;
  currentRoom: RoomInfo | null;
  connectToServer: () => void;
  sendMessage: (action: string, data: any) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [userCount, setUserCount] = useState(0);

  const connectToServer = () => {
    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const parsedMessage = JSON.parse(event.data);
      
      if (parsedMessage.roomCode && parsedMessage.roomName) {
        setCurrentRoom({
          roomCode: parsedMessage.roomCode,
          roomName: parsedMessage.roomName
        });
        
        if (parsedMessage.chatHistory) {
          setMessages(parsedMessage.chatHistory);
        }
        
        if (parsedMessage.userCount !== undefined) {
          setUserCount(parsedMessage.userCount);
        }
      }

      if (parsedMessage.type === 'userCount') {
        setUserCount(parsedMessage.count);
        setMessages((prev) => [...prev, {
          type: 'notification',
          message: parsedMessage.message
        }]);
      }

      if (['message', 'info', 'error', 'notification'].includes(parsedMessage.type)) {
        setMessages((prev) => [...prev, parsedMessage]);
      }
    };
    ws.onclose = () => {
      setIsConnected(false);
      setMessages([]);
      setCurrentRoom(null);
      setUserCount(0);
    };
    setSocket(ws);
  };

  const sendMessage = (action: string, data: any) => {
    if (socket) {
      socket.send(JSON.stringify({ action, ...data }));
    }
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return {
    isConnected,
    messages,
    userCount,
    currentRoom,
    connectToServer,
    sendMessage
  };
};