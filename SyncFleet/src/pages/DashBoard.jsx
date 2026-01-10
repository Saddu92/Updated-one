import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import API from "../utils/axios.js";
import { MY_ROOM } from "@/utils/constant.js";
import { useAuthStore } from "@/store/auth";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer.jsx";
import { HiMenu, HiX } from "react-icons/hi";

const Dashboard = () => {
  const navigate = useNavigate();
  const [myRooms, setMyRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchRooms = async () => {
      try {
        const res = await API.get(MY_ROOM, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setMyRooms(res.data.rooms || []);
      } catch (err) {
        console.error("❌ Failed to fetch rooms:", err.message);
      }
    };

    fetchRooms();
  }, [user, navigate]);

  const handleJoinRoom = async (roomCode) => {
    setActiveRoom(roomCode);
    navigate(`/room/${roomCode}/map`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#f8fbff] via-[#e8f4ff] to-[#dce7f7] font-inter text-gray-800">
      
      {/* ================= NAVBAR ================= */}
      <nav className="backdrop-blur-md py-4 px-4 sm:px-8 shadow-md sticky top-0 z-50 bg-gradient-to-r from-white/80 to-blue-50/80 border-b border-blue-200/50">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <Link
            to={"/"}
            className="text-3xl font-orbitron bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-wide"
          >
            SyncFleet
          </Link>

          {/* Desktop Menu */}
          <div className="hidden sm:flex space-x-6 items-center">
            <button
              onClick={() => navigate("/")}
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/my-rooms")}
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              My Rooms
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition"
            >
              Logout
            </button>
          </div>

          {/* Mobile Hamburger */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 focus:outline-none"
            >
              {isMenuOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="sm:hidden mt-2 flex flex-col gap-3 bg-white/90 p-4 rounded-b-lg border-t border-blue-200/30">
            <button
              onClick={() => {
                navigate("/");
                setIsMenuOpen(false);
              }}
              className="text-gray-700 hover:text-blue-600 font-medium py-2 w-full text-center"
            >
              Home
            </button>
            <button
              onClick={() => {
                navigate("/my-rooms");
                setIsMenuOpen(false);
              }}
              className="text-gray-700 hover:text-blue-600 font-medium py-2 w-full text-center"
            >
              My Rooms
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
                setIsMenuOpen(false);
              }}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg w-full text-center"
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1">
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

            {/* LEFT SIDE */}
            <div className="flex flex-col gap-8">

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatBox title="Total Rooms" value={myRooms.length} color="blue" />
                <StatBox title="Active Room" value={activeRoom || "None"} color="green" />
                <StatBox
                  title="Total Members"
                  value={myRooms.reduce(
                    (sum, room) => sum + (room.members?.length || 0),
                    0
                  )}
                  color="purple"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <button
                  onClick={() => navigate("/create-room")}
                  className="lg:w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-semibold hover:scale-105 transition"
                >
                  Create Room
                </button>
                <button
                  onClick={() => navigate("/join-room")}
                  className="lg:w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:scale-105 transition"
                >
                  Join Room
                </button>
              </div>

              {/* Recent Activity */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded-3xl p-6 shadow-md">
                <h3 className="text-xl font-orbitron font-bold text-blue-600">
                  Recent Activity
                </h3>
                <p className="text-gray-600 text-sm mt-2">
                  No recent activity yet.
                </p>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex flex-col gap-4 max-h-[600px] overflow-x-hidden">
              <h3 className="text-xl font-orbitron font-bold text-blue-600 mb-4">
                My Rooms
              </h3>

              {myRooms.length === 0 ? (
                <p className="text-gray-600">
                  You haven't created or joined any rooms yet.
                </p>
              ) : (
                myRooms.map((room) => (
                  <div
                    key={room._id}
                    className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-400 rounded-2xl p-4 shadow hover:shadow-lg transition flex justify-between items-center"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleJoinRoom(room.code)}
                    >
                      <span className="font-semibold text-gray-800">
                        {room.name || room.code}
                      </span>
                    </div>

                    <span
                      onClick={() => handleJoinRoom(room.code)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer ${
                        activeRoom === room.code
                          ? "bg-green-500 text-white"
                          : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                      }`}
                    >
                      {activeRoom === room.code ? "Joined" : "Join"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <Footer />
    </div>
  );
};

/* ---------- Small UI Component (NO LOGIC CHANGE) ---------- */
const StatBox = ({ title, value, color }) => {
  const colors = {
    blue: "from-blue-50 to-cyan-50 text-blue-600",
    green: "from-green-50 to-emerald-50 text-green-600",
    purple: "from-purple-50 to-pink-50 text-purple-600",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-6 shadow-md text-center`}
    >
      <p className="text-gray-700 font-medium">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

export default Dashboard;
