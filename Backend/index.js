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
import redis from "./utils/redis.js";

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
const roomCreators = {};


const ALERT_COOLDOWN = 30000;

const GEOFENCE_KEY = (roomCode) => `room:${roomCode}:geofence`;
const STATIONARY_THRESHOLD = process.env.STATIONARY_THRESHOLD_MS
  ? parseInt(process.env.STATIONARY_THRESHOLD_MS, 10)
  : 2 * 60 * 1000;
const STATIONARY_CONFIRM_TIMEOUT = process.env.STATIONARY_CONFIRM_TIMEOUT_MS
  ? parseInt(process.env.STATIONARY_CONFIRM_TIMEOUT_MS, 10)
  : 30 * 1000;
const pendingConfirmations = {};

console.log(
  `⏱️ Stationary threshold set to ${Math.round(STATIONARY_THRESHOLD / 1000)}s`
);


// Periodic stationary check
setInterval(async () => {
  const now = Date.now();

  // 🔹 Fetch all users' lastMove timestamps
  const keys = await redis.keys("room:*:user:*:lastMove");
  


  for (const key of keys) {
    const last = parseInt(await redis.get(key), 10);
    if (!last) continue;

    if (now - last < STATIONARY_THRESHOLD) continue;

    // key format: room:{roomCode}:user:{userId}:lastMove
    const [, roomCode, , userId] = key.split(":");

    const stationaryKey = `room:${roomCode}:user:${userId}:stationary`;

    // 🔹 Already marked stationary? (same logic as before)
    const alreadyStationary = await redis.get(stationaryKey);
    if (alreadyStationary === "true") continue;

    // 🔹 Mark stationary in Redis
    await redis.set(stationaryKey, "true");

    // 🔹 Find socket for this user
    const socketId = userSocketMap.get(userId);
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) continue;

    const username = sock.data?.username || "Unknown";

    // 🔹 Ask user for confirmation (UNCHANGED BEHAVIOR)
    try {
      sock.emit("stationary-confirm", {
        message: `We've noticed you haven't moved for ${Math.round(
          STATIONARY_THRESHOLD / 60000
        )} minutes. Are you alright?`,
        timeout: STATIONARY_CONFIRM_TIMEOUT,
      });
    } catch {
      // Same fallback behavior as your code
      io.to(roomCode).emit("user-stationary", {
        userId,
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

      continue;
    }

    // 🔹 Confirmation timeout (UNCHANGED LOGIC)
    if (!pendingConfirmations[roomCode]) {
      pendingConfirmations[roomCode] = {};
    }

    if (pendingConfirmations[roomCode][userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
    }

 pendingConfirmations[roomCode][userId] = setTimeout(async () => {
  const stillStationary = await redis.get(stationaryKey);
  // ✅ CHECK: If user already confirmed, don't escalate to SOS
  if (stillStationary !== "true") {
    delete pendingConfirmations[roomCode][userId];
    return;
  }

  // ✅ ALSO CHECK: If there's no pending confirmation anymore, user already responded
  if (!pendingConfirmations[roomCode]?.[userId]) {
    return;
  }

  // 🔴 ESCALATE TO SOS
  io.to(roomCode).emit("user-sos", {
    socketId: socketId,
    username,
    userId,
  });

  // 🔴 SEND CHAT MESSAGE
  io.to(roomCode).emit("room-message", {
    from: "System",
    type: "sos",
    content: `🚨 ${username} is unresponsive and may need help!`,
    timestamp: Date.now(),
  });

  delete pendingConfirmations[roomCode][userId];
}, STATIONARY_CONFIRM_TIMEOUT);

  }
}, 30 * 1000);

// SOCKET HANDLERS
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("join-room", async ({ roomCode, username, userId }) => {
    const geofenceState = await redis.hgetall(GEOFENCE_KEY(roomCode));
socket.emit("geofence-init", geofenceState);

    if (!roomCode || !username || !userId) {
      console.warn("⚠ join-room failed:", { roomCode, username, userId });
      return;
    }

    socket.data.roomCode = roomCode;
    socket.data.userId = userId;
    socket.data.username = username;
    await redis.set(
      `room:${roomCode}:user:${userId}:status`,
      "online",
      "EX",
      20
    );

    socket.to(roomCode).emit("user-status", {
      userId,
      status: "online",
    });

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

          const users = [...(io.sockets.adapter.rooms.get(roomCode) || [])].map(
            (socketId) => {
              const sock = io.sockets.sockets.get(socketId);
              return {
                socketId,
                username: sock?.data.username,
                isCreator: sock?.data.isCreator || false,
              };
            }
          );
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



  socket.on("location-update", async ({ roomCode, coords }) => {
    if (!roomCode || !coords || !socket.data.username || !socket.data.userId) {
      console.warn("⚠ location-update failed:", {
        roomCode,
        coords,
        user: socket.data,
      });
      return;
    }


    const isCreator = socket.data.isCreator || false;

    const redisKey = `room:${roomCode}:locations`;
    const currentKey = socket.id;
    const prevKey = `${socket.id}:prev`;

    const prevRaw = await redis.hget(redisKey, prevKey);
    const prevLoc = prevRaw ? JSON.parse(prevRaw) : null;
// ✅ Update creator coords
if (isCreator && roomCreators[roomCode]) {
  roomCreators[roomCode].coords = coords;
}

    let moved = true;
    if (prevLoc) {
      try {
        moved = haversine(prevLoc, coords) > 5;
      } catch {
        moved = true;
      }
    }

    await redis.hset(redisKey, prevKey, JSON.stringify(coords));
    await redis.hset(redisKey, currentKey, JSON.stringify(coords));

    if (moved) {
      await redis.set(
        `room:${roomCode}:user:${socket.data.userId}:lastMove`,
        Date.now()
      );

      await redis.set(
        `room:${roomCode}:user:${socket.data.userId}:status`,
        "online",
        "EX",
        20
      );

      const stationaryKey = `room:${roomCode}:user:${socket.data.userId}:stationary`;
      const wasStationary = await redis.get(stationaryKey);

      if (wasStationary === "true") {
        await redis.set(stationaryKey, "false");

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

    // ✅ location-update emit MUST be OUTSIDE the moved block
    io.to(roomCode).emit("location-update", {
      socketId: socket.id,
      username: socket.data.username,
      coords,
      isCreator,
    });

    // ✅ Update creator coords
   if (!isCreator && roomCreators[roomCode]?.coords) {
  const creatorCoords = roomCreators[roomCode].coords;
  const GEOFENCE_RADIUS = 300;

  try {
    const distance = haversine(coords, creatorCoords);
    const redisKey = GEOFENCE_KEY(roomCode);
    const userId = socket.data.userId;

    const wasOutside = await redis.hget(redisKey, userId);
    const isOutside = distance > GEOFENCE_RADIUS;

    // 🔴 ENTERED geofence violation
    if (isOutside && !wasOutside) {
      await redis.hset(redisKey, userId, "1");

      io.to(roomCode).emit("geofence-update", {
        userId,
        socketId: socket.id,
        isOutside: true,
        distance: Math.round(distance),
      });

      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "warning",
        content: `⚠️ ${socket.data.username} is ${Math.round(distance)}m away from the group leader!`,
        timestamp: Date.now(),
      });
    }

    // 🟢 RE-ENTERED geofence (THIS FIXES YOUR ISSUE)
    if (!isOutside && wasOutside) {
      await redis.hdel(redisKey, userId);

      io.to(roomCode).emit("geofence-update", {
        userId,
        socketId: socket.id,
        isOutside: false,
      });

      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "info",
        content: `✅ ${socket.data.username} is back inside the group range.`,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.error("Geofence error:", err);
  }
}

  });

  socket.on("stationary-response", async ({ roomCode, response }) => {
    const { userId, username } = socket.data;
    if (!roomCode || !userId) return;

    // clear timeout
    if (pendingConfirmations[roomCode]?.[userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
      delete pendingConfirmations[roomCode][userId];
    }

    const stationaryKey = `room:${roomCode}:user:${userId}:stationary`;

    if (response === "yes") {
      // ✅ USER IS OK → CLEAR STATIONARY IN REDIS
      await redis.set(stationaryKey, "false");

      // refresh lastMove so timer resets
      await redis.set(`room:${roomCode}:user:${userId}:lastMove`, Date.now());

      io.to(roomCode).emit("user-stationary-cleared", {
        socketId: socket.id,
        username,
      });

      // ✅ ALSO CLEAR SOS ALERT
      io.to(roomCode).emit("user-sos-cleared", {
        socketId: socket.id,
        username,
        userId,
      });

      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "info",
        content: `✅ ${username} confirmed they are OK.`,
        timestamp: Date.now(),
      });
    } else {
      // ❗ USER NEEDS HELP
      io.to(roomCode).emit("user-stationary", {
        socketId: socket.id,
        username,
        since: Date.now(),
      });

      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "warning",
        content: `🚨 ${username} indicated they need help!`,
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

      console.log(
        `🚨 SOS Alert from ${socket.data.username} in room ${roomCode}`
      );
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

    console.log(
      `✅ SOS cleared for ${socket.data.username} in room ${roomCode}`
    );
  });

  const HAZARD_TTL = 5 * 60 * 1000; // 5 minutes
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
    setTimeout(() => {
  io.in(roomId).emit("hazard-cleared", {
    hazardId: data.id,
    userName: data.userName,
  });

  io.in(roomId).emit("room-message", {
    from: "System",
    type: "info",
    content: `✅ Hazard reported by ${data.userName} is now cleared.`,
    timestamp: Date.now(),
  });
}, HAZARD_TTL);
  });

  socket.on("disconnect", async () => {
    const { roomCode, username, userId } = socket.data || {};
    if (!roomCode || !userId) return;

    // 🔹 Mark user offline in Redis
    await redis.set(`room:${roomCode}:user:${userId}:status`, "offline");

    // 🔹 Notify others (for faded / disconnected icon)
    socket.to(roomCode).emit("user-status", {
      userId,
      status: "offline",
    });

    console.log(
      `❌ ${username} (${userId}) disconnected from room ${roomCode}`
    );

    // 🔹 Cleanup server state
    userSocketMap.delete(userId);
    
    // 🔹 Clear pending stationary confirmation (IMPORTANT)
    if (pendingConfirmations[roomCode]?.[userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
      delete pendingConfirmations[roomCode][userId];
    }
  


    if (roomCreators[roomCode]?.userId === userId) {
      delete roomCreators[roomCode];
      console.log(`👑 Room creator left room ${roomCode}`);
    }
    await redis.set(`room:${roomCode}:user:${userId}:stationary`, "false");

    // 🔹 Notify room user left
    io.to(roomCode).emit("user-left", {
      socketId: socket.id,
      username,
    });

    // 🔹 Update room user list
    const users = [...(io.sockets.adapter.rooms.get(roomCode) || [])].map(
      (socketId) => ({
        socketId,
        username: io.sockets.sockets.get(socketId)?.data.username,
      })
    );

    io.to(roomCode).emit("room-users", users);
  });
});

(async () => {
  try {
    await redis.ping();
    console.log("🧪 Redis ping successful");
  } catch (err) {
    console.error("❌ Redis ping failed:", err);
  }
})();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
