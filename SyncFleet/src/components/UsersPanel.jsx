// components/UsersPanel.jsx
import React from "react";
import PropTypes from "prop-types";
import { isOutsideGeofence } from "../utils/helper.js";

const UsersPanel = ({
  isOpen,
  onClose,
  activeUsers,
  userLocations,
  mySocketId,
  getUserColor,
  geofence,
  trailDuration,
  setTrailDuration,
  geofenceRadius,
  setGeofenceRadius,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-4 left-4 w-72 bg-gray-900/70 backdrop-blur-md rounded-xl shadow-2xl z-[9999] overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-green-600 rounded-t-xl text-white font-semibold text-sm shadow-md">
        <span>Active Users ({activeUsers.length})</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-all text-lg font-bold"
        >
          ×
        </button>
      </div>

      {/* Users List */}
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-700 scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-800">
        {activeUsers.map((user) => {
          const location = userLocations[user.socketId] || {};
          const batteryLevel = location.battery?.level ?? null;
          const outside = isOutsideGeofence(location?.coords, geofence);

          return (
            <div
              key={user.socketId}
              className={`flex items-center justify-between p-2 hover:bg-gray-800 rounded transition ${
                location.isStationary ? "bg-red-900/30" : ""
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: location.isStationary
                      ? "#ef4444"
                      : getUserColor(user.socketId),
                  }}
                />
                <span className="truncate text-sm font-medium text-white">
                  {user.username}
                  {user.socketId === mySocketId && " (You)"}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs">
                {/* Battery */}
                {batteryLevel !== null && (
                  <span
                    className={`font-medium ${
                      batteryLevel < 0.15
                        ? "text-red-500"
                        : batteryLevel < 0.3
                        ? "text-orange-400"
                        : "text-green-400"
                    }`}
                    title={`Battery: ${Math.round(batteryLevel * 100)}%`}
                  >
                    🔋{Math.round(batteryLevel * 100)}%
                    {location.battery?.charging ? "⚡" : ""}
                  </span>
                )}

                {/* Outside geofence */}
                {outside && (
                  <span className="text-orange-400 font-semibold">OUTSIDE!</span>
                )}

                {/* SOS */}
                {location.isStationary && (
                  <span className="text-red-500 font-bold">SOS</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trail Duration */}
      <div className="p-2 border-t border-gray-700">
        <label className="text-xs text-gray-400 mb-1 block">
          Trail Duration (minutes)
        </label>
        <select
          value={trailDuration}
          onChange={(e) => setTrailDuration(Number(e.target.value))}
          className="w-full p-1 border border-gray-600 rounded text-xs bg-gray-800 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
        </select>
      </div>

      {/* Geofence Radius */}
      <div className="p-2 border-t border-gray-700">
        <label className="text-xs text-gray-400 mb-1 block">
          Geofence Radius (meters)
        </label>
        <input
          type="number"
          min={100}
          max={2000}
          step={50}
          value={geofenceRadius}
          onChange={(e) => setGeofenceRadius(Number(e.target.value))}
          className="w-full p-1 border border-gray-600 rounded text-xs bg-gray-800 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
        />
      </div>
    </div>
  );
};

UsersPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  activeUsers: PropTypes.arrayOf(
    PropTypes.shape({
      socketId: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
    })
  ).isRequired,
  userLocations: PropTypes.object.isRequired,
  mySocketId: PropTypes.string,
  getUserColor: PropTypes.func.isRequired,
  geofence: PropTypes.shape({
    center: PropTypes.object,
    radius: PropTypes.number.isRequired,
  }).isRequired,
  trailDuration: PropTypes.number.isRequired,
  setTrailDuration: PropTypes.func.isRequired,
  geofenceRadius: PropTypes.number.isRequired,
  setGeofenceRadius: PropTypes.func.isRequired,
};

export default UsersPanel;