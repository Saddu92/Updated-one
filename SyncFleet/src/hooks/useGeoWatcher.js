// hooks/useGeoWatcher.js
import { useEffect, useRef, useState } from "react";
import { GEOLOCATION_TIMEOUT } from "../utils/helper.js";

export const useGeoWatcher = ({ isUserReady, user, onPositionUpdate }) => {
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const geolocationWatchId = useRef(null);

  useEffect(() => {
    if (!isUserReady || !user) return;

    let timeoutId;

    const handleSuccess = (position) => {
      clearTimeout(timeoutId);
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(coords);
      if (onPositionUpdate) onPositionUpdate(coords);
    };

    const handleError = (error) => {
      clearTimeout(timeoutId);
      let errorMessage = "Unable to get location.";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Location access denied. Please enable location permissions.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage =
            "Location unavailable. Please check your device settings.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = "An error occurred while getting your location.";
      }
      setLocationError(errorMessage);
      setCoords({ lat: 0, lng: 0 });
    };

    timeoutId = setTimeout(() => {
      handleError({ code: 3 });
    }, GEOLOCATION_TIMEOUT);

    if (navigator.geolocation) {
      geolocationWatchId.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT - 1000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setCoords({ lat: 0, lng: 0 });
    }

    return () => {
      clearTimeout(timeoutId);
      if (geolocationWatchId.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchId.current);
      }
    };
  }, [isUserReady, user, onPositionUpdate]);

  return { coords, locationError };
};