'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { 
  STAMP_DEFINITIONS, 
  STAMP_MAP, 
  StampCategory, 
  StampDefinition 
} from '@/lib/stamps';
import { playSound } from '@/lib/ai-handler';
import { 
  X, 
  Search, 
  Stamp, 
  RotateCw, 
  Maximize2, 
  Paintbrush, 
  Check, 
  Sparkles,
  Layers
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StampPicker() {
  const {
    isStampPickerOpen,
    setIsStampPickerOpen,
    selectedStampId,
    setSelectedStampId,
    stampFilled,
    setStampFilled,
    stampScale,
    setStampScale,
    stampRotation,
    setStampRotation,
    setTopMessage,
    currentColor,
    theme
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<StampCategory | 'all'>('all');

  if (!isStampPickerOpen) return null;

  const currentStamp = STAMP_MAP.get(selectedStampId) || STAMP_DEFINITIONS[0];

  const filteredStamps = STAMP_DEFINITIONS.filter(s => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const categories: { id: StampCategory | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All Stamps', count: STAMP_DEFINITIONS.length },
    { id: 'shapes', label: 'Shapes', count: STAMP_DEFINITIONS.filter(s => s.category === 'shapes').length },
    { id: 'symbols', label: 'Symbols', count: STAMP_DEFINITIONS.filter(s => s.category === 'symbols').length },
    { id: 'wireframe', label: 'Wireframe', count: STAMP_DEFINITIONS.filter(s => s.category === 'wireframe').length },
  ];

  const sizePresets = [
    { label: 'S', scale: 0.7 },
    { label: 'M', scale: 1.0 },
    { label: 'L', scale: 1.5 },
    { label: 'XL', scale: 2.2 },
  ];

  const rotationAngles = [0, Math.PI / 4, Math.PI / 2, Math.PI];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[70] pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-6"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Backdrop for closing */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setIsStampPickerOpen(false);
            playSound(360, 'sine', 0.08);
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={cn(
            "relative w-full max-w-lg rounded-2xl shadow-2xl border pointer-events-auto overflow-hidden flex flex-col max-h-[85vh] z-10",
            theme === 'dark' 
              ? "bg-gray-900 border-gray-800 text-gray-100 shadow-indigo-950/40" 
              : "bg-white border-slate-200 text-slate-800 shadow-xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-4 py-3 border-b",
            theme === 'dark' ? "border-gray-800 bg-gray-900/60" : "border-slate-100 bg-slate-50/60"
          )}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Stamp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                  Stamp Library
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    24 vector shapes
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Click to stamp, or click & drag to size & rotate
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsStampPickerOpen(false);
                playSound(360, 'sine', 0.08);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Close stamp selector"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar & Category filters */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shapes, icons, wireframes..."
                className={cn(
                  "w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none transition-all",
                  theme === 'dark' 
                    ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" 
                    : "bg-gray-50 border-gray-200 text-black placeholder-gray-400 focus:border-indigo-400 focus:bg-white"
                )}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      playSound(500, 'sine', 0.04);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5",
                      active
                        ? (theme === 'dark' 
                            ? "bg-indigo-600 text-white shadow-xs" 
                            : "bg-indigo-600 text-white shadow-xs")
                        : (theme === 'dark' 
                            ? "bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-750" 
                            : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-150")
                    )}
                  >
                    <span>{cat.label}</span>
                    <span className={cn(
                      "text-[10px] px-1 rounded-full",
                      active ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
                    )}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stamps Grid */}
          <div className="p-3 overflow-y-auto max-h-64 grid grid-cols-4 sm:grid-cols-6 gap-2">
            {filteredStamps.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-gray-400">
                No matching stamps found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredStamps.map((stamp) => {
                const isSelected = selectedStampId === stamp.id;
                return (
                  <button
                    key={stamp.id}
                    onClick={() => {
                      setSelectedStampId(stamp.id);
                      setTopMessage(`Stamp selected: ${stamp.name} 📐 Click or drag canvas to place.`);
                      playSound(600, 'triangle', 0.08);
                    }}
                    title={`${stamp.name}: ${stamp.description}`}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center group relative",
                      isSelected
                        ? (theme === 'dark'
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/40"
                            : "bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-400/40")
                        : (theme === 'dark'
                            ? "bg-gray-800/40 border-gray-750 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50")
                    )}
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      <svg
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        className={cn(
                          "transition-transform group-hover:scale-110",
                          isSelected ? "scale-110" : ""
                        )}
                        dangerouslySetInnerHTML={{ __html: stamp.iconSvg }}
                      />
                    </div>
                    <span className="text-[10px] font-medium leading-tight truncate w-full">
                      {stamp.name}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-gray-900" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Properties & Configuration Bar */}
          <div className={cn(
            "px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs",
            theme === 'dark' ? "border-gray-800 bg-gray-900/80" : "border-slate-100 bg-slate-50/80"
          )}>
            {/* Scale Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Maximize2 size={13} /> Size:
              </span>
              <div className="flex items-center bg-gray-200/60 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200/40 dark:border-gray-700">
                {sizePresets.map(preset => {
                  const active = Math.abs(stampScale - preset.scale) < 0.05;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setStampScale(preset.scale);
                        playSound(520, 'sine', 0.04);
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                        active 
                          ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs" 
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fill Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setStampFilled(!stampFilled);
                  playSound(stampFilled ? 420 : 620, 'sine', 0.06);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all",
                  stampFilled
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : (theme === 'dark' ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50")
                )}
                title="Toggle Solid Fill or Line Outline"
              >
                <div 
                  className={cn(
                    "w-3 h-3 rounded-xs border",
                    stampFilled ? "bg-white border-white" : "border-current bg-transparent"
                  )} 
                />
                <span>{stampFilled ? 'Filled' : 'Outline'}</span>
              </button>
            </div>

            {/* Quick Rotate Button */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <RotateCw size={13} /> Angle:
              </span>
              <div className="flex items-center gap-1">
                {rotationAngles.map((angle) => {
                  const deg = Math.round((angle * 180) / Math.PI);
                  const active = Math.abs(stampRotation - angle) < 0.05;
                  return (
                    <button
                      key={deg}
                      onClick={() => {
                        setStampRotation(angle);
                        playSound(550, 'sine', 0.04);
                      }}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border",
                        active
                          ? "bg-indigo-100 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800"
                      )}
                    >
                      {deg}°
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Stamp Preview Callout */}
          <div className={cn(
            "px-4 py-2 border-t flex items-center justify-between text-[11px]",
            theme === 'dark' ? "border-gray-800 bg-gray-950 text-gray-400" : "border-slate-100 bg-slate-100/50 text-slate-500"
          )}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-gray-200">Active:</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">{currentStamp.name}</span>
              <span>— {currentStamp.description}</span>
            </div>

            <button
              onClick={() => {
                setIsStampPickerOpen(false);
                playSound(650, 'sine', 0.08);
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Use Stamp
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
