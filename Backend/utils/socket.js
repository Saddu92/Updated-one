// utils/socket.js
import { Server } from 'socket.io';

let io = null;
let isInitialized = false;

export const initIO = (httpServer) => {
  if (isInitialized) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // Increased from 10000 to 60000
    pingInterval: 25000, // Increased from 3000 to 25000
    connectTimeout: 45000,
    allowEIO3: true,
    transports: ['websocket', 'polling']
  });

  isInitialized = true;
  return io;
};

export const getIO = () => {
  if (!isInitialized || !io) {
    throw new Error('Socket.io not initialized! Call initIO first.');
  }
  return io;
};