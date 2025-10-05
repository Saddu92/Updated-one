import React, { useState } from "react";
import API from "../utils/axios";
import { JOIN_ROOM } from "@/utils/constant";
import { useNavigate } from "react-router-dom";

const JoinRoom = () => {
  const [code, setCode] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = async () => {
    setLoading(true);
    setResponse("");
    try {
      const res = await API.post(JOIN_ROOM, { code });
      setResponse("✅ " + res.data.message + " | Code: " + res.data.roomCode);
      navigate(`/room/${res.data.roomCode}/map`);
    } catch (err) {
      setResponse("❌ " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-4">
      <div className="bg-gray-900/70 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold mb-6 text-white text-center tracking-wide">
          Join Room
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter Room Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition"
            autoComplete="off"
          />
          <button
            onClick={handleJoinRoom}
            disabled={loading || !code}
            className="w-full mt-3 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 transition disabled:opacity-60"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
          {response && (
            <div
              className={`mt-3 text-center px-3 py-2 rounded-lg text-sm ${
                response.startsWith("✅")
                  ? "bg-green-700 text-white font-semibold"
                  : "bg-red-600 text-white border border-red-500"
              }`}
            >
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
