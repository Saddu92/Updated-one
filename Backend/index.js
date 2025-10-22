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
import { isOutsideGeofence } from "../SyncFleet/src/utils/helper.js";

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
const DEVIATION_THRESHOLD = 100; // Meters, adjust as needed
const userSocketMap = new Map(); // userId => socket.id
const roomLocations = {}; // roomCode => { socketId: coords }
// Stationary detection state
const lastMoveTimestamp = {}; // roomCode => { socketId: timestamp }
const stationaryState = {}; // roomCode => { socketId: boolean }
const STATIONARY_THRESHOLD = process.env.STATIONARY_THRESHOLD_MS
  ? parseInt(process.env.STATIONARY_THRESHOLD_MS, 10)
  : 2* 60 * 1000; // default 5 minutes

console.log(`⏱️ Stationary threshold set to ${Math.round(STATIONARY_THRESHOLD / 1000)}s`);

// Confirmation timeout for asking the user if they're OK (default 30s)
const STATIONARY_CONFIRM_TIMEOUT = process.env.STATIONARY_CONFIRM_TIMEOUT_MS
  ? parseInt(process.env.STATIONARY_CONFIRM_TIMEOUT_MS, 10)
  : 30 * 1000;

// pending confirmations: roomCode => { socketId: timeoutId }
const pendingConfirmations = {};

// Periodic checker for stationary users
setInterval(() => {
  const now = Date.now();
  Object.keys(lastMoveTimestamp).forEach((roomCode) => {
    const timestamps = lastMoveTimestamp[roomCode] || {};
    Object.keys(timestamps).forEach((socketId) => {
      const last = timestamps[socketId] || 0;
      if (now - last >= STATIONARY_THRESHOLD) {
        if (!stationaryState[roomCode]) stationaryState[roomCode] = {};
        if (!stationaryState[roomCode][socketId]) {
          // Ask the user first: emit a confirmation request to the user's socket
          const sock = io.sockets.sockets.get(socketId);
          const username = sock?.data?.username || 'Unknown';
          try {
            sock?.emit('stationary-confirm', {
              message: `We've noticed you haven't moved for ${Math.round(STATIONARY_THRESHOLD/60000)} minutes. Are you alright?`,
              timeout: STATIONARY_CONFIRM_TIMEOUT,
            });
          } catch (e) {
            // if socket not available, fall back to immediate broadcast
            io.to(roomCode).emit('user-stationary', { socketId, username, since: last });
            io.to(roomCode).emit('room-message', {
              from: 'System',
              type: 'warning',
              content: `⚠️ ${username} has been stationary for more than ${Math.round(STATIONARY_THRESHOLD/60000)} minutes.`,
              timestamp: Date.now(),
            });
            stationaryState[roomCode][socketId] = true;
            return;
          }

          // Set pending confirmation timeout: if no response within timeout, broadcast alert
          if (!pendingConfirmations[roomCode]) pendingConfirmations[roomCode] = {};
          if (pendingConfirmations[roomCode][socketId]) clearTimeout(pendingConfirmations[roomCode][socketId]);
          pendingConfirmations[roomCode][socketId] = setTimeout(() => {
            // If still not stationary-marked, broadcast alert
            if (!stationaryState[roomCode][socketId]) {
              stationaryState[roomCode][socketId] = true;
              io.to(roomCode).emit('user-stationary', { socketId, username, since: last });
              io.to(roomCode).emit('room-message', {
                from: 'System',
                type: 'warning',
                content: `⚠️ ${username} has been stationary for more than ${Math.round(STATIONARY_THRESHOLD/60000)} minutes.`,
                timestamp: Date.now(),
              });
            }
            delete pendingConfirmations[roomCode][socketId];
          }, STATIONARY_CONFIRM_TIMEOUT);
        }
      }
    });
  });
}, 30 * 1000); // run every 30s

