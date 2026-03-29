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
  onGeofenceRadiusUpdate, // ✅ NEW
  onGeofenceStateUpdate,
}) => {
  const [mySocketId, setMySocketId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userLocations, setUserLocations] = useState({});
  const [alertUsers, setAlertUsers] = useState({});
  const [disconnectedUsers, setDisconnectedUsers] = useState({});

  const [userTrails, setUserTrails] = useState({});
  const [creatorSocketId, setCreatorSocketId] = useState(null); // ✅ NEW

  const stationaryCheckIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastSeenRef = useRef({});
  const geofenceInitRef = useRef({});
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onAnomalyAlertRef = useRef(onAnomalyAlert);
  const onUserJoinedRef = useRef(onUserJoined);
  const onUserLeftRef = useRef(onUserLeft);
  const onRoomUsersRef = useRef(onRoomUsers);
  const onCreatorIdentifiedRef = useRef(onCreatorIdentified);
  const onGeofenceRadiusUpdateRef = useRef(onGeofenceRadiusUpdate);
  const onGeofenceStateUpdateRef = useRef(onGeofenceStateUpdate);

  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
    onAnomalyAlertRef.current = onAnomalyAlert;
    onUserJoinedRef.current = onUserJoined;
    onUserLeftRef.current = onUserLeft;
    onRoomUsersRef.current = onRoomUsers;
    onCreatorIdentifiedRef.current = onCreatorIdentified;
    onGeofenceRadiusUpdateRef.current = onGeofenceRadiusUpdate;
    onGeofenceStateUpdateRef.current = onGeofenceStateUpdate;
  }, [
    onLocationUpdate,
    onAnomalyAlert,
    onUserJoined,
    onUserLeft,
    onRoomUsers,
    onCreatorIdentified,
    onGeofenceRadiusUpdate,
    onGeofenceStateUpdate,
  ]);

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

    const handleUserJoined = ({ username, userId, socketId, isCreator }) => {
      // Remove from disconnected users if they were disconnected (match by username)
      setDisconnectedUsers((prev) => {
        const next = { ...prev };
        const disconnectedSocketId = Object.keys(next).find(id => next[id].username === username);
        if (disconnectedSocketId) {
          // Send system message that user reconnected
          socket.emit("chat-message", {
            roomCode,
            message: {
              type: "system",
              text: `${username} has reconnected`,
              timestamp: Date.now(),
            },
          });
          delete next[disconnectedSocketId];
        }
        return next;
      });

      setActiveUsers((prev) => [
        ...prev.filter((u) => u.socketId !== socketId),
        { socketId, userId, username, isCreator }, // ✅ Include isCreator
      ]);

      // ✅ Track creator socket ID
      if (isCreator) {
        setCreatorSocketId(socketId);
        if (onCreatorIdentifiedRef.current) {
          onCreatorIdentifiedRef.current(socketId);
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
      if (onUserJoinedRef.current) {
        onUserJoinedRef.current({ username, socketId, isCreator });
      }
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
      const user = activeUsers.find((u) => u.socketId === socketId);
      if (user) {
        // Mark as disconnected instead of removing
        setDisconnectedUsers((prev) => ({
          ...prev,
          [socketId]: {
            username: user.username,
            lastCoords: userLocations[socketId] || null,
            disconnectedAt: Date.now(),
          },
        }));
        // Send system message
        socket.emit("chat-message", {
          roomCode,
          message: {
            type: "system",
            text: `${user.username} has disconnected`,
            timestamp: Date.now(),
          },
        });
        showToast(`${user.username} has disconnected`, "warning");
      }
      // Remove from active users and locations
      setActiveUsers((prev) => prev.filter((u) => u.socketId !== socketId));
      setUserLocations((prev) => {
        const newLocations = { ...prev };
        delete newLocations[socketId];
        return newLocations;
      });
      setAlertUsers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      delete lastSeenRef.current[socketId];
      if (onUserLeftRef.current) onUserLeftRef.current({ socketId });
    };

    const handleLocationUpdate = ({
      socketId,
      username,
      coords,
      isCreator,
      geofenceRadius,
    }) => {
      const now = Date.now();
      lastSeenRef.current[socketId] = now;

      if (
        typeof geofenceRadius === "number" &&
        onGeofenceRadiusUpdateRef.current
      ) {
        onGeofenceRadiusUpdateRef.current(geofenceRadius);
      }
      if (isCreator && onGeofenceStateUpdateRef.current) {
        onGeofenceStateUpdateRef.current({
          center: coords,
          radius: typeof geofenceRadius === "number" ? geofenceRadius : undefined,
        });
      }

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
        if (onCreatorIdentifiedRef.current) {
          onCreatorIdentifiedRef.current(socketId);
        }
        console.log(`👑 Creator position updated: ${username}`);
      }

      setUserTrails((prev) => ({
        ...prev,
        [socketId]: [...(prev[socketId] || []), { ...coords, timestamp: now }]
          .filter((p) => now - p.timestamp <= trailExpiryMs)
          .slice(-PATH_HISTORY_LIMIT),
      }));

      if (onLocationUpdateRef.current) {
        onLocationUpdateRef.current({ socketId, username, coords, isCreator });
      }
    };

    const handleGeofenceUpdate = ({ userId, socketId, isOutside }) => {
      if (userId) {
        geofenceInitRef.current = {
          ...geofenceInitRef.current,
          [userId]: isOutside ? "1" : undefined,
        };
        if (!isOutside) {
          delete geofenceInitRef.current[userId];
        }
      }

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

      if (onAnomalyAlertRef.current) onAnomalyAlertRef.current(data);
    };
    const handleGeofenceInit = (data) => {
      geofenceInitRef.current = data || {};

      setAlertUsers(() => {
        if (!data || !activeUsers.length) return {};

        const mapped = {};
        activeUsers.forEach((roomUser) => {
          if (roomUser?.socketId && roomUser?.userId && data[roomUser.userId]) {
            mapped[roomUser.socketId] = true;
          }
        });
        return mapped;
      });
    };

    const handleGeofenceRadiusUpdate = ({ radius }) => {
      if (onGeofenceRadiusUpdateRef.current) {
        onGeofenceRadiusUpdateRef.current(radius);
      }
    };

    const handleGeofenceStateUpdate = ({ center, radius }) => {
      if (onGeofenceStateUpdateRef.current) {
        onGeofenceStateUpdateRef.current({ center, radius });
      }
      if (
        typeof radius === "number" &&
        onGeofenceRadiusUpdateRef.current
      ) {
        onGeofenceRadiusUpdateRef.current(radius);
      }
    };

    const handleRoomUsers = (users) => {
      setActiveUsers(users);

      if (geofenceInitRef.current && Object.keys(geofenceInitRef.current).length) {
        const mapped = {};
        users.forEach((roomUser) => {
          if (
            roomUser?.socketId &&
            roomUser?.userId &&
            geofenceInitRef.current[roomUser.userId]
          ) {
            mapped[roomUser.socketId] = true;
          }
        });
        setAlertUsers(mapped);
      }

      // ✅ Find and set creator from user list
      const creator = users.find((u) => u.isCreator);
      if (creator && creator.socketId !== creatorSocketId) {
        setCreatorSocketId(creator.socketId);
        if (onCreatorIdentifiedRef.current) {
          onCreatorIdentifiedRef.current(creator.socketId);
        }
        console.log(`👑 Creator found in user list: ${creator.username}`);
      }

      if (onRoomUsersRef.current) onRoomUsersRef.current(users);
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
      const sosState = data || {};
      setUserLocations((prev) => {
        const next = { ...prev };
        Object.entries(sosState).forEach(([socketId, isActive]) => {
          next[socketId] = {
            ...(next[socketId] || {}),
            isSOS: Boolean(isActive),
            isStationary: Boolean(isActive),
          };
        });
        return next;
      });
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
    socket.on("geofence-radius-update", handleGeofenceRadiusUpdate);
    socket.on("geofence-state-update", handleGeofenceStateUpdate);
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
      socket.off("geofence-radius-update", handleGeofenceRadiusUpdate);
      socket.off("geofence-state-update", handleGeofenceStateUpdate);
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
    disconnectedUsers,
    setUserLocations,
    setAlertUsers,
    alertUsers,
  };
};
