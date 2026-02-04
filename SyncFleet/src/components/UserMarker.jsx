// components/UserMarker.jsx
import React from "react";
import PropTypes from "prop-types";
import { Marker, Popup } from "react-leaflet";
import { createPulsingIcon } from "../utils/iconHelpers.js";

const STATUS_COLORS = {
  sos: "#DC2626",
  stationary: "#B91C1C",
  far: "#EAB308",
  outside: "#F59E0B",
};

const UserMarker = ({
  username,
  coords,
  color,
  markerType = "normal",
  deviationDistance,
  batteryLevel,
}) => {
  const resolvedColor =
    STATUS_COLORS[markerType] || color;

  return (
    <Marker
      position={coords}
      icon={createPulsingIcon(
        resolvedColor,
        username,
        markerType,
        batteryLevel
      )}
    >
      <Popup className="syncfleet-popup">
        <div className="flex flex-col gap-2 min-w-[180px] text-sm">

          {/* Username */}
          <div className="font-semibold text-[#111827]">
            {username}
          </div>

          {/* ALERTS */}
          {markerType === "sos" && (
            <div className="px-3 py-2 rounded-md bg-red-100 text-red-700 font-semibold text-xs">
              EMERGENCY · SOS ACTIVE
            </div>
          )}

          {markerType === "stationary" && (
            <div className="px-3 py-2 rounded-md bg-red-50 text-red-600 font-medium text-xs">
              User is stationary
            </div>
          )}

          {markerType === "outside" && (
            <div className="px-3 py-2 rounded-md bg-amber-100 text-amber-700 font-medium text-xs">
              Outside geofenced area
            </div>
          )}

          {markerType === "far" && (
            <div className="px-3 py-2 rounded-md bg-yellow-100 text-yellow-700 font-medium text-xs">
              {Math.round(deviationDistance)}m from group center
            </div>
          )}

          {/* Battery */}
          {batteryLevel !== null &&
            batteryLevel !== undefined && (
              <div
                className={`text-xs font-medium ${
                  batteryLevel < 0.15
                    ? "text-red-600"
                    : batteryLevel < 0.3
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                Battery: {Math.round(batteryLevel * 100)}%
                {batteryLevel < 0.15 && " (Low)"}
              </div>
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
  markerType: PropTypes.oneOf([
    "normal",
    "stationary",
    "far",
    "outside",
    "sos",
  ]),
  deviationDistance: PropTypes.number,
  batteryLevel: PropTypes.number,
};

export default UserMarker;
