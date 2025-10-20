// utils/helpers.js

export const STATIONARY_LIMIT = 5 * 60 * 1000; // 5 minutes
export const MOVEMENT_THRESHOLD = 5; // meters
export const INACTIVE_THRESHOLD = 30000; // 30 seconds
export const PATH_HISTORY_LIMIT = 100;
export const GEOLOCATION_TIMEOUT = 10000;
export const DEFAULT_TRAIL_DURATION = 5; // minutes
export const DEVIATION_THRESHOLD = 150; // meters
export const SOS_DURATION = 30000; // 30 seconds
import haversine from "haversine-distance";
export const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export const cn = (...classes) => classes.filter(Boolean).join(" ");

// Utility to check if point is outside geofence
export const isOutsideGeofence = (point, fence) => {
  if (!fence.center || !point) return false;
//   const haversine = require("haversine-distance");
  const distance = haversine(point, fence.center);
  return distance > fence.radius;
};