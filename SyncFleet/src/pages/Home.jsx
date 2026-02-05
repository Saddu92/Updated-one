import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";

import bikeAnimation from "@/assets/lottie/bike.json";

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

  /* ===== SHARED PROGRESS (0 → 1) ===== */
  const progress = useMotionValue(0);

  /* Bike movement: off-screen left → off-screen right */
  const bikeX = useTransform(
    progress,
    [0, 1],
    ["-120vw", "120vw"]
  );

  /* Page movement: hidden left → normal */
  const pageX = useTransform(
    progress,
    [0, 1],
    ["-100vw", "0vw"]
  );

  /* Fade content slightly near the end */
  const pageOpacity = useTransform(
    progress,
    [0.6, 1],
    [0, 1]
  );

  /* Run animation on every mount */
  useEffect(() => {
    animate(progress, 1, {
      duration: 4,
      ease: "easeInOut",
    });
  }, []);


  return (
    
    <div className="min-h-screen bg-[#F5F7FA] text-[#111827] font-inter overflow-x-hidden">
{/* ===== SUNSET + MOUNTAINS BACKDROP ===== */}
<motion.div
  style={{
    opacity: useTransform(progress, [0, 0.6], [0, 1]),
  }}
  className="
    fixed inset-0 -z-10
    bg-gradient-to-b
    from-[#FDBA74] via-[#FCA5A5] to-[#93C5FD]
  "
>
  {/* Mountains */}
  <div className="absolute bottom-0 left-0 right-0 h-[40vh]">
    <div
      className="
        absolute bottom-0 left-[-10%] w-[120%] h-[60%]
        bg-[#1F2937]/30
        rounded-t-[100%]
      "
    />
    <div
      className="
        absolute bottom-0 left-[-5%] w-[110%] h-[45%]
        bg-[#111827]/40
        rounded-t-[100%]
      "
    />
  </div>
</motion.div>
      {/* ===== BIKE (SYNC MASTER) ===== */}
      <motion.div
        style={{ x: bikeX }}
        className="
          fixed inset-0 z-50
          flex items-center justify-center
          pointer-events-none
        "
      >
        {/* Road line */}
  <motion.div
    style={{
      scaleX: progress,
      transformOrigin: "left",
    }}
    className="
      w-[60vw] max-w-[600px]
      h-[3px]
      rounded-full
      bg-gradient-to-r from-gray-700 via-gray-500 to-transparent
      opacity-60
      mb-6
    "
  />
        <Loader
          animation={bikeAnimation}
          text={null}
          size={window.innerWidth < 640 ? 260 : 360}
        />
      </motion.div>

      {/* ===== PAGE (SYNCED WITH BIKE) ===== */}
      <motion.div style={{ x: pageX, opacity: pageOpacity }}>
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
                  className="px-6 py-3 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] transition"
                >
                  Get started
                </Link>

                <Link
                  to="/about"
                  className="px-6 py-3 rounded-lg border border-[#E5E7EB] bg-white font-semibold text-[#2563EB] hover:bg-[#F9FAFB] transition"
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* RIGHT PRODUCT PREVIEW */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-sm h-[420px] sm:h-[480px] rounded-2xl bg-white border border-[#E5E7EB] shadow-lg overflow-hidden">

                <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E7EB] text-sm">
                  <span className="font-medium">Live Map</span>
                  <span className="text-green-600 font-medium text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-600" />
                    Online
                  </span>
                </div>

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

                  <button
                    onClick={() =>
                      setStyle(style === "osm" ? "stamen" : "osm")
                    }
                    className="absolute top-3 right-3 px-2 py-1 text-xs rounded-md bg-white border border-[#E5E7EB] shadow-sm"
                  >
                    Switch map
                  </button>

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
      </motion.div>
    </div>
  );
};

export default Home;