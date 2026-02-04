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
  creatorSocketId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:top-4 md:left-4 md:right-auto md:w-80 bg-white text-[#111827] border border-[#E5E7EB] rounded-xl shadow-lg z-[9999] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-white">
        <span className="text-sm font-semibold">
          Active Users ({activeUsers.length})
        </span>
        <button
          onClick={onClose}
          className="text-[#6B7280] hover:text-[#111827] text-lg"
          aria-label="Close users panel"
        >
          ×
        </button>
      </div>

      {/* Users list */}
      <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9]">
        {activeUsers.map((user) => {
          const location = userLocations[user.socketId] || {};
          const batteryLevel = location.battery?.level ?? null;
          const outside = isOutsideGeofence(location?.coords, geofence);
          const isCreator = user.socketId === creatorSocketId;

          return (
            <div
              key={user.socketId}
              className={`flex items-center justify-between px-4 py-2 text-sm ${
                location.isStationary ? "bg-red-50" : ""
              }`}
            >
              {/* Left */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: location.isStationary
                      ? "#DC2626"
                      : getUserColor(user.socketId),
                  }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">
                    {user.username}
                    {user.socketId === mySocketId && " (You)"}
                  </span>

                  {!isCreator && geofence.center && location.coords && (
                    <span className="text-xs text-[#6B7280]">
                      {Math.round(
                        haversine(location.coords, geofence.center)
                      )} m from leader
                    </span>
                  )}

                  {isCreator && (
                    <span className="text-xs text-[#6B7280]">
                      Group leader
                    </span>
                  )}
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-0.5 text-xs">
                {batteryLevel != null && (
                  <span
                    className={`font-medium ${
                      batteryLevel < 0.15
                        ? "text-red-600"
                        : batteryLevel < 0.3
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {Math.round(batteryLevel * 100)}%
                  </span>
                )}

                {!isCreator && outside && (
                  <span className="text-amber-600 font-semibold">
                    Outside zone
                  </span>
                )}

                {location.isStationary && (
                  <span className="text-red-600 font-semibold">
                    SOS
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trail duration */}
      <div className="px-4 py-3 border-t border-[#E5E7EB]">
        <label className="block text-xs text-[#6B7280] mb-1">
          Trail duration
        </label>
        <select
          value={trailDuration}
          onChange={(e) => setTrailDuration(Number(e.target.value))}
          className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm focus:ring-2 focus:ring-blue-300"
        >
          <option value={5}>5 minutes</option>
          <option value={10}>10 minutes</option>
          <option value={15}>15 minutes</option>
        </select>
      </div>

      {/* Geofence radius (FIXED) */}
      <div className="px-4 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <label className="block text-xs font-medium text-[#374151] mb-1">
          Geofence radius (meters)
        </label>

        {/* Slider – safer than free input */}
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={geofenceRadius}
          onChange={(e) => setGeofenceRadius(Number(e.target.value))}
          className="w-full accent-[#2563EB]"
        />

        <div className="flex justify-between text-xs text-[#6B7280] mt-1">
          <span>100 m</span>
          <span className="font-semibold text-[#111827]">
            {geofenceRadius} m
          </span>
          <span>2000 m</span>
        </div>

        <p className="mt-1 text-xs text-[#6B7280]">
          Members should stay within this distance from the leader
        </p>
      </div>
    </div>
  );
};

UsersPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  activeUsers: PropTypes.array.isRequired,
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
