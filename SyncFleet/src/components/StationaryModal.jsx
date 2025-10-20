// components/StationaryModal.jsx
import React from "react";
import PropTypes from "prop-types";
import { IoAlertCircle } from "react-icons/io5";

const StationaryModal = ({ isOpen, onYes, onNo }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,.5)",
        zIndex: 99999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(239, 68, 68, 0.4)",
          padding: "32px",
          minWidth: "360px",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "3px solid #ef4444",
          animation: "modal-shake 0.5s ease-in-out",
        }}
      >
        <div style={{ position: "relative" }}>
          <IoAlertCircle size={64} color="#ef4444" />
          <span
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.2)",
              animation: "pulse-ring 1.5s ease-out infinite",
            }}
          />
        </div>
        
        <h2 style={{ 
          fontWeight: "bold", 
          color: "#ef4444", 
          fontSize: 24,
          marginTop: 20,
          marginBottom: 8,
        }}>
          Stationary Detected!
        </h2>
        
        <p style={{ 
          marginTop: 8, 
          fontSize: 16,
          color: "#374151",
          textAlign: "center",
        }}>
          You've been stationary for over 5 minutes.
        </p>
        
        <p style={{ 
          fontSize: 18, 
          marginTop: 16,
          marginBottom: 24,
          fontWeight: "600",
          color: "#1f2937",
        }}>
          Are you okay?
        </p>
        
        <div style={{ display: "flex", gap: "16px", width: "100%" }}>
          <button
            onClick={onYes}
            style={{
              flex: 1,
              background: "#10b981",
              color: "white",
              fontWeight: "bold",
              borderRadius: "8px",
              padding: "14px 24px",
              fontSize: "16px",
              border: "none",
              outline: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            }}
            onMouseOver={(e) => e.target.style.background = "#059669"}
            onMouseOut={(e) => e.target.style.background = "#10b981"}
          >
            ✓ Yes, I'm OK
          </button>
          
          <button
            onClick={onNo}
            style={{
              flex: 1,
              background: "#dc2626",
              color: "white",
              fontWeight: "bold",
              borderRadius: "8px",
              padding: "14px 24px",
              fontSize: "16px",
              border: "none",
              outline: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
            }}
            onMouseOver={(e) => e.target.style.background = "#b91c1c"}
            onMouseOut={(e) => e.target.style.background = "#dc2626"}
          >
            ✗ Need Help!
          </button>
        </div>
        
        <div style={{
          marginTop: 20,
          padding: "12px 16px",
          background: "#fef2f2",
          borderRadius: "8px",
          border: "1px solid #fecaca",
        }}>
          <span style={{ 
            color: "#dc2626", 
            fontSize: 13,
            fontWeight: "500",
          }}>
            ⏱️ No response in 30 seconds will automatically send SOS alert
          </span>
        </div>

        <style>
          {`
            @keyframes pulse-ring {
              0% { transform: scale(1); opacity: 0.5; }
              100% { transform: scale(1.5); opacity: 0; }
            }
            @keyframes modal-shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px); }
              75% { transform: translateX(10px); }
            }
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