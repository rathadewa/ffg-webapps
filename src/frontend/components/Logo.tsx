import React from "react";

export default function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        {/* shadcn logo mark — two diagonal lines */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          width="18"
          height="18"
        >
          <line
            x1="208" y1="128" x2="128" y2="208"
            stroke="#09090b"
            strokeLinecap="round"
            strokeWidth="30"
          />
          <line
            x1="192" y1="40" x2="40" y2="192"
            stroke="#09090b"
            strokeLinecap="round"
            strokeWidth="30"
          />
        </svg>
      </div>
      <span className="logo-name">FFG WebApps</span>
    </div>
  );
}
