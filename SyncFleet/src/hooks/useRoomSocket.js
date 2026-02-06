// hooks/useRoomSocket.js
import { useEffect, useRef, useState } from "react";
import { getSocket } from "../utils/socket.js";
import {
  SOS_DURATION,
  INACTIVE_THRESHOLD,
  PATH_HISTORY_LIMIT,
} from "../utils/helper.js";

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
  const [alertUsers, setAlertUsers] = useState({});

  const [userTrails, setUserTrails] = useState({});
  const [creatorSocketId, setCreatorSocketId] = useState(null); // ✅ NEW

  const stationaryCheckIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastSeenRef = useRef({});

  useEffect(() => {
    if (!isUserReady || !user?.id) return;

    const socket = getSocket();

    const handleConnect = () => {
      setIsConnecting(false);
      setMySocketId(socket.id);
      try {
        window.__syncFleetSocket = socket;
        window.__syncFleetRoomCode = roomCode;
      } catch (e) {
        // ignore
      }
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
      showToast(
        `${username} joined the room${isCreator ? " (Creator)" : ""}`,
        "info",
      );
      if (onUserJoined) onUserJoined({ username, socketId, isCreator });
    };

    const handleUserStatus = ({ userId, status }) => {
      setUserLocations((prev) => ({
        ...prev,
        [userId]: {
          ...(prev[userId] || {}),
          networkStatus: status, // "offline"
        },
      }));
    };

    const handleUserLeft = ({ socketId }) => {
      delete lastSeenRef.current[socketId];
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
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      if (onUserLeft) onUserLeft({ socketId });
    };

    const handleLocationUpdate = ({
      socketId,
      username,
      coords,
      isCreator,
    }) => {
      const now = Date.now();
      lastSeenRef.current[socketId] = now;
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
            networkStatus: "online",
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

      if (onLocationUpdate)
        onLocationUpdate({ socketId, username, coords, isCreator });
    };

    const handleGeofenceUpdate = ({ userId, socketId, isOutside }) => {
      setAlertUsers((prev) => {
        const next = { ...prev };
        if (isOutside) next[socketId] = true;
        else delete next[socketId];
        return next;
      });
    };

    const handleAnomalyAlert = (data) => {
      const { socketId, username, type } = data;
      playAlertSound();
      const alertType = type === "sos" ? "danger" : "warning";
      showToast(
        type === "sos"
          ? `🚨 SOS triggered by ${username}`
          : `⚠️ ${username} deviated from group`,
        alertType,
      );
      // setAlertUsers((prev) => {
      //   const newSet = new Set(prev);
      //   newSet.add(socketId);
      //   return newSet;
      // });

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

      if (onAnomalyAlert) onAnomalyAlert(data);
    };
    const handleGeofenceInit = (data) => {
      setAlertUsers(data || {});
    };


    const handleRoomUsers = (users) => {
      setActiveUsers(users);

      // ✅ Find and set creator from user list
      const creator = users.find((u) => u.isCreator);
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
    const handleSosInit = (data) => {
  setAlertUsers(data || {});
};


    const handleUserSOSCleared = ({ socketId, username }) => {
      setUserLocations((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || {}),
          isSOS: false,
          isStationary: false,
          stationarySince: null,
        },
      }));

      // ✅ REMOVE FROM ALERT USERS SET
      setAlertUsers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });

      if (showToast) showToast(`${username} is OK`, "info");
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
    socket.on("user-status", handleUserStatus);
    socket.on("geofence-update", handleGeofenceUpdate);
    socket.on("geofence-init", handleGeofenceInit);
    socket.on("sos-init", handleSosInit);


    socket.on("stationary-confirm", (data) => {
      try {
        window.dispatchEvent(
          new CustomEvent("syncfleet:stationary-confirm", { detail: data }),
        );
      } catch (e) {
        // ignore
      }
    });
    socket.on("user-stationary-cleared", handleUserStationaryCleared);
    socket.on("user-sos-cleared", handleUserSOSCleared);
    socket.on("user-sos", handleUserSOS);
    
    socket.on("room-users", handleRoomUsers);

    stationaryCheckIntervalRef.current = setInterval(() => {
      setUserLocations((prev) => {
        const now = Date.now();
        const updated = {};
        Object.entries(prev).forEach(([socketId, data]) => {
          const filteredPath = (data.path || []).filter(
            (p) => now - p.timestamp <= trailExpiryMs,
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
      socket.off("user-sos-cleared", handleUserSOSCleared);
      socket.off("user-sos", handleUserSOS);
      socket.off("room-users", handleRoomUsers);
      socket.off("geofence-update", handleGeofenceUpdate);
      socket.off("geofence-init", handleGeofenceInit);
      socket.off("sos-init", handleSosInit);


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
    onRoomUsers,
    onCreatorIdentified,
    creatorSocketId,
  ]);

  // 🔄 Network quality checker (online → weak)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setUserLocations((prev) => {
        const updated = { ...prev };

        Object.entries(updated).forEach(([socketId, user]) => {
          if (!user) return;
          if (user.networkStatus === "offline") return;

          const lastSeen = lastSeenRef.current[socketId];
          if (!lastSeen) return;

          if (now - lastSeen > 20000) {
            updated[socketId] = {
              ...user,
              networkStatus: "weak",
            };
          }
        });

        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    mySocketId,
    isConnecting,
    activeUsers,
    userLocations,
    userTrails,
    creatorSocketId, // ✅ Export creator socket ID
    setUserLocations,
    setAlertUsers,
    alertUsers,
  };
};
