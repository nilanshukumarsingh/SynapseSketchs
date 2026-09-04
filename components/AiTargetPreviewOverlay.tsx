'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Sparkles, Wand2, X, Move, ShieldCheck, Check } from 'lucide-react';
import { handleAiAction, playSound } from '@/lib/ai-handler';

export default function AiTargetPreviewOverlay() {
  const { aiPreviewBox, setAiPreviewBox, updateAiPreviewBoxPos, setIsGenerating, theme } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; boxX: number; boxY: number } | null>(null);

  if (!aiPreviewBox) return null;

  const isDark = theme === 'dark';

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      boxX: aiPreviewBox.x,
      boxY: aiPreviewBox.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStart) return;
    e.stopPropagation();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    updateAiPreviewBoxPos(
      dragStart.boxX + dx,
      dragStart.boxY + dy,
      aiPreviewBox.width,
      aiPreviewBox.height
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    setDragStart(null);
  };

  const handleResize = (newW: number, newH: number) => {
    const cx = aiPreviewBox.x + aiPreviewBox.width / 2;
    const cy = aiPreviewBox.y + aiPreviewBox.height / 2;
    const newX = Math.round(cx - newW / 2);
    const newY = Math.round(cy - newH / 2);
    updateAiPreviewBoxPos(newX, newY, newW, newH);
    playSound(700, 'sine', 0.05);
  };

  const handleConfirm = async () => {
    playSound(660, 'sine', 0.08);
    setTimeout(() => playSound(880, 'sine', 0.12), 70);
    useStore.getState().setTopMessage("✨ Drawing your sketch right inside the confirmed frame!");
    const confirmedBox = { ...aiPreviewBox };
    setAiPreviewBox(null);
    await handleAiAction(confirmedBox.prompt, setIsGenerating, confirmedBox);
  };

  const handleCancel = () => {
    playSound(320, 'sine', 0.06);
    setAiPreviewBox(null);
  };

  // Compute safe position for the confirmation card relative to the target box
  const cardWidth = 330;
  const cardEstimatedHeight = 225;
  const idealX = aiPreviewBox.x + aiPreviewBox.width / 2 - cardWidth / 2;
  const clampedX = typeof window !== 'undefined' 
    ? Math.max(16, Math.min(window.innerWidth - cardWidth - 16, idealX)) 
    : idealX;

  const spaceBelow = typeof window !== 'undefined' 
    ? window.innerHeight - (aiPreviewBox.y + aiPreviewBox.height + 16) 
    : 300;

  let clampedY = aiPreviewBox.y + aiPreviewBox.height + 14;
  if (spaceBelow < cardEstimatedHeight + 95 && aiPreviewBox.y > cardEstimatedHeight + 20) {
    // Flip above the box if there's no room below (e.g. near bottom toolbar)
    clampedY = aiPreviewBox.y - cardEstimatedHeight - 14;
  }
  if (typeof window !== 'undefined') {
    clampedY = Math.max(16, Math.min(window.innerHeight - cardEstimatedHeight - 95, clampedY));
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-40 select-none overflow-hidden">
      {/* Target Bounding Frame on Canvas - perfectly styled matching the canvas theme */}
      <div
        style={{
          left: `${aiPreviewBox.x}px`,
          top: `${aiPreviewBox.y}px`,
          width: `${aiPreviewBox.width}px`,
          height: `${aiPreviewBox.height}px`,
        }}
        className={`absolute border-2 border-dashed rounded-2xl transition-all duration-200 pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col justify-between p-3.5 group ${
          isDark 
            ? 'border-indigo-400/85 bg-indigo-500/[0.08] shadow-[0_0_25px_rgba(99,102,241,0.2)]' 
            : 'border-indigo-500/85 bg-indigo-50/[0.3] shadow-[0_0_25px_rgba(99,102,241,0.14)]'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Top Header Tag inside the Box */}
        <div className="flex items-center justify-between w-full pointer-events-none">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-tight shadow-xs backdrop-blur-md ${
            isDark 
              ? 'bg-gray-900/95 border-gray-700 text-indigo-300' 
              : 'bg-white/95 border-gray-200 text-indigo-700'
          }`}>
            <Sparkles size={13} className="text-indigo-500 animate-pulse" />
            <span>AI Sketch Zone</span>
          </div>
          <div className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border shadow-xs backdrop-blur-md ${
            isDark 
              ? 'bg-gray-900/90 border-gray-700 text-gray-300' 
              : 'bg-white/90 border-gray-200 text-gray-600'
          }`}>
            <Move size={11} className="text-indigo-500" />
            <span>Drag to Move</span>
          </div>
        </div>

        {/* Center Memo Sticker for Prompt */}
        <div className={`self-center px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow-xs truncate max-w-[85%] mx-auto flex items-center gap-2 pointer-events-none ${
          isDark 
            ? 'bg-gray-900/95 border-gray-700 text-gray-100' 
            : 'bg-white/95 border-gray-200 text-gray-800'
        }`}>
          <span className="text-indigo-500 text-sm">🎨</span>
          <span className="truncate">&ldquo;{aiPreviewBox.prompt}&rdquo;</span>
        </div>

        {/* Bottom subtle guidance */}
        <div className={`self-center text-[10px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-sm pointer-events-none ${
          isDark 
            ? 'text-indigo-300/80 bg-gray-900/80 border border-gray-800' 
            : 'text-indigo-600/80 bg-white/80 border border-gray-100'
        }`}>
          ✦ Confirmed target area
        </div>

        {/* Crisp professional corner anchors matching canvas theme */}
        <div className={`absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border-2 shadow-xs ${
          isDark ? 'bg-gray-900 border-indigo-400' : 'bg-white border-indigo-600'
        }`} />
        <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 shadow-xs ${
          isDark ? 'bg-gray-900 border-indigo-400' : 'bg-white border-indigo-600'
        }`} />
        <div className={`absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border-2 shadow-xs ${
          isDark ? 'bg-gray-900 border-indigo-400' : 'bg-white border-indigo-600'
        }`} />
        <div className={`absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 shadow-xs ${
          isDark ? 'bg-gray-900 border-indigo-400' : 'bg-white border-indigo-600'
        }`} />
      </div>

      {/* Floating Confirmation Card matching the Canvas UI theme */}
      <div
        style={{
          left: `${clampedX}px`,
          top: `${clampedY}px`,
          width: `${cardWidth}px`,
        }}
        className={`fixed p-4 rounded-2xl border z-50 pointer-events-auto backdrop-blur-2xl transition-all duration-200 animate-fade-in ${
          isDark 
            ? 'bg-gray-900/98 border-gray-700/80 text-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.7)]' 
            : 'bg-white/98 border-gray-200/90 text-gray-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)]'
        }`}
      >
        <div className="relative z-10">
          {/* Card Header with Icon & Title */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-xs shrink-0 ${
                isDark 
                  ? 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300' 
                  : 'bg-indigo-50 border-indigo-100 text-indigo-600'
              }`}>
                <Wand2 size={18} className="text-indigo-500 animate-pulse" />
              </div>
              <div>
                <h4 className={`text-xs font-extrabold tracking-tight flex items-center gap-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  <span>Confirm Target Frame</span>
                  <span className="text-indigo-500">✨</span>
                </h4>
                <p className={`text-[11px] font-medium leading-tight mt-0.5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Strokes will be drawn strictly here
                </p>
              </div>
            </div>

            <button
              onClick={handleCancel}
              title="Close preview"
              className={`p-1.5 rounded-full transition-colors ${
                isDark 
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
              }`}
            >
              <X size={15} />
            </button>
          </div>

          {/* Prompt Preview Tag */}
          <div className={`mt-3 px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            isDark 
              ? 'bg-gray-800/80 border-gray-700/80 text-gray-200' 
              : 'bg-gray-50 border-gray-200/80 text-gray-800'
          }`}>
            <span className="text-indigo-500 text-xs shrink-0">🎨</span>
            <span className="truncate italic">&ldquo;{aiPreviewBox.prompt}&rdquo;</span>
          </div>

          {/* Quick Size Presets */}
          <div className="mt-2.5 flex items-center justify-between text-[10px]">
            <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Frame Size:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleResize(220, 180)}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  aiPreviewBox.width <= 240
                    ? isDark 
                      ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300 font-bold' 
                      : 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-xs'
                    : isDark 
                      ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Small
              </button>
              <button
                type="button"
                onClick={() => handleResize(340, 240)}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  aiPreviewBox.width > 240 && aiPreviewBox.width <= 380
                    ? isDark 
                      ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300 font-bold' 
                      : 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-xs'
                    : isDark 
                      ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => handleResize(460, 320)}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  aiPreviewBox.width > 380
                    ? isDark 
                      ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300 font-bold' 
                      : 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-xs'
                    : isDark 
                      ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Wide
              </button>
            </div>
          </div>

          {/* Stroke Protection Reassurance */}
          <div className={`mt-2.5 flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-xl border ${
            isDark 
              ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
          }`}>
            <ShieldCheck size={12} className="shrink-0" />
            <span>Outside canvas drawings are safe & protected</span>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 flex items-center gap-2">
            <button
              id="ai-confirm-draw-btn"
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all active:scale-95"
            >
              <Check size={14} className="text-white" />
              <span>Confirm & Draw</span>
            </button>
            <button
              id="ai-cancel-preview-btn"
              onClick={handleCancel}
              className={`px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all active:scale-95 border ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
