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
import crypto from "crypto";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ],
    credentials: true,
  })
);
app.get("/", (req, res) => {
  res.send("🚀 SyncFleet Backend is running");
});
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/ors", orsRoutes);
app.set("io", io);

const PORT = process.env.PORT || 5000;
const userSocketMap = new Map();
const roomCreators = {};

const GEOFENCE_KEY = (roomCode) => `room:${roomCode}:geofence`;
const GEOFENCE_RADIUS = 300;
const STATIONARY_THRESHOLD = process.env.STATIONARY_THRESHOLD_MS
  ? parseInt(process.env.STATIONARY_THRESHOLD_MS, 10)
  : 2 * 60 * 1000;
const STATIONARY_CONFIRM_TIMEOUT = process.env.STATIONARY_CONFIRM_TIMEOUT_MS
  ? parseInt(process.env.STATIONARY_CONFIRM_TIMEOUT_MS, 10)
  : 30 * 1000;
const HAZARD_TTL = 5 * 60 * 1000;
const STATUS_TTL = 20;
const TRANSIENT_KEY_TTL = 600;

const pendingConfirmations = {};

console.log(
  `⏱️ Stationary threshold set to ${Math.round(STATIONARY_THRESHOLD / 1000)}s`
);

// Periodic stationary check using tracked set (no redis.keys())
setInterval(async () => {
  const now = Date.now();
  const users = await redis.smembers("active:lastMove:users");

  for (const entry of users) {
    const [roomCode, userId] = entry.split(":");
    const key = `room:${roomCode}:user:${userId}:lastMove`;

    const last = await redis.get(key);
    if (!last) {
      await redis.srem("active:lastMove:users", entry);
      continue;
    }

    const lastTime = parseInt(last, 10);
    if (now - lastTime < STATIONARY_THRESHOLD) continue;

    const stationaryKey = `room:${roomCode}:user:${userId}:stationary`;
    const alreadyStationary = await redis.get(stationaryKey);
    if (alreadyStationary === "true") continue;

    // ✅ Batch Redis writes with pipeline
    const pipe = redis.pipeline();
    pipe.set(stationaryKey, "true", "EX", TRANSIENT_KEY_TTL);
    pipe.set(
      `room:${roomCode}:user:${userId}:sos`,
      "true",
      "EX",
      TRANSIENT_KEY_TTL
    );
    pipe.sadd(`room:${roomCode}:active:stationary`, userId);
    await pipe.exec();

    const socketId = userSocketMap.get(userId);
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) continue;

    const username = sock.data?.username || "Unknown";

    try {
      sock.emit("stationary-confirm", {
        message: `We've noticed you haven't moved for ${Math.round(
          STATIONARY_THRESHOLD / 60000
        )} minutes. Are you alright?`,
        timeout: STATIONARY_CONFIRM_TIMEOUT,
      });
    } catch {
      io.to(roomCode).emit("user-stationary", {
        userId,
        username,
        since: lastTime,
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

    if (!pendingConfirmations[roomCode]) {
      pendingConfirmations[roomCode] = {};
    }

    if (pendingConfirmations[roomCode][userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
    }

    pendingConfirmations[roomCode][userId] = setTimeout(async () => {
      const stillStationary = await redis.get(stationaryKey);
      if (stillStationary !== "true") {
        delete pendingConfirmations[roomCode][userId];
        return;
      }

      if (!pendingConfirmations[roomCode]?.[userId]) {
        return;
      }

      // ✅ Pipeline SOS escalation writes
      const pipe = redis.pipeline();
      pipe.set(
        `room:${roomCode}:user:${userId}:sos`,
        "true",
        "EX",
        TRANSIENT_KEY_TTL
      );
      pipe.sadd(`room:${roomCode}:active:sos`, userId);
      await pipe.exec();

      io.to(roomCode).emit("user-sos", {
        socketId,
        username,
        userId,
      });

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
// 🔒 Per-socket rate limiter (absolute safety net)
const lastLocationUpdate = new Map();
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on("join-room", async ({ roomCode, username, userId }) => {
    if (!roomCode || !username || !userId) {
      console.warn("⚠ join-room failed:", { roomCode, username, userId });
      return;
    }

    socket.data.roomCode = roomCode;
    socket.data.userId = userId;
    socket.data.username = username;

    // ✅ Batch initial setup with pipeline
    const pipe = redis.pipeline();
    pipe.sadd(`room:${roomCode}:chat:users`, userId);
    pipe.set(
      `room:${roomCode}:user:${userId}:status`,
      "online",
      "EX",
      STATUS_TTL
    );
    await pipe.exec();

    // ✅ Emit geofence state
    const geofenceState = await redis.hgetall(GEOFENCE_KEY(roomCode));
    socket.emit("geofence-init", geofenceState);

    // ✅ Emit SOS state using tracked set (no redis.keys())
    const sosUserIds = await redis.smembers(`room:${roomCode}:active:sos`);
    const sosState = {};
    for (const uid of sosUserIds) {
      const socketId = userSocketMap.get(uid);
      if (socketId) sosState[socketId] = true;
    }
    socket.emit("sos-init", sosState);

    socket.to(roomCode).emit("user-status", {
      userId,
      status: "online",
    });

    // ✅ Handle duplicate socket for same user
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

  socket.on("get-chat-history", async ({ roomCode }) => {
    const raw = await redis.lrange(
      `room:${roomCode}:chat:messages`,
      0,
      -1
    );

    const messages = raw.map(JSON.parse);
    socket.emit("chat-history", messages);
  });

  socket.on("get-unread-count", async ({ roomCode, userId }) => {
    const count =
      (await redis.get(`room:${roomCode}:chat:unread:${userId}`)) || 0;
    socket.emit("unread-count", Number(count));
  });

  socket.on("mark-chat-seen", async ({ roomCode, userId }) => {
    await redis.del(`room:${roomCode}:chat:unread:${userId}`);
    socket.emit("unread-count", 0);
  });

  socket.on("location-update", async ({ roomCode, coords }) => {
     const now = Date.now();
  const last = lastLocationUpdate.get(socket.id) || 0;

  // ⛔ drop spam (max 1 update / 1.5s)
  if (now - last < 1500) return;

  lastLocationUpdate.set(socket.id, now);
      console.log("📍 location-update received");
    if (!roomCode || !coords || !socket.data.username || !socket.data.userId) {
      return;
    }
    

    const isCreator = socket.data.isCreator || false;
    const redisKey = `room:${roomCode}:locations`;
    const currentKey = socket.id;
    const prevKey = `${socket.id}:prev`;
    const userId = socket.data.userId;

    // ✅ Fetch previous location
    const prevRaw = await redis.hget(redisKey, prevKey);
    const prevLoc = prevRaw ? JSON.parse(prevRaw) : null;

    // ✅ Update creator coords in memory
    if (isCreator && roomCreators[roomCode]) {
      roomCreators[roomCode].coords = coords;
    }

    // ✅ Calculate movement distance efficiently
    let moved = true;
    if (prevLoc) {
      try {
        moved = haversine(prevLoc, coords) > 5;
      } catch {
        moved = true;
      }
    }

    // ✅ Batch location update operations
    const pipe = redis.pipeline();
    pipe.hset(redisKey, prevKey, JSON.stringify(coords), currentKey, JSON.stringify(coords));
pipe.expire(`room:${roomCode}:locations`, 120);
    if (moved) {
      pipe.set(
        `room:${roomCode}:user:${userId}:lastMove`,
        Date.now(),
        "EX",
        TRANSIENT_KEY_TTL
      );
      pipe.set(
        `room:${roomCode}:user:${userId}:status`,
        "online",
        "EX",
        STATUS_TTL
      );
      pipe.sadd("active:lastMove:users", `${roomCode}:${userId}`);
    } else {
      pipe.set(
        `room:${roomCode}:user:${userId}:status`,
        "online",
        "EX",
        STATUS_TTL
      );
    }

    await pipe.exec();

    // ✅ Check stationary status
    const stationaryKey = `room:${roomCode}:user:${userId}:stationary`;
    const wasStationary = await redis.get(stationaryKey);

    if (wasStationary === "true") {
      // ✅ Clear stationary with pipeline
      const clearPipe = redis.pipeline();
      clearPipe.set(stationaryKey, "false", "EX", TRANSIENT_KEY_TTL);
      clearPipe.set(
        `room:${roomCode}:user:${userId}:sos`,
        "false",
        "EX",
        TRANSIENT_KEY_TTL
      );
      clearPipe.srem(`room:${roomCode}:active:stationary`, userId);
      clearPipe.srem(`room:${roomCode}:active:sos`, userId);
      await clearPipe.exec();

      io.to(roomCode).emit("user-stationary-cleared", {
        socketId: socket.id,
        username: socket.data.username,
      });

      io.to(roomCode).emit("user-sos-cleared", {
        socketId: socket.id,
        username: socket.data.username,
        userId,
      });

      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "info",
        content: `${socket.data.username} is moving again.`,
        timestamp: Date.now(),
      });
    }

    // ✅ Always emit location update
    io.to(roomCode).emit("location-update", {
      socketId: socket.id,
      username: socket.data.username,
      coords,
      isCreator,
    });

    // ✅ Geofence check for non-creator members
    if (!isCreator && roomCreators[roomCode]?.coords) {
      const creatorCoords = roomCreators[roomCode].coords;

      try {
        const distance = haversine(coords, creatorCoords);
        const geofenceRedisKey = GEOFENCE_KEY(roomCode);

        const wasOutside = await redis.hget(geofenceRedisKey, userId);
        const isOutside = distance > GEOFENCE_RADIUS;

        // ✅ User entered geofence violation
        if (isOutside && !wasOutside) {
          const pipe = redis.pipeline();
          pipe.hset(geofenceRedisKey, userId, "1");
          pipe.sadd(`room:${roomCode}:active:geofence`, userId);
          await pipe.exec();

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

        // ✅ User re-entered geofence (back in range)
        if (!isOutside && wasOutside) {
          const pipe = redis.pipeline();
          pipe.hdel(geofenceRedisKey, userId);
          pipe.srem(`room:${roomCode}:active:geofence`, userId);
          await pipe.exec();

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

    // ✅ Clear timeout
    if (pendingConfirmations[roomCode]?.[userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
      delete pendingConfirmations[roomCode][userId];
    }

    const stationaryKey = `room:${roomCode}:user:${userId}:stationary`;

    if (response === "yes") {
      // ✅ User is OK - clear stationary with pipeline
      const pipe = redis.pipeline();
      pipe.set(stationaryKey, "false", "EX", TRANSIENT_KEY_TTL);
      pipe.set(
        `room:${roomCode}:user:${userId}:sos`,
        "false",
        "EX",
        TRANSIENT_KEY_TTL
      );
      pipe.set(
        `room:${roomCode}:user:${userId}:lastMove`,
        Date.now(),
        "EX",
        TRANSIENT_KEY_TTL
      );
      pipe.srem(`room:${roomCode}:active:stationary`, userId);
      pipe.srem(`room:${roomCode}:active:sos`, userId);
      await pipe.exec();

      io.to(roomCode).emit("user-stationary-cleared", {
        socketId: socket.id,
        username,
      });

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
      // ✅ User needs help
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

  socket.on("chat-message", async ({ roomCode, message }) => {
    if (!roomCode || !message?.content) return;

    const chatMessage = {
      id: crypto.randomUUID(),
      sender: socket.data.username,
      senderId: socket.data.userId,
      content: message.content,
      type: message.type || "text",
      timestamp: Date.now(),
    };

    // ✅ Batch chat message storage
    const pipe = redis.pipeline();
    pipe.rpush(
      `room:${roomCode}:chat:messages`,
      JSON.stringify(chatMessage)
    );
    pipe.ltrim(`room:${roomCode}:chat:messages`, -100, -1);

    // ✅ Increment unread count for all users except sender
    const users = await redis.smembers(`room:${roomCode}:chat:users`);
    for (const uid of users) {
      if (uid !== chatMessage.senderId) {
        pipe.incr(`room:${roomCode}:chat:unread:${uid}`);
      }
    }

    await pipe.exec();

    // ✅ Emit clean chat event
    io.to(roomCode).emit("chat-message", chatMessage);
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

    // ✅ Hazard auto-clear with timeout
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

    // ✅ Batch disconnect cleanup operations
    const pipe = redis.pipeline();
    pipe.set(`room:${roomCode}:user:${userId}:status`, "offline");
    pipe.srem(`room:${roomCode}:chat:users`, userId);
    pipe.srem(`room:${roomCode}:active:stationary`, userId);
    pipe.srem(`room:${roomCode}:active:sos`, userId);
    pipe.srem(`room:${roomCode}:active:geofence`, userId);
    pipe.srem("active:lastMove:users", `${roomCode}:${userId}`);
    pipe.hdel(
  `room:${roomCode}:locations`,
  socket.id,
  `${socket.id}:prev`
);
    await pipe.exec();


    socket.to(roomCode).emit("user-status", {
      userId,
      status: "offline",
    });

    console.log(
      `❌ ${username} (${userId}) disconnected from room ${roomCode}`
    );

    // ✅ Cleanup server state
    userSocketMap.delete(userId);
lastLocationUpdate.delete(socket.id);
    // ✅ Clear pending stationary confirmation
    if (pendingConfirmations[roomCode]?.[userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
      delete pendingConfirmations[roomCode][userId];
    }

    // ✅ Handle room creator disconnect
    if (roomCreators[roomCode]?.userId === userId) {
      delete roomCreators[roomCode];
      console.log(`👑 Room creator left room ${roomCode}`);
    }

    // ✅ Notify room user left
    io.to(roomCode).emit("user-left", {
      socketId: socket.id,
      username,
    });

    // ✅ Update room user list
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
