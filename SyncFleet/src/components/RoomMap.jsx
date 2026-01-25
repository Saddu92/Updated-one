// components/RoomMap.jsx
import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useParams } from "react-router-dom";
import { getSocket, disconnectSocket } from "../utils/socket.js";
import { useAuthStore } from "../store/auth";
import haversine from "haversine-distance";
import {
  IoLocationSharp,
  IoExitOutline,
} from "react-icons/io5";
import { FiUsers, FiMessageSquare } from "react-icons/fi";
import { GiRoad } from "react-icons/gi";
import { MdOutlineWarning } from "react-icons/md";
import useSound from "use-sound";
import notificationSound from "../assets/notification.mp3";
import axios from "axios";
import { GEOCODE, ROOM_BY_CODE } from "../utils/constant.js";
import API from "../utils/axios.js";
import {
  COLORS,
  DEFAULT_TRAIL_DURATION,
  INACTIVE_THRESHOLD,
  SOS_DURATION,
} from "../utils/helper.js";
import { useRoomSocket } from "../hooks/useRoomSocket.js";
import { useGeoWatcher } from "../hooks/useGeoWatcher.js";
import { useStationaryDetection } from "../hooks/useStationaryDetection.js";
import MapDisplay from "./MapDisplay.jsx";
import SOSButton from "./SOSButton.jsx";
import ChatPanel from "./ChatPanel.jsx";
import UsersPanel from "./UsersPanel.jsx";
import StationaryModal from "./StationaryModal.jsx";
import LeaveRoomModal from "./LeaveRoomModal.jsx";
import Toast from "./Toast.jsx";

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
    const res = await API.get(ROOM_BY_CODE(roomCode));
    return res.data;
  } catch (err) {
    console.error("Error fetching room:", err);
    throw err;
  }
}

