import React, { useState, useEffect, useRef } from "react";

interface Message {
  type: 'message' | 'info' | 'error' | 'notification' | 'userCount';
  sender?: string;
  content?: string;
  message?: string;
  count?: number;
}

interface RoomInfo {
  roomCode: string;
  roomName: string;
  userCount?: number;
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [userCount, setUserCount] = useState<number>(0);

  const messageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const connectToServer = () => {
    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const parsedMessage = JSON.parse(event.data);
      
      // Handle room creation/joining
      if (parsedMessage.roomCode && parsedMessage.roomName) {
        setCurrentRoom({
          roomCode: parsedMessage.roomCode,
          roomName: parsedMessage.roomName
        });
        
        // Set initial chat history and user count
        if (parsedMessage.chatHistory) {
          setMessages(parsedMessage.chatHistory);
        }
        
        // Set initial user count
        if (parsedMessage.userCount !== undefined) {
          setUserCount(parsedMessage.userCount);
        }
      }

      // Handle user count updates
      if (parsedMessage.type === 'userCount') {
        setUserCount(parsedMessage.count);
        setMessages((prev) => [...prev, {
          type: 'notification',
          message: parsedMessage.message
        }]);
      }

      // Regular message handling
      if (['message', 'info', 'error', 'notification'].includes(parsedMessage.type)) {
        setMessages((prev) => [...prev, parsedMessage]);
      }
    };
    ws.onclose = () => {
      setIsConnected(false);
      setMessages([]);
      setCurrentUserName("");
      setCurrentRoom(null);
      setUserCount(0);
    };
    setSocket(ws);
  };

  const handleCreateRoom = () => {
    if (socket && userName && roomName) {
      socket.send(JSON.stringify({ 
        action: "create", 
        name: userName,
        roomName: roomName 
      }));
      setCurrentUserName(userName);
    }
  };

  const handleJoinRoom = () => {
    if (socket && userName && roomCode) {
      socket.send(JSON.stringify({ 
        action: "join", 
        name: userName, 
        roomCode 
      }));
      setCurrentUserName(userName);
    }
  };

  const handleSendMessage = () => {
    if (socket && inputMessage.trim()) {
      socket.send(
        JSON.stringify({ action: "message", content: inputMessage.trim() })
      );
      setInputMessage("");
    }
  };

  const renderMessageBubble = (message: Message, index: number) => {
    switch (message.type) {
      case 'message':
        const isCurrentUser = message.sender === currentUserName;
        return (
          <div 
            key={index} 
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}
          >
            <div 
              className={`max-w-[70%] px-3 py-2 rounded-lg ${
                isCurrentUser 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-black'
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
      case 'info':
        return (
          <div key={index} className="text-center text-green-600 mb-2">
            {message.message}
          </div>
        );
      case 'error':
        return (
          <div key={index} className="text-center text-red-600 mb-2">
            {message.message}
          </div>
        );
      case 'notification':
        return (
          <div key={index} className="text-center text-yellow-600 mb-2">
            {message.message}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-center text-blue-600">
          WebSocket Chat App
        </h1>

        {!isConnected ? (
          <button
            onClick={connectToServer}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded mt-4"
          >
            Connect to Server
          </button>
        ) : (
          <>
            <div className="my-4">
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full border rounded p-2 mb-2"
                disabled={currentUserName !== ""}
              />
              {!currentUserName && (
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Room Name"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full border rounded p-2"
                    />
                    <button
                      onClick={handleCreateRoom}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
                      disabled={!userName || !roomName}
                    >
                      Create Room
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Room Code (if joining)"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      className="w-full border rounded p-2"
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded"
                      disabled={!userName || !roomCode}
                    >
                      Join Room
                    </button>
                  </div>
                </>
              )}

              {currentUserName && currentRoom && (
                <div className="text-center text-blue-600 font-semibold mt-2">
                  Welcome, {currentUserName}! 
                  <br />
                  Room: {currentRoom.roomName} (Code: {currentRoom.roomCode})
                  <br />
                  Users: {userCount}
                </div>
              )}
            </div>

            {currentUserName && currentRoom && (
              <>
                <div 
                  ref={messageContainerRef}
                  className="h-96 overflow-y-auto border rounded mb-4 p-4"
                >
                  {messages.map((message, index) => 
                    renderMessageBubble(message, index)
                  )}
                </div>

                <div className="flex">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                    className="flex-grow border rounded-l p-2"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r"
                    disabled={!inputMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;