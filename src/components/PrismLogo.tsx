import React from 'react';

export default function PrismLogo({ size = 28, className = '' }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0px 4px 8px rgba(124, 58, 237, 0.4))' }}
    >
      <defs>
        <linearGradient id="prism-glass" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#4f46e5" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="prism-light" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="prism-shadow" x1="50" y1="50" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#312e81" stopOpacity="0.8" />
          <stop offset="1" stopColor="#1e1b4b" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Back Facet */}
      <path d="M50 15 L85 35 L50 90 Z" fill="url(#prism-shadow)" />
      
      {/* Front Left Facet */}
      <path d="M15 35 L50 15 L50 90 Z" fill="url(#prism-glass)" />
      
      {/* Front Right Facet Overlap (Glass effect) */}
      <path d="M50 15 L85 35 L50 70 L15 35 Z" fill="url(#prism-light)" style={{ mixBlendMode: 'overlay' }} />
      
      {/* Edge Highlights */}
      <path d="M15 35 L50 15 L85 35" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" />
      <path d="M50 15 L50 90" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
      <path d="M15 35 L50 90 L85 35" stroke="rgba(139, 92, 246, 0.8)" strokeWidth="1" fill="none" />
    </svg>
  );
}
