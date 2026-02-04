// components/StationaryModal.jsx
import React from "react";
import PropTypes from "prop-types";
import { IoAlertCircle } from "react-icons/io5";

const StationaryModal = ({ isOpen, onYes, onNo }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stationary-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E7EB] shadow-xl p-6 md:p-8">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-red-100 animate-stationaryPulse" />
            <IoAlertCircle
              size={56}
              className="relative text-[#DC2626]"
            />
          </div>
        </div>

        {/* Content */}
        <h2
          id="stationary-title"
          className="mt-4 text-lg md:text-xl font-semibold text-center text-[#111827]"
        >
          No movement detected
        </h2>

        <p className="mt-2 text-sm text-center text-[#6B7280]">
          You have not moved for a while. Please confirm your status.
        </p>

        <p className="mt-4 text-base font-medium text-center text-[#111827]">
          Are you okay?
        </p>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onYes}
            className="
              flex-1 py-3 rounded-lg
              bg-[#16A34A] hover:bg-[#15803D]
              text-white font-semibold
              transition active:scale-95
            "
          >
            I’m OK
          </button>

          <button
            onClick={onNo}
            className="
              flex-1 py-3 rounded-lg
              bg-[#DC2626] hover:bg-[#B91C1C]
              text-white font-semibold
              transition active:scale-95
            "
          >
            Send SOS
          </button>
        </div>

        {/* Auto SOS Notice */}
        <div className="mt-5 rounded-lg bg-[#FEF2F2] border border-red-200 px-4 py-3 text-center">
          <p className="text-xs font-medium text-[#991B1B]">
            If there is no response, an SOS alert will be sent automatically.
          </p>
        </div>
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
