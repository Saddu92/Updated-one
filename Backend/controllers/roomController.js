import Room from "../models/Room.js";
import User from "../models/User.js";
import redis from "../utils/redis.js";

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// CREATE ROOM CONTROLLER (UPDATED TO STORE DISPLAY_NAME + LAT/LON)

export const createRoom = async (req, res) => {
  try {
    const { source, destination } = req.body;
    const userId = req.user.id; // from JWT middleware

    if (!source?.displayName || !destination?.displayName) {
      return res.status(400).json({ message: "Source and Destination details are required" });
    }

    // Generate random 6-digit code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room = new Room({
       name: req.body.name,
      code,
      source: {
        displayName: source.displayName,
        lat: source.lat,
        lon: source.lon,
      },
      destination: {
        displayName: destination.displayName,
        lat: destination.lat,
        lon: destination.lon,
      },
      createdBy: userId,
      members: [userId],
    });
   


    await room.save();

    // also push room into user's joinedRooms if you maintain that
    await User.findByIdAndUpdate(userId, { $push: { joinedRooms: room._id } });

    return res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (err) {
    console.error("Room Creation Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};




// export const joinRoom = async (req, res) => {
//   try {
//     const { code } = req.body;
//     if (!code)
//       return res.status(400).json({ message: "Room code is required" });

//     const room = await Room.findOne({ code });

//     if (!room) return res.status(404).json({ message: "Room not found" });

//     // Check if user already a member
//     if (room.members.includes(req.user._id)) {
//       return res.status(400).json({ message: "You already joined this room" });
//     }

//     // Add user to members
//     room.members.push(req.user._id);
//     await room.save();
//   } catch (error) {
//     res.status(500).json({ message: "Join room failed", error: error.message });
//   }
// };

export const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code)
      return res.status(400).json({ message: "Room code is required" });

    const room = await Room.findOne({ code });
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!req.user || !req.user._id)
      return res.status(401).json({ message: "User authentication required" });

    if (room.members.includes(req.user._id)) {
      return res.status(400).json({ message: "You already joined this room" });
    }

    // ✅ Update members only without triggering full validation
    await Room.updateOne(
      { _id: room._id },
      { $addToSet: { members: req.user._id } } // prevents duplicates
    );

    // Optional: update user’s joinedRooms array
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { joinedRooms: room._id },
    });

    res.status(200).json({
      message: "Joined room successfully",
      roomCode: room.code,
    });
  } catch (error) {
    console.error("Join Room Error:", error);
    res.status(500).json({ message: "Join room failed", error: error.message });
  }
};






export const getMyRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      $or: [{ createdBy: userId }, { members: userId }],
    })
      .populate("createdBy", "name email")
      .populate("members", "name email");

    res.status(200).json({ rooms });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch rooms", error: error.message });
  }
};

export const getRoomByCode = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await Room.findOne({ code: roomCode }).populate("members", "username email");

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(room);
  } catch (err) {
    console.error("Error fetching room:", err);
    res.status(500).json({ error: "Failed to fetch room" });
  }
};


export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const roomCode = room.code;
    const io = req.app.get("io");

    // 🔴 1. Notify ALL members in real time
    io.to(roomCode).emit("room-deleted", {
      roomId,
      roomCode,
    });

    // 🔴 2. Clean Redis (SCAN to avoid blocking)
    const pattern = `room:${roomCode}:*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        500
      );
      cursor = nextCursor;
      if (keys.length) await redis.del(keys);
    } while (cursor !== "0");

    // 🔴 3. Remove room from users
    await User.updateMany(
      { joinedRooms: room._id },
      { $pull: { joinedRooms: room._id } }
    );

    // 🔴 4. Delete room
    await Room.findByIdAndDelete(roomId);

    return res.status(200).json({ message: "Room deleted" });
  } catch (err) {
    console.error("Delete Room Error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
};
