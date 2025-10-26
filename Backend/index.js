import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import haversine from "haversine-distance";
import orsRoutes from "./routes/orsRoutes.js";
import Room from "./models/Room.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/ors", orsRoutes);

const PORT = process.env.PORT || 5000;
const userSocketMap = new Map();
const roomLocations = {};
const roomCreators = {};
const lastDeviationAlert = new Map();

const ALERT_COOLDOWN = 30000;
const outOfGeofence = new Map(); // ✅ Track users outside geofence

// Stationary detection
const lastMoveTimestamp = {};
const stationaryState = {};
const STATIONARY_THRESHOLD = process.env.STATIONARY_THRESHOLD_MS
  ? parseInt(process.env.STATIONARY_THRESHOLD_MS, 10)
  : 2 * 60 * 1000;
const STATIONARY_CONFIRM_TIMEOUT = process.env.STATIONARY_CONFIRM_TIMEOUT_MS
  ? parseInt(process.env.STATIONARY_CONFIRM_TIMEOUT_MS, 10)
  : 30 * 1000;
const pendingConfirmations = {};

console.log(`⏱️ Stationary threshold set to ${Math.round(STATIONARY_THRESHOLD / 1000)}s`);

// Periodic stationary check
setInterval(() => {
  const now = Date.now();
  Object.keys(lastMoveTimestamp).forEach((roomCode) => {
    const timestamps = lastMoveTimestamp[roomCode] || {};
    Object.keys(timestamps).forEach((socketId) => {
      const last = timestamps[socketId] || 0;
      if (now - last >= STATIONARY_THRESHOLD) {
        if (!stationaryState[roomCode]) stationaryState[roomCode] = {};
        if (!stationaryState[roomCode][socketId]) {
          const sock = io.sockets.sockets.get(socketId);
          const username = sock?.data?.username || "Unknown";
          try {
            sock?.emit("stationary-confirm", {
              message: `We've noticed you haven't moved for ${Math.round(
                STATIONARY_THRESHOLD / 60000
              )} minutes. Are you alright?`,
              timeout: STATIONARY_CONFIRM_TIMEOUT,
            });
          } catch (e) {
            io.to(roomCode).emit("user-stationary", {
              socketId,
              username,
              since: last,
            });
            io.to(roomCode).emit("room-message", {
              from: "System",
              type: "warning",
              content: `⚠️ ${username} has been stationary for more than ${Math.round(
                STATIONARY_THRESHOLD / 60000
              )} minutes.`,
              timestamp: Date.now(),
            });
            stationaryState[roomCode][socketId] = true;
            return;
          }

          if (!pendingConfirmations[roomCode])
            pendingConfirmations[roomCode] = {};
          if (pendingConfirmations[roomCode][socketId])
            clearTimeout(pendingConfirmations[roomCode][socketId]);
          pendingConfirmations[roomCode][socketId] = setTimeout(() => {
            if (!stationaryState[roomCode][socketId]) {
              stationaryState[roomCode][socketId] = true;
              io.to(roomCode).emit("user-stationary", {
                socketId,
                username,
                since: last,
              });
              io.to(roomCode).emit("room-message", {
                from: "System",
                type: "warning",
                content: `⚠️ ${username} has been stationary for more than ${Math.round(
                  STATIONARY_THRESHOLD / 60000
                )} minutes.`,
                timestamp: Date.now(),
              });
            }
            delete pendingConfirmations[roomCode][socketId];
          }, STATIONARY_CONFIRM_TIMEOUT);
        }
      }
    });
  });
}, 30 * 1000);

