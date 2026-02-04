import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";

const About = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] text-[#111827] font-inter">
      <Navbar />

      {/* ================= HERO ================= */}
      <header className="py-16 md:py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold font-orbitron mb-6">
            About SyncFleet
          </h1>
          <p className="text-[#6B7280] text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            SyncFleet is a real-time location tracking and safety platform designed
            for coordinated travel, group movement, and fleet awareness.
            Whether you’re on the road, managing teams, or traveling together,
            SyncFleet keeps everyone connected and informed.
          </p>
        </div>
      </header>

      {/* ================= FEATURES ================= */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

          {/* Feature 1 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-[#2563EB] mb-3">
              Real-time Tracking
            </h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Monitor live locations with accurate positioning, smooth updates,
              and group visibility designed for safety and coordination.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-[#16A34A] mb-3">
              Team Communication
            </h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Stay aligned through built-in chat, alerts, and system messages
              without switching between apps.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-[#1D4ED8] mb-3">
              Safety & Awareness
            </h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Built with safety in mind — including SOS alerts, inactivity
              detection, and geofence-based awareness.
            </p>
          </div>

        </div>
      </section>

      {/* ================= VISION ================= */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 md:p-12 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold font-orbitron text-center mb-6">
            Our Vision
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg text-center max-w-3xl mx-auto leading-relaxed">
            We believe group movement should be coordinated, transparent, and safe.
            SyncFleet is built to support teams, travelers, and fleets with
            reliable real-time insights — helping people move together with
            confidence, clarity, and control.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
