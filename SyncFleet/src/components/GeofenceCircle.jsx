// components/GeofenceCircle.jsx
import React from "react";
import PropTypes from "prop-types";
import { Circle } from "react-leaflet";
import { useEffect, useRef } from "react";

const GeofenceCircle = ({ center, radius }) => {
  const circleRef = useRef(null);

  useEffect(() => {
    if (!circleRef.current || !center) return;

    circleRef.current.setLatLng(center);
    circleRef.current.setRadius(radius);
  }, [center, radius]);

  if (!center) return null;

  return (
    <Circle
      ref={circleRef}
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
