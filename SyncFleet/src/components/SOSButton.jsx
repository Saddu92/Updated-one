// components/SOSButton.jsx
import React from "react";
import PropTypes from "prop-types";
import { IoAlertCircle } from "react-icons/io5";

const SOSButton = ({ onClick }) => {
  return (
    <div className="absolute bottom-20 right-20">
      <button
        onClick={onClick}
        className="absolute z-[999] p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center"
        title="Send SOS"
      >
        <IoAlertCircle className="text-2xl" />
        <span className="absolute animate-ping inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75" />
      </button>
    </div>
  );
};

SOSButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default SOSButton;