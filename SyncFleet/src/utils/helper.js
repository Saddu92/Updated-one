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
  // ✅ Must have valid geofence center and radius
  if (!fence?.center || !fence?.radius || fence.radius <= 0) {
    return false; // If no geofence set, don't show as outside
  }
  
  if (!point) return false;
  
  // ✅ Ensure coordinates are in the right format
  const center = fence.center;
  const lat1 = point.lat !== undefined ? point.lat : point.latitude;
  const lng1 = point.lng !== undefined ? point.lng : point.longitude;
  const lat2 = center.lat !== undefined ? center.lat : center.latitude;
  const lng2 = center.lng !== undefined ? center.lng : center.longitude;
  
  // ✅ If coordinates are missing, can't determine geofence
  if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) {
    return false;
  }
  
  try {
    const distance = haversine(
      { lat: lat1, lng: lng1 },
      { lat: lat2, lng: lng2 }
    );
    // Return true only if distance is greater than radius
    const isOutside = distance > fence.radius;
    return isOutside;
  } catch (err) {
    console.warn("Error calculating distance for geofence:", err);
    return false;
  }
};