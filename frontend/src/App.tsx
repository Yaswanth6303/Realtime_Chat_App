import React, { useState, useRef, useEffect } from "react";
import MessageBubble from "./components/MessageBubble";
import RoomForm from "./components/RoomForm";
import ChatInput from "./components/ChatInput";
import { useWebSocket } from "./hooks/useWebsocket";

const App: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  const messageContainerRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    messages,
    userCount,
    currentRoom,
    connectToServer,
    sendMessage,
  } = useWebSocket();

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateRoom = () => {
    if (userName && roomName) {
      sendMessage("create", { name: userName, roomName });
      setCurrentUserName(userName);
    }
  };

  const handleJoinRoom = () => {
    if (userName && roomCode) {
      sendMessage("join", { name: userName, roomCode });
      setCurrentUserName(userName);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage("message", { content: inputMessage.trim() });
      setInputMessage("");
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
            {!currentUserName && (
              <RoomForm
                userName={userName}
                roomName={roomName}
                roomCode={roomCode}
                onUserNameChange={setUserName}
                onRoomNameChange={setRoomName}
                onRoomCodeChange={setRoomCode}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
              />
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

            {currentUserName && currentRoom && (
              <>
                <div
                  ref={messageContainerRef}
                  className="h-96 overflow-y-auto border rounded mb-4 p-4"
                >
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={index}
                      message={message}
                      currentUserName={currentUserName}
                    />
                  ))}
                </div>

                <ChatInput
                  inputMessage={inputMessage}
                  onInputChange={setInputMessage}
                  onSendMessage={handleSendMessage}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