io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("join-room", ({ roomCode, username, userId }) => {
    if (!roomCode || !username || !userId) {
      console.warn("❗ join-room failed:", { roomCode, username, userId });
      return;
    }

    // Disconnect existing socket for this userId
    if (userSocketMap.has(userId)) {
      const oldSocketId = userSocketMap.get(userId);
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
        console.log(`❌ Disconnected old socket ${oldSocketId} for user ${username} (${userId})`);
      }
    }

    // Store new socket
    userSocketMap.set(userId, socket.id);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.username = username;
    socket.data.userId = userId;

    console.log(`👤 ${username} (${userId}) joined room ${roomCode}`);

    // Broadcast updated user list
    const users = [...io.sockets.adapter.rooms.get(roomCode) || []].map((socketId) => ({
      socketId,
      username: io.sockets.sockets.get(socketId)?.data.username,
    }));
    io.to(roomCode).emit("room-users", users);

    // Notify others of new user
    socket.to(roomCode).emit("user-joined", { username, socketId: socket.id });
  });

  const DEVIATION_COOLDOWN = 30000; // 1 minute
const lastDeviationAlert = new Map(); // socket.id => timestamp
  socket.on("location-update", ({ roomCode, coords }) => {
    if (!roomCode || !coords || !socket.data.username || !socket.data.userId) {
      console.warn("❗ location-update failed:", { roomCode, coords, user: socket.data });
      return;
    }

    // Store user location
    if (!roomLocations[roomCode]) roomLocations[roomCode] = {};
    roomLocations[roomCode][socket.id] = coords;
    // Update last move timestamp for this user
    if (!lastMoveTimestamp[roomCode]) lastMoveTimestamp[roomCode] = {};
    if (!stationaryState[roomCode]) stationaryState[roomCode] = {};

    const now = Date.now();
    const prev = lastMoveTimestamp[roomCode][socket.id] || 0;

    // If coords contain a timestamp or speed, you can use that; otherwise use distance-based movement
    const moved = (() => {
      const prevLoc = (roomLocations[roomCode] || {})[socket.id + "__prev"];
      if (!prevLoc) return true; // first report treat as moved
      try {
        const d = haversine(prevLoc, coords);
        return d > 5; // moved more than 5 meters
      } catch (e) {
        return true;
      }
    })();

    // store a shallow copy as previous for next comparison
    roomLocations[roomCode][socket.id + "__prev"] = coords;

    if (moved) {
      lastMoveTimestamp[roomCode][socket.id] = now;
      // If previously stationary, clear state and inform room
      if (stationaryState[roomCode][socket.id]) {
        stationaryState[roomCode][socket.id] = false;
        io.to(roomCode).emit("user-stationary-cleared", {
          socketId: socket.id,
          username: socket.data.username,
        });
        io.to(roomCode).emit("room-message", {
          from: "System",
          type: "info",
          content: `${socket.data.username} is moving again. Stationary cleared.`,
          timestamp: Date.now(),
        });
      }
    }

    // Broadcast location update
    io.to(roomCode).emit("location-update", {
      socketId: socket.id,
      username: socket.data.username,
      coords,
    });

    // Calculate group center and check for deviation
    const allCoords = Object.values(roomLocations[roomCode] || {});
    if (allCoords.length < 2) return;

    const center = {
      lat: allCoords.reduce((sum, loc) => sum + loc.lat, 0) / allCoords.length,
      lng: allCoords.reduce((sum, loc) => sum + loc.lng, 0) / allCoords.length,
    };

    // const myDistance = haversine(coords, center);
    // if (myDistance > DEVIATION_THRESHOLD) {
    //   io.to(roomCode).emit("anomaly-alert", {
    //     type: "deviation",
    //     userId: socket.id,
    //     username: socket.data.username,
    //     location: coords,
    //     distance: Math.round(myDistance),
    //   });
    //   console.log(`⚠️ ${socket.data.username} is deviating by ${Math.round(myDistance)}m`);
    // }


    const fence = {
  center: { lat:coords.lat,lng: coords.lng},
  radius: 300, // meters
};

const outside = isOutsideGeofence(coords, fence);

if (outside) {
  const now = Date.now();
  const lastAlert = lastDeviationAlert.get(socket.id) || 0;
  if (now - lastAlert > DEVIATION_COOLDOWN) {
    // Emit anomaly-alert event for other UI usage
    io.to(roomCode).emit("anomaly-alert", {
      type: "geofence",
      userId: socket.id,
      username: socket.data.username,
      coords,
    });

    // Emit as chat message so it shows in chat box
    // io.to(roomCode).emit("room-message", {
    //   from: "system",
    //   message: {
    //     type: "warning",
    //     content: `⚠️ ${socket.data.username} is outside the geofence!`,
    //     sender: "System",
    //     coords,
    //     timestamp: Date.now(),
    //   },
    // });

    const room = getRoom(roomCode);
const isCreator = (socket.data.userId === room.creatorId);

if (isCreator) {
  // Perform full geofence checks on creator only
  if (isOutsideGeofence(coords, geofence)) {
    io.to(roomCode).emit("room-message", {
      from: "System",
      type: "warning",
      content: `${socket.data.username} (creator) is outside the geofence!`,
    });
  }
} else {
  // For other members, only check if outside to send notifications
  if (isOutsideGeofence(coords, geofence)) {
    // Notify all except the user who is outside
    io.to(roomCode).emit("room-message", {
      from: "System",
      type: "warning",
      content: `${socket.data.username} is outside the group's area!`,
    });
    // Send private message to the user
    socket.emit("room-message", {
      from: "System",
      type: "warning",
      content: "You are getting far from your group",
    });
  }
}


    lastDeviationAlert.set(socket.id, now);
  }
}

  });

  // Handle user's response to stationary confirmation
  socket.on('stationary-response', ({ roomCode, response }) => {
    if (!roomCode || !socket.data.username) return;
    const roomPending = pendingConfirmations[roomCode] || {};
    const timeoutId = roomPending[socket.id];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete roomPending[socket.id];
    }

    if (response === 'yes') {
      // User confirms they're OK: reset lastMoveTimestamp to now to avoid re-asking
      if (!lastMoveTimestamp[roomCode]) lastMoveTimestamp[roomCode] = {};
      lastMoveTimestamp[roomCode][socket.id] = Date.now();
      // Make sure stationary state remains false
      if (stationaryState[roomCode]) stationaryState[roomCode][socket.id] = false;
      io.to(roomCode).emit('room-message', {
        from: 'System',
        type: 'info',
        content: `${socket.data.username} confirmed they are OK.`,
        timestamp: Date.now(),
      });
    } else {
      // 'no' or any negative response: broadcast SOS-like alert to room
      if (!stationaryState[roomCode]) stationaryState[roomCode] = {};
      stationaryState[roomCode][socket.id] = true;
      io.to(roomCode).emit('user-stationary', { socketId: socket.id, username: socket.data.username, since: Date.now() });
      io.to(roomCode).emit('room-message', {
        from: 'System',
        type: 'warning',
        content: `🚨 ${socket.data.username} indicated they need help!`,
        timestamp: Date.now(),
      });
    }
  });

