import React from 'react';

interface IconProps {
  className?: string;
}

// Pipe-spool symbols (not generic UI glyphs) for the Flange/Valve/Fitting/
// Pipe stat tiles, each with a motion specific to that part. Animation
// classes (ic-*) are defined in index.css and respect
// prefers-reduced-motion there.

export const FlangeIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="12" cy="4" r="1" fill="currentColor" />
    <circle cx="18.9" cy="8" r="1" fill="currentColor" />
    <circle cx="18.9" cy="16" r="1" fill="currentColor" />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
    <circle cx="5.1" cy="16" r="1" fill="currentColor" />
    <circle cx="5.1" cy="8" r="1" fill="currentColor" />
    <circle className="ic-flange-dot" cx="12" cy="4" r="1.6" fill="currentColor" />
  </svg>
);

export const ValveIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 8 L11 12 L4 16 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M20 8 L13 12 L20 16 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <g className="ic-valve-handle">
      <line x1="12" y1="12" x2="12" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9.4" y1="5" x2="14.6" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  </svg>
);

export const FittingIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3.5 12 H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
    <path d="M12 12 V20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
    <path d="M12 12 H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
    <path className="ic-flow-dash" d="M3.5 12 H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path className="ic-flow-dash ic-flow-dash-delay" d="M12 12 V20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path className="ic-flow-dash ic-flow-dash-delay" d="M12 12 H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const PipeIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2.5" y="9.5" width="19" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
    <line x1="6" y1="9.5" x2="6" y2="14.5" stroke="currentColor" strokeWidth="1.4" />
    <line x1="18" y1="9.5" x2="18" y2="14.5" stroke="currentColor" strokeWidth="1.4" />
    <line className="ic-pipe-dash" x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
  </svg>
);
