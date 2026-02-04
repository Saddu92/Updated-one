// components/MapDisplay.jsx
import PropTypes from "prop-types";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import haversine from "haversine-distance";
import { createGroupCenterIcon } from "../utils/iconHelpers.js";
import { DEVIATION_THRESHOLD, INACTIVE_THRESHOLD,  } from "../utils/helper.js";
import RecenterMap from "./RecenterMap.jsx";
import GeofenceCircle from "./GeofenceCircle.jsx";
import UserMarker from "./UserMarker.jsx";
import UserTrail from "./UserTrail.jsx";
import HazardLayer from "./HazardLayer.jsx";
import RoutePath from "./RoutePath.jsx";
import Loader from "@/components/Loader";
import mapLoader from "@/assets/lottie/Travel.json";
import { useState } from "react";
const STATUS_COLORS = {
  normal: "#2563EB",     // Cool Blue
  stationary: "#DC2626", // Red (alert)
  outside: "#F59E0B",    // Amber
  far: "#EAB308",        // Warning
  sos: "#DC2626",        // SOS ONLY
};
const TRAIL_WEIGHT = window.innerWidth < 768 ? 3 : 4;



const MapDisplay = ({
  coords,
  mapRef,
  userLocations,
  mySocketId,
  getUserColor,
  geofence,
  alertUsers={},
  groupCenter,
  visibleHazards,
  sourceCoords,
  destinationCoords,
  user,
  shouldRecenter,
  isRoomCreator,
  creatorSocketId, // ✅ NEW
}) => {
  const [mapReady, setMapReady] = useState(false);
  const calculateDeviation = (userCoords) => {
    // ✅ Calculate deviation from geofence center (creator's position)
    if (!geofence.center || !userCoords) return 0;
    return haversine(geofence.center, userCoords);
  };

  return (
  <div className="relative h-full w-full">
    {/* ================= MAP LOADER ================= */}
    {!mapReady && (
      <div className="absolute inset-0 z-[9999] bg-white/90 backdrop-blur flex items-center justify-center">
        <Loader
          animation={mapLoader}
          size={140}
          text="Loading live map…"
        />
      </div>
    )}

    <MapContainer
      center={coords}
      zoom={15}
      ref={mapRef}
      zoomControl={false}
      className="h-full w-full rounded-none md:rounded-lg"
      whenReady={() => {
        // small delay = smoother UX
        setTimeout(() => setMapReady(true), 300);
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Route Path */}
      {sourceCoords && destinationCoords && (
        <RoutePath source={sourceCoords} destination={destinationCoords} />
      )}

      {/* Geofence */}
      {geofence.center && (
        <GeofenceCircle center={geofence.center} radius={geofence.radius} />
      )}

      {/* Hazards */}
      <HazardLayer hazards={visibleHazards} />

      {/* Recenter */}
      <RecenterMap coords={coords} shouldRecenter={shouldRecenter} />

      {/* Current User */}
      <UserMarker
        username={isRoomCreator ? "You (Creator)" : "You"}
        coords={coords}
        color={
          userLocations[mySocketId]?.isStationary
            ? STATUS_COLORS.stationary
            : alertUsers[mySocketId] && !isRoomCreator
            ? STATUS_COLORS.outside
            : getUserColor(mySocketId)
        }
        markerType={
          userLocations[mySocketId]?.isStationary
            ? "stationary"
            : alertUsers[mySocketId] && !isRoomCreator
            ? "outside"
            : "normal"
        }
        batteryLevel={userLocations[mySocketId]?.battery?.level}
        networkStatus={userLocations[mySocketId]?.networkStatus}
      />

      {/* Other Users */}
      {Object.entries(userLocations)
        .filter(([id]) => id !== mySocketId)
        .map(([id, u]) => {
          if (!u?.coords) return null;
          const now = Date.now();
          if (now - u.lastSeen >= INACTIVE_THRESHOLD) return null;

          const deviationDistance = calculateDeviation(u.coords);
          const isCreator = id === creatorSocketId;

          let markerType = "normal";
          if (u.isStationary) markerType = "stationary";
          else if (u.isSOS) markerType = "sos";
          else if (!isCreator && alertUsers[id]) markerType = "outside";
          else if (!isCreator && deviationDistance > DEVIATION_THRESHOLD)
            markerType = "far";

          return (
            <React.Fragment key={id}>
              <UserMarker
                username={isCreator ? `${u.username} (Creator)` : u.username}
                coords={u.coords}
                color={getUserColor(id)}
                markerType={markerType}
                deviationDistance={deviationDistance}
                batteryLevel={u.battery?.level}
                networkStatus={u.networkStatus}
              />

              {u.path && u.path.length > 1 && (
                <UserTrail
                  positions={u.path}
                  color={
                    markerType === "stationary"
                      ? STATUS_COLORS.stationary
                      : markerType === "far"
                      ? STATUS_COLORS.far
                      : markerType === "outside"
                      ? STATUS_COLORS.outside
                      : getUserColor(id)
                  }
                  weight={TRAIL_WEIGHT}
                  dashArray={markerType !== "normal" ? "6,6" : null}
                  isAlert={markerType !== "normal"}
                />
              )}
            </React.Fragment>
          );
        })}
    </MapContainer>
  </div>
);

};

MapDisplay.propTypes = {
  coords: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  mapRef: PropTypes.object,
  userLocations: PropTypes.object.isRequired,
  mySocketId: PropTypes.string,
  getUserColor: PropTypes.func.isRequired,
  geofence: PropTypes.shape({
    center: PropTypes.object,
    radius: PropTypes.number.isRequired,
  }).isRequired,
  groupCenter: PropTypes.object,
  visibleHazards: PropTypes.array.isRequired,
  sourceCoords: PropTypes.object,
  destinationCoords: PropTypes.object,
  user: PropTypes.object,
  shouldRecenter: PropTypes.bool,
  isRoomCreator: PropTypes.bool,
  creatorSocketId: PropTypes.string, // ✅ NEW
};

export default MapDisplay;