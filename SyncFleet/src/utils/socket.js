import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";


let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 6000,
      timeout: 5000,
    });

    socketInstance.on("connect", () =>
      console.debug("✅ Socket connected:", socketInstance.id)
    );
    socketInstance.on("disconnect", (reason) =>
      console.warn("❌ Socket disconnected:", reason)
    );
    socketInstance.on("connect_error", (err) =>
      console.error("⚡️ Socket connect_error:", err?.message || err)
    );
    socketInstance.on("reconnect_attempt", (attempt) =>
      console.log("🔄 Socket reconnect attempt:", attempt)
    );
  }
  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  if (!socket.connected) socket.connect();
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    console.log("🔌 Socket disconnected manually.");
  }
};

export const isSocketReady = () => {
  return socketInstance?.connected === true;
};