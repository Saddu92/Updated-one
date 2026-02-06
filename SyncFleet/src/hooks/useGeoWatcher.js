// hooks/useGeoWatcher.js
import { useEffect, useRef, useState } from "react";
import haversine from "haversine-distance";

export const useGeoWatcher = ({ enabled = true, user, onPositionUpdate }) => {
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const geolocationWatchId = useRef(null);
  const timeoutIdRef = useRef(null);

  // ✅ NEW: throttling & dedup refs
  const lastEmitTimeRef = useRef(0);
  const lastCoordsRef = useRef(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    const handleSuccess = (position) => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

      const newCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setCoords(newCoords);
      setLocationError(null);

      // 🚫 no user or callback
      if (!user || !onPositionUpdate) return;

      const now = Date.now();

      // ⏱️ HARD THROTTLE: 1 update / 2 seconds
      if (now - lastEmitTimeRef.current < 2000) return;

      // 📏 IGNORE GPS JITTER (<5 meters)
      if (lastCoordsRef.current) {
        const distance = haversine(lastCoordsRef.current, newCoords);
        if (distance < 5) return;
      }

      // ✅ allow emit
      lastEmitTimeRef.current = now;
      lastCoordsRef.current = newCoords;

      onPositionUpdate(newCoords);
    };

    const handleError = (error) => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

      let errorMessage = "Unable to get location.";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Location access denied. Please enable location permissions.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
        default:
          errorMessage = "An unknown location error occurred.";
      }

      setLocationError(errorMessage);
    };

    // ⏲️ safety timeout
    timeoutIdRef.current = setTimeout(() => {
      handleError({ code: 3 });
    }, 15000);

    // 📍 initial position
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // 👀 watch position
    geolocationWatchId.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (geolocationWatchId.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchId.current);
      }
    };
  }, [enabled, user]); // ❗ REMOVED onPositionUpdate from deps

  return { coords, locationError };
};