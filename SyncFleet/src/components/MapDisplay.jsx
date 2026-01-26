// components/MapDisplay.jsx
import React from "react";
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
  const calculateDeviation = (userCoords) => {
    // ✅ Calculate deviation from geofence center (creator's position)
    if (!geofence.center || !userCoords) return 0;
    return haversine(geofence.center, userCoords);
  };

  return (
    <MapContainer
      center={coords}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Route Path */}
      {sourceCoords && destinationCoords && (
        <RoutePath source={sourceCoords} destination={destinationCoords} />
      )}

      {/* Geofence - Show if center exists */}
      {geofence.center && (
        <GeofenceCircle center={geofence.center} radius={geofence.radius} />
      )}

      {/* Hazards */}
      <HazardLayer hazards={visibleHazards} />

      {/* Recenter */}
      <RecenterMap coords={coords} shouldRecenter={shouldRecenter} />

      {/* Current User Marker */}
      <UserMarker
        username={isRoomCreator ? "You (Creator)" : "You"}
        coords={coords}
       color={
  userLocations[mySocketId]?.isStationary
    ? "#ef4444"
    : alertUsers[mySocketId] && !isRoomCreator
    ? "#f59e0b"
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
          const isActive = now - u.lastSeen < INACTIVE_THRESHOLD;
          if (!isActive) return null;

          

          const deviationDistance = calculateDeviation(u.coords);
          const isCreator = id === creatorSocketId;

          let markerType = null;
          if (u.isStationary) markerType = "stationary";
          else if (u.isSOS) markerType = "sos";
          // ✅ Only non-creators can be "outside" - and only if geofence is active
          else if (!isCreator && alertUsers[id])markerType = "outside";
          else if (!isCreator && deviationDistance > DEVIATION_THRESHOLD) markerType = "far";
          else markerType = "normal";

          return (
            <React.Fragment key={id}>
              <UserMarker
                username={isCreator ? `${u.username} (Creator)` : u.username}
                coords={u.coords}
                color={getUserColor(id)}
                markerType={u.isSOS ? "sos" : markerType}
                deviationDistance={deviationDistance}
                batteryLevel={u.battery?.level}
                networkStatus={u.networkStatus}

               
              />

              {/* Trail */}
              {u.path && u.path.length > 1 && (
                <UserTrail
                  positions={u.path}
                  color={
                    markerType === "stationary"
                      ? "#ef4444"
                      : markerType === "far"
                      ? "#eab308"
                      : markerType === "outside"
                      ? "#f59e0b"
                      : getUserColor(id)
                  }
                  weight={4}
                  dashArray={
                    markerType === "stationary" ||
                    markerType === "far" ||
                    markerType === "outside"
                      ? "5,5"
                      : null
                  }
                  isAlert={Boolean(markerType !== "normal")}
                />
              )}
            </React.Fragment>
          );
        })}
    </MapContainer>
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