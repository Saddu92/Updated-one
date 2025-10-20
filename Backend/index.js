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