// components/MapDisplay.jsx
import React from "react";
import PropTypes from "prop-types";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import haversine from "haversine-distance";
import { createGroupCenterIcon } from "../utils/iconHelpers.js";
import { DEVIATION_THRESHOLD, INACTIVE_THRESHOLD, isOutsideGeofence } from "../utils/helper.js";
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
  groupCenter,
  visibleHazards,
  sourceCoords,
  destinationCoords,
  user,
  shouldRecenter,
  isRoomCreator,
}) => {
  const calculateDeviation = (userCoords) => {
    if (!groupCenter || !userCoords) return 0;
    return haversine(groupCenter, userCoords);
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

      {/* Geofence */}
      <GeofenceCircle center={geofence.center} radius={geofence.radius} />

      {/* Hazards */}
      <HazardLayer hazards={visibleHazards} />

      {/* Recenter */}
      <RecenterMap coords={coords} shouldRecenter={shouldRecenter} />

      {/* Current User Marker */}
      <UserMarker
        username="You"
        coords={coords}
        color={
          userLocations[mySocketId]?.isStationary
            ? "#ef4444"
            : isOutsideGeofence(coords, geofence)
            ? "#f59e0b"
            : getUserColor(mySocketId)
        }
        markerType={
          userLocations[mySocketId]?.isStationary
            ? "stationary"
            : isOutsideGeofence(coords, geofence)
            ? "outside"
            : "normal"
        }
        batteryLevel={userLocations[mySocketId]?.battery?.level}
      />

      {/* Other Users */}
      {Object.entries(userLocations)
        .filter(([id]) => id !== mySocketId)
        .map(([id, u]) => {
          if (!u?.coords) return null;
          const now = Date.now();
          const isActive = now - u.lastSeen < INACTIVE_THRESHOLD;
          if (!isActive) return null;

          const outside = isOutsideGeofence(u.coords, geofence);
          const deviationDistance = calculateDeviation(u.coords);

          let markerType = null;
          if (u.isStationary) markerType = "stationary";
        
          
          else if (deviationDistance > DEVIATION_THRESHOLD) markerType = "far";
          else if (outside) markerType = "outside";
          else markerType = "normal";

          return (
            <React.Fragment key={id}>
              <UserMarker
                username={u.username}
                coords={u.coords}
                color={getUserColor(id)}
                markerType={u.isSOS?"sos":markerType}
                deviationDistance={deviationDistance}
                batteryLevel={u.battery?.level}
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

      {/* Group Center */}
      {groupCenter && (
        <Marker position={groupCenter} icon={createGroupCenterIcon()}>
          <Popup>Group Center</Popup>
        </Marker>
      )}
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
};

export default MapDisplay;