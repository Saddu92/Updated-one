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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] font-inter">
      {/* Navbar */}
      <nav className="backdrop-blur-md py-4 px-4 sm:px-8 shadow-md sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <Link
            to={"/"}
            className="text-3xl font-orbitron text-cyan-400 tracking-wide"
          >
            SyncFleet
          </Link>

          {/* Desktop Buttons (unchanged) */}
          <div className="hidden sm:flex space-x-6">
            <button
              onClick={() => navigate("/")}
              className="text-gray-300 hover:text-[#FFD369] font-medium transition"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/my-rooms")}
              className="text-gray-300 hover:text-[#FFD369] font-medium transition"
            >
              My Rooms
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="bg-[#FFD369] text-black px-4 py-2 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition"
            >
              Logout
            </button>
          </div>

          {/* Hamburger for Mobile */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 focus:outline-none"
            >
              {isMenuOpen ? (
                <HiX className="w-6 h-6" />
              ) : (
                <HiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="sm:hidden mt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                navigate("/");
                setIsMenuOpen(false);
              }}
              className="text-gray-300 hover:text-[#FFD369] font-medium py-2 w-full text-center"
            >
              Home
            </button>
            <button
              onClick={() => {
                navigate("/my-rooms");
                setIsMenuOpen(false);
              }}
              className="text-gray-300 hover:text-[#FFD369] font-medium py-2 w-full text-center"
            >
              My Rooms
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
                setIsMenuOpen(false);
              }}
              className="bg-[#FFD369] text-black px-4 py-2 rounded-lg font-semibold hover:scale-105 hover:shadow-lg w-full text-center"
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      {/* Hero + Stats + Forms */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: Stats + Buttons */}
          <div className="flex flex-col gap-8">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg text-center">
                <p className="text-gray-300 font-medium">Total Rooms</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {myRooms.length}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg text-center">
                <p className="text-gray-300 font-medium">Active Room</p>
                <p className="text-2xl font-bold text-green-400">
                  {activeRoom || "None"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg text-center">
                <p className="text-gray-300 font-medium">Total Members</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {myRooms.reduce(
                    (sum, room) => sum + (room.members?.length || 0),
                    0
                  )}
                </p>
              </div>
            </div>

            {/* Create & Join Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <button
                onClick={() => navigate("/create-room")}
                className="lg:w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-blue-500 text-black py-4 rounded-xl font-semibold hover:from-yellow-400 hover:to-orange-500 transition"
              >
                Create Room
              </button>
              <button
                onClick={() => navigate("/join-room")}
                className="lg:w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-blue-500 text-black py-4 rounded-xl font-semibold hover:from-yellow-400 hover:to-orange-500 transition"
              >
                Join Room
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg flex flex-col gap-4">
              <h3 className="text-xl font-orbitron font-bold text-cyan-400">
                Recent Activity
              </h3>
              <p className="text-gray-300 text-sm">No recent activity yet.</p>
            </div>
          </div>

          {/* Right: My Rooms List */}
          <div className="flex flex-col gap-4 max-h-[600px] overflow-x-hidden">
            <h3 className="text-cyan-400 font-orbitron font-bold text-xl mb-4">
              My Rooms
            </h3>
            {myRooms.length === 0 ? (
              <p className="text-gray-300">
                You haven’t created or joined any rooms yet.
              </p>
            ) : (
              myRooms.map((room) => (
                <div
                  key={room._id}
                  className="bg-white/10 border-l-4 border-cyan-400 rounded-2xl p-4 backdrop-blur-lg shadow hover:shadow-xl transform transition flex justify-between items-center"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleJoinRoom(room.code)}
                  >
                    <span className="text-white font-semibold">
                      {room.name || room.code}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer ${
                      activeRoom === room.code
                        ? "bg-green-400 text-black"
                        : "bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:from-yellow-400 hover:to-orange-500"
                    }`}
                    onClick={() => handleJoinRoom(room.code)}
                  >
                    {activeRoom === room.code ? "Joined" : "Join"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Dashboard;
