import React from 'react';

interface NexWinLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
}

export const NexWinLogo: React.FC<NexWinLogoProps> = ({
  size = 64,
  className = '',
  showText = false
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Main Web/SaaS Blue Gradient */}
          <linearGradient id="nexwinBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Golden/Cyan Accent Gradients for CAD/Vector lines */}
          <linearGradient id="cyberCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Soft Glass Shine */}
          <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Shadow filters for high depth */}
          <filter id="vectorGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer squircle/container with subtle glowing border */}
        <rect
          x="12"
          y="12"
          width="488"
          height="488"
          rx="110"
          fill="url(#nexwinBg)"
          stroke="#e0f2fe"
          strokeWidth="6"
          strokeOpacity="0.5"
        />

        {/* CAD Grid System/Technical Blueprint Accent Lines */}
        <g opacity="0.25" stroke="#ffffff" strokeWidth="1">
          {/* Vertical Grid Lines */}
          <line x1="80" y1="20" x2="80" y2="492" />
          <line x1="140" y1="20" x2="140" y2="492" />
          <line x1="200" y1="20" x2="200" y2="492" />
          <line x1="260" y1="20" x2="260" y2="492" strokeDasharray="5,5" strokeWidth="1.5" />
          <line x1="320" y1="20" x2="320" y2="492" />
          <line x1="380" y1="20" x2="380" y2="492" />
          <line x1="440" y1="20" x2="440" y2="492" />

          {/* Horizontal Grid Lines */}
          <line x1="20" y1="80" x2="492" y2="80" />
          <line x1="20" y1="140" x2="492" y2="140" />
          <line x1="20" y1="200" x2="492" y2="200" />
          <line x1="20" y1="260" x2="492" y2="260" strokeDasharray="5,5" strokeWidth="1.5" />
          <line x1="20" y1="320" x2="492" y2="320" />
          <line x1="20" y1="380" x2="492" y2="380" />
          <line x1="20" y1="440" x2="492" y2="440" />

          {/* Center Blueprint Circles */}
          <circle cx="260" cy="260" r="180" strokeDasharray="3,6" />
          <circle cx="260" cy="260" r="90" strokeDasharray="2,4" />
        </g>

        {/* INNER ARCHITECTURAL GRAPHIC: Precision Window & Swing Door Symbolism */}
        <g filter="url(#vectorGlow)">
          {/* 1. LEFT DOOR WITH OPEN SWING (CAD style) */}
          <g>
            {/* Door Frame Profile (Outside casing) */}
            <rect
              x="110"
              y="120"
              width="140"
              height="280"
              rx="4"
              fill="#0f172a"
              fillOpacity="0.4"
              stroke="#ffffff"
              strokeWidth="6"
            />
            
            {/* Inner Profile (Bevel Line) */}
            <rect
              x="120"
              y="130"
              width="120"
              height="260"
              rx="2"
              stroke="#e0f2fe"
              strokeWidth="2"
              fill="none"
            />

            {/* Swing Leaf Sash (3D swing projection) */}
            {/* Path representing the partially opened door sash */}
            <path
              d="M 195 140 L 125 155 L 125 365 L 195 380 Z"
              fill="#3b82f6"
              fillOpacity="0.4"
              stroke="url(#cyberCyan)"
              strokeWidth="8"
              strokeLinejoin="round"
            />

            {/* Glass panel inside the leaf */}
            <path
              d="M 185 155 L 135 165 L 135 355 L 185 365 Z"
              fill="url(#glassReflection)"
              stroke="#bae6fd"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* Modern Handle Point & Vector line */}
            <path
              d="M 133 260 L 145 260 L 145 272"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Handle Base Pin */}
            <circle cx="133" cy="260" r="3" fill="#ffffff" />
          </g>

          {/* 2. RIGHT VENT ARCHED COMPARTMENT (Traditional High-Tech Window) */}
          <g>
            {/* Arched Window Casing */}
            <path
              d="M 262 400 L 262 210 A 98 98 0 0 1 458 210 L 458 400 Z"
              fill="#0f172a"
              fillOpacity="0.4"
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinejoin="round"
            />

            {/* Inner frame profile bevel line */}
            <path
              d="M 272 390 L 272 210 A 88 88 0 0 1 448 210 L 448 390 Z"
              stroke="#e0f2fe"
              strokeWidth="2"
              fill="none"
            />

            {/* Glass Panes: Dividing Sash */}
            {/* Arched Divider */}
            <path
              d="M 284 210 A 76 76 0 0 1 436 210 Z"
              fill="url(#glassReflection)"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Middle vertical mullion */}
            <line x1="360" y1="210" x2="360" y2="390" stroke="#ffffff" strokeWidth="5" />

            {/* Horizontal transoms */}
            <line x1="272" y1="270" x2="448" y2="270" stroke="#ffffff" strokeWidth="5" />
            <line x1="272" y1="330" x2="448" y2="330" stroke="#ffffff" strokeWidth="5" />

            {/* CAD Angle Indicator Line (Tilt & Turn Swing Symbol) */}
            <path
              d="M 272 270 L 360 300 L 272 330"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="4,4"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 448 270 L 360 300 L 448 330"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="4,4"
              fill="none"
              opacity="0.8"
            />
          </g>

          {/* Architectural Dimension CAD line helper */}
          <g opacity="0.5">
            {/* Bottom dimension arrow */}
            <line x1="110" y1="425" x2="458" y2="425" stroke="#bae6fd" strokeWidth="1.5" />
            <path d="M 110 420 L 110 430 M 458 420 L 458 430" stroke="#bae6fd" strokeWidth="1.5" />
            
            {/* Cross tick lines */}
            <line x1="107" y1="428" x2="113" y2="422" stroke="#bae6fd" strokeWidth="2" />
            <line x1="455" y1="428" x2="461" y2="422" stroke="#bae6fd" strokeWidth="2" />
          </g>
        </g>

        {/* Clean Gloss Shine over everything (Skeuomorphic glass finish) */}
        <path
          d="M 15 110 C 15 30 50 15 150 15 L 400 15 C 470 15 497 40 497 120 C 350 250 180 200 15 110 Z"
          fill="url(#glassReflection)"
          pointerEvents="none"
        />
      </svg>
    </div>
  );
};