socket.on("chat-message", ({ roomCode, message }) => {
  if (!roomCode || !message || !socket.data.username) {
    console.warn("⚠️ chat-message failed:", { roomCode, message, user: socket.data });
    return;
  }

  console.log(`💬 Chat from ${socket.data.username}: ${message.content}`);
  
  // Check if this is an SOS message
  if (message.type === "sos") {
    // Broadcast SOS status to all users in room
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

// Add handler to clear SOS status when user moves
socket.on("clear-sos", ({ roomCode }) => {
  if (!roomCode || !socket.data.username) return;
  
  io.to(roomCode).emit("user-sos-cleared", {
    socketId: socket.id,
    username: socket.data.username,
    userId: socket.data.userId,
  });
  
  console.log(`✅ SOS cleared for ${socket.data.username} in room ${roomCode}`);
});
// Listen for hazard reports from a user
// Listen for hazard reports from a user
socket.on("add-hazard", (data) => {
  console.log("[Server] Received hazard:", data);
  const roomId = data.roomId;

  // Broadcast marker update to other users in the room
  socket.to(roomId).emit("hazard-added", data);
  console.log(`[Server] Broadcasted hazard to room ${roomId}`);

  // Broadcast normalized hazard chat message to all users in the room
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
      
      // Remove from userSocketMap
      userSocketMap.delete(userId);

      // Remove location
      if (roomLocations[roomCode]) {
        delete roomLocations[roomCode][socket.id];
        if (Object.keys(roomLocations[roomCode]).length === 0) {
          delete roomLocations[roomCode];
        }
      }

      // Cleanup stationary state and lastMoveTimestamp
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

      // Notify room of user leaving
      io.to(roomCode).emit("user-left", {
        socketId: socket.id,
        username,
      });

      // Update user list
      const users = [...io.sockets.adapter.rooms.get(roomCode) || []].map((socketId) => ({
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