// SOCKET HANDLERS
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("join-room", ({ roomCode, username, userId }) => {
    if (!roomCode || !username || !userId) {
      console.warn("⚠ join-room failed:", { roomCode, username, userId });
      return;
    }

    if (userSocketMap.has(userId)) {
      const oldSocketId = userSocketMap.get(userId);
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
        console.log(
          `❌ Disconnected old socket ${oldSocketId} for user ${username} (${userId})`
        );
      }
    }

    userSocketMap.set(userId, socket.id);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.username = username;
    socket.data.userId = userId;

    Room.findOne({ code: roomCode })
      .then((room) => {
        if (room) {
          const isCreator = room.createdBy.toString() === userId;
          socket.data.isCreator = isCreator;

          if (isCreator) {
            roomCreators[roomCode] = {
              userId,
              socketId: socket.id,
              coords: null,
            };
            console.log(`👑 ${username} is the room creator for ${roomCode}`);
          }

          console.log(
            `👤 ${username} (${userId}) joined room ${roomCode} ${
              isCreator ? "(CREATOR)" : ""
            }`
          );

          const users = [
            ...(io.sockets.adapter.rooms.get(roomCode) || []),
          ].map((socketId) => {
            const sock = io.sockets.sockets.get(socketId);
            return {
              socketId,
              username: sock?.data.username,
              isCreator: sock?.data.isCreator || false,
            };
          });
          io.to(roomCode).emit("room-users", users);
          socket.to(roomCode).emit("user-joined", {
            username,
            socketId: socket.id,
            isCreator,
          });
        }
      })
      .catch((err) => {
        console.error("Error checking room creator:", err);
      });
  });

  socket.on("location-update", ({ roomCode, coords }) => {
    if (!roomCode || !coords || !socket.data.username || !socket.data.userId) {
      console.warn("⚠ location-update failed:", {
        roomCode,
        coords,
        user: socket.data,
      });
      return;
    }

    const isCreator = socket.data.isCreator || false;

    if (!roomLocations[roomCode]) roomLocations[roomCode] = {};
    roomLocations[roomCode][socket.id] = coords;

    if (isCreator && roomCreators[roomCode]) {
      roomCreators[roomCode].coords = coords;
      console.log(`👑 Updated creator position for room ${roomCode}`);
    }

    if (!lastMoveTimestamp[roomCode]) lastMoveTimestamp[roomCode] = {};
    if (!stationaryState[roomCode]) stationaryState[roomCode] = {};

    const now = Date.now();

    const moved = (() => {
      const prevLoc = (roomLocations[roomCode] || {})[socket.id + "__prev"];
      if (!prevLoc) return true;
      try {
        const d = haversine(prevLoc, coords);
        return d > 5;
      } catch (e) {
        return true;
      }
    })();

    roomLocations[roomCode][socket.id + "__prev"] = coords;

    if (moved) {
      lastMoveTimestamp[roomCode][socket.id] = now;
      if (stationaryState[roomCode][socket.id]) {
        stationaryState[roomCode][socket.id] = false;
        io.to(roomCode).emit("user-stationary-cleared", {
          socketId: socket.id,
          username: socket.data.username,
        });
        io.to(roomCode).emit("room-message", {
          from: "System",
          type: "info",
          content: `${socket.data.username} is moving again.`,
          timestamp: Date.now(),
        });
      }
    }

    io.to(roomCode).emit("location-update", {
      socketId: socket.id,
      username: socket.data.username,
      coords,
      isCreator,
    });

    // ✅ FIXED GEOFENCE SECTION
    if (!isCreator && roomCreators[roomCode]?.coords) {
      const creatorCoords = roomCreators[roomCode].coords;
      const GEOFENCE_RADIUS = 300; // meters
      const now = Date.now();

      try {
        const distanceFromCreator = haversine(coords, creatorCoords);
        const userState = outOfGeofence.get(socket.id) || {
          active: false,
          lastAlert: 0,
        };

        if (distanceFromCreator > GEOFENCE_RADIUS) {
          if (!userState.active) {
            userState.active = true;
            userState.lastAlert = 0;
            outOfGeofence.set(socket.id, userState);
            console.log(`⚠️ ${socket.data.username} exited geofence.`);
          }

          if (now - userState.lastAlert >= 30000) {
            userState.lastAlert = now;
            outOfGeofence.set(socket.id, userState);

            io.to(roomCode).emit("room-message", {
              from: "System",
              type: "warning",
              content: `⚠️ ${socket.data.username} is ${Math.round(
                distanceFromCreator
              )}m away from the group leader!`,
              timestamp: Date.now(),
            });

            socket.emit("room-message", {
              from: "System",
              type: "warning",
              content: `⚠️ You are ${Math.round(
                distanceFromCreator
              )}m away from the group leader. Please stay close!`,
              timestamp: Date.now(),
            });

            io.to(roomCode).emit("anomaly-alert", {
              type: "geofence",
              userId: socket.id,
              username: socket.data.username,
              coords,
              distance: distanceFromCreator,
            });

            console.log(
              `⚠️ Alert sent to ${socket.data.username} (${Math.round(
                distanceFromCreator
              )}m away)`
            );
          }
        } else if (userState.active) {
          userState.active = false;
          outOfGeofence.set(socket.id, userState);

          io.to(roomCode).emit("room-message", {
            from: "System",
            type: "info",
            content: `✅ ${socket.data.username} is back within the group leader's range.`,
            timestamp: Date.now(),
          });

          console.log(`✅ ${socket.data.username} re-entered geofence.`);
        }
      } catch (error) {
        console.error("Error calculating distance from creator:", error);
      }
    }
  });

  socket.on("stationary-response", ({ roomCode, response }) => {
    if (!roomCode || !socket.data.username) return;
    const roomPending = pendingConfirmations[roomCode] || {};
    const timeoutId = roomPending[socket.id];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete roomPending[socket.id];
    }

    if (response === "yes") {
      if (!lastMoveTimestamp[roomCode]) lastMoveTimestamp[roomCode] = {};
      lastMoveTimestamp[roomCode][socket.id] = Date.now();
      if (stationaryState[roomCode]) stationaryState[roomCode][socket.id] =
        false;
      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "info",
        content: `${socket.data.username} confirmed they are OK.`,
        timestamp: Date.now(),
      });
    } else {
      if (!stationaryState[roomCode]) stationaryState[roomCode] = {};
      stationaryState[roomCode][socket.id] = true;
      io.to(roomCode).emit("user-stationary", {
        socketId: socket.id,
        username: socket.data.username,
        since: Date.now(),
      });
      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "warning",
        content: `🚨 ${socket.data.username} indicated they need help!`,
        timestamp: Date.now(),
      });
    }
  });

  socket.on("chat-message", ({ roomCode, message }) => {
    if (!roomCode || !message || !socket.data.username) {
      console.warn("⚠️ chat-message failed:", {
        roomCode,
        message,
        user: socket.data,
      });
      return;
    }

    console.log(`💬 Chat from ${socket.data.username}: ${message.content}`);

    if (message.type === "sos") {
      io.to(roomCode).emit("user-sos", {
        socketId: socket.id,
        username: socket.data.username,
        userId: socket.data.userId,
      });

      console.log(`🚨 SOS Alert from ${socket.data.username} in room ${roomCode}`);
    }

    io.to(roomCode).emit("room-message", {
      from: socket.id,
      message: {
        ...message,
        sender: socket.data.username,
      },
    });
  });

  socket.on("clear-sos", ({ roomCode }) => {
    if (!roomCode || !socket.data.username) return;

    io.to(roomCode).emit("user-sos-cleared", {
      socketId: socket.id,
      username: socket.data.username,
      userId: socket.data.userId,
    });

    console.log(`✅ SOS cleared for ${socket.data.username} in room ${roomCode}`);
  });

  socket.on("add-hazard", (data) => {
    console.log("[Server] Received hazard:", data);
    const roomId = data.roomId;

    socket.to(roomId).emit("hazard-added", data);
    console.log(`[Server] Broadcasted hazard to room ${roomId}`);

    io.in(roomId).emit("room-message", {
      from: socket.id,
      message: {
        type: "hazard",
        content: `🚨 ${data.userName} reported ${data.type}`,
        sender: data.userName,
        lat: data.lat,
        lon: data.lon,
        timestamp: Date.now(),
      },
    });
    console.log("[Server] Sent hazard room-message");
  });

  socket.on("disconnect", () => {
    const { roomCode, username, userId } = socket.data;
    if (roomCode && username && userId) {
      console.log(`❌ ${username} (${userId}) disconnected from room ${roomCode}`);

      userSocketMap.delete(userId);
      if (roomCreators[roomCode]?.userId === userId) {
        delete roomCreators[roomCode];
        console.log(`👑 Room creator left room ${roomCode}`);
      }

      if (roomLocations[roomCode]) {
        delete roomLocations[roomCode][socket.id];
        if (Object.keys(roomLocations[roomCode]).length === 0) {
          delete roomLocations[roomCode];
        }
      }

      if (lastMoveTimestamp[roomCode]) {
        delete lastMoveTimestamp[roomCode][socket.id];
        if (Object.keys(lastMoveTimestamp[roomCode]).length === 0) {
          delete lastMoveTimestamp[roomCode];
        }
      }

      if (stationaryState[roomCode]) {
        delete stationaryState[roomCode][socket.id];
        if (Object.keys(stationaryState[roomCode]).length === 0) {
          delete stationaryState[roomCode];
        }
      }

      outOfGeofence.delete(socket.id); // ✅ Clean up geofence state

      io.to(roomCode).emit("user-left", {
        socketId: socket.id,
        username,
      });

      const users = [
        ...(io.sockets.adapter.rooms.get(roomCode) || []),
      ].map((socketId) => ({
        socketId,
        username: io.sockets.sockets.get(socketId)?.data.username,
      }));
      io.to(roomCode).emit("room-users", users);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
