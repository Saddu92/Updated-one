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
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [destinationQuery]);

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !source || !destination) {
      setResponse("Please enter Room Name and select valid Source and Destination.");
      return;
    }
    setLoading(true);
    setResponse("");
    try {
      const res = await API.post(CREATE_ROOM, { roomName, source, destination });
      setResponse("Room Created: " + res.data.roomCode);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      setResponse("Error: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-4">
      <div className="bg-gray-900/70 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold mb-6 text-white text-center tracking-wide">
          Create New Room
        </h2>

        <div className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-gray-300 mb-1 font-medium" htmlFor="roomName">
              Room Name
            </label>
            <input
              id="roomName"
              type="text"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition"
            />
          </div>

          {/* Source */}
          <div className="relative">
            <label className="block text-gray-300 mb-1 font-medium" htmlFor="source">
              Source
            </label>
            <input
              id="source"
              type="text"
              placeholder="Search source location"
              value={sourceQuery}
              onChange={(e) => {
                setSourceQuery(e.target.value);
                setSource(null);
              }}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition"
              autoComplete="off"
            />
            {sourceSuggestions.length > 0 && (
              <ul className="absolute z-20 bg-gray-800 border border-gray-600 rounded-lg mt-1 w-full max-h-48 overflow-auto shadow-lg text-white">
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
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm break-words"
                  >
                    {place.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-gray-300 mb-1 font-medium" htmlFor="destination">
              Destination
            </label>
            <input
              id="destination"
              type="text"
              placeholder="Search destination location"
              value={destinationQuery}
              onChange={(e) => {
                setDestinationQuery(e.target.value);
                setDestination(null);
              }}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white py-2 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition"
              autoComplete="off"
            />
            {destinationSuggestions.length > 0 && (
              <ul className="absolute z-20 bg-gray-800 border border-gray-600 rounded-lg mt-1 w-full max-h-48 overflow-auto shadow-lg text-white">
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
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm break-words"
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
            className="w-full mt-3 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-600 transition disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>

          {/* Response */}
          {response && (
            <div
              className={`mt-3 text-center px-3 py-2 rounded-lg text-sm ${
                response.startsWith("Room Created")
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

export default CreateRoom;
