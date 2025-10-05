import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Members = () => {
  // Dummy members data (replace with API data)
  const members = [
    { name: "Alice", role: "Explorer", avatar: "https://i.pravatar.cc/150?img=1" },
    { name: "Bob", role: "Biker", avatar: "https://i.pravatar.cc/150?img=2" },
    { name: "Charlie", role: "Traveler", avatar: "https://i.pravatar.cc/150?img=3" },
    { name: "David", role: "Guide", avatar: "https://i.pravatar.cc/150?img=4" },
    { name: "Eve", role: "Navigator", avatar: "https://i.pravatar.cc/150?img=5" },
    { name: "Frank", role: "Photographer", avatar: "https://i.pravatar.cc/150?img=6" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Page Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold mb-12 text-cyan-400 text-center md:text-left">
          Members
        </h1>

        {/* Members Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {members.map((member, idx) => (
            <div
              key={idx}
              className="bg-gray-900/70 p-6 rounded-2xl shadow-lg hover:shadow-cyan-500/50 transition flex flex-col items-center text-center"
            >
              <img
                src={member.avatar}
                alt={member.name}
                className="w-24 h-24 rounded-full mb-4 border-2 border-cyan-400"
              />
              <h2 className="text-xl font-semibold mb-1">{member.name}</h2>
              <p className="text-gray-300 text-sm">{member.role}</p>
              <button className="mt-4 px-4 py-2 bg-cyan-500 rounded-lg text-white text-sm hover:bg-cyan-400 transition">
                View Profile
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Members;
