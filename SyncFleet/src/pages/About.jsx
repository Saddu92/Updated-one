import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";

const About = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter">  
      <Navbar/>

      {/* Hero Section */}
      <header className="py-16 md:py-24 text-center px-6 md:px-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-orbitron font-extrabold text-white mb-6 drop-shadow-md">
            About SyncFleet
          </h1>
          <p className="text-gray-300 text-base md:text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            SyncFleet is your companion for seamless group tracking and team coordination.  
            Whether you’re on a road trip, biking adventure, or managing a logistics team,  
            SyncFleet helps you stay connected, safe, and informed in real-time.
          </p>
        </div>
      </header>

      {/* About Features */}
      <section className="max-w-6xl mx-auto py-12 px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
        
        <div className="bg-[#1e1b4b] backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-lg border border-[#00C2FF]/30 flex flex-col items-center text-center hover:scale-105 transition transform">
          <h3 className="text-xl sm:text-2xl font-orbitron font-bold text-cyan-400 mb-3">Real-Time Tracking</h3>
          <p className="text-gray-300 text-sm sm:text-base">
            Monitor your team’s location in real-time with smooth, accurate maps.
          </p>
        </div>

        <div className="bg-[#1e1b4b] backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-lg border border-[#22c55e]/30 flex flex-col items-center text-center hover:scale-105 transition transform">
          <h3 className="text-xl sm:text-2xl font-orbitron font-bold text-green-400 mb-3">Team Chat</h3>
          <p className="text-gray-300 text-sm sm:text-base">
            Stay connected with your group through in-app chat for coordination and updates.
          </p>
        </div>

        <div className="bg-[#1e1b4b] backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-lg border border-[#facc15]/30 flex flex-col items-center text-center hover:scale-105 transition transform">
          <h3 className="text-xl sm:text-2xl font-orbitron font-bold text-[#FFD369] mb-3">Emergency Alerts</h3>
          <p className="text-gray-300 text-sm sm:text-base">
            Quickly send SOS alerts to notify your group in case of emergencies.
          </p>
        </div>

      </section>

      {/* Vision Section */}
      <section className="bg-[#1e1b4b] backdrop-blur-md py-12 px-6 md:px-8 rounded-3xl shadow-xl border border-[#00C2FF]/20 max-w-6xl mx-auto mb-16">
        <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-white text-center mb-6">Our Vision</h2>
        <p className="text-gray-300 text-base md:text-lg lg:text-xl text-center max-w-3xl mx-auto leading-relaxed">
          We aim to redefine group travel and team coordination by providing a modern, reliable, and intuitive platform.  
          SyncFleet empowers teams and explorers to move together safely and efficiently, no matter where the journey takes them.
        </p>
      </section>

      {/* Footer */}
      <Footer/>
    </div>
  );
};

export default About;
