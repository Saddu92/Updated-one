// utils/axios.js or wherever you created axios config
import axios from "axios";


const API = axios.create({
  baseURL: "http://localhost:5000/api",
  paramsSerializer: {
    indexes: null, // avoid [] for arrays; ensures flat keys
  },
});
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("⚠️ No token found in localStorage");
  }
  return req;
});

export default API;