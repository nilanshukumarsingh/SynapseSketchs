'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { Sparkles } from 'lucide-react';

export default function AiDrawingCursor() {
  const aiCursor = useStore((state) => state.aiCursor);
  const scale = useStore((state) => state.scale);
  const offset = useStore((state) => state.offset);

  if (!aiCursor || isNaN(aiCursor.x) || isNaN(aiCursor.y)) return null;

  // Compute exact screen coordinate of the current drawing tip
  const screenX = aiCursor.x * scale + offset.x;
  const screenY = aiCursor.y * scale + offset.y;

  return (
    <div
      className="fixed pointer-events-none z-50 will-change-transform"
      style={{
        transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
        left: 0,
        top: 0,
      }}
    >
      {/* 
        Stylus tip is anchored precisely at (0, 0).
        The stylus body is angled diagonally UP and to the RIGHT (away from drawn strokes)
        so it NEVER occludes or hides the line being drawn!
      */}
      <div className="relative select-none pointer-events-none -translate-x-[4px] -translate-y-[32px]">
        {/* Sleek Tilted Digital Stylus Vector */}
        <div className="relative">
          <svg
            width="38"
            height="38"
            viewBox="0 0 38 38"
            fill="none"
            className="filter drop-shadow-[0_4px_10px_rgba(99,102,241,0.45)]"
          >
            {/* Fine Precision Nib Tip pointing directly at bottom-left (4, 34) */}
            <path
              d="M4 34 L8 25 L13 30 Z"
              fill="#4338ca"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            {/* Bright Active Ink Highlight at the contact point */}
            <circle cx="4" cy="34" r="2.5" fill="#38bdf8" />
            <circle cx="4" cy="34" r="1.2" fill="#ffffff" />

            {/* Ergonomic Stylus Barrel tilted 45° up and right */}
            <path
              d="M8 25 L26 7 C27.5 5.5 30 5.5 31.5 7 C33 8.5 33 11 31.5 12.5 L13 30 Z"
              fill="url(#aiStylusGradient)"
              stroke="#ffffff"
              strokeWidth="1.4"
            />
            {/* Stylus Grip Detail */}
            <line x1="12" y1="21" x2="17" y2="26" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
            <line x1="15" y1="18" x2="20" y2="23" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
            
            {/* Premium Metallic Ring */}
            <line x1="23" y1="10" x2="28" y2="15" stroke="#f472b6" strokeWidth="2.2" />

            <defs>
              <linearGradient id="aiStylusGradient" x1="8" y1="25" x2="31.5" y2="7" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="0.6" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>

          {/* Micro Sparkle Indicator placed high on the pen barrel */}
          <div className="absolute -top-1 right-0 text-amber-300 animate-pulse">
            <Sparkles size={13} />
          </div>
        </div>

        {/* Floating status pill positioned high above and to the right, totally clear of the artwork */}
        <div className="absolute -top-5 left-8 px-2 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/20 text-white text-[9px] font-bold tracking-wider uppercase whitespace-nowrap shadow-md flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>AI Inking</span>
        </div>
      </div>
    </div>
  );
}
