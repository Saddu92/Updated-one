// components/UserMarker.jsx
import React from "react";
import PropTypes from "prop-types";
import { Marker, Popup } from "react-leaflet";
import { createPulsingIcon } from "../utils/iconHelpers.js";

const UserMarker = ({ username, coords, color, markerType, deviationDistance, batteryLevel }) => {
  return (
    <Marker
      position={coords}
      icon={createPulsingIcon(
        markerType === "sos" || markerType === "stationary"
          ? "#ef4444"
          : markerType === "far"
          ? "#eab308"
          : markerType === "outside"
          ? "#f59e0b"
          : color,
        username,
        markerType,
        batteryLevel
      )}
    >
      <Popup className="font-medium">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-base">{username}</span>
          
          {(markerType === "stationary" || markerType === "sos") && (
            <span className="text-red-600 font-bold text-sm bg-red-100 px-2 py-1 rounded">
              🚨 SOS - NEEDS HELP
            </span>
          )}
          
          {markerType === "far" && (
            <span className="text-yellow-600 text-sm">
              ⚠️ {Math.round(deviationDistance)}m from group
            </span>
          )}
          
          {markerType === "outside" && (
            <span className="text-orange-600 font-bold text-sm">
              ⚠️ Outside geofenced area!
            </span>
          )}
          
          {batteryLevel !== null && batteryLevel !== undefined && (
            <span className={`text-xs font-medium ${
              batteryLevel < 0.15 
                ? "text-red-600" 
                : batteryLevel < 0.3 
                ? "text-orange-500" 
                : "text-green-600"
            }`}>
              🔋 Battery: {Math.round(batteryLevel * 100)}%
              {batteryLevel < 0.15 && " - LOW!"}
            </span>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

UserMarker.propTypes = {
  username: PropTypes.string.isRequired,
  coords: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  color: PropTypes.string.isRequired,
  markerType: PropTypes.oneOf(["normal", "stationary", "far", "outside", "sos"]),
  deviationDistance: PropTypes.number,
  batteryLevel: PropTypes.number,
};

export default UserMarker;