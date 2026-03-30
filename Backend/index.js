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
import crypto from "crypto"; // add at top if not present

// Redis Lua helpers to reduce command count (Upstash-friendly)
redis.defineCommand("setSosState", {
  numberOfKeys: 2,
  lua: `
    redis.call("SET", KEYS[1], ARGV[1])
    if tonumber(ARGV[3]) and tonumber(ARGV[3]) > 0 then
      redis.call("EXPIRE", KEYS[1], tonumber(ARGV[3]))
    end
    if ARGV[1] == "true" then
      redis.call("SADD", KEYS[2], ARGV[2])
    else
      redis.call("SREM", KEYS[2], ARGV[2])
    end
    if tonumber(ARGV[3]) and tonumber(ARGV[3]) > 0 then
      redis.call("EXPIRE", KEYS[2], tonumber(ARGV[3]))
    end
    return 1
  `,
});

redis.defineCommand("incrUnread", {
  numberOfKeys: 1,
  lua: `
    local users = redis.call("SMEMBERS", KEYS[1])
    local res = {}
    local ttl = tonumber(ARGV[3])
    for i = 1, #users do
      local u = users[i]
      if u ~= ARGV[1] then
        local key = ARGV[2] .. u
        local c = redis.call("INCR", key)
        if ttl and ttl > 0 then
          redis.call("EXPIRE", key, ttl)
        end
        res[#res + 1] = u
        res[#res + 1] = c
      end
    end
    return res
  `,
});


dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // allow_origins=["*"]  
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
     "https://syncfleet-teal.vercel.app",
     /\.vercel\.app$/,
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
     "https://syncfleet-teal.vercel.app",
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


const ALERT_COOLDOWN = 30000;

const GEOFENCE_KEY = (roomCode) => `room:${roomCode}:geofence`;
const GEOFENCE_CENTER_KEY = (roomCode) => `room:${roomCode}:geofence:center`;
const SOS_SET_KEY = (roomCode) => `room:${roomCode}:sos:users`;
const SOS_INIT_KEY = (roomCode) => `room:${roomCode}:sos:init`;
const SOS_KEY = (roomCode, userId) => `room:${roomCode}:user:${userId}:sos`;
const applySosState = (pipe, roomCode, userId, isSos) => {
  pipe.setSosState(
    SOS_KEY(roomCode, userId),
    SOS_SET_KEY(roomCode),
    isSos ? "true" : "false",
    userId,
    SOS_TTL_SEC
  );
};
const STATIONARY_THRESHOLD = process.env.STATIONARY_THRESHOLD_MS
  ? parseInt(process.env.STATIONARY_THRESHOLD_MS, 10)
  : 30 * 1000; // 30 seconds in test mode
const STATIONARY_CONFIRM_TIMEOUT = process.env.STATIONARY_CONFIRM_TIMEOUT_MS
  ? parseInt(process.env.STATIONARY_CONFIRM_TIMEOUT_MS, 10)
  : 60 * 1000; // 1 minute for auto-SOS timeout
const LOCATION_EMIT_MS = process.env.LOCATION_EMIT_MS
  ? parseInt(process.env.LOCATION_EMIT_MS, 10)
  : 5000;
const LOCATION_MIN_MOVE_M = process.env.LOCATION_MIN_MOVE_M
  ? parseInt(process.env.LOCATION_MIN_MOVE_M, 10)
  : 5;
const CHAT_TTL_SEC = process.env.CHAT_TTL_SEC
  ? parseInt(process.env.CHAT_TTL_SEC, 10)
  : 120;
const CHAT_HISTORY_LIMIT = process.env.CHAT_HISTORY_LIMIT
  ? parseInt(process.env.CHAT_HISTORY_LIMIT, 10)
  : 50;
const LOCATIONS_TTL_SEC = process.env.LOCATIONS_TTL_SEC
  ? parseInt(process.env.LOCATIONS_TTL_SEC, 10)
  : 120;
const SOS_TTL_SEC = process.env.SOS_TTL_SEC
  ? parseInt(process.env.SOS_TTL_SEC, 10)
  : 180;
const UNREAD_TTL_SEC = process.env.UNREAD_TTL_SEC
  ? parseInt(process.env.UNREAD_TTL_SEC, 10)
  : 180;
