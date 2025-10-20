// components/GeofenceCircle.jsx
import React from "react";
import PropTypes from "prop-types";
import { Circle } from "react-leaflet";

const GeofenceCircle = ({ center, radius }) => {
  if (!center) return null;

  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{
        color: "#2563eb",
        fillColor: "#93c5fd",
        fillOpacity: 0.2,
      }}
    />
  );
};

GeofenceCircle.propTypes = {
  center: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }),
  radius: PropTypes.number.isRequired,
};

export default GeofenceCircle;