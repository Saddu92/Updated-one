import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/axios.js";
import { CREATE_ROOM } from "@/utils/constant";

const CreateRoom = () => {
  const [roomName, setRoomName] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceQuery.length > 2) {
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            sourceQuery
          )}`
        )
          .then((res) => res.json())
          .then((data) => setSourceSuggestions(data.slice(0, 5)))
          .catch(() => setSourceSuggestions([]));
      } else {
        setSourceSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sourceQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (destinationQuery.length > 2) {
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            destinationQuery
          )}`
        )
          .then((res) => res.json())
          .then((data) => setDestinationSuggestions(data.slice(0, 5)))
          .catch(() => setDestinationSuggestions([]));
      } else {
        setDestinationSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [destinationQuery]);

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !source || !destination) {
      setResponse("Please enter a room name and select valid locations.");
      return;
    }

    setLoading(true);
    setResponse("");
    try {
      const res = await API.post(CREATE_ROOM, {
        roomName,
        source,
        destination,
      });
      setResponse(`Room created • Code: ${res.data.roomCode}`);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      setResponse(
        err.response?.data?.message || "Failed to create room"
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-6 md:p-8">

        <h2 className="text-xl md:text-2xl font-semibold text-[#111827] text-center mb-6">
          Create a New Room
        </h2>

        <div className="space-y-4">

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Room name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Morning Commute"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>

          {/* Source */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Source location
            </label>
            <input
              type="text"
              value={sourceQuery}
              onChange={(e) => {
                setSourceQuery(e.target.value);
                setSource(null);
              }}
              placeholder="Search starting point"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              autoComplete="off"
            />

            {sourceSuggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full bg-white border border-[#E5E7EB] rounded-md shadow-lg max-h-48 overflow-auto">
                {sourceSuggestions.map((place) => (
                  <li
                    key={place.place_id}
                    onClick={() => {
                      setSource({
                        displayName: place.display_name,
                        lat: place.lat,
                        lon: place.lon,
                      });
                      setSourceQuery(place.display_name);
                      setSourceSuggestions([]);
                    }}
                    className="px-3 py-2 text-sm hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    {place.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Destination location
            </label>
            <input
              type="text"
              value={destinationQuery}
              onChange={(e) => {
                setDestinationQuery(e.target.value);
                setDestination(null);
              }}
              placeholder="Search destination"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              autoComplete="off"
            />

            {destinationSuggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full bg-white border border-[#E5E7EB] rounded-md shadow-lg max-h-48 overflow-auto">
                {destinationSuggestions.map((place) => (
                  <li
                    key={place.place_id}
                    onClick={() => {
                      setDestination({
                        displayName: place.display_name,
                        lat: place.lat,
                        lon: place.lon,
                      });
                      setDestinationQuery(place.display_name);
                      setDestinationSuggestions([]);
                    }}
                    className="px-3 py-2 text-sm hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    {place.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleCreateRoom}
            disabled={loading || !roomName || !source || !destination}
            className="w-full mt-2 py-2.5 rounded-md text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? "Creating room…" : "Create room"}
          </button>

          {/* Feedback */}
          {response && (
            <div
              className={`mt-3 px-3 py-2 rounded-md text-sm text-center ${
                response.startsWith("Room created")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
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

export default CreateRoom;
