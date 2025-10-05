import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams } from "react-router-dom";
import { getSocket, disconnectSocket } from "../utils/socket.js";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import haversine from "haversine-distance";
import { IoMdSend } from "react-icons/io";
import { IoLocationSharp, IoAlertCircle, IoExitOutline } from "react-icons/io5";
import { FiUsers, FiMessageSquare } from "react-icons/fi";
import "leaflet-polylinedecorator";
import useSound from "use-sound";
import notificationSound from "../assets/notification.mp3";
import RoutePath from "./RoutePath.jsx";
import axios from "axios";
import HazardLayer from "./HazardLayer.jsx";
import { GiRoad } from "react-icons/gi";
import { MdOutlineWarning } from "react-icons/md";
import { GEOCODE, ROOM_BY_CODE } from "@/utils/constant.js";
import API from "@/utils/axios.js";

const STATIONARY_LIMIT = 5 * 60 * 1000; // 5 minutes
const MOVEMENT_THRESHOLD = 5; // meters
const INACTIVE_THRESHOLD = 30000; // 30 seconds
const PATH_HISTORY_LIMIT = 100;
const GEOLOCATION_TIMEOUT = 10000;
const DEFAULT_TRAIL_DURATION = 5; // minutes
const DEVIATION_THRESHOLD = 150; // meters
const SOS_DURATION = 30000; // 30 seconds

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

// Fix Leaflet default icon path
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

const cn = (...classes) => classes.filter(Boolean).join(" ");

const createPulsingIcon = (
  color = "#3b82f6",
  username = "",
  markerType = null
) => {
  let pulseColor = color;
  if (markerType === "stationary") pulseColor = "#ef4444";
  else if (markerType === "far") pulseColor = "#eab308";
  else if (markerType === "outside") pulseColor = "#f59e0b"; // orange

  return L.divIcon({
    className: "custom-pulse-icon",
    html: `
      <div class="relative">
        <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-1 rounded text-xs font-medium whitespace-nowrap">${username}</div>
        ${
          markerType === "stationary"
            ? `<div class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>`
            : markerType === "far"
            ? `<div class="absolute -top-3 -right-3 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>`
            : markerType === "outside"
            ? `<div class="absolute -top-3 -right-3 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>`
            : ""
        }
        <div class="pulse-marker" style="
          background: ${pulseColor}20;
          border-color: ${pulseColor};
        "></div>
        <div class="absolute-center" style="color: ${pulseColor};">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="currentColor" stroke-width="2">
            <circle cx="12" cy="10" r="5" fill="white" />
            <circle cx="12" cy="10" r="3" />
            <path d="M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" fill="white" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const RecenterMap = React.memo(({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }
  }, [coords, map]);
  return null;
});

