// hooks/useGeoWatcher.js
import { useEffect, useRef, useState } from "react";
import haversine from "haversine-distance";
import { GEOLOCATION_TIMEOUT, MOVEMENT_THRESHOLD } from "../utils/helper.js";

export const useGeoWatcher = ({ enabled = true, user, onPositionUpdate }) => {
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const geolocationWatchId = useRef(null);
  const timeoutIdRef = useRef(null);
  const retryTimerRef = useRef(null);
  const lastSentRef = useRef({ coords: null, ts: 0 });
  const latestCoordsRef = useRef(null);
  const consecutiveTimeoutsRef = useRef(0);
  const mountedRef = useRef(false);
  const MIN_EMIT_MS =
    Number(import.meta.env.VITE_LOCATION_EMIT_MS) || 5000;
  const POSITION_TIMEOUT_MS =
    Number(import.meta.env.VITE_GEO_POSITION_TIMEOUT_MS) ||
    Math.max(GEOLOCATION_TIMEOUT, 20000);
  const WATCH_MAX_AGE_MS =
    Number(import.meta.env.VITE_GEO_MAX_AGE_MS) || 15000;
  const RECOVERY_RETRY_MS =
    Number(import.meta.env.VITE_GEO_RECOVERY_RETRY_MS) || 4000;
  const MAX_SILENT_TIMEOUTS =
    Number(import.meta.env.VITE_GEO_MAX_SILENT_TIMEOUTS) || 2;

  useEffect(() => {
    mountedRef.current = true;

    const clearTimers = () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };

    const clearWatcher = () => {
      if (geolocationWatchId.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchId.current);
        geolocationWatchId.current = null;
      }
    };

    if (!enabled) {
      setIsLocating(false);
      setIsRecovering(false);
      return () => {
        mountedRef.current = false;
        clearTimers();
        clearWatcher();
      };
    }

    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by your browser. Please use a modern browser.",
      );
      setIsLocating(false);
      setIsRecovering(false);
      return () => {
        mountedRef.current = false;
      };
    }

    const handleSuccess = (position) => {
      clearTimers();
      consecutiveTimeoutsRef.current = 0;
      setIsLocating(false);
      setIsRecovering(false);

      const nextCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setCoords(nextCoords);
      latestCoordsRef.current = nextCoords;
      setLocationError(null);

      if (user && onPositionUpdate) {
        const now = Date.now();
        const prev = lastSentRef.current;
        let shouldEmit = false;

        if (!prev.coords) {
          shouldEmit = true;
        } else {
          const distance = haversine(prev.coords, nextCoords);
          if (distance >= MOVEMENT_THRESHOLD) {
            shouldEmit = true;
          } else if (now - prev.ts >= MIN_EMIT_MS) {
            shouldEmit = true;
          }
        }

        if (shouldEmit) {
          lastSentRef.current = { coords: nextCoords, ts: now };
          onPositionUpdate(nextCoords);
        }
      }
    };

    const startTracking = () => {
      clearWatcher();
      clearTimers();
      setIsLocating(true);
      setIsRecovering(false);

      timeoutIdRef.current = setTimeout(() => {
        handleError({ code: 3 });
      }, POSITION_TIMEOUT_MS + 5000);

      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: POSITION_TIMEOUT_MS,
        maximumAge: WATCH_MAX_AGE_MS,
      });

      geolocationWatchId.current = navigator.geolocation.watchPosition(
        handleSuccess,
        (error) => handleError(error, { fromWatch: true }),
        {
          enableHighAccuracy: true,
          timeout: POSITION_TIMEOUT_MS,
          maximumAge: WATCH_MAX_AGE_MS,
        },
      );
    };

    const scheduleRecovery = () => {
      clearWatcher();
      clearTimers();
      setIsLocating(false);
      setIsRecovering(true);
      retryTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        startTracking();
      }, RECOVERY_RETRY_MS);
    };

    const handleError = (error, { fromWatch = false } = {}) => {
      clearTimers();

      switch (error.code) {
        case error.PERMISSION_DENIED:
          consecutiveTimeoutsRef.current = 0;
          setIsLocating(false);
          setIsRecovering(false);
          clearWatcher();
          setLocationError(
            "Location access denied. Please enable location permissions in your browser settings.",
          );
          return;
        case error.POSITION_UNAVAILABLE:
          setLocationError(
            latestCoordsRef.current
              ? "Location signal is weak. Using your last known position while retrying."
              : "Location signal is weak. Retrying automatically.",
          );
          scheduleRecovery();
          return;
        case error.TIMEOUT:
          consecutiveTimeoutsRef.current += 1;
          if (
            latestCoordsRef.current ||
            fromWatch ||
            consecutiveTimeoutsRef.current <= MAX_SILENT_TIMEOUTS
          ) {
            setLocationError(
              latestCoordsRef.current
                ? "Live location is delayed. Keeping your last known position and retrying."
                : "Getting GPS lock is taking longer than expected. Retrying automatically.",
            );
            scheduleRecovery();
            return;
          }

          // Instead of stopping, keep retrying with exponential backoff
          const backoffDelay = Math.min(RECOVERY_RETRY_MS * Math.pow(2, consecutiveTimeoutsRef.current - MAX_SILENT_TIMEOUTS), 60000); // Cap at 1 minute
          setLocationError(
            latestCoordsRef.current
              ? `Live location is delayed. Keeping your last known position and retrying in ${Math.round(backoffDelay / 1000)} seconds.`
              : `Location is still unavailable. Retrying in ${Math.round(backoffDelay / 1000)} seconds.`,
          );
          retryTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            startTracking();
          }, backoffDelay);
          return;
        default:
          setIsLocating(false);
          setIsRecovering(false);
          setLocationError("An error occurred while getting your location.");
      }
    };

    startTracking();

    return () => {
      mountedRef.current = false;
      clearTimers();
      clearWatcher();
    };
  }, [
    enabled,
    user,
    onPositionUpdate,
    MAX_SILENT_TIMEOUTS,
    MIN_EMIT_MS,
    POSITION_TIMEOUT_MS,
    RECOVERY_RETRY_MS,
    WATCH_MAX_AGE_MS,
  ]);

  return { coords, locationError, isLocating, isRecovering };
};
