import {Router} from  "express";
import { protect } from "../middlewares/authMiddelware.js";
import { createRoom, getMyRooms, joinRoom,getRoomByCode, deleteRoom} from "../controllers/roomController.js";

const roomRoutes=Router();

roomRoutes.post("/createRoom",protect,createRoom);
roomRoutes.post("/joinRoom", protect,joinRoom);
roomRoutes.get("/myRooms", protect, getMyRooms); 
roomRoutes.get("/:roomCode", protect, getRoomByCode);
roomRoutes.delete("/:roomId", protect, deleteRoom);


export default roomRoutes;