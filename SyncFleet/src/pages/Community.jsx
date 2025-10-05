import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Community = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-12 text-green-400 text-center md:text-left">
          Community
        </h1>

        <div className="grid md:grid-cols-3 gap-8">
          {["Road Trips", "Bikers", "Explorers", "Developers", "Travel Tips", "Events"].map((topic, idx) => (
            <div
              key={idx}
              className="bg-gray-900/70 p-6 rounded-2xl shadow-lg hover:shadow-green-500/50 transition flex flex-col items-center justify-center text-center"
            >
              <h2 className="text-xl font-semibold mb-2">{topic}</h2>
              <p className="text-gray-300 text-sm">
                Join discussions, share experiences, and connect with like-minded adventurers.
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Community;