const lastLocationUpdate = new Map();
const pendingConfirmations = {};

console.log(
  `⏱️ Stationary threshold set to ${Math.round(STATIONARY_THRESHOLD / 1000)}s`
);


// Periodic stationary check - OPTIMIZED with local cache
const stationaryCache = {}; // Local cache to avoid repeated Redis reads
setInterval(async () => {
  const now = Date.now();

  // 🔹 Get all rooms from active connections (instead of KEYS scan)
  const rooms = new Set();
  for (const [userId, socketId] of userSocketMap.entries()) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock?.data.roomCode) rooms.add(sock.data.roomCode);
  }

  // 🔹 Check each active room in one batch
  for (const roomCode of rooms) {
    const pipe = redis.pipeline();
    const playerKeys = [];
    const toStationary = [];
    
    // Get all sockets in this room
    const roomSockets = io.sockets.adapter.rooms.get(roomCode) || [];
    
    for (const socketId of roomSockets) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock?.data.userId) {
        const userKey = `room:${roomCode}:user:${sock.data.userId}:lastMove`;
        const stationaryKey = `room:${roomCode}:user:${sock.data.userId}:stationary`;
        playerKeys.push({ socketId: socketId, userId: sock.data.userId, userKey, stationaryKey });
        pipe.get(userKey);
        pipe.get(stationaryKey);
      }
    }

    if (playerKeys.length === 0) continue;

    // Execute batch
    const results = await pipe.exec();
    
    // Process results
    for (let i = 0; i < playerKeys.length; i++) {
      const { socketId, userId, userKey, stationaryKey } = playerKeys[i];
      const last = parseInt(results[i * 2], 10);
      const alreadyStationary = results[i * 2 + 1];

      if (!last || now - last < STATIONARY_THRESHOLD) continue;
      if (alreadyStationary === "true") continue;

      // Mark for batch Redis update
      toStationary.push(stationaryKey);

      const sock = io.sockets.sockets.get(socketId);
      if (!sock) continue;

      const username = sock.data?.username || "Unknown";

      try {
        const durationText = STATIONARY_THRESHOLD >= 60000
          ? `${Math.round(STATIONARY_THRESHOLD / 60000)} minute(s)`
          : `${Math.round(STATIONARY_THRESHOLD / 1000)} second(s)`;

        console.log(`→ stationary-confirm request for room=${roomCode}, user=${username}, timeout=${STATIONARY_CONFIRM_TIMEOUT}ms`);

        sock.emit("stationary-confirm", {
          message: `We've noticed you haven't moved for ${durationText}. Are you alright?`,
          timeout: STATIONARY_CONFIRM_TIMEOUT,
        });
      } catch {
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
        
        const sosPipe = redis.pipeline();
        applySosState(sosPipe, roomCode, userId, true);
        await sosPipe.exec();

        console.log(`🚨 stationary timeout -> auto SOS for room=${roomCode}, user=${username}, userId=${userId}`);

        io.to(roomCode).emit("user-sos", {
          socketId: socketId,
          username,
          userId,
        });

        io.to(roomCode).emit("room-message", {
          from: "System",
          type: "sos",
          content: `🚨 ${username} is unresponsive and may need help!`,
          timestamp: Date.now(),
        });

        io.to(roomCode).emit("chat-message", {
          id: crypto.randomUUID(),
          sender: "System",
          senderId: "system",
          content: `🚨 ${username} is unresponsive and may need help!`,
          type: "sos",
          timestamp: Date.now(),
        });

        delete pendingConfirmations[roomCode][userId];
      }, STATIONARY_CONFIRM_TIMEOUT);
    }

    if (toStationary.length) {
      const setPipe = redis.pipeline();
      for (const key of toStationary) {
        setPipe.set(key, "true");
      }
      await setPipe.exec();
    }
  }
}, 30 * 1000);

