import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur border-t border-blue-200/40">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

        <div>
          <h2 className="text-xl font-orbitron bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            SyncFleet
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            Real-time room & location synchronization platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <Link to="/about" className="hover:text-blue-600">About</Link>
          <Link to="/contact" className="hover:text-blue-600">Contact</Link>
          <Link to="/help" className="hover:text-blue-600">Help</Link>
          <Link to="/community" className="hover:text-blue-600">Community</Link>
          <Link to="/faq" className="hover:text-blue-600">FAQ</Link>
        </div>

        <div className="flex md:justify-end gap-4 text-xl">
          <a href="#" className="hover:text-blue-600">🐦</a>
          <a href="#" className="hover:text-blue-600">💼</a>
          <a href="#" className="hover:text-blue-600">🐙</a>
          <a href="#" className="hover:text-blue-600">✉️</a>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 border-t py-4">
        © {new Date().getFullYear()} SyncFleet. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
