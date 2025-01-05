import React from "react";

interface RoomFormProps {
  userName: string;
  roomName: string;
  roomCode: string;
  onUserNameChange: (value: string) => void;
  onRoomNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const RoomForm: React.FC<RoomFormProps> = ({
  userName,
  roomName,
  roomCode,
  onUserNameChange,
  onRoomNameChange,
  onRoomCodeChange,
  onCreateRoom,
  onJoinRoom,
}) => {
  return (
    <div className="my-4">
      <input
        type="text"
        placeholder="Enter your name"
        value={userName}
        onChange={(e) => onUserNameChange(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      />
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => onRoomNameChange(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button
          onClick={onCreateRoom}
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
          onChange={(e) => onRoomCodeChange(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button
          onClick={onJoinRoom}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded"
          disabled={!userName || !roomCode}
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default RoomForm;
