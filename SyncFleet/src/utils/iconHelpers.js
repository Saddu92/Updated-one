// utils/iconHelpers.js
import L from "leaflet";

export const createPulsingIcon = (color, username, markerType, batteryLevel = null) => {
  const isSOS = markerType === "stationary" || markerType === "sos";
  const isLowBattery = batteryLevel !== null && batteryLevel < 0.15;
  const isOutside = markerType === "outside";
  const isFar = markerType === "far";

  // Battery icon SVG
  const batteryIcon = isLowBattery
    ? `<div style="position:absolute;top:-8px;right:-8px;z-index:10;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="18" height="12" rx="2" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
          <rect x="20" y="9" width="2" height="6" rx="1" fill="#ef4444"/>
          <text x="11" y="15" text-anchor="middle" fill="white" font-size="10" font-weight="bold">!</text>
        </svg>
      </div>`
    : "";

  // SOS icon SVG
  const sosIcon = isSOS
    ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);z-index:10;
          background:#ef4444;color:white;padding:2px 6px;border-radius:8px;
          font-weight:bold;font-size:10px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
          animation:sos-pulse 1s ease-in-out infinite;">
        SOS
      </div>`
    : "";

  const iconHtml = `
    <div style="position:relative;width:40px;height:40px;">
      ${batteryIcon}
      ${sosIcon}
      
      <!-- Outer pulsing ring for SOS -->
      ${
        isSOS
          ? `<span style="
          position:absolute;
          left:-5px;top:-5px;
          width:50px;height:50px;
          border-radius:50%;
          background:rgba(239, 68, 68, 0.4);
          animation:sos-ring 1.5s cubic-bezier(.4,0,.6,1) infinite;
          z-index:1;
        "></span>`
          : ""
      }
      
      <!-- Main marker circle -->
      <span style="
        position:absolute;
        left:5px;top:5px;
        width:30px;height:30px;
        border-radius:50%;
        background:${isSOS ? "#ef4444" : isOutside ? "#f59e0b" : isFar ? "#eab308" : color};
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        z-index:2;
        ${isSOS ? "animation:marker-blink 1s ease-in-out infinite;" : ""}
      "></span>
      
      <!-- Inner icon -->
      <span style="
        position:absolute;
        left:12px;top:12px;
        width:16px;height:16px;
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:3;
      ">
        ${
          isSOS
            ? `<svg width="16" height="16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="white"/>
            <text x="12" y="17" text-anchor="middle" fill="#ef4444" font-size="14" font-weight="bold">!</text>
          </svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="white"/>
          </svg>`
        }
      </span>
      
      <style>
        @keyframes sos-ring {
          0% { opacity: 0.8; transform:scale(1); }
          50% { opacity: 0.2; transform:scale(1.3); }
          100% { opacity: 0.8; transform:scale(1); }
        }
        @keyframes marker-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes sos-pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.1); }
        }
      </style>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

export const createGroupCenterIcon = () => {
  const iconHtml = `
    <div style="position:relative;width:32px;height:32px;">
      <span style="
        position:absolute;
        left:0;top:0;
        width:32px;height:32px;
        border-radius:50%;
        background:rgba(16, 185, 129, 0.3);
        animation:center-pulse 2s cubic-bezier(.4,0,.6,1) infinite;
      "></span>
      <span style="
        position:absolute;
        left:8px;top:8px;
        width:16px;height:16px;
        border-radius:50%;
        background:#10b981;
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      "></span>
      <style>
        @keyframes center-pulse {
          0% { opacity: 0.6; transform:scale(1); }
          50% { opacity: 0.2; transform:scale(1.5); }
          100% { opacity: 0.6; transform:scale(1); }
        }
      </style>
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};