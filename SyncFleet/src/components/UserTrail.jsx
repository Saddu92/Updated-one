// components/UserTrail.jsx
import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";

const UserTrail = React.memo(
  ({ positions, color, weight = 4, dashArray, isAlert }) => {
    const map = useMap();

    const isMobile = useMemo(
      () => typeof window !== "undefined" && window.innerWidth < 768,
      []
    );

    useEffect(() => {
      if (!map || !positions || positions.length < 2) return;

      const resolvedColor = isAlert ? "#F59E0B" : color;

      const polyline = L.polyline(
        positions.map((p) => [p.lat, p.lng]),
        {
          color: resolvedColor,
          weight: isMobile ? Math.max(2, weight - 1) : weight,
          opacity: 0.65,
          dashArray,
          lineCap: "round",
          lineJoin: "round",
          className: "syncfleet-user-trail",
        }
      ).addTo(map);

      // Direction arrow (subtle, end only)
      const decorator = L.polylineDecorator(polyline, {
        patterns: [
          {
            offset: "100%",
            repeat: 0,
            symbol: L.Symbol.arrowHead({
              pixelSize: isMobile ? 8 : 10,
              polygon: false,
              pathOptions: {
                stroke: true,
                color: resolvedColor,
                opacity: 0.8,
                weight: 2,
              },
            }),
          },
        ],
      }).addTo(map);

      return () => {
        map.removeLayer(decorator);
        map.removeLayer(polyline);
      };
    }, [map, positions, color, weight, dashArray, isAlert, isMobile]);

    return null;
  }
);

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
