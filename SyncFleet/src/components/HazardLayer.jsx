import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

const createBlinkingWarningIcon = () => {
  const iconHtml = `
    <div style="position:relative;width:32px;height:32px;">
      <!-- Blinking pulse -->
      <span style="
        position:absolute;
        left:0;top:0;
        width:32px;height:32px;
        border-radius:50%;
        background:rgba(253, 224, 71, 0.5);
        animation:warn-blink 1s cubic-bezier(.4,0,.6,1) infinite;
        z-index:1;
        pointer-events:none;
      "></span>
      <!-- SVG Warning icon -->
      <span style="
        position:absolute;
        left:4px;top:4px;
        width:24px;height:24px;
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:2;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <polygon points="12,3 2,21 22,21" fill="#fde047" stroke="#f59e0b" stroke-width="2"/>
          <rect x="11" y="9" width="2" height="6" rx="1" fill="#b45309"/>
          <rect x="11" y="17" width="2" height="2" rx="1" fill="#b45309"/>
        </svg>
      </span>
      <style>
        @keyframes warn-blink {
          0% { opacity: 0.7; transform:scale(1);}
          50% { opacity: 0.1; transform:scale(1.5);}
          100% { opacity: 0.7; transform:scale(1);}
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

const HazardLayer = ({ hazards }) => {
  return (
    <>
      {hazards.map((h, idx) => (
        <Marker
          key={idx}
          position={[h.lat, h.lon]}
          icon={createBlinkingWarningIcon()}
        >
          <Popup>
            ⚠️ {h.type} reported by {h.userName}
            {typeof h.distanceM === "number" ? ` • ${h.distanceM}m away` : ""}
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default HazardLayer;
