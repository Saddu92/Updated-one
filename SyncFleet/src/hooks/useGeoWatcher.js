// hooks/useGeoWatcher.js
import { useEffect, useRef, useState } from "react";
import haversine from "haversine-distance";
import { GEOLOCATION_TIMEOUT, MOVEMENT_THRESHOLD } from "../utils/helper.js";

export const useGeoWatcher = ({ enabled = true, user, onPositionUpdate }) => {
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const geolocationWatchId = useRef(null);
  const timeoutIdRef = useRef(null);
  const lastSentRef = useRef({ coords: null, ts: 0 });
  const MIN_EMIT_MS =
    Number(import.meta.env.VITE_LOCATION_EMIT_MS) || 5000;

  useEffect(() => {
  // console.log("🧭 useGeoWatcher EFFECT STARTED");
  // console.log("enabled:", enabled);
  // console.log("navigator.geolocation:", !!navigator.geolocation);

    if (!enabled) return;

    const handleSuccess = (position) => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(coords);
      setLocationError(null); // ✅ Clear any previous errors
      if (user && onPositionUpdate) {
        const now = Date.now();
        const prev = lastSentRef.current;
        let shouldEmit = false;
        if (!prev.coords) {
          shouldEmit = true;
        } else {
          const distance = haversine(prev.coords, coords);
          if (distance >= MOVEMENT_THRESHOLD) {
            shouldEmit = true;
          } else if (now - prev.ts >= MIN_EMIT_MS) {
            shouldEmit = true;
          }
        }

        if (shouldEmit) {
          lastSentRef.current = { coords, ts: now };
          onPositionUpdate(coords);
        }
      }
    };

    const handleError = (error) => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      let errorMessage = "Unable to get location.";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Location access denied. Please enable location permissions in your browser settings.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage =
            "Location unavailable. Please check your device settings.";
          break;
        case error.TIMEOUT:
          errorMessage =
            "Location request timed out. Please check if location services are enabled and try again.";
          break;
        default:
          errorMessage = "An error occurred while getting your location.";
      }
      setLocationError(errorMessage);
      // ✅ Don't set coords to 0,0 - let user see the error instead
    };

    // ✅ Shorter timeout - 15 seconds instead of relying on GEOLOCATION_TIMEOUT
    timeoutIdRef.current = setTimeout(() => {
      handleError({ code: 3 }); // TIMEOUT error code
    }, 15000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      // 🔁 2️⃣ THEN start watching
      geolocationWatchId.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } else {
      setLocationError(
        "Geolocation is not supported by your browser. Please use a modern browser.",
      );
    }

    return () => {
      // console.log("🧹 useGeoWatcher CLEANUP");
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (geolocationWatchId.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchId.current);
      }
    };
  }, [enabled, user, onPositionUpdate]);

  return { coords, locationError };
};
