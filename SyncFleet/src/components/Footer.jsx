import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full bg-[#0f172a] bg-opacity-90 border-t border-gray-700 shadow-inner py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">

        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-green-400 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
            S
          </div>
          <span className="text-white font-semibold text-lg">SyncFleet</span>
        </div>

        {/* Center: Navigation 8 elements in 2 columns */}
        <div className="grid grid-cols-2 gap-6 text-white text-sm text-center md:text-left">
          <div className="flex flex-col gap-2">
            <Link to={"/"} className="hover:text-cyan-400 transition">Home</Link>
            <Link to={"/about"} className="hover:text-cyan-400 transition">About</Link>
            <Link to={"/contact"} className="hover:text-cyan-400 transition">Contact</Link>
            <Link to={"/help"} className="hover:text-cyan-400 transition">Help</Link>
          </div>
          <div className="flex flex-col gap-2">
            <Link to={"/members"} className="hover:text-cyan-400 transition">Members</Link>
            <Link to={"/community"} className="hover:text-cyan-400 transition">Community</Link>
            <Link to={"/blog"} className="hover:text-cyan-400 transition">Blog</Link>
            <Link to={"/faq"} className="hover:text-cyan-400 transition">FAQ</Link>
          </div>
        </div>

        {/* Right: Links / Social */}
        <div className="flex gap-4 text-white text-lg mt-4 md:mt-0">
          <a href="#" className="hover:text-cyan-400 transition">🐦</a>
          <a href="#" className="hover:text-cyan-400 transition">💼</a>
          <a href="#" className="hover:text-cyan-400 transition">🐙</a>
          <a href="#" className="hover:text-cyan-400 transition">✉️</a>
        </div>

      </div>

      {/* Bottom copyright */}
      <div className="text-center text-white/60 text-xs border-t border-gray-700 pt-4 mt-6">
        © {new Date().getFullYear()} SyncFleet. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
