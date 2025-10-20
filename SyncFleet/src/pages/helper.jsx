// helpers.js
import L from "leaflet";
import haversine from "haversine-distance";

// Pulsing icon creation for markers
export function createPulsingIcon(color = "#3b82f6", username = "", markerType = null) {
  let pulseColor = color;
  if (markerType === "stationary") pulseColor = "#ef4444";
  else if (markerType === "far") pulseColor = "#eab308";
  else if (markerType === "outside") pulseColor = "#f59e0b";

  return L.divIcon({
    className: "custom-pulse-icon",
    html: `
      <div class="relative">
        <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-1 rounded text-xs font-medium whitespace-nowrap">${username}</div>
        ${
          markerType === "stationary"
            ? '<div class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>'
            : markerType === "far"
            ? '<div class="absolute -top-3 -right-3 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>'
            : markerType === "outside"
            ? '<div class="absolute -top-3 -right-3 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>'
            : ""
        }
        <div class="pulse-marker" style="
          background: ${pulseColor}20;
          border-color: ${pulseColor};
        "></div>
        <div class="absolute-center" style="color: ${pulseColor};">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="currentColor" stroke-width="2">
            <circle cx="12" cy="10" r="5" fill="white" />
            <circle cx="12" cy="10" r="3" />
            <path d="M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" fill="white" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Check if location is outside geofence circle
export function isOutsideGeofence(point, geofence) {
  if (!geofence.center || !point) return false;
  const distance = haversine(point, geofence.center);
  return distance > geofence.radius;
}
