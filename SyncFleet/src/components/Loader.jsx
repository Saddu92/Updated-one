// components/Loader.jsx
import React from "react";
import Lottie from "lottie-react";

const Loader = ({
  animation,
  text = "Loading…",
  size = 140,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Lottie
        animationData={animation}
        loop
        style={{ width: size, height: size }}
      />
      {text && (
        <p className="mt-3 text-sm text-gray-500 font-medium">
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;