// SOCKET HANDLERS
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);


  socket.on("join-room", async ({ roomCode, username, userId }) => {
    const joinPipe = redis.pipeline();
    joinPipe.sadd(`room:${roomCode}:chat:users`, userId);
    joinPipe.hgetall(GEOFENCE_KEY(roomCode));
    joinPipe.smembers(SOS_SET_KEY(roomCode));
    joinPipe.get(SOS_INIT_KEY(roomCode));
    joinPipe.get(GEOFENCE_CENTER_KEY(roomCode));
    const joinResults = await joinPipe.exec();

    const geofenceState = joinResults[1]?.[1] || {};
    socket.emit("geofence-init", geofenceState);
    
    // Send current geofence radius
    const radiusKey = `room:${roomCode}:geofence:radius`;
    const currentRadius = await redis.get(radiusKey);
    if (currentRadius) {
      socket.emit("geofence-radius-update", { radius: parseInt(currentRadius, 10) });
    }
    const storedCenterRaw = joinResults[4]?.[1];
    const storedCenter = storedCenterRaw ? JSON.parse(storedCenterRaw) : null;
    if (storedCenter || roomCreators[roomCode]?.coords) {
      socket.emit("geofence-state-update", {
        center: storedCenter || roomCreators[roomCode].coords,
        radius: currentRadius ? parseInt(currentRadius, 10) : roomCreators[roomCode].radius || 300,
      });
    }
    let sosUserIds = joinResults[2]?.[1] || [];
    const sosState = {};

    // One-time fallback for legacy keys; populate set to avoid future KEYS
    if (!sosUserIds.length) {
      const init = joinResults[3]?.[1];
      if (!init) {
        const sosKeys = await redis.keys(`room:${roomCode}:user:*:sos`);
        if (sosKeys.length) {
          const pipe = redis.pipeline();
          for (const key of sosKeys) pipe.get(key);
          const results = await pipe.exec();

          const migratePipe = redis.pipeline();
          for (let i = 0; i < sosKeys.length; i++) {
            const val = results[i]?.[1];
            if (val === "true") {
              const [, , , userId] = sosKeys[i].split(":");
              sosUserIds.push(userId);
              migratePipe.sadd(SOS_SET_KEY(roomCode), userId);
            }
          }
          migratePipe.set(SOS_INIT_KEY(roomCode), "1");
          await migratePipe.exec();
        } else {
          await redis.set(SOS_INIT_KEY(roomCode), "1");
        }
      }
    }

    for (const userId of sosUserIds) {
      const socketId = userSocketMap.get(userId);
      if (socketId) sosState[socketId] = true;
    }

    socket.emit("sos-init", sosState);


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
      .then(async (room) => {
        if (room) {
          const isCreator = room.createdBy.toString() === userId;
          socket.data.isCreator = isCreator;

          if (isCreator) {
            const savedRadiusRaw = await redis.get(`room:${roomCode}:geofence:radius`);
            roomCreators[roomCode] = {
              userId,
              socketId: socket.id,
              coords: null,
              radius: savedRadiusRaw ? parseInt(savedRadiusRaw, 10) : 300,
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
                userId: sock?.data.userId,
                username: sock?.data.username,
                isCreator: sock?.data.isCreator || false,
              };
            }
          );
          io.to(roomCode).emit("room-users", users);
          socket.to(roomCode).emit("user-joined", {
            username,
            userId,
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
    -CHAT_HISTORY_LIMIT,
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
    // if (!roomCode || !coords || !socket.data.username || !socket.data.userId) {
    //   console.warn("⚠ location-update failed:", {
    //     roomCode,
    //     coords,
    //     user: socket.data,
    //   });
    //   return;
    // }


    const isCreator = socket.data.isCreator || false;

    // Server-side rate limit to reduce Redis load
    const now = Date.now();
    const last = lastLocationUpdate.get(socket.id);
    if (last) {
      try {
        const dist = haversine(last.coords, coords);
        if (dist < LOCATION_MIN_MOVE_M && now - last.ts < LOCATION_EMIT_MS) {
          return;
        }
      } catch {
        // ignore distance errors and continue
      }
    }
    lastLocationUpdate.set(socket.id, { coords, ts: now });

    const redisKey = `room:${roomCode}:locations`;
    const currentKey = socket.id;
    const prevKey = `${socket.id}:prev`;

    const prevRaw = await redis.hget(redisKey, prevKey);
    const prevLoc = prevRaw ? JSON.parse(prevRaw) : null;
// ✅ Update creator coords
if (isCreator && roomCreators[roomCode]) {
  roomCreators[roomCode].coords = coords;
  await redis.set(GEOFENCE_CENTER_KEY(roomCode), JSON.stringify(coords));
  io.to(roomCode).emit("geofence-state-update", {
    center: coords,
    radius: roomCreators[roomCode].radius || 300,
  });
}

    let moved = true;
    if (prevLoc) {
      try {
        moved = haversine(prevLoc, coords) > 5;
      } catch {
        moved = true;
      }
    }

    const locPipe = redis.pipeline();
    locPipe.hset(redisKey, {
      [prevKey]: JSON.stringify(coords),
      [currentKey]: JSON.stringify(coords),
    });
    if (LOCATIONS_TTL_SEC > 0) {
      locPipe.expire(redisKey, LOCATIONS_TTL_SEC);
    }
    await locPipe.exec();

    if (moved) {
      const movePipe = redis.pipeline();
      movePipe.set(
        `room:${roomCode}:user:${socket.data.userId}:lastMove`,
        Date.now()
      );
      movePipe.set(
        `room:${roomCode}:user:${socket.data.userId}:status`,
        "online",
        "EX",
        20
      );

      const stationaryKey = `room:${roomCode}:user:${socket.data.userId}:stationary`;
      movePipe.get(stationaryKey);
      const moveResults = await movePipe.exec();
      const wasStationary = moveResults[2]?.[1];

      if (wasStationary === "true") {
        const clearPipe = redis.pipeline();
        applySosState(clearPipe, roomCode, socket.data.userId, false);
        clearPipe.set(stationaryKey, "false");
        await clearPipe.exec();

        io.to(roomCode).emit("user-stationary-cleared", {
          socketId: socket.id,
          username: socket.data.username,
          
        });
 io.to(roomCode).emit("user-sos-cleared", {
    socketId: socket.id,
    username: socket.data.username,
    userId: socket.data.userId,
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
      geofenceRadius: roomCreators[roomCode]?.radius,
    });

    // ✅ Update creator coords
   if (!isCreator && roomCreators[roomCode]?.coords) {
  const creatorCoords = roomCreators[roomCode].coords;
  
  // Get the current geofence radius from Redis, default to 300
  const radiusKey = `room:${roomCode}:geofence:radius`;
  const storedRadius = await redis.get(radiusKey);
  const GEOFENCE_RADIUS = storedRadius ? parseInt(storedRadius, 10) : 300;

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

      // Emit anomaly alert for toast notification
      io.to(roomCode).emit("anomaly-alert", {
        socketId: socket.id,
        username: socket.data.username,
        type: "geofence",
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

    console.log(`[stationary] response from user=${username}, room=${roomCode}, response=${response}`);

    // clear timeout
    if (pendingConfirmations[roomCode]?.[userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
      delete pendingConfirmations[roomCode][userId];
    }

    const stationaryKey = `room:${roomCode}:user:${userId}:stationary`;

    if (response === "yes") {
      const okPipe = redis.pipeline();
      applySosState(okPipe, roomCode, userId, false);

      // ✅ USER IS OK → CLEAR STATIONARY IN REDIS
      okPipe.set(stationaryKey, "false");

      // refresh lastMove so timer resets
      okPipe.set(`room:${roomCode}:user:${userId}:lastMove`, Date.now());
      await okPipe.exec();

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
      // ❗ USER NEEDS HELP → trigger SOS
      const sosPipe = redis.pipeline();
      applySosState(sosPipe, roomCode, userId, true);
      await sosPipe.exec();

      io.to(roomCode).emit("user-sos", {
        socketId: socket.id,
        username,
        userId,
      });

      io.to(roomCode).emit("room-message", {
        from: "System",
        type: "sos",
        content: `🚨 ${username} indicated they need help!`,
        timestamp: Date.now(),
      });

      io.to(roomCode).emit("chat-message", {
        id: crypto.randomUUID(),
        sender: "System",
        senderId: "system",
        content: `🚨 ${username} indicated they need help!`,
        type: "sos",
        timestamp: Date.now(),
      });
    }
  });

  socket.on("manual-sos", async ({ roomCode }) => {
    const { userId, username } = socket.data;
    if (!roomCode || !userId) return;

    const sosPipe = redis.pipeline();
    applySosState(sosPipe, roomCode, userId, true);
    await sosPipe.exec();

    io.to(roomCode).emit("user-sos", {
      socketId: socket.id,
      username,
      userId,
    });

    io.to(roomCode).emit("room-message", {
      from: "System",
      type: "sos",
      content: `🚨 ${username} is requesting help!`,
      timestamp: Date.now(),
    });
  });

  socket.on("geofence-radius-update", async ({ roomCode, radius }) => {
    const { userId, username, isCreator } = socket.data;
    if (!roomCode || !userId || typeof radius !== 'number') return;

    if (!isCreator) {
      return;
    }

    // Store the radius in Redis
    const radiusKey = `room:${roomCode}:geofence:radius`;
    await redis.set(radiusKey, radius.toString());
    if (roomCreators[roomCode]) {
      roomCreators[roomCode].radius = radius;
      io.to(roomCode).emit("geofence-state-update", {
        center: roomCreators[roomCode].coords,
        radius,
      });
    }

    // Re-evaluate all connected users' geofence status with the new radius
    if (roomCreators[roomCode]?.coords) {
      const creatorCoords = roomCreators[roomCode].coords;
      const locationsKey = `room:${roomCode}:locations`;
      const geofenceKey = GEOFENCE_KEY(roomCode);
      
      // Get all sockets in the room
      const roomSockets = io.sockets.adapter.rooms.get(roomCode);
      if (roomSockets) {
        for (const socketId of roomSockets) {
          const sock = io.sockets.sockets.get(socketId);
          if (!sock || sock.data.isCreator) continue; // Skip creator and invalid sockets
          
          try {
            // Get user's current location from Redis
            const userLocRaw = await redis.hget(locationsKey, socketId);
            if (!userLocRaw) continue;
            
            const userCoords = JSON.parse(userLocRaw);
            const distance = haversine(userCoords, creatorCoords);
            const isOutside = distance > radius;
            
            const userId = sock.data.userId;
            // const wasOutside = await redis.hget(geofenceKey, userId);
            
            // if (isOutside && !wasOutside) {
            //   // User is now outside
            //   await redis.hset(geofenceKey, userId, "1");
            //   io.to(roomCode).emit("geofence-update", {
            //     userId,
            //     socketId,
            //     isOutside: true,
            //     distance: Math.round(distance),
            //   });
            //   io.to(roomCode).emit("anomaly-alert", {
            //     socketId,
            //     username: sock.data.username,
            //     type: "geofence",
            //     distance: Math.round(distance),
            //   });
            //   io.to(roomCode).emit("room-message", {
            //     from: "System",
            //     type: "warning",
            //     content: `⚠️ ${sock.data.username} is ${Math.round(distance)}m away from the group leader!`,
            //     timestamp: Date.now(),
            //   });
            // } else if (!isOutside && wasOutside) {
            //   // User is now inside
            //   await redis.hdel(geofenceKey, userId);
            //   io.to(roomCode).emit("geofence-update", {
            //     userId,
            //     socketId,
            //     isOutside: false,
            //   });
            //   io.to(roomCode).emit("room-message", {
            //     from: "System",
            //     type: "info",
            //     content: `✅ ${sock.data.username} is back inside the group range.`,
            //     timestamp: Date.now(),
            //   });
            // }

            if (isOutside) {
  await redis.hset(geofenceKey, userId, "1");
} else {
  await redis.hdel(geofenceKey, userId);
}

// 🔥 ALWAYS EMIT (THIS FIXES YOUR ISSUE)
io.to(roomCode).emit("geofence-update", {
  userId,
  socketId,
  isOutside,
  distance: Math.round(distance),
});

// ✅ OPTIONAL: only show warning when going outside
if (isOutside) {
  io.to(roomCode).emit("anomaly-alert", {
    socketId,
    username: sock.data.username,
    type: "geofence",
    distance: Math.round(distance),
  });

  io.to(roomCode).emit("room-message", {
    from: "System",
    type: "warning",
    content: `⚠️ ${sock.data.username} is ${Math.round(distance)}m away from the group leader!`,
    timestamp: Date.now(),
  });
} else {
  io.to(roomCode).emit("room-message", {
    from: "System",
    type: "info",
    content: `✅ ${sock.data.username} is inside the group range.`,
    timestamp: Date.now(),
  });
}
          } catch (err) {
            console.error(`Error re-evaluating geofence for ${socketId}:`, err);
          }
        }
      }
    }

    // Broadcast the radius update to all users in the room (except sender)
    io.to(roomCode).emit("geofence-radius-update", { radius });

    console.log(`📏 Geofence radius updated to ${radius}m by ${username} in room ${roomCode}`);
  });

  socket.on("geofence-state-sync", async ({ roomCode, center, radius }) => {
    const { userId, username, isCreator } = socket.data;
    if (!roomCode || !userId || typeof radius !== "number") return;

    if (!isCreator) {
      return;
    }

    const radiusKey = `room:${roomCode}:geofence:radius`;
    await redis.set(radiusKey, radius.toString());
    if (center) {
      await redis.set(GEOFENCE_CENTER_KEY(roomCode), JSON.stringify(center));
    }

    if (!roomCreators[roomCode]) {
      roomCreators[roomCode] = {
        userId,
        socketId: socket.id,
        coords: center || null,
        radius,
      };
    } else {
      roomCreators[roomCode].socketId = socket.id;
      roomCreators[roomCode].radius = radius;
      if (center) {
        roomCreators[roomCode].coords = center;
      }
    }

    io.to(roomCode).emit("geofence-state-update", {
      center: center || roomCreators[roomCode].coords || null,
      radius,
    });

    console.log(`📡 Geofence state synced by ${username} in room ${roomCode}: ${radius}m`);
  });

  socket.on("get-geofence-state", async ({ roomCode }) => {
    if (!roomCode) return;

    const [radiusRaw, centerRaw] = await Promise.all([
      redis.get(`room:${roomCode}:geofence:radius`),
      redis.get(GEOFENCE_CENTER_KEY(roomCode)),
    ]);

    const radius = radiusRaw ? parseInt(radiusRaw, 10) : roomCreators[roomCode]?.radius || 300;
    const center = centerRaw
      ? JSON.parse(centerRaw)
      : roomCreators[roomCode]?.coords || null;

    socket.emit("geofence-state-update", { center, radius });
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

  // 🔹 Store message in Redis
  const chatKey = `room:${roomCode}:chat:messages`;
  const chatPipe = redis.pipeline();
  chatPipe.rpush(chatKey, JSON.stringify(chatMessage));
  if (CHAT_HISTORY_LIMIT > 0) {
    chatPipe.ltrim(chatKey, -CHAT_HISTORY_LIMIT, -1);
  }
  if (CHAT_TTL_SEC > 0) {
    chatPipe.expire(chatKey, CHAT_TTL_SEC);
  }
  await chatPipe.exec();

  // 🔹 Increase unread count for others (single Redis command)
  const unreadPairs = await redis.incrUnread(
    `room:${roomCode}:chat:users`,
    chatMessage.senderId,
    `room:${roomCode}:chat:unread:`,
    UNREAD_TTL_SEC
  );
  for (let i = 0; i < unreadPairs.length; i += 2) {
    const uid = unreadPairs[i];
    const newCount = Number(unreadPairs[i + 1]);
    const targetSocket = userSocketMap.get(uid);
    if (targetSocket) {
      io.to(targetSocket).emit("unread-count", newCount);
    }
  }

  // 🔹 Emit clean chat event
  io.to(roomCode).emit("chat-message", chatMessage);
});


  socket.on("clear-sos", ({ roomCode }) => {
    if (!roomCode || !socket.data.username) return;

    const { userId, username } = socket.data;
    if (userId) {
      const clearPipe = redis.pipeline();
      applySosState(clearPipe, roomCode, userId, false);
      clearPipe.exec().catch(() => {});
    }

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

    // 🔹 Mark user offline in Redis (batched)
    const disconnectPipe = redis.pipeline();
    disconnectPipe.set(`room:${roomCode}:user:${userId}:status`, "offline");

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
    disconnectPipe.srem(`room:${roomCode}:chat:users`, userId);

    // 🔹 Clear pending stationary confirmation (IMPORTANT)
    if (pendingConfirmations[roomCode]?.[userId]) {
      clearTimeout(pendingConfirmations[roomCode][userId]);
      delete pendingConfirmations[roomCode][userId];
    }
  


    if (roomCreators[roomCode]?.userId === userId) {
      delete roomCreators[roomCode];
      console.log(`👑 Room creator left room ${roomCode}`);
    }
    disconnectPipe.set(`room:${roomCode}:user:${userId}:stationary`, "false");

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
    await disconnectPipe.exec();
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
