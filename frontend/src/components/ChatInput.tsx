import React from "react";

interface ChatInputProps {
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  onInputChange,
  onSendMessage,
}) => {
  return (
    <div className="flex">
      <input
        type="text"
        placeholder="Type your message..."
        value={inputMessage}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            onSendMessage();
          }
        }}
        className="flex-grow border rounded-l p-2"
      />
      <button
        onClick={onSendMessage}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r"
        disabled={!inputMessage.trim()}
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput;
