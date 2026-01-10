// components/UsersPanel.jsx
import React from "react";
import PropTypes from "prop-types";
import { isOutsideGeofence } from "../utils/helper.js";
import haversine from "haversine-distance";

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
  creatorSocketId, // ✅ NEW
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:top-4 md:left-4 md:right-auto w-auto md:w-72 max-w-sm md:max-w-none bg-white/95 text-gray-800 border border-gray-200 rounded-xl shadow-lg z-[9999] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-sky-600 rounded-t-xl text-white font-semibold text-sm shadow-sm">
        <span>Active Users ({activeUsers.length})</span>
        <button
          onClick={onClose}
          className="text-white hover:text-sky-100 transition-all text-lg font-bold"
          aria-label="Close users panel"
        >
          ×
        </button>
      </div>

      {/* Users List */}
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 p-1">
        {activeUsers.map((user) => {
          const location = userLocations[user.socketId] || {};
          const batteryLevel = location.battery?.level ?? null;
          const outside = isOutsideGeofence(location?.coords, geofence);
          const isCreator = user.socketId === creatorSocketId;

          return (
            <div
              key={user.socketId}
              className={`flex items-center justify-between p-2 rounded transition ${
                location.isStationary ? "bg-red-50" : ""
              } ${isCreator ? "bg-yellow-50" : ""}`}
            >
              <div className="flex items-center gap-2 truncate flex-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: location.isStationary
                      ? "#ef4444"
                      : getUserColor(user.socketId),
                  }}
                />
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {user.username}
                      {user.socketId === mySocketId && " (You)"}
                    </span>
                    {/* ✅ Creator Badge */}
                    {isCreator && (
                      <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                        👑 Leader
                      </span>
                    )}
                  </div>
                  {/* ✅ Show distance from creator for non-creators */}
                  {!isCreator && geofence.center && location.coords && (
                    <span className="text-xs text-gray-500">
                      {Math.round(
                        haversine(location.coords, geofence.center)
                      )}m from leader
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs">
                {/* Battery */}
                {batteryLevel !== null && (
                  <span
                    className={`font-medium ${
                      batteryLevel < 0.15
                        ? "text-red-600"
                        : batteryLevel < 0.3
                        ? "text-orange-500"
                        : "text-emerald-600"
                    }`}
                    title={`Battery: ${Math.round(batteryLevel * 100)}%`}
                  >
                    🔋{Math.round(batteryLevel * 100)}%
                    {location.battery?.charging ? "⚡" : ""}
                  </span>
                )}

                {/* Outside geofence - only for non-creators */}
                {!isCreator && outside && (
                  <span className="text-orange-500 font-semibold">⚠️ FAR</span>
                )}

                {/* SOS */}
                {location.isStationary && (
                  <span className="text-red-600 font-bold">🚨 SOS</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trail Duration */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <label className="text-xs text-gray-600 mb-1 block">
          Trail Duration (minutes)
        </label>
        <select
          value={trailDuration}
          onChange={(e) => setTrailDuration(Number(e.target.value))}
          className="w-full p-2 border border-gray-200 rounded text-sm bg-white text-gray-700 focus:ring-1 focus:ring-sky-300 focus:border-sky-300"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
        </select>
      </div>

      {/* Geofence Radius */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <label className="text-xs text-gray-600 mb-1 block">
          Geofence Radius (meters) - Leader's Area
        </label>
        <input
          type="number"
          min={100}
          max={2000}
          step={50}
          value={geofenceRadius}
          onChange={(e) => setGeofenceRadius(Number(e.target.value))}
          className="w-full p-2 border border-gray-200 rounded text-sm bg-white text-gray-700 focus:ring-1 focus:ring-sky-300 focus:border-sky-300"
        />
        <p className="text-xs text-gray-500 mt-1">
          All members should stay within this distance from the leader
        </p>
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
  creatorSocketId: PropTypes.string,
};

export default UsersPanel;