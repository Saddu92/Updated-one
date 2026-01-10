// components/StationaryModal.jsx
import React from "react";
import PropTypes from "prop-types";
import { IoAlertCircle } from "react-icons/io5";

const StationaryModal = ({ isOpen, onYes, onNo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border-2 border-red-100 p-6 md:p-8 animate-[modal-shake_0.5s_ease-in-out]">
        <div className="flex flex-col items-center">
          <div className="relative">
            <IoAlertCircle size={64} className="text-red-600" />
            <span className="absolute -top-2 -right-2 w-20 h-20 rounded-full bg-red-100/60 animate-pulse-block" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-red-600 mt-4">Stationary Detected!</h2>

          <p className="text-sm text-gray-700 mt-3 text-center">You've been stationary for over 5 minutes.</p>

          <p className="text-lg font-semibold text-gray-800 mt-4 mb-4">Are you okay?</p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onYes}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg py-3 shadow-sm transition"
            >
              ✓ Yes, I'm OK
            </button>
            <button
              onClick={onNo}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg py-3 shadow-sm transition"
            >
              ✗ Need Help!
            </button>
          </div>

          <div className="mt-4 px-4 py-2 bg-red-50 border border-red-100 rounded text-sm text-red-600 text-center">
            ⏱️ No response in 30 seconds will automatically send SOS alert
          </div>
        </div>

        <style>
          {`
            @keyframes modal-shake { 0%,100%{transform:translateX(0);}25%{transform:translateX(-8px);}75%{transform:translateX(8px);} }
            .animate-pulse-block{ animation: pulse-ring 1.5s ease-out infinite; }
            @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
          `}
        </style>
      </div>
    </div>
  );
};

StationaryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onYes: PropTypes.func.isRequired,
  onNo: PropTypes.func.isRequired,
};

export default StationaryModal;