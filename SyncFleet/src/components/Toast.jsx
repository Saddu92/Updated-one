// components/Toast.jsx
import React from "react";
import PropTypes from "prop-types";

const Toast = ({ message, type }) => {
  if (!message) return null;

  return (
    <div
      className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 rounded-md shadow-lg ${
        type === "danger"
          ? "bg-red-100 text-red-800 border border-red-200"
          : type === "warning"
          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
          : "bg-blue-100 text-blue-800 border border-blue-200"
      }`}
    >
      {message}
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string,
  type: PropTypes.oneOf(["info", "warning", "danger"]),
};

export default Toast;