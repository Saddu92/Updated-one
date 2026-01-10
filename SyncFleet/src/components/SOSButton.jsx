// components/SOSButton.jsx
import React from "react";
import PropTypes from "prop-types";
import { IoAlertCircle } from "react-icons/io5";

const SOSButton = ({ onClick }) => {
  return (
    <div className="fixed bottom-6 right-4 md:bottom-20 md:left-6 z-[999]">
      <button
        onClick={onClick}
        className="relative p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center"
        title="Send SOS"
        aria-label="Send SOS"
      >
        <IoAlertCircle className="text-2xl" />
        <span className="absolute animate-ping inline-flex h-8 w-8 rounded-full bg-red-400 opacity-60" />
      </button>
    </div>
  );
};

SOSButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default SOSButton;