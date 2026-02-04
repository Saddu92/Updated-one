import React, { useState } from "react";
import API from "../utils/axios";
import { JOIN_ROOM } from "@/utils/constant";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const JoinRoom = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = async () => {
    if (!code.trim()) return;

    setLoading(true);
    try {
      const res = await API.post(JOIN_ROOM, { code });
      toast.success("Joined room successfully");
      navigate(`/room/${res.data.roomCode}/map`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-lg p-6 md:p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-[#2563EB]">
            Join a Room
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Enter the room code shared with you
          </p>
        </div>

        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Room code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A9F3Q2"
              autoComplete="off"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm tracking-widest focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>

          {/* Action */}
          <button
            onClick={handleJoinRoom}
            disabled={loading || !code}
            className="w-full mt-2 py-2.5 rounded-md text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? "Joining…" : "Join room"}
          </button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-center text-[#6B7280] mt-5">
          You’ll be redirected to the live map once you join.
        </p>
      </div>
    </div>
  );
};

export default JoinRoom;
