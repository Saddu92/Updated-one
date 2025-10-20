// components/LeaveRoomModal.jsx
import React from "react";
import PropTypes from "prop-types";

const LeaveRoomModal = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-gray-900 rounded-xl p-6 w-80 text-white shadow-2xl">
        <h2 className="text-lg font-semibold mb-4">Leave Room</h2>
        <p className="text-sm mb-6">
          Are you sure you want to leave the room?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

LeaveRoomModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default LeaveRoomModal;