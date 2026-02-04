import React, { useEffect, useState, useMemo } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import API from "@/utils/axios.js";
import { DIRECTIONS, GEOCODE } from "../utils/constant.js";

const RoutePath = ({ source, destination }) => {
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(false);

  const isMobile = useMemo(
    () => typeof window !== "undefined" && window.innerWidth < 768,
    []
  );

  useEffect(() => {
    const fetchRoute = async () => {
      if (!source || !destination) return;

      setLoading(true);
      try {
        const geocodeOne = (val) => {
          if (
            val &&
            typeof val === "object" &&
            val.lat != null &&
            val.lng != null
          ) {
            return API.get(GEOCODE, {
              params: { lat: val.lat, lon: val.lng },
            });
          }
          return API.get(GEOCODE, {
            params: { text: String(val) },
          });
        };

        const [srcResp, destResp] = await Promise.all([
          geocodeOne(source),
          geocodeOne(destination),
        ]);

        const src = srcResp.data;
        const dest = destResp.data;

        if (!src?.lat || !src?.lng || !dest?.lat || !dest?.lng) {
          setPath([]);
          return;
        }

        const routeResp = await API.get(DIRECTIONS, {
          params: {
            startLat: src.lat,
            startLng: src.lng,
            endLat: dest.lat,
            endLng: dest.lng,
          },
        });

        setPath(routeResp.data?.route || []);
      } catch (err) {
        console.error("❌ Route fetch failed", err);
        setPath([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [source, destination]);

  if (!source || !destination || path.length < 2) return null;

  return (
    <>
      {/* Route polyline */}
      <Polyline
        positions={path}
        pathOptions={{
          color: "#2563EB",
          weight: isMobile ? 3 : 4,
          opacity: 0.7,
          dashArray: "6,8",
        }}
      >
        <Tooltip sticky direction="top" offset={[0, -10]}>
          Planned Route
        </Tooltip>
      </Polyline>

      {/* Optional loading indicator (non-intrusive) */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] px-3 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-xs text-[#6B7280] shadow-sm">
          Calculating route…
        </div>
      )}
    </>
  );
};

export default RoutePath;
