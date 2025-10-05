import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";


const mapStyles = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors'
  },
  stamen: {
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
    attribution: 'Map tiles by Stamen Design, OpenStreetMap'
  },
};

const Home = () => {
  const [style, setStyle] = useState("osm");
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white font-inter">
      <Navbar />

      {/* Hero Section */}
      <main className="flex flex-col-reverse md:flex-row items-center justify-center px-6 md:px-10 lg:px-20 py-16 md:py-20 gap-12">
        {/* Left Content */}
        <div className="flex-1 text-center md:text-left space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-orbitron leading-tight">
            Track <span className="text-cyan-400">Together</span>,<br />
            Travel <span className="text-green-400">Smarter</span>.
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-md md:max-w-lg mx-auto md:mx-0">
            Real-time group tracking with trails, in-app chat, and emergency SOS
            alerts. Built for road trips, bikers, and explorers who stay
            together.
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mt-4">
            <Link
              to="/dashboard"
              className="bg-cyan-500 text-white px-6 sm:px-8 py-3 rounded-xl text-lg hover:bg-cyan-400 transition shadow-md text-center"
            >
              Get Started
            </Link>
            <Link
              to="/about"
              className="border border-cyan-400 px-6 sm:px-8 py-3 rounded-xl text-lg hover:bg-cyan-900 transition text-center"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Right Mockup */}
        <div className="flex-1 flex justify-center relative w-full max-w-md mx-auto md:mx-0">
          <div className="w-full sm:w-72 h-[400px] sm:h-[500px] rounded-3xl shadow-[0_0_20px_rgba(56,189,248,0.6)] bg-gray-900 overflow-hidden relative flex flex-col z-[10]">
            {/* Mockup Header */}
            <div className="bg-gray-800 py-2 px-4 flex justify-between items-center flex-shrink-0">
              <span className="text-sm">SyncFleet Map</span>
              <span className="text-xs text-green-400 animate-pulse">
                ● Live
              </span>
            </div>

            {/* Map */}
            <div className="flex-1 min-h-0 relative">
              <MapContainer
                center={[28.6139, 77.209]}
                zoom={5}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  url={mapStyles[style].url}
                  attribution={mapStyles[style].attribution}
                />
              </MapContainer>

              {/* Toggle button */}
              <button
                className="absolute top-2 right-2 bg-gray-800 px-2 py-1 rounded text-white z-[999]"
                onClick={() => setStyle(style === "osm" ? "stamen" : "osm")}
              >
                Switch Map
              </button>
            </div>

            {/* Floating SOS */}
            <button className="absolute z-[999] bottom-4 right-4 sm:bottom-6 sm:right-6 bg-red-500 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition animate-ping">
              SOS
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
