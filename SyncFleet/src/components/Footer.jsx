import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#F5F7FA] border-t border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Brand */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[#111827] tracking-wide">
            SyncFleet
          </h2>
          <p className="text-sm text-[#6B7280] leading-relaxed max-w-sm">
            Real-time location tracking and safety coordination platform
            built for reliability and clarity.
          </p>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-y-2 text-sm text-[#6B7280]">
          {[
            { to: "/", label: "Home" },
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
            { to: "/help", label: "Help Center" },
            { to: "/community", label: "Community" },
            { to: "/faq", label: "FAQ" },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="hover:text-[#2563EB] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Social / Contact */}
        <div className="flex md:justify-end items-start gap-4">
          {[
            { label: "Twitter", icon: "🐦" },
            { label: "LinkedIn", icon: "💼" },
            { label: "GitHub", icon: "🐙" },
            { label: "Email", icon: "✉️" },
          ].map((item) => (
            <a
              key={item.label}
              href="#"
              aria-label={item.label}
              className="text-[#9CA3AF] hover:text-[#2563EB] transition-transform transition-colors duration-150 hover:-translate-y-[2px]"
            >
              <span className="text-lg">{item.icon}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#E5E7EB] py-4 text-center">
        <p className="text-xs text-[#9CA3AF]">
          © {new Date().getFullYear()} SyncFleet. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
