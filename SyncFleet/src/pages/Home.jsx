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
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-sky-100 text-gray-800 font-inter">
      <Navbar />

      {/* Hero Section */}
      <main className="flex flex-col-reverse md:flex-row items-center justify-center px-6 md:px-10 lg:px-20 py-16 md:py-20 gap-12">
        {/* Left Content */}
        <div className="flex-1 text-center md:text-left space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-orbitron leading-tight">
            Track <span className="text-sky-600">Together</span>,<br />
            Travel <span className="text-emerald-600">Smarter</span>.
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-md md:max-w-lg mx-auto md:mx-0">
            Real-time group tracking with trails, in-app chat, and emergency SOS
            alerts. Built for road trips, bikers, and explorers who stay
            together.
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mt-4">
            <Link
              to="/dashboard"
              className="bg-sky-600 text-white px-6 sm:px-8 py-3 rounded-xl text-lg hover:bg-sky-500 transition shadow-md text-center"
            >
              Get Started
            </Link>
            <Link
              to="/about"
              className="border border-sky-200 px-6 sm:px-8 py-3 rounded-xl text-lg hover:bg-sky-50 transition text-center text-sky-700"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Right Mockup */}
          <div className="flex-1 flex justify-center relative w-full max-w-md mx-auto md:mx-0">
          <div className="w-full sm:w-80 h-[420px] sm:h-[520px] rounded-3xl shadow-lg bg-white border border-gray-100 overflow-hidden relative flex flex-col z-[10]">
            {/* Mockup Header */}
            <div className="bg-white/80 py-2 px-4 flex justify-between items-center flex-shrink-0 border-b border-gray-100">
              <span className="text-sm text-gray-700">SyncFleet Map</span>
              <span className="text-xs text-emerald-600 animate-pulse">● Live</span>
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
                className="absolute top-2 right-2 bg-white border border-gray-100 px-2 py-1 rounded text-gray-700 z-[999] shadow-sm"
                onClick={() => setStyle(style === "osm" ? "stamen" : "osm")}
              >
                Switch Map
              </button>
            </div>
            {/* Floating SOS */}
            <button className="absolute z-[999] bottom-4 left-4 sm:bottom-6 sm:left-6 bg-red-600 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition">
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
