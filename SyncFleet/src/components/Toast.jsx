// components/Toast.jsx
import React from "react";
import PropTypes from "prop-types";

const Toast = ({ message, type = "info" }) => {
  if (!message) return null;

  const styles = {
    info: {
      container:
        "bg-blue-50 border border-blue-200 text-blue-800",
      accent: "bg-[#2563EB]",
    },
    warning: {
      container:
        "bg-amber-50 border border-amber-200 text-amber-800",
      accent: "bg-[#F59E0B]",
    },
    danger: {
      container:
        "bg-red-50 border border-red-200 text-red-800",
      accent: "bg-[#DC2626]",
    },
  };

  const current = styles[type] || styles.info;

  return (
    <div className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full max-w-sm">
      <div
        className={`
          relative flex items-start gap-3
          px-4 py-3 rounded-lg shadow-lg
          ${current.container}
          animate-toastIn
        `}
        role="status"
        aria-live="polite"
      >
        {/* Accent bar (severity cue, not loud) */}
        <span
          className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${current.accent}`}
        />

        {/* Message */}
        <p className="text-sm font-medium leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string,
  type: PropTypes.oneOf(["info", "warning", "danger"]),
};

export default Toast;
