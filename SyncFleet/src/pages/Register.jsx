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
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post(REGISTER, { name, email, password });
      const { token, user } = res.data;

      setUser(user, token);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Account created successfully");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-lg p-6 md:p-8">

        {/* Brand */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-[#2563EB]">
            SyncFleet
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Create your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-md text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-300 transition"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-center text-[#6B7280] mt-6">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-[#2563EB] font-medium cursor-pointer hover:underline"
          >
            Log in
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
