import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";

const mapStyles = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  stamen: {
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
    attribution: "Map tiles by Stamen Design, OpenStreetMap",
  },
};

const Home = () => {
  const [style, setStyle] = useState("osm");

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#111827] font-inter">
      <Navbar />

      {/* ================= HERO ================= */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* LEFT CONTENT */}
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Real-time group tracking,
              <br />
              built for safety.
            </h1>

            <p className="text-base sm:text-lg text-[#6B7280] max-w-lg mx-auto md:mx-0">
              SyncFleet helps groups stay connected with live location tracking,
              movement trails, in-app chat, and emergency SOS — designed for
              road trips, fleets, and coordinated travel.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition text-center"
              >
                Get started
              </Link>

              <Link
                to="/about"
                className="px-6 py-3 rounded-lg border border-[#E5E7EB] bg-white font-semibold text-[#2563EB] hover:bg-[#F9FAFB] transition text-center"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* RIGHT PRODUCT PREVIEW */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm h-[480px] rounded-2xl bg-white border border-[#E5E7EB] shadow-lg overflow-hidden">

              {/* Preview Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E7EB] text-sm">
                <span className="font-medium">Live Map</span>
                <span className="text-green-600 font-medium text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-600" />
                  Online
                </span>
              </div>

              {/* Map */}
              <div className="relative h-full">
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

                {/* Map Style Toggle (subtle) */}
                <button
                  onClick={() =>
                    setStyle(style === "osm" ? "stamen" : "osm")
                  }
                  className="absolute top-3 right-3 px-2 py-1 text-xs rounded-md bg-white border border-[#E5E7EB] shadow-sm text-[#374151] hover:bg-[#F9FAFB]"
                >
                  Switch map
                </button>

                {/* Preview SOS (disabled look) */}
                <div className="absolute bottom-4 left-4">
                  <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs font-bold shadow-md">
                    SOS
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
