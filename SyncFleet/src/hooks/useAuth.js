import { useAuthStore } from "@/store/auth";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const { setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const login = async (email, password) => {
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      setUser(res.data.user, res.data.token);
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials");
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post("/api/auth/register", { name, email, password });
      setUser(res.data.user, res.data.token);
      toast.success("Registered successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const signOut = () => {
    logout();
    toast.success("Logged out!");
    navigate("/");
  };

  return { login, register, signOut };
};
