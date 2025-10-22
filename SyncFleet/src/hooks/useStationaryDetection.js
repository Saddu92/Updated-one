// hooks/useStationaryDetection.js
import { useRef, useCallback, useState } from "react";
import haversine from "haversine-distance";
import { STATIONARY_LIMIT, MOVEMENT_THRESHOLD } from "../utils/helper.js";

export const useStationaryDetection = ({ mySocketId, setUserLocations, emitSOS }) => {
  const lastPositionRef = useRef(null);
  const lastMovedAtRef = useRef(Date.now());
  const stationaryPromptTimeout = useRef(null);
  const [showStationaryPrompt, setShowStationaryPrompt] = useState(false);

  const checkStationary = useCallback(
    (newCoords) => {
      const lastCoords = lastPositionRef.current;
      const now = Date.now();

      if (lastCoords) {
        const distance = haversine(lastCoords, newCoords);
        if (distance > MOVEMENT_THRESHOLD) {
          // User moved - reset everything
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
        } else if (
          now - lastMovedAtRef.current > STATIONARY_LIMIT &&
          !showStationaryPrompt
        ) {
          // User has been stationary for 5+ minutes
          setShowStationaryPrompt(true);
          
          // Auto-send SOS after 30 seconds if no response
          stationaryPromptTimeout.current = setTimeout(() => {
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
          }, 30000);
        }
      } else {
        lastPositionRef.current = newCoords;
        lastMovedAtRef.current = now;
      }
    },
    [emitSOS, mySocketId, showStationaryPrompt, setUserLocations]
  );

    // Programmatically trigger the stationary prompt (used when server asks)
    const triggerStationaryPrompt = useCallback((message, timeout = 30000) => {
      setShowStationaryPrompt(true);
      clearTimeout(stationaryPromptTimeout.current);
      stationaryPromptTimeout.current = setTimeout(() => {
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
        } catch (e) {}
      }, timeout);
    }, [emitSOS, mySocketId, setUserLocations]);

  const handleStationaryYes = useCallback(() => {
    setShowStationaryPrompt(false);
    clearTimeout(stationaryPromptTimeout.current);
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
    } catch (e) {
      // ignore
    }
  }, [mySocketId, setUserLocations]);

  const handleStationaryNo = useCallback(() => {
    setShowStationaryPrompt(false);
    clearTimeout(stationaryPromptTimeout.current);
    
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
      // ignore
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