async function geocodeLocation(location) {
  try {
    let res;
    if (typeof location === "string" || location?.displayName) {
      const address =
        typeof location === "string" ? location : location.displayName;
      res = await API.get(GEOCODE, { params: { text: address } });
    } else if (location?.lat && location?.lng) {
      res = await API.get(GEOCODE, {
        params: { lat: location.lat, lon: location.lng },
      });
    } else {
      console.warn("⚠️ geocodeLocation called with invalid input:", location);
      return null;
    }

    if (res.data?.lat != null && res.data?.lng != null) {
      return { lat: parseFloat(res.data.lat), lng: parseFloat(res.data.lng) };
    }

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

const RoomMap = ({ room }) => {
  const { code: roomCode } = useParams();
  const socket = getSocket();
  const [playAlertSound] = useSound(notificationSound, { interrupt: true });
  const [toast, setToast] = useState(null);

  // User states
  const [user, setUser] = useState(null);


  // UI states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [trailDuration, setTrailDuration] = useState(DEFAULT_TRAIL_DURATION);
  const [geofence, setGeofence] = useState({
    center: null,
    radius: 300,
  });
  const [currentRoom, setCurrentRoom] = useState(null);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [hazards, setHazards] = useState([]);
  
  const [shouldRecenter, setShouldRecenter] = useState(false);
  const [isRoomCreator, setIsRoomCreator] = useState(false);
  const [roomCreatorId, setRoomCreatorId] = useState(null);
  const [creatorSocketId, setCreatorSocketId] = useState(null); // ✅ NEW
  const [creatorCoords, setCreatorCoords] = useState(null); // ✅ NEW

  // Refs
  const mapRef = useRef();
  const toastTimeoutRef = useRef(null);

  const trailExpiryMs = useMemo(
    () => trailDuration * 60 * 1000,
    [trailDuration]
  );

  // Toast helper
  const showToast = useCallback((message, type = "info") => {
    clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Custom hooks
  const { coords, locationError } = useGeoWatcher({
    enabled:true,
    user,
    onPositionUpdate: (newCoords) => {
      if (!user?.id || !user?.name || !socket.connected) return;
      socket.emit(
        "location-update",
        {
          roomCode,
          coords: newCoords,
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
  });

  const {
    mySocketId,
    isConnecting,
    activeUsers,
    userLocations,
    alertUsers,
    userTrails,
    creatorSocketId: hookCreatorSocketId, // ✅ GET FROM HOOK
    setUserLocations,
    setAlertUsers,
  } = useRoomSocket({
    roomCode,
    user,
    isUserReady: Boolean(user),
    trailExpiryMs,
    showToast,
    playAlertSound,
    onRoomMessage: ({ from, message }) => {
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
    },
    onAnomalyAlert: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          type: "anomaly",
          sender: "System",
          content:
            data.type === "sos"
              ? `🚨 SOS Alert from ${data.username}`
              : `⚠️ ${data.username} is ${Math.round(
                  data.distance
                )}m away from the group!`,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    onCreatorIdentified: (socketId) => { // ✅ NEW CALLBACK
      setCreatorSocketId(socketId);
      console.log(`👑 Creator identified: ${socketId}`);
    },
  });

  // Sync creator socket ID from hook
  useEffect(() => {
    if (hookCreatorSocketId && hookCreatorSocketId !== creatorSocketId) {
      setCreatorSocketId(hookCreatorSocketId);
    }
  }, [hookCreatorSocketId, creatorSocketId]);

  // SOS emitter
  const emitSOS = useCallback(() => {
    if (!socket.connected) {
      showToast("Cannot send SOS - disconnected from server", "danger");
      return;
    }

    playAlertSound();

    const message = {
      type: "sos",
      content: `🚨 SOS Alert from ${user?.name}`,
      sender: user?.name || "You",
      timestamp: new Date().toISOString(),
    };
    socket.emit("chat-message", { roomCode, message });

    setUserLocations((prev) => ({
      ...prev,
      [mySocketId]: {
        ...prev[mySocketId],
        isSOS: true,
        sosStartTime: Date.now()
      },
    }));

    setTimeout(() => {
      setUserLocations((prev) => ({
        ...prev,
        [mySocketId]: {
          ...prev[mySocketId],
          isSOS: false
        },
      }));
    }, SOS_DURATION);
  }, [socket, roomCode, user, showToast, mySocketId, playAlertSound, setUserLocations]);

  const {
    checkStationary,
    showStationaryPrompt,
    handleStationaryYes,
    handleStationaryNo,
    triggerStationaryPrompt,
  } = useStationaryDetection({
    mySocketId,
    setUserLocations,
    emitSOS,
  });

  // Listen for server-initiated stationary confirmations
  useEffect(() => {
    function onServerAsk(e) {
      const data = e.detail || {};
      const timeout = data.timeout || 30000;
      if (typeof window !== 'undefined' && triggerStationaryPrompt) {
        triggerStationaryPrompt(data.message || 'Are you alright?', timeout);
      }
    }
    window.addEventListener('syncfleet:stationary-confirm', onServerAsk);
    return () => window.removeEventListener('syncfleet:stationary-confirm', onServerAsk);
  }, [triggerStationaryPrompt]);

  // Load user and check room creator
  const { user: authUser } = useAuthStore();

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!authUser) {
          window.location.href = "/login";
          return;
        }
        
        setUser(authUser);
        // Fetch room data to check if user is creator
        const roomData = await apiCallToGetRoom(roomCode);
        setCurrentRoom(roomData);
        const isCreator = roomData?.createdBy === authUser.id;
        setIsRoomCreator(isCreator);
        setRoomCreatorId(roomData?.createdBy);
        
        console.log(`🔑 User ${authUser.name} is ${isCreator ? 'CREATOR' : 'MEMBER'} of room ${roomCode}`);
      } catch (e) {
        console.error("Error loading room:", e);
        if (e.response?.status === 401) {
          window.location.href = "/login";
        }
      }
    };
    loadUser();
    
  }, [roomCode, authUser]);

  // Fetch room data
  useEffect(() => {
    async function fetchRoom() {
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

  // Set geofence center - creator-based
  useEffect(() => {
    if (isRoomCreator) {
      // Creator uses their own position
      if (coords) {
        setGeofence((prev) => ({
          ...prev,
          center: coords,
          radius: prev.radius || 300,
        }));
      }
    } else if (creatorSocketId && userLocations[creatorSocketId]?.coords) {
      // Members use creator's position
      const newCreatorCoords = userLocations[creatorSocketId].coords;
      setGeofence((prev) => ({
        ...prev,
        center: newCreatorCoords,
      }));
      setCreatorCoords(newCreatorCoords);
    }
  }, [coords, isRoomCreator, creatorSocketId, userLocations]);

  // Set recenter only on initial mount
  useEffect(() => {
    setShouldRecenter(true);
    setTimeout(() => {
      setShouldRecenter(false);
    }, 1000);
  }, []);

  // Battery monitoring
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
  }, [setUserLocations]);

  useEffect(() => {
    function handleRoomMessage(message) {
      if (message.type === "warning") {
        showToast(message.content, "warning");
      }
    }
    socket.on("room-message", handleRoomMessage);
    return () => socket.off("room-message", handleRoomMessage);
  }, [socket, showToast]);

  // Hazard updates
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
      (h) => !h.createdAt || now - h.createdAt < 5 * 60 * 1000
    );
  }, [hazards]);

  const addHazard = (type, lat, lon) => {
    const data = {
      type,
      lat,
      lon,
      userId: user.id,
      userName: user.name,
      roomId: roomCode,
    };
    socket.emit("add-hazard", data);
    setHazards((prev) => [...prev, data]);
  };

  const groupCenter = useMemo(() => {
    const activeUsersList = Object.values(userLocations).filter(
      (u) => Date.now() - u.lastSeen < INACTIVE_THRESHOLD
    );
    if (activeUsersList.length === 0) return null;
    const sum = activeUsersList.reduce(
      (acc, u) => ({
        lat: acc.lat + u.coords.lat,
        lng: acc.lng + u.coords.lng,
      }),
      { lat: 0, lng: 0 }
    );
    return {
      lat: sum.lat / activeUsersList.length,
      lng: sum.lng / activeUsersList.length,
    };
  }, [userLocations]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    if (!socket.connected) {
      showToast("Cannot send message - disconnected from server", "danger");
      return;
    }

    const message = {
      type: "chat",
      content: newMessage.trim(),
      sender: user?.name.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit("chat-message", { roomCode, message });

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  }, [newMessage, socket, roomCode, user, showToast]);

  // Handle manual recentering via the button
  const handleRecenter = useCallback(() => {
    if (coords && mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], 16, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [coords]);

  const handleLeaveRoom = useCallback(() => {
    setShowLeaveModal(true);
  }, []);

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

  // Check stationary on position update
  useEffect(() => {
    if (coords) {
      checkStationary(coords);
    }
  }, [coords, checkStationary]);

  // Loading states
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Loading user data...</p>
      </div>
    );
  }
  // if (!user) {
  //   return (
  //     <div className="flex items-center justify-center h-screen">
  //       <p className="text-red-500 text-lg">
  //         Failed to load user data. Please login again.
  //       </p>
  //     </div>
  //   );
  // }
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
  // console.log(coords)
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
    {/* ROOT: full viewport */}
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-white via-sky-50 to-sky-100 text-gray-800">

      {/* Toast */}
      <Toast message={toast?.message} type={toast?.type} />

      {/* Stationary Modal */}
      <StationaryModal
        isOpen={showStationaryPrompt}
        onYes={handleStationaryYes}
        onNo={handleStationaryNo}
      />

      {/* ================= MAP (FULLSCREEN) ================= */}
      <div className="absolute inset-0">
        <MapDisplay
          coords={coords}
          mapRef={mapRef}
          userLocations={userLocations}
          mySocketId={mySocketId}
          getUserColor={getUserColor}
          geofence={geofence}
          groupCenter={null}
          visibleHazards={visibleHazards}
          sourceCoords={sourceCoords}
          destinationCoords={destinationCoords}
          user={user}
          shouldRecenter={shouldRecenter}
          isRoomCreator={isRoomCreator}
          creatorSocketId={creatorSocketId}
        />

        {/* Connection Status - Mobile */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-[9999] flex items-center bg-white/95 px-2 md:px-3 py-1 rounded-full shadow border text-xs md:text-sm">
          <div
            className={`w-2 md:w-3 h-2 md:h-3 rounded-full mr-2 ${
              socket.connected ? "bg-green-600" : "bg-red-500"
            }`}
          />
          <span className="font-medium text-gray-700">
            {socket.connected ? "Online" : "Offline"}
          </span>
        </div>

        {/* SOS Button - Desktop */}
        <div className="hidden md:block">
          <SOSButton
            onClick={() => {
              playAlertSound();
              emitSOS();
            }}
          />
        </div>
      </div>

      {/* ================= DESKTOP CONTROLS (MD+) ================= */}
      <div className="hidden md:flex absolute top-4 right-4 z-[9999] flex-col items-center gap-2">
        {/* Recenter */}
        <button
          onClick={handleRecenter}
          className="p-3 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 hover:shadow-md transition"
          title="Recenter map"
        >
          <IoLocationSharp className="text-sky-600 text-xl" />
        </button>

        {/* Chat */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="relative p-3 bg-white border border-gray-200 rounded-lg shadow hover:bg-sky-50 hover:shadow-md transition"
          title="Open chat"
        >
          <FiMessageSquare className="text-sky-600 text-xl" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>

        {/* Users */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="relative p-3 bg-white border border-gray-200 rounded-lg shadow hover:bg-emerald-50 hover:shadow-md transition"
          title="View users"
        >
          <FiUsers className="text-emerald-600 text-xl" />
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
            {activeUserCount}
          </span>
        </button>

        {/* Hazards Section */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => addHazard("Pothole", coords.lat, coords.lng)}
            className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg shadow hover:bg-red-50 hover:shadow-md transition"
            title="Report pothole"
          >
            <GiRoad className="text-red-600 text-lg" />
            <span className="text-red-600 font-semibold text-xs">Pothole</span>
          </button>

          <button
            onClick={() => addHazard("Accident", coords.lat, coords.lng)}
            className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg shadow hover:bg-yellow-50 hover:shadow-md transition"
            title="Report accident"
          >
            <MdOutlineWarning className="text-amber-600 text-lg" />
            <span className="text-amber-600 font-semibold text-xs">Accident</span>
          </button>
        </div>

        {/* Leave */}
        <button
          onClick={handleLeaveRoom}
          className="p-3 bg-white border border-gray-200 rounded-lg shadow hover:bg-red-50 hover:shadow-md transition mt-2"
          title="Leave room"
        >
          <IoExitOutline className="text-red-600 text-xl" />
        </button>
      </div>

      {/* ================= MOBILE BOTTOM ACTION BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9998] bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around px-2 py-3">
          {/* Recenter */}
          <button
            onClick={handleRecenter}
            className="flex flex-col items-center gap-1 p-2 rounded-lg active:bg-gray-100 transition min-w-[60px]"
            title="Recenter"
          >
            <IoLocationSharp className="text-sky-600 text-2xl" />
            <span className="text-xs font-medium text-gray-700">Map</span>
          </button>

          {/* Chat */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg active:bg-gray-100 transition min-w-[60px] relative"
            title="Chat"
          >
            <div className="relative">
              <FiMessageSquare className="text-sky-600 text-2xl" />
              {messages.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {messages.length > 9 ? '9+' : messages.length}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">Chat</span>
          </button>

          {/* Users */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg active:bg-gray-100 transition min-w-[60px] relative"
            title="Users"
          >
            <div className="relative">
              <FiUsers className="text-emerald-600 text-2xl" />
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeUserCount}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-700">Users</span>
          </button>

          {/* Hazard Dropdown */}
          <div className="relative group">
            <button
              className="flex flex-col items-center gap-1 p-2 rounded-lg active:bg-gray-100 transition min-w-[60px]"
              title="Report hazard"
            >
              <MdOutlineWarning className="text-amber-600 text-2xl" />
              <span className="text-xs font-medium text-gray-700">Alert</span>
            </button>
            <div className="absolute bottom-full mb-2 right-0 hidden group-hover:flex flex-col gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[140px]">
              <button
                onClick={() => addHazard("Pothole", coords.lat, coords.lng)}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 text-left transition"
              >
                <GiRoad className="text-red-600 text-lg" />
                <span className="text-sm font-medium text-red-600">Pothole</span>
              </button>
              <button
                onClick={() => addHazard("Accident", coords.lat, coords.lng)}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-yellow-50 text-left transition"
              >
                <MdOutlineWarning className="text-amber-600 text-lg" />
                <span className="text-sm font-medium text-amber-600">Accident</span>
              </button>
            </div>
          </div>

          {/* Leave */}
          <button
            onClick={handleLeaveRoom}
            className="flex flex-col items-center gap-1 p-2 rounded-lg active:bg-gray-100 transition min-w-[60px]"
            title="Leave"
          >
            <IoExitOutline className="text-red-600 text-2xl" />
            <span className="text-xs font-medium text-gray-700">Leave</span>
          </button>
        </div>
      </div>

      {/* ================= SOS BUTTON (MOBILE) ================= */}
      <div className="md:hidden fixed bottom-20 right-4 z-[9997]">
        <SOSButton
          onClick={() => {
            playAlertSound();
            emitSOS();
          }}
        />
      </div>

      {/* ================= USERS PANEL ================= */}
      <UsersPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        activeUsers={activeUsers}
        userLocations={userLocations}
        mySocketId={mySocketId}
        getUserColor={getUserColor}
        geofence={geofence}
        trailDuration={trailDuration}
        setTrailDuration={setTrailDuration}
        geofenceRadius={geofence.radius}
        setGeofenceRadius={(radius) =>
          setGeofence((prev) => ({ ...prev, radius }))
        }
        creatorSocketId={creatorSocketId}
      />

      {/* ================= CHAT ================= */}
      {/* Mobile Chat - Full Screen Modal */}
      <div className="md:hidden">
        <ChatPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSend={handleSendMessage}
          currentUser={user?.name}
        />
      </div>

      {/* Desktop Chat - Floating Window */}
      {chatOpen && (
        <div className="hidden md:block fixed right-4 top-32 z-[9999] w-[340px] h-[500px] shadow-2xl rounded-xl overflow-hidden">
          <ChatPanel
            isOpen
            inline
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSend={handleSendMessage}
            currentUser={user?.name}
          />
        </div>
      )}

      {/* Leave Room Modal */}
      <LeaveRoomModal
        isOpen={showLeaveModal}
        onCancel={() => setShowLeaveModal(false)}
        onConfirm={() => {
          if (socket.connected) {
            socket.emit("leave-room", { roomCode, userId: user.id });
            disconnectSocket();
          }
          window.location.href = "/";
        }}
      />
    </div>
  </ErrorBoundary>
);

};

export default RoomMap;