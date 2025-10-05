import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/utils/axios";
import { REGISTER } from "@/utils/constant";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/auth";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAuthStore();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post(REGISTER, { name, email, password });
      const { token, user } = res.data;
      setUser(user, token);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
      toast.success("Registration successful!", {
        style: { background: "#0f172a", color: "#00ffff", fontWeight: "500" },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed", {
        style: { background: "#0f172a", color: "#f87171", fontWeight: "500" },
      });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] font-inter">
      
      {/* Left Panel (branding/illustration) */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-12">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-orbitron font-bold text-cyan-400 mb-4">
            SyncFleet
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl max-w-md mx-auto">
            Collaborate seamlessly in futuristic workspaces. Join rooms, manage
            fleets, and stay connected.
          </p>
        </div>
      </div>

      {/* Right Panel (form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-2xl shadow-lg">
          <h2 className="text-3xl sm:text-4xl font-orbitron font-bold text-cyan-400 mb-6 text-center">
            Create an Account
          </h2>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 sm:py-4 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm sm:text-base"
              required
            />

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 sm:py-4 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm sm:text-base"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 sm:py-4 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm sm:text-base"
              required
            />

            <button
              type="submit"
              className="w-full py-3 sm:py-4 rounded-lg font-semibold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-yellow-400 hover:to-orange-500 transition text-sm sm:text-base"
            >
              Sign Up
            </button>
          </form>

          <p className="text-gray-400 text-xs sm:text-sm text-center mt-6">
            Already have an account?{" "}
            <span
              className="text-yellow-400 cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
