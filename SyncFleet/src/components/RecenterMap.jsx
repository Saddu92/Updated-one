// components/RecenterMap.jsx
import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useMap } from "react-leaflet";

const RecenterMap = React.memo(({ coords, shouldRecenter }) => {
  const map = useMap();

  useEffect(() => {
    // Only recenter if explicitly told to do so
    if (coords && shouldRecenter) {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }
  }, [coords, map, shouldRecenter]);

  // Initial centering
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }
  }, []); // Only run once on mount

  return null;
});

RecenterMap.propTypes = {
  coords: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }),
};

RecenterMap.displayName = "RecenterMap";

export default RecenterMap;