import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Help = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-cyan-400 text-center md:text-left">
          Help & Support
        </h1>

        <div className="space-y-6">
          <div className="bg-gray-900/70 p-6 rounded-2xl shadow-lg hover:shadow-cyan-500/50 transition">
            <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
            <p className="text-gray-300">
              Learn how to create rooms, join friends, and start tracking your trips with our app.
            </p>
          </div>

          <div className="bg-gray-900/70 p-6 rounded-2xl shadow-lg hover:shadow-green-500/50 transition">
            <h2 className="text-xl font-semibold mb-2">Account Issues</h2>
            <p className="text-gray-300">
              Troubleshooting login problems, password resets, and profile updates.
            </p>
          </div>

          <div className="bg-gray-900/70 p-6 rounded-2xl shadow-lg hover:shadow-blue-500/50 transition">
            <h2 className="text-xl font-semibold mb-2">Technical Support</h2>
            <p className="text-gray-300">
              Report bugs, connectivity issues, or any unexpected behavior in the app.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Help;
