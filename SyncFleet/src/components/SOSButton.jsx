// components/SOSButton.jsx
import React from "react";
import PropTypes from "prop-types";
import { IoAlertCircle } from "react-icons/io5";

const SOSButton = ({ onClick }) => {
  return (
    <div className="fixed z-[9999] bottom-24 right-4 md:bottom-8 md:right-8">
      <button
        onClick={onClick}
        aria-label="Send SOS Emergency Alert"
        title="Send SOS"
        className="
          relative
          flex items-center justify-center
          w-14 h-14 md:w-16 md:h-16
          rounded-full
          bg-[#DC2626]
          text-white
          shadow-lg
          transition
          active:scale-95
          focus:outline-none
          focus:ring-4
          focus:ring-red-300
        "
      >
        {/* Pulsing ring (subtle, continuous) */}
        <span className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-sosPulse" />

        {/* Icon */}
        <IoAlertCircle className="relative text-2xl md:text-3xl" />
      </button>

      {/* Label (desktop only) */}
      <div className="hidden md:block mt-2 text-center">
        <span className="text-xs font-semibold text-red-700 tracking-wide">
          SOS
        </span>
      </div>
    </div>
  );
};

SOSButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default SOSButton;
