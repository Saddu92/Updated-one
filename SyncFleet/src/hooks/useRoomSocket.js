// hooks/useRoomSocket.js
import { useEffect, useRef, useState } from "react";
import { getSocket } from "../utils/socket.js";
import { SOS_DURATION, INACTIVE_THRESHOLD, PATH_HISTORY_LIMIT } from "../utils/helper.js";

export const useRoomSocket = ({
  roomCode,
  user,
  isUserReady,
  trailExpiryMs,
  showToast,
  playAlertSound,
  onLocationUpdate,
  onAnomalyAlert,
  onUserJoined,
  onUserLeft,
  onRoomMessage,
  onRoomUsers,
  onCreatorIdentified, // ✅ NEW
}) => {
  const [mySocketId, setMySocketId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userLocations, setUserLocations] = useState({});
  const [alertUsers, setAlertUsers] = useState(new Set());
  const [userTrails, setUserTrails] = useState({});
  const [creatorSocketId, setCreatorSocketId] = useState(null); // ✅ NEW

  const stationaryCheckIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isUserReady || !user?.id) return;

    const socket = getSocket();

    const handleConnect = () => {
      setIsConnecting(false);
      setMySocketId(socket.id);
      socket.emit("join-room", {
        roomCode,
        username: user.name,
        userId: user.id,
      });
    };

    const handleDisconnect = () => {
      setIsConnecting(false);
      setMySocketId(null);
      showToast("Disconnected from server", "danger");
    };

    const handleUserJoined = ({ username, socketId, isCreator }) => {
      setActiveUsers((prev) => [
        ...prev.filter((u) => u.socketId !== socketId),
        { socketId, username, isCreator }, // ✅ Include isCreator
      ]);

      // ✅ Track creator socket ID
      if (isCreator) {
        setCreatorSocketId(socketId);
        if (onCreatorIdentified) {
          onCreatorIdentified(socketId);
        }
        console.log(`👑 Creator identified: ${username} (${socketId})`);
      }

      try {
        window.__syncFleetSocket = socket;
        window.__syncFleetRoomCode = roomCode;
      } catch (e) {
        // ignore
      }
      showToast(`${username} joined the room${isCreator ? ' (Creator)' : ''}`, "info");
      if (onUserJoined) onUserJoined({ username, socketId, isCreator });
    };

    const handleUserLeft = ({ socketId }) => {
      setUserLocations((prev) => {
        const newLocations = { ...prev };
        delete newLocations[socketId];
        return newLocations;
      });
      setActiveUsers((prev) => {
        const user = prev.find((u) => u.socketId === socketId);
        if (user) showToast(`${user.username} left the room`, "info");
        return prev.filter((u) => u.socketId !== socketId);
      });
      setAlertUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
      if (onUserLeft) onUserLeft({ socketId });
    };

    const handleLocationUpdate = ({ socketId, username, coords, isCreator }) => {
      const now = Date.now();
      setUserLocations((prev) => {
        const existing = prev[socketId] || {};
        const filteredPath = [
          ...(existing.path || []),
          { ...coords, timestamp: now },
        ]
          .filter((p) => now - p.timestamp <= trailExpiryMs)
          .slice(-PATH_HISTORY_LIMIT);
        
        return {
          ...prev,
          [socketId]: {
            ...existing,
            username,
            coords,
            isCreator: isCreator || false, // ✅ Store creator flag
            lastSeen: now,
            path: filteredPath,
          },
        };
      });

      // ✅ Update creator socket ID if this is creator
      if (isCreator && !creatorSocketId) {
        setCreatorSocketId(socketId);
        if (onCreatorIdentified) {
          onCreatorIdentified(socketId);
        }
        console.log(`👑 Creator position updated: ${username}`);
      }

      setUserTrails((prev) => ({
        ...prev,
        [socketId]: [...(prev[socketId] || []), { ...coords, timestamp: now }]
          .filter((p) => now - p.timestamp <= trailExpiryMs)
          .slice(-PATH_HISTORY_LIMIT),
      }));
      
      if (onLocationUpdate) onLocationUpdate({ socketId, username, coords, isCreator });
    };

    const handleAnomalyAlert = (data) => {
      const { socketId, username, type } = data;
      playAlertSound();
      const alertType = type === "sos" ? "danger" : "warning";
      showToast(
        type === "sos"
          ? `🚨 SOS triggered by ${username}`
          : `⚠️ ${username} deviated from group`,
        alertType
      );
      setAlertUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(socketId);
        return newSet;
      });

      if (type === "sos") {
        setUserLocations((prev) => ({
          ...prev,
          [socketId]: { ...(prev[socketId] || {}), isStationary: true },
        }));
        setTimeout(() => {
          setUserLocations((prev) => ({
            ...prev,
            [socketId]: { ...(prev[socketId] || {}), isStationary: false },
          }));
        }, SOS_DURATION);
      }

      setTimeout(() => {
        setAlertUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(socketId);
          return newSet;
        });
      }, SOS_DURATION);

      if (onAnomalyAlert) onAnomalyAlert(data);
    };

    const handleRoomMessage = ({ from, message }) => {
      if (message.type === "hazard" && from !== socket.id) {
        showToast(`⚠️ ${message.content}`, "warning");
      }

      if (message.type === "sos" && from !== socket.id) {
        playAlertSound();
        showToast(`🚨 SOS triggered by ${message.sender}`, "danger");
      }

      if (onRoomMessage) onRoomMessage({ from, message });
    };

    const handleRoomUsers = (users) => {
      setActiveUsers(users);
      
      // ✅ Find and set creator from user list
      const creator = users.find(u => u.isCreator);
      if (creator && creator.socketId !== creatorSocketId) {
        setCreatorSocketId(creator.socketId);
        if (onCreatorIdentified) {
          onCreatorIdentified(creator.socketId);
        }
        console.log(`👑 Creator found in user list: ${creator.username}`);
      }
      
      if (onRoomUsers) onRoomUsers(users);
    };

    const handleUserStationary = ({ socketId, username, since }) => {
      setUserLocations((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || {}),
          isStationary: true,
          stationarySince: since || Date.now(),
        },
      }));

      if (playAlertSound) playAlertSound();
      if (showToast) showToast(`${username} has been stationary`, "warning");
    };

    const handleUserStationaryCleared = ({ socketId, username }) => {
      setUserLocations((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || {}),
          isStationary: false,
          stationarySince: null,
        },
      }));

      if (showToast) showToast(`${username} is moving again`, "info");
    };

    const handleUserSOS = ({ socketId, username }) => {
      setUserLocations((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || {}),
          isStationary: true,
          isSOS: true,
        },
      }));
      
      if (playAlertSound) {
        playAlertSound();
      }
      
      if (showToast) {
        showToast(`🚨 SOS Alert from ${username}!`, "danger");
      }
    };

    if (!socket.connected) {
      setIsConnecting(true);
      socket.connect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("location-update", handleLocationUpdate);
    socket.on("anomaly-alert", handleAnomalyAlert);
    socket.on("user-stationary", handleUserStationary);
    socket.on('stationary-confirm', (data) => {
      try {
        window.dispatchEvent(new CustomEvent('syncfleet:stationary-confirm', { detail: data }));
      } catch (e) {
        // ignore
      }
    });
    socket.on("user-stationary-cleared", handleUserStationaryCleared);
    socket.on("user-sos", handleUserSOS);
    socket.on("room-message", handleRoomMessage);
    socket.on("room-users", handleRoomUsers);

    stationaryCheckIntervalRef.current = setInterval(() => {
      setUserLocations((prev) => {
        const now = Date.now();
        const updated = {};
        Object.entries(prev).forEach(([socketId, data]) => {
          const filteredPath = (data.path || []).filter(
            (p) => now - p.timestamp <= trailExpiryMs
          );
          updated[socketId] = {
            ...data,
            path: filteredPath,
          };
        });
        return updated;
      });
    }, 60000);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("location-update", handleLocationUpdate);
      socket.off("anomaly-alert", handleAnomalyAlert);
      socket.off("user-stationary", handleUserStationary);
      socket.off("user-stationary-cleared", handleUserStationaryCleared);
      socket.off("user-sos", handleUserSOS);
      socket.off("room-message", handleRoomMessage);
      socket.off("room-users", handleRoomUsers);
      clearInterval(stationaryCheckIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [
    isUserReady,
    user,
    roomCode,
    trailExpiryMs,
    showToast,
    playAlertSound,
    onLocationUpdate,
    onAnomalyAlert,
    onUserJoined,
    onUserLeft,
    onRoomMessage,
    onRoomUsers,
    onCreatorIdentified,
    creatorSocketId,
  ]);

  return {
    mySocketId,
    isConnecting,
    activeUsers,
    userLocations,
    alertUsers,
    userTrails,
    creatorSocketId, // ✅ Export creator socket ID
    setUserLocations,
    setAlertUsers,
  };
};