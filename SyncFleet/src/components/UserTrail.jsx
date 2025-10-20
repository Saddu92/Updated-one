// components/UserTrail.jsx
import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";

const UserTrail = React.memo(({ positions, color, weight = 4, dashArray, isAlert }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !positions || positions.length < 2) return;

    const polyline = L.polyline(
      positions.map((p) => [p.lat, p.lng]),
      {
        color: isAlert ? "#eab308" : color,
        weight,
        dashArray,
        className: "fading-trail",
      }
    ).addTo(map);

    const decorator = L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: "100%",
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            pathOptions: {
              color: isAlert ? "#eab308" : color,
              fillOpacity: 1,
              weight: 0,
            },
          }),
        },
      ],
    }).addTo(map);

    return () => {
      map.removeLayer(decorator);
      map.removeLayer(polyline);
    };
  }, [map, positions, color, weight, dashArray, isAlert]);

  return null;
});

UserTrail.propTypes = {
  positions: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
    })
  ).isRequired,
  color: PropTypes.string.isRequired,
  weight: PropTypes.number,
  dashArray: PropTypes.string,
  isAlert: PropTypes.bool,
};

UserTrail.displayName = "UserTrail";

export default UserTrail;