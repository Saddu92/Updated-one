// hooks/useStationaryDetection.js
import { useRef, useCallback, useState, useEffect } from "react";
import haversine from "haversine-distance";
import {
  STATIONARY_LIMIT,
  MOVEMENT_THRESHOLD,
  SOS_DURATION,
  STATIONARY_CONFIRM_TIMEOUT,
} from "../utils/helper.js";

export const useStationaryDetection = ({ mySocketId, setUserLocations, emitSOS }) => {
  const lastPositionRef = useRef(null);
  const lastMovedAtRef = useRef(Date.now());
  const stationaryPromptTimeout = useRef(null);
  const autoSOSTimeoutRef = useRef(null);
  const [showStationaryPrompt, setShowStationaryPrompt] = useState(false);

  const checkStationary = useCallback(
    (newCoords) => {
      const lastCoords = lastPositionRef.current;
      const now = Date.now();

      if (lastCoords) {
        const distance = haversine(lastCoords, newCoords);
        if (distance > MOVEMENT_THRESHOLD) {
          // User moved - reset everything
          console.log("[stationary] moved, resetting", { distance, MOVEMENT_THRESHOLD });
          lastMovedAtRef.current = now;
          lastPositionRef.current = newCoords;
          setUserLocations((prev) => ({
            ...prev,
            [mySocketId]: { 
              ...(prev[mySocketId] || {}), 
              isStationary: false,
              isSOS: false,
            },
          }));
          setShowStationaryPrompt(false);
          clearTimeout(stationaryPromptTimeout.current);
          clearTimeout(autoSOSTimeoutRef.current);
          autoSOSTimeoutRef.current = null;
        } else if (
          now - lastMovedAtRef.current > STATIONARY_LIMIT &&
          !showStationaryPrompt
        ) {
          // User has been stationary long enough
          console.log("[stationary] triggered prompt", {
            elapsed: now - lastMovedAtRef.current,
            limit: STATIONARY_LIMIT,
            timeout: STATIONARY_CONFIRM_TIMEOUT,
          });
          setShowStationaryPrompt(true);
          
          if (!autoSOSTimeoutRef.current) {
            console.log("[stationary] setting auto SOS timeout from checkStationary");
            autoSOSTimeoutRef.current = setTimeout(() => {
              console.log("[stationary] auto SOS after prompt timeout", {
                timeout: STATIONARY_CONFIRM_TIMEOUT,
              });
              setShowStationaryPrompt(false);
              setUserLocations((prev) => ({
                ...prev,
                [mySocketId]: { 
                  ...(prev[mySocketId] || {}), 
                  isStationary: true,
                  isSOS: true,
                },
              }));
              emitSOS();
              try {
                const socket = window.__syncFleetSocket;
                socket?.emit?.('stationary-response', { roomCode: window.__syncFleetRoomCode, response: 'no' });
              } catch (e) {
                console.error("[stationary] error emitting stationary-response(no)", e);
              }
              autoSOSTimeoutRef.current = null;
            }, STATIONARY_CONFIRM_TIMEOUT);
          }
        }
      } else {
        lastPositionRef.current = newCoords;
        lastMovedAtRef.current = now;
      }
    },
    [emitSOS, mySocketId, showStationaryPrompt, setUserLocations]
  );

  // Background interval to evaluate stationary state even if coords stop updating
  useEffect(() => {
    const intervalId = setInterval(() => {
      try {
        const now = Date.now();
        if (
          lastPositionRef.current &&
          now - lastMovedAtRef.current > STATIONARY_LIMIT &&
          !showStationaryPrompt
        ) {
          // Trigger prompt and start auto-send timeout
          setShowStationaryPrompt(true);
          if (!autoSOSTimeoutRef.current) {
            console.log("[stationary] setting auto SOS timeout from interval");
            autoSOSTimeoutRef.current = setTimeout(() => {
              setShowStationaryPrompt(false);
              setUserLocations((prev) => ({
                ...prev,
                [mySocketId]: {
                  ...(prev[mySocketId] || {}),
                  isStationary: true,
                  isSOS: true,
                },
              }));
              emitSOS();
              try {
                const socket = window.__syncFleetSocket;
                socket?.emit?.('stationary-response', { roomCode: window.__syncFleetRoomCode, response: 'no' });
              } catch (e) {
                console.error("[stationary] background event emit error", e);
              }
              autoSOSTimeoutRef.current = null;
            }, STATIONARY_CONFIRM_TIMEOUT);
          }
        }
      } catch (e) {
        console.error("[stationary] background check error", e);
      }
    }, 10000); // check every 10s

    return () => {
      clearInterval(intervalId);
      clearTimeout(stationaryPromptTimeout.current);
      clearTimeout(autoSOSTimeoutRef.current);
      autoSOSTimeoutRef.current = null;
    };
  }, [emitSOS, mySocketId, setUserLocations]);


    // Programmatically trigger the stationary prompt (used when server asks)
    const triggerStationaryPrompt = useCallback((message, timeout = STATIONARY_CONFIRM_TIMEOUT) => {
      setShowStationaryPrompt(true);
      if (!autoSOSTimeoutRef.current) {
        console.log("[stationary] setting auto SOS timeout from triggerStationaryPrompt");
        autoSOSTimeoutRef.current = setTimeout(() => {
          console.log("[stationary] triggerStationaryPrompt auto-no timeout", { timeout });
          setShowStationaryPrompt(false);
          // Auto 'no' (need help) on timeout
          setUserLocations((prev) => ({
            ...prev,
            [mySocketId]: {
              ...(prev[mySocketId] || {}),
              isStationary: true,
              isSOS: true,
            },
          }));
          emitSOS();
          try {
            const socket = window.__syncFleetSocket;
            socket?.emit?.('stationary-response', { roomCode: window.__syncFleetRoomCode, response: 'no' });
          } catch (e) {
            console.error("[stationary] triggerStationaryPrompt emit error", e);
          }
          autoSOSTimeoutRef.current = null;
        }, timeout);
      }
    }, [emitSOS, mySocketId, setUserLocations]);

  const handleStationaryYes = useCallback(() => {
    console.log("[stationary] user confirmed they are OK");
    setShowStationaryPrompt(false);
    clearTimeout(stationaryPromptTimeout.current);
    clearTimeout(autoSOSTimeoutRef.current);
    autoSOSTimeoutRef.current = null;
    lastMovedAtRef.current = Date.now();
    
    // Reset stationary status
    setUserLocations((prev) => ({
      ...prev,
      [mySocketId]: { 
        ...(prev[mySocketId] || {}), 
        isStationary: false,
        isSOS: false,
      },
    }));
    // Notify server that user is OK
    try {
      const socket = window.__syncFleetSocket; // global socket reference (set in app's socket init)
      socket?.emit?.('stationary-response', { roomCode: window.__syncFleetRoomCode, response: 'yes' });
      socket?.emit?.('clear-sos', { roomCode: window.__syncFleetRoomCode });
    } catch (e) {
      // ignore
    }
  }, [mySocketId, setUserLocations]);

  const handleStationaryNo = useCallback(() => {
    console.log("[stationary] user clicked NO -> SOS");
    setShowStationaryPrompt(false);
    clearTimeout(stationaryPromptTimeout.current);
    clearTimeout(autoSOSTimeoutRef.current);
    autoSOSTimeoutRef.current = null;
    
    // Mark as SOS immediately
    setUserLocations((prev) => ({
      ...prev,
      [mySocketId]: { 
        ...(prev[mySocketId] || {}), 
        isStationary: true,
        isSOS: true,
      },
    }));
    
    // Send SOS immediately
    emitSOS();
    // Notify server that user needs help
    try {
      const socket = window.__syncFleetSocket;
      socket?.emit?.('stationary-response', { roomCode: window.__syncFleetRoomCode, response: 'no' });
    } catch (e) {
      console.error("[stationary] handleStationaryNo emit error", e);
    }
  }, [emitSOS, mySocketId, setUserLocations]);

  return {
    checkStationary,
    showStationaryPrompt,
    handleStationaryYes,
    handleStationaryNo,
    triggerStationaryPrompt,
  };
};
