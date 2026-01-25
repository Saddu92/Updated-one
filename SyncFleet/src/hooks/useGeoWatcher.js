// hooks/useGeoWatcher.js
import { useEffect, useRef, useState } from "react";
import { GEOLOCATION_TIMEOUT } from "../utils/helper.js";

export const useGeoWatcher = ({ isUserReady, user, onPositionUpdate }) => {
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const geolocationWatchId = useRef(null);
  const timeoutIdRef = useRef(null);

  useEffect(() => {
    if (!isUserReady || !user) return;

    const handleSuccess = (position) => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(coords);
      setLocationError(null); // ✅ Clear any previous errors
      if (onPositionUpdate) onPositionUpdate(coords);
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
          errorMessage = "Location request timed out. Please check if location services are enabled and try again.";
          break;
        default:
          errorMessage = "An error occurred while getting your location.";
      }
      setLocationError(errorMessage);
      // ✅ Don't set coords to 0,0 - let user see the error instead
    };

    // ✅ Shorter timeout - 15 seconds instead of relying on GEOLOCATION_TIMEOUT
    timeoutIdRef.current = setTimeout(() => {
      handleError({ code: 3, TIMEOUT: 3 }); // TIMEOUT error code
    }, 15000);

    if (navigator.geolocation) {
      geolocationWatchId.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds
          maximumAge: 0,
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser. Please use a modern browser.");
    }

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (geolocationWatchId.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchId.current);
      }
    };
  }, [isUserReady, user, onPositionUpdate]);

  return { coords, locationError };
};