const DecoratedPolyline = React.memo(
  ({ positions, color, weight, dashArray, isAlert }) => {
    const map = useMap();
    useEffect(() => {
      if (!map || !positions || positions.length < 2) return;

      const polyline = L.polyline(
        positions.map((p) => [p.lat, p.lng]),
        {
          color: isAlert ? "#eab308" : color,
          weight,
          dashArray,
          className: "fading-trail",
        }
      ).addTo(map);

      const decorator = L.polylineDecorator(polyline, {
        patterns: [
          {
            offset: "100%",
            repeat: 0,
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              pathOptions: {
                color: isAlert ? "#eab308" : color,
                fillOpacity: 1,
                weight: 0,
              },
            }),
          },
        ],
      }).addTo(map);

      return () => {
        map.removeLayer(decorator);
        map.removeLayer(polyline);
      };
    }, [map, positions, color, weight, dashArray, isAlert]);
    return null;
  }
);

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md p-4 bg-red-50 rounded-lg">
            <p className="text-red-500 text-lg">
              {this.state.error?.message || "Unknown error"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export async function apiCallToGetRoom(roomCode) {
  try {
    const res = await API.get(ROOM_BY_CODE(roomCode)); // GET instead of POST
    return res.data;
  } catch (err) {
    console.error("Error fetching room:", err);
    throw err;
  }
}

const RoomMap = ({ room }) => {
  const { code: roomCode } = useParams();
  const socket = getSocket();
  const [playAlertSound] = useSound(notificationSound, { interrupt: true });
  const [toast, setToast] = useState(null);

  // User/Socket/Location states
  const [user, setUser] = useState(null);
  const [isUserReady, setIsUserReady] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Socket states
  const [isConnecting, setIsConnecting] = useState(false);
  const [mySocketId, setMySocketId] = useState(null);

  // Room states
  const [userLocations, setUserLocations] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [alertUsers, setAlertUsers] = useState(new Set());
  const [userTrails, setUserTrails] = useState({});
  const [trailDuration, setTrailDuration] = useState(DEFAULT_TRAIL_DURATION);
  const [geofence, setGeofence] = useState({
    center: null,
    radius: 300,
  });
  const [currentRoom, setCurrentRoom] = useState(null);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [showStationaryPrompt, setShowStationaryPrompt] = useState(false);

  // Refs
  const mapRef = useRef();
  const lastPositionRef = useRef(null);
  const lastMovedAtRef = useRef(Date.now());
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const stationaryCheckIntervalRef = useRef(null);
  const geolocationWatchId = useRef(null);
  const toastTimeoutRef = useRef(null);
  const stationaryPromptTimeout = useRef(null);

  const trailExpiryMs = useMemo(
    () => trailDuration * 60 * 1000,
    [trailDuration]
  );

  // For Polyline
  const ORS_API_KEY = import.meta.env.VITE_API_KEY; // Ensure your API key in env

  // ... imports unchanged

  // ... keep the rest of the file unchanged

  async function geocodeLocation(location) {
    try {
      let res;

      if (typeof location === "string" || location?.displayName) {
        // Forward geocode: place name -> coords
        const address =
          typeof location === "string" ? location : location.displayName;
        // Send a flat 'text' param
        res = await API.get(GEOCODE, { params: { text: address } });
      } else if (location?.lat && location?.lng) {
        // Reverse geocode: coords -> place name
        // Send flat 'lat' and 'lon' params
        res = await API.get(GEOCODE, {
          params: { lat: location.lat, lon: location.lng },
        });
      } else {
        console.warn("⚠️ geocodeLocation called with invalid input:", location);
        return null;
      }

      // Backend returns a single object with lat/lng for both forward and reverse
      if (res.data?.lat != null && res.data?.lng != null) {
        return { lat: parseFloat(res.data.lat), lng: parseFloat(res.data.lng) };
      }

      // Fallback if backend is ever changed to return an array like Nominatim search
      if (
        Array.isArray(res.data) &&
        res.data?.lat != null &&
        res.data?.lon != null
      ) {
        return { lat: parseFloat(res.data.lat), lng: parseFloat(res.data.lon) };
      }

      console.warn("No coordinates found for:", location, res.data);
      return null;
    } catch (error) {
      console.error("❌ Geocode error", error?.response?.data || error.message);
      return null;
    }
  }

  useEffect(() => {
    async function fetchRoom() {
      // Replace with your actual API call to get room info by roomId or code
      const roomData = await apiCallToGetRoom(roomCode);
      setCurrentRoom(roomData);

      if (roomData?.source && roomData?.destination) {
        const sCoords = await geocodeLocation(roomData.source);
        const dCoords = await geocodeLocation(roomData.destination);
        setSourceCoords(sCoords);
        setDestinationCoords(dCoords);
      }
    }
    fetchRoom();
  }, [roomCode]);

  // --- Move this useEffect here with other hooks ---
  useEffect(() => {
    setSourceCoords(currentRoom?.source || null);
    setDestinationCoords(currentRoom?.destination || null);
  }, [currentRoom]);

  // Toast helper
  const showToast = useCallback((message, type = "info") => {
    clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Disconnect handler
  const handleDisconnect = useCallback(() => {
    setIsConnecting(false);
    setMySocketId(null);
    showToast("Disconnected from server", "danger");
  }, [showToast]);

  // SOS
  const emitSOS = useCallback(() => {
    if (!socket.connected) {
      showToast("Cannot send SOS - disconnected from server", "danger");
      return;
    }
    const message = {
      type: "sos",
      content: `🚨 SOS Alert from ${user?.name || "User"}`,
      sender: user?.name || "You",
      timestamp: new Date().toISOString(),
    };
    socket.emit("chat-message", { roomCode, message });
    setMessages((prev) => [...prev, message]);
    setAlertUsers((prev) => {
      const newSet = new Set(prev);
      newSet.add(mySocketId);
      return newSet;
    });
    setUserLocations((prev) => ({
      ...prev,
      [mySocketId]: {
        ...(prev[mySocketId] || {}),
        isStationary: true,
      },
    }));
    setTimeout(() => {
      setAlertUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mySocketId);
        return newSet;
      });
      setUserLocations((prev) => ({
        ...prev,
        [mySocketId]: {
          ...(prev[mySocketId] || {}),
          isStationary: false,
        },
      }));
    }, SOS_DURATION);
  }, [socket, roomCode, user, mySocketId, showToast]);

  // Geofence utility
  const isOutsideGeofence = (point, fence) => {
    if (!fence.center || !point) return false;
    const distance = haversine(point, fence.center);
    return distance > fence.radius;
  };

  // Stationary check
  const checkStationary = useCallback(
    (newCoords) => {
      const lastCoords = lastPositionRef.current;
      const now = Date.now();
      if (lastCoords) {
        const distance = haversine(lastCoords, newCoords);
        if (distance > MOVEMENT_THRESHOLD) {
          lastMovedAtRef.current = now;
          lastPositionRef.current = newCoords;
          setUserLocations((prev) => ({
            ...prev,
            [mySocketId]: { ...(prev[mySocketId] || {}), isStationary: false },
          }));
          setShowStationaryPrompt(false);
          clearTimeout(stationaryPromptTimeout.current);
        } else if (
          now - lastMovedAtRef.current > STATIONARY_LIMIT &&
          !showStationaryPrompt
        ) {
          // Show confirmation modal! (only once each time stationary)
          setShowStationaryPrompt(true);
          stationaryPromptTimeout.current = setTimeout(() => {
            setShowStationaryPrompt(false);
            emitSOS();
          }, 30000); // 30 sec to reply
        }
      } else {
        lastPositionRef.current = newCoords;
        lastMovedAtRef.current = now;
      }
    },
    [emitSOS, mySocketId, showStationaryPrompt]
  );

  // Modal confirmation handlers
  const handleStationaryYes = () => {
    setShowStationaryPrompt(false);
    clearTimeout(stationaryPromptTimeout.current);
    lastMovedAtRef.current = Date.now(); // reset timer
  };
  const handleStationaryNo = () => {
    setShowStationaryPrompt(false);
    clearTimeout(stationaryPromptTimeout.current);
    emitSOS();
  };

  const emitLocationUpdate = useCallback(
    (coords) => {
      if (!user?.id || !user?.name || !socket.connected) {
        showToast(
          "Cannot send location - disconnected from server or missing user info",
          "danger"
        );
        return;
      }
      socket.emit(
        "location-update",
        {
          roomCode,
          coords,
          user: {
            id: user.id,
            name: user.name,
          },
        },
        (ack) => {
          if (ack?.error) {
            showToast("Failed to update location", "danger");
          }
        }
      );
    },
    [roomCode, socket, user, showToast]
  );

  // Load user on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          window.location.href = "/login";
          return;
        }
        const parsed = JSON.parse(storedUser);
        if (parsed?.id && parsed?.name) {
          setUser(parsed);
        } else {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } catch (e) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    };
    loadUser();
    setIsUserReady(true);
  }, []);

  // Start watching geolocation once user is loaded
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
      checkStationary(coords);
      emitLocationUpdate(coords);
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
  }, [isUserReady, user, emitLocationUpdate, checkStationary]);

  // Set initial geofence center (change as needed for groupCenter)
  useEffect(() => {
    if (coords && !geofence.center) {
      setGeofence((prev) => ({
        ...prev,
        center: coords, // or you can use groupCenter if you prefer
        radius: 300,
      }));
    }
  }, [coords, geofence.center]);

  // Socket connection handler
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
    const handleUserJoined = ({ username, socketId }) => {
      setActiveUsers((prev) => [
        ...prev.filter((u) => u.socketId !== socketId),
        { socketId, username },
      ]);
      showToast(`${username} joined the room`, "info");
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
    };
    const handleLocationUpdate = ({ socketId, username, coords }) => {
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
            lastSeen: now,
            path: filteredPath,
            // Do NOT clear isStationary here
          },
        };
      });
      setUserTrails((prev) => ({
        ...prev,
        [socketId]: [...(prev[socketId] || []), { ...coords, timestamp: now }]
          .filter((p) => now - p.timestamp <= trailExpiryMs)
          .slice(-PATH_HISTORY_LIMIT),
      }));
    };
    // SOS/anomaly from others
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
      // If anomaly is a stationary SOS, mark user as stationary!
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
      setMessages((prev) => [
        ...prev,
        {
          type: "anomaly",
          sender: "System",
          content:
            type === "sos"
              ? `🚨 SOS Alert from ${username}`
              : `⚠️ ${username} is ${Math.round(
                  data.distance
                )}m away from the group!`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    const handleRoomMessage = ({ from, message }) => {
      if (message.type === "hazard" && from !== socket.id) {
        showToast(`⚠️ ${message.content}`, "warning");
      }

      if (message.type === "sos" && from !== socket.id) {
        playAlertSound();
        showToast(`🚨 SOS triggered by ${message.sender}`, "danger");
        setAlertUsers((prev) => {
          const newSet = new Set(prev);
          newSet.add(from);
          return newSet;
        });
        setUserLocations((prev) => ({
          ...prev,
          [from]: { ...(prev[from] || {}), isStationary: true },
        }));
        setTimeout(() => {
          setAlertUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(from);
            return newSet;
          });
          setUserLocations((prev) => ({
            ...prev,
            [from]: { ...(prev[from] || {}), isStationary: false },
          }));
        }, SOS_DURATION);
      }
      if (from !== socket.id) {
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            sender:
              message.sender || userLocations[from]?.username || "Unknown",
          },
        ]);
      }
    };
    const handleRoomUsers = (users) => {
      setActiveUsers(users);
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
      socket.off("room-message", handleRoomMessage);
      socket.off("room-users", handleRoomUsers);
      clearInterval(stationaryCheckIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [
    isUserReady,
    user,
    roomCode,
    socket,
    trailExpiryMs,
    mySocketId,
    showToast,
    playAlertSound,
  ]);

  // Chat autoscroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // BATTERY: monitor and send to others
  useEffect(() => {
    let batteryRef = null;
    let lastSentLevel = null;

    const sendBatteryStatus = () => {
      if (!batteryRef || !user?.id || !socket) return;
      const data = {
        level: batteryRef.level,
        charging: batteryRef.charging,
        ts: Date.now(),
      };
      localStorage.setItem("batteryStatus", JSON.stringify(data));
      if (batteryRef.level !== lastSentLevel) {
        socket.emit("battery-status", {
          roomCode,
          userId: user.id,
          level: batteryRef.level,
          charging: batteryRef.charging,
        });
        lastSentLevel = batteryRef.level;
      }
    };

    if (!navigator.getBattery) return;
    navigator.getBattery().then((battery) => {
      batteryRef = battery;
      battery.addEventListener("levelchange", sendBatteryStatus);
      battery.addEventListener("chargingchange", sendBatteryStatus);
      sendBatteryStatus();
    });

    return () => {
      if (batteryRef) {
        batteryRef.removeEventListener("levelchange", sendBatteryStatus);
        batteryRef.removeEventListener("chargingchange", sendBatteryStatus);
      }
    };
  }, [socket, user, roomCode]);

  useEffect(() => {
    const socket = getSocket();
    function handleUserBatteryUpdate({ userId, level, charging }) {
      setUserLocations((prev) => ({
        ...prev,
        [userId]: {
          ...(prev[userId] || {}),
          battery: { level, charging },
        },
      }));
    }
    socket.on("user-battery-update", handleUserBatteryUpdate);
    return () => {
      socket.off("user-battery-update", handleUserBatteryUpdate);
    };
  }, []);

  // Listen for hazard updates from server
  useEffect(() => {
    const handler = (data) => {
      const dM = coords
        ? Math.round(haversine(coords, { lat: data.lat, lng: data.lon }))
        : null;
      showToast(
        `⚠️ ${data.type} reported${dM != null ? ` ${dM}m away` : ""} by ${
          data.userName
        }`,
        "warning"
      );
      setHazards((prev) => [
        ...prev,
        { ...data, notified: true, distanceM: dM, createdAt: Date.now() },
      ]);
    };
    socket.on("hazard-added", handler);
    return () => socket.off("hazard-added", handler);
  }, [socket, coords, showToast]);

  const visibleHazards = useMemo(() => {
    const now = Date.now();
    return hazards.filter(
      (h) => !h.createdAt || now - h.createdAt < 5 * 60 * 1000 // 5 minutes
    );
  }, [hazards]);

  /**
   * Add a hazard (called by button or map click)
   */
  const addHazard = (type, lat, lon) => {
    const data = {
      type,
      lat,
      lon,
      userId: user.id,
      userName: user.name,
      roomId: roomCode, // use roomCode here
    };
    console.log("[RoomMap] Emitting hazard:", data);

    // Emit to server
    socket.emit("add-hazard", data);

    // Optimistically add to local state
    setHazards((prev) => [...prev, data]);
  };

  // Calculate group center
  const groupCenter = useMemo(() => {
    const activeUsers = Object.values(userLocations).filter(
      (u) => Date.now() - u.lastSeen < INACTIVE_THRESHOLD
    );
    if (activeUsers.length === 0) return null;
    const sum = activeUsers.reduce(
      (acc, u) => ({
        lat: acc.lat + u.coords.lat,
        lng: acc.lng + u.coords.lng,
      }),
      { lat: 0, lng: 0 }
    );
    return {
      lat: sum.lat / activeUsers.length,
      lng: sum.lng / activeUsers.length,
    };
  }, [userLocations]);

  // Calculate how far a user is from group center
  const calculateDeviation = useCallback(
    (userCoords) => {
      if (!groupCenter || !userCoords) return 0;
      return haversine(groupCenter, userCoords);
    },
    [groupCenter]
  );

  // Only show toast alert when a user leaves (not every render)
  useEffect(() => {
    Object.entries(userLocations).forEach(([id, u]) => {
      if (!u?.coords) return;
      const isNowOutside = isOutsideGeofence(u.coords, geofence);
      if (isNowOutside && !u.wasOutsideGeofence) {
        showToast(`${u.username || "User"} left geofenced area!`, "warning");
        setUserLocations((prev) => ({
          ...prev,
          [id]: { ...prev[id], wasOutsideGeofence: true },
        }));
      } else if (!isNowOutside && u.wasOutsideGeofence) {
        setUserLocations((prev) => ({
          ...prev,
          [id]: { ...prev[id], wasOutsideGeofence: false },
        }));
      }
    });
  }, [userLocations, geofence, showToast]);

  // UI handlers
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    if (!socket.connected) {
      showToast("Cannot send message - disconnected from server", "danger");
      return;
    }

    const message = {
      type: "chat",
      content: newMessage.trim(),
      sender: user?.name.trim(), // always use actual username
      timestamp: new Date().toISOString(),
    };

    socket.emit("chat-message", { roomCode, message });
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
    chatInputRef.current?.focus();
  }, [newMessage, socket, roomCode, user, showToast]);

  const handleRecenter = useCallback(() => {
    if (coords && mapRef.current) {
      mapRef.current.setView([coords.lat, coords.lng], 16);
    }
  }, [coords]);

  // const handleLeaveRoom = useCallback(() => {
  //   if (window.confirm("Are you sure you want to leave the room?")) {
  //     if (socket.connected) {
  //       socket.emit("leave-room", { roomCode, userId: user.id });
  //       disconnectSocket();
  //     }
  //     window.location.href = "/";
  //   }
  // }, [socket, roomCode, user]);

  const activeUserCount = useMemo(() => {
    const now = Date.now();
    return Object.values(userLocations).filter(
      (u) => now - u.lastSeen < INACTIVE_THRESHOLD
    ).length;
  }, [userLocations]);
  const getUserColor = useCallback(
    (socketId) => {
      const index = activeUsers.findIndex((u) => u.socketId === socketId);
      return COLORS[index % COLORS.length];
    },
    [activeUsers]
  );
  const isUserInAlert = useCallback(
    (socketId) => alertUsers.has(socketId),
    [alertUsers]
  );

  // Leave room handler with modal
  const handleLeaveRoom = useCallback(() => {
    setShowLeaveModal(true); // open modal instead of window.confirm
  }, []);

  // ---- RETURN: UI ---------
  if (!isUserReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Loading user data...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500 text-lg">
          Failed to load user data. Please login again.
        </p>
      </div>
    );
  }
  if (locationError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md p-4 bg-red-50 rounded-lg">
          <p className="text-red-500 text-lg">{locationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (!coords) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Getting your location...</p>
          <p className="text-sm text-gray-400 mt-2">
            Please allow location access to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Toast notification */}
        {toast && (
          <div
            className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 rounded-md shadow-lg ${
              toast.type === "danger"
                ? "bg-red-100 text-red-800 border border-red-200"
                : toast.type === "warning"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* --- ADDITION: Stationary Confirmation Modal --- */}
        {showStationaryPrompt && (
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,.3)",
              zIndex: 99999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                padding: "32px",
                minWidth: "320px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                border: "2px solid #ef4444",
              }}
            >
              <IoAlertCircle size={48} color="#ef4444" />
              <h2
                style={{ fontWeight: "bold", color: "#ef4444", fontSize: 20 }}
              >
                Stationary Detected!
              </h2>
              <p style={{ marginTop: 16, fontSize: 16 }}>
                You've been stationary for over 5 minutes.
              </p>
              <p style={{ fontSize: 16, marginBottom: 24 }}>
                <b>Are you okay?</b>
              </p>
              <div style={{ display: "flex", gap: "24px" }}>
                <button
                  onClick={handleStationaryYes}
                  style={{
                    background: "#10b981",
                    color: "white",
                    fontWeight: "bold",
                    borderRadius: "6px",
                    padding: "12px 24px",
                    fontSize: "16px",
                    border: "none",
                    outline: "none",
                  }}
                >
                  Yes, I'm OK
                </button>
                <button
                  onClick={handleStationaryNo}
                  style={{
                    background: "#dc2626",
                    color: "white",
                    fontWeight: "bold",
                    borderRadius: "6px",
                    padding: "12px 24px",
                    fontSize: "16px",
                    border: "none",
                    outline: "none",
                  }}
                >
                  No / Need Help
                </button>
              </div>
              <span style={{ marginTop: 16, color: "#ef4444", fontSize: 14 }}>
                (No response in 30 seconds sends SOS alert to group)
              </span>
            </div>
          </div>
        )}

        <div className="flex h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-6 gap-6">
          {/* Left: Map Section (80%) */}
          <div className="w-[80%] h-full">
            <div className="h-full w-full rounded-2xl shadow-2xl border-2 border-indigo-500/40 overflow-hidden bg-gray-900/40 backdrop-blur-md">
              {/* Connection status indicator */}
              <div className="absolute top-4 left-4 z-[9999] flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    socket.connected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm">
                  {socket.connected ? "Connected" : "Disconnected"}
                  {isConnecting && " (Connecting...)"}
                </span>
              </div>
              <MapContainer
                center={coords}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                ref={mapRef}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {sourceCoords && destinationCoords && (
                  <RoutePath
                    source={sourceCoords}
                    destination={destinationCoords}
                  />
                )}

                {/* Draw geofence */}
                {geofence.center && (
                  <Circle
                    center={geofence.center}
                    radius={geofence.radius}
                    pathOptions={{
                      color: "#2563eb",
                      fillColor: "#93c5fd",
                      fillOpacity: 0.2,
                    }}
                  />
                )}

                {/* Yellow blinking hazard markers visible within last 5 minutes */}
                <HazardLayer hazards={visibleHazards} />

                <RecenterMap coords={coords} />

                {/* Render Yourself */}
                <Marker
                  position={coords}
                  icon={createPulsingIcon(
                    userLocations[mySocketId]?.isStationary
                      ? "#ef4444"
                      : isOutsideGeofence(coords, geofence)
                      ? "#f59e0b"
                      : getUserColor(mySocketId),
                    "You",
                    userLocations[mySocketId]?.isStationary
                      ? "stationary"
                      : isOutsideGeofence(coords, geofence)
                      ? "outside"
                      : "normal"
                  )}
                >
                  <Popup className="font-medium">
                    {user?.name || "You"}
                    {userLocations[mySocketId]?.isStationary && (
                      <span className="block text-red-700 font-bold">
                        Stationary - SOS
                      </span>
                    )}
                    {isOutsideGeofence(coords, geofence) && (
                      <span className="block text-orange-700 font-bold">
                        Outside geofenced area!
                      </span>
                    )}
                  </Popup>
                </Marker>

                {/* Render Other Users */}
                {Object.entries(userLocations)
                  .filter(([id]) => id !== mySocketId)
                  .map(([id, u]) => {
                    if (!u?.coords) return null;
                    const now = Date.now();
                    const isActive = now - u.lastSeen < INACTIVE_THRESHOLD;
                    if (!isActive) return null;
                    const outside = isOutsideGeofence(u.coords, geofence);
                    const deviationDistance = calculateDeviation(u.coords);

                    let markerType = null;
                    if (u.isStationary) markerType = "stationary";
                    else if (deviationDistance > DEVIATION_THRESHOLD)
                      markerType = "far";
                    else if (outside) markerType = "outside";
                    else markerType = "normal";

                    return (
                      <React.Fragment key={id}>
                        <Marker
                          position={u.coords}
                          icon={createPulsingIcon(
                            markerType === "stationary"
                              ? "#ef4444"
                              : markerType === "far"
                              ? "#eab308"
                              : markerType === "outside"
                              ? "#f59e0b"
                              : getUserColor(id),
                            u.username,
                            markerType
                          )}
                        >
                          <Popup className="font-medium">
                            <div className="flex flex-col">
                              <span>{u.username}</span>
                              {markerType === "stationary" && (
                                <span className="text-red-600 font-bold">
                                  Stationary - SOS
                                </span>
                              )}
                              {markerType === "far" && (
                                <span className="text-yellow-600">
                                  {Math.round(deviationDistance)}m from group
                                </span>
                              )}
                              {markerType === "outside" && (
                                <span className="text-orange-600 font-bold">
                                  Outside geofenced area!
                                </span>
                              )}
                            </div>
                          </Popup>
                        </Marker>

                        {/* Polyline for movement */}
                        {u.path && u.path.length > 1 && (
                          <DecoratedPolyline
                            positions={u.path}
                            color={
                              markerType === "stationary"
                                ? "#ef4444"
                                : markerType === "far"
                                ? "#eab308"
                                : markerType === "outside"
                                ? "#f59e0b"
                                : getUserColor(id)
                            }
                            weight={4}
                            dashArray={
                              markerType === "stationary" ||
                              markerType === "far" ||
                              markerType === "outside"
                                ? "5,5"
                                : null
                            }
                            isAlert={Boolean(markerType !== "normal")}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                {/* Group Center */}
                {groupCenter && (
                  <Marker
                    position={groupCenter}
                    icon={L.divIcon({
                      className: "group-center-marker",
                      html: `<div class="group-center"></div>`,
                      iconSize: [20, 20],
                      iconAnchor: [10, 10],
                    })}
                  >
                    <Popup>Group Center</Popup>
                  </Marker>
                )}

                {/* SOS Button */}
                <div className="absolute bottom-20 right-20 ">
                  <button
                    onClick={() => {
                      playAlertSound();
                      emitSOS();
                    }}
                    className="absolute z-[999] p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                    title="Send SOS"
                  >
                    <IoAlertCircle className="text-2xl" />
                    <span className="absolute animate-ping inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75" />
                  </button>
                </div>
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Top Right Buttons */}
        <div className="absolute top-4 right-4 z-[9999] flex flex-col items-center gap-2">
          {/* Main Buttons */}
          <div className="flex items-center gap-3">
            {/* Recenter */}
            <button
              onClick={handleRecenter}
              className="group relative p-3 bg-white/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg 
                 hover:bg-white/30 transition-all duration-300"
              title="Recenter map"
            >
              <IoLocationSharp className="text-blue-400 text-xl group-hover:scale-110 transition-transform duration-200" />
            </button>

            {/* Chat */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="group relative p-3 bg-white/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg 
                 hover:bg-white/30 transition-all duration-300"
              title="Toggle chat"
            >
              <FiMessageSquare className="text-blue-400 text-xl group-hover:scale-110 transition-transform duration-200" />
              {messages.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                  {messages.length}
                </span>
              )}
            </button>

            {/* Users */}
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="group relative p-3 bg-white/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg 
                 hover:bg-white/30 transition-all duration-300"
              title="Toggle panel"
            >
              <FiUsers className="text-green-400 text-xl group-hover:scale-110 transition-transform duration-200" />
              <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                {activeUserCount}
              </span>
            </button>

            {/* Leave Room */}
            <button
              onClick={handleLeaveRoom}
              className="group relative p-3 bg-white/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg 
                 hover:bg-red-500/80 hover:text-white transition-all duration-300"
              title="Leave room"
            >
              <IoExitOutline className="text-red-400 text-xl group-hover:scale-110 transition-transform duration-200" />
            </button>
          </div>

          {/* Hazard Buttons (Right of main buttons) */}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => addHazard("Pothole", coords.lat, coords.lng)}
              className="group relative flex items-center justify-center gap-2 p-3 bg-white/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg 
                 hover:bg-red-600 hover:text-white transition-all duration-300"
              title="Mark Pothole"
            >
              <GiRoad className="text-red-500 group-hover:text-white text-xl" />
              <span className="text-red-500 group-hover:text-white font-semibold text-sm">
                Pothole
              </span>
            </button>

            <button
              onClick={() => addHazard("Accident", coords.lat, coords.lng)}
              className="group relative flex items-center justify-center gap-2 p-3 bg-white/20 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg 
                 hover:bg-yellow-500 hover:text-white transition-all duration-300"
              title="Mark Accident"
            >
              <MdOutlineWarning className="text-yellow-500 group-hover:text-white text-xl" />
              <span className="text-yellow-500 group-hover:text-white font-semibold text-sm">
                Accident
              </span>
            </button>
          </div>
        </div>

        {/* Users Panel */}
        {panelOpen && (
          <div className="absolute top-4 left-4 w-72 bg-gray-900/70 backdrop-blur-md rounded-xl shadow-2xl z-[9999] overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-green-600 rounded-t-xl text-white font-semibold text-sm shadow-md">
              <span>Active Users ({activeUserCount})</span>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-white hover:text-gray-200 transition-all text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Users List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-700 scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-800">
              {activeUsers.map((user) => {
                const location = userLocations[user.socketId] || {};
                const batteryLevel = location.battery?.level ?? null;
                const outside = isOutsideGeofence(location?.coords, geofence);

                return (
                  <div
                    key={user.socketId}
                    className={`flex items-center justify-between p-2 hover:bg-gray-800 rounded transition ${
                      location.isStationary ? "bg-red-900/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: location.isStationary
                            ? "#ef4444"
                            : getUserColor(user.socketId),
                        }}
                      />
                      <span className="truncate text-sm font-medium text-white">
                        {user.username}
                        {user.socketId === mySocketId && " (You)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      {/* Battery */}
                      {batteryLevel !== null && (
                        <span
                          className={`font-medium ${
                            batteryLevel < 0.15
                              ? "text-red-500"
                              : batteryLevel < 0.3
                              ? "text-orange-400"
                              : "text-green-400"
                          }`}
                          title={`Battery: ${Math.round(batteryLevel * 100)}%`}
                        >
                          🔋{Math.round(batteryLevel * 100)}%
                          {location.battery?.charging ? "⚡" : ""}
                        </span>
                      )}

                      {/* Outside geofence */}
                      {outside && (
                        <span className="text-orange-400 font-semibold">
                          OUTSIDE!
                        </span>
                      )}

                      {/* SOS */}
                      {location.isStationary && (
                        <span className="text-red-500 font-bold">SOS</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trail Duration */}
            <div className="p-2 border-t border-gray-700">
              <label className="text-xs text-gray-400 mb-1 block">
                Trail Duration (minutes)
              </label>
              <select
                value={trailDuration}
                onChange={(e) => setTrailDuration(Number(e.target.value))}
                className="w-full p-1 border border-gray-600 rounded text-xs bg-gray-800 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>

            {/* Geofence Radius */}
            <div className="p-2 border-t border-gray-700">
              <label className="text-xs text-gray-400 mb-1 block">
                Geofence Radius (meters)
              </label>
              <input
                type="number"
                min={100}
                max={2000}
                step={50}
                value={geofence.radius}
                onChange={(e) =>
                  setGeofence((g) => ({ ...g, radius: Number(e.target.value) }))
                }
                className="w-full p-1 border border-gray-600 rounded text-xs bg-gray-800 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}

        {/* Chat panel */}
        {chatOpen && (
          <div className="fixed bottom-6 right-2 w-[18%] min-w-[280px] max-w-[500px] max-h-[60%] flex flex-col z-[9999]">
            {/* Chat Card */}
            <div className="flex flex-col h-full rounded-2xl shadow-2xl bg-gray-900/95 border border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center p-3 bg-green-600 border-b border-gray-700">
                <span className="text-white font-semibold text-md">
                  Chatbox
                </span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-white hover:text-red-500 transition-all text-xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 px-3 py-2 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800">
                {messages.map((msg, idx) => {
                  const currentUser = user?.name?.trim().toLowerCase();
                  const isSelf =
                    msg.sender?.trim().toLowerCase() === currentUser;

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col p-2 rounded-2xl max-w-[75%] ${
                        isSelf
                          ? "self-end bg-green-500 text-white"
                          : "self-start bg-white text-gray-900 border border-gray-300"
                      } shadow`}
                    >
                      {!isSelf && (
                        <span className="text-xs font-semibold text-gray-400 mb-1">
                          {msg.sender}
                        </span>
                      )}
                      <span className="text-sm break-words">{msg.content}</span>
                      <span
                        className={`text-[9px] mt-1 flex justify-end ${
                          isSelf ? "text-green-100" : "text-gray-500"
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-center p-2 bg-gray-800 border-t border-gray-700">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 px-3 py-2 rounded-full bg-gray-700 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 transition"
                />
                <button
                  onClick={handleSendMessage}
                  className="ml-2 px-3 py-2 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md transition"
                >
                  <IoMdSend className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/*  leave Model */}

        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-gray-900 rounded-xl p-6 w-80 text-white shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">Leave Room</h2>
              <p className="text-sm mb-6">
                Are you sure you want to leave the room?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (socket.connected) {
                      socket.emit("leave-room", { roomCode, userId: user.id });
                      disconnectSocket();
                    }
                    window.location.href = "/";
                  }}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default RoomMap;
