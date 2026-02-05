import { useNavigate, Link } from "react-router-dom";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../utils/axios.js";
import { MY_ROOM } from "@/utils/constant.js";
import { useAuthStore } from "@/store/auth";
import Footer from "@/components/Footer.jsx";
import { HiMenu, HiX } from "react-icons/hi";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [myRooms, setMyRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /* ================= FETCH ROOMS ================= */
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
        console.error("Failed to fetch rooms", err);
        toast.error("Failed to fetch rooms");
      }
    };

    fetchRooms();
  }, [user, navigate]);

  /* ================= HANDLERS ================= */
  const handleJoinRoom = (roomCode) => {
    setActiveRoom(roomCode);
    navigate(`/room/${roomCode}/map`);
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;

    try {
      // ⚠️ baseURL already contains /api
      await API.delete(`/room/${roomId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      toast.success("Room deleted successfully");
      setMyRooms((prev) => prev.filter((r) => r._id !== roomId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete room");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#111827]">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-[#2563EB]">
            SyncFleet
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => navigate("/")} className="text-[#6B7280] hover:text-[#2563EB]">
              Home
            </button>
            <button onClick={() => navigate("/my-rooms")} className="text-[#6B7280] hover:text-[#2563EB]">
              My Rooms
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="px-4 py-2 rounded-md bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            >
              Logout
            </button>
          </nav>

          {/* Mobile Menu */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-[#F3F4F6]"
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            {isMenuOpen ? <HiX /> : <HiMenu />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-[#E5E7EB] bg-white px-4 py-3 space-y-2">
            <button onClick={() => navigate("/")} className="block w-full text-left py-2">
              Home
            </button>
            <button onClick={() => navigate("/my-rooms")} className="block w-full text-left py-2">
              My Rooms
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="w-full py-2 rounded-md bg-[#2563EB] text-white"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* ================= CONTENT ================= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">👋 Hi, {user?.name}</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Welcome back to SyncFleet dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatBox title="Total Rooms" value={myRooms.length} />
              <StatBox title="Active Room" value={activeRoom || "None"} />
              <StatBox
                title="Total Members"
                value={myRooms.reduce(
                  (sum, room) => sum + (room.members?.length || 0),
                  0
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/create-room")}
                className="flex-1 py-3 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8]"
              >
                Create Room
              </button>
              <button
                onClick={() => navigate("/join-room")}
                className="flex-1 py-3 rounded-lg border border-[#E5E7EB] bg-white font-semibold hover:bg-[#F9FAFB]"
              >
                Join Room
              </button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">My Rooms</h3>

            {myRooms.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                You haven’t created or joined any rooms yet.
              </p>
            ) : (
              myRooms.map((room) => (
                <div
                  key={room._id}
                  className="flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-xl hover:shadow-sm transition"
                >
                  {/* Room Info */}
                  <div
                    onClick={() => handleJoinRoom(room.code)}
                    className="cursor-pointer flex-1"
                  >
                    <p className="font-semibold truncate">
                      {room.name || "Unnamed Room"}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Code: {room.code}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleJoinRoom(room.code)}
                      className={`px-3 py-1.5 text-xs rounded-full font-semibold transition ${
                        activeRoom === room.code
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                    >
                      {activeRoom === room.code ? "Active" : "Join"}
                    </button>

                    {room.createdBy?._id === user.id && (
                      <button
                        onClick={() => handleDeleteRoom(room._id)}
                        className="px-3 py-1.5 text-xs rounded-full font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

/* ================= STAT BOX ================= */
const StatBox = ({ title, value }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 text-center">
    <p className="text-sm text-[#6B7280]">{title}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

export default Dashboard;