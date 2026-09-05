'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, Stroke, Layer } from '@/lib/store';
import { History, X, Check, Trash2, CloudCheck, Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { playSound } from '@/lib/ai-handler';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STORAGE_KEY = 'synapse_sketch_canvas_draft_v1';

export interface CanvasDraftData {
  strokes: Stroke[];
  layers: Layer[];
  activeLayerId: string;
  backgroundImage: string | null;
  strokeCount: number;
  savedAt: number;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 minute ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
}

export default function DraftRecoveryPrompt() {
  const { strokes, layers, activeLayerId, backgroundImage, restoreDraft, theme } = useStore();
  const [availableDraft, setAvailableDraft] = useState<CanvasDraftData | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [lastSavedTimeText, setLastSavedTimeText] = useState<string>('');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const isInitialMount = useRef(true);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. On Mount: Check if a saved draft exists in localStorage to offer restoration
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: CanvasDraftData = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.strokes) && parsed.strokes.length > 0) {
            // If the draft exists, check if canvas is currently fresh/empty
            if (useStore.getState().strokes.length === 0) {
              setAvailableDraft(parsed);
              setShowPrompt(true);
              setLastSavedTimeText(getRelativeTime(parsed.savedAt));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to read canvas draft from localStorage', e);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  // Update relative time label every 15s while prompt is visible
  useEffect(() => {
    if (!showPrompt || !availableDraft) return;
    const interval = setInterval(() => {
      setLastSavedTimeText(getRelativeTime(availableDraft.savedAt));
    }, 15000);
    return () => clearInterval(interval);
  }, [showPrompt, availableDraft]);

  // 2. Periodic Serialization: Periodically serialize current canvas state to localStorage
  useEffect(() => {
    // Avoid overwriting draft during first render check
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only serialize if user actually has drawn strokes
    if (strokes.length === 0) return;

    const timer = setTimeout(() => {
      try {
        const draft: CanvasDraftData = {
          strokes,
          layers,
          activeLayerId,
          backgroundImage,
          strokeCount: strokes.length,
          savedAt: Date.now(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setShowSaveIndicator(true);

        if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
        indicatorTimeoutRef.current = setTimeout(() => {
          setShowSaveIndicator(false);
        }, 2200);
      } catch (err) {
        console.warn('Failed to auto-save canvas draft:', err);
      }
    }, 3000); // Debounced 3s periodic serialization

    return () => clearTimeout(timer);
  }, [strokes, layers, activeLayerId, backgroundImage]);

  const handleRestore = () => {
    if (!availableDraft) return;
    restoreDraft({
      strokes: availableDraft.strokes,
      layers: availableDraft.layers,
      activeLayerId: availableDraft.activeLayerId,
      backgroundImage: availableDraft.backgroundImage,
    });

    useStore.getState().setTopMessage(`Restored draft with ${availableDraft.strokeCount} strokes! 🎨`);
    playSound(750, 'sine', 0.15);
    setShowPrompt(false);
  };

  const handleDiscard = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setAvailableDraft(null);
    setShowPrompt(false);
    useStore.getState().setTopMessage('Previous draft discarded.');
    playSound(320, 'sawtooth', 0.1);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    playSound(400, 'triangle', 0.06);
  };

  return (
    <>
      {/* Subtle Auto-Save Tactile Pill Indicator */}
      <AnimatePresence>
        {showSaveIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed top-16 left-6 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide shadow-md border backdrop-blur-md select-none pointer-events-none',
              theme === 'dark'
                ? 'bg-gray-900/85 border-gray-700/60 text-emerald-400'
                : 'bg-white/90 border-slate-200/80 text-emerald-600'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Draft auto-saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restore Draft Prompt Notification */}
      <AnimatePresence>
        {showPrompt && availableDraft && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className={cn(
              'fixed top-16 sm:top-20 right-4 sm:right-6 z-[80] w-[92vw] sm:w-[360px] p-4 rounded-2xl shadow-2xl border backdrop-blur-2xl transition-colors select-none',
              theme === 'dark'
                ? 'bg-gray-950/95 border-gray-800 text-white shadow-indigo-950/30'
                : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-indigo-100/60'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                  <History size={17} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-tight">
                    Restore Previous Drawing?
                  </h4>
                  <p
                    className={cn(
                      'text-[11px] leading-tight mt-0.5',
                      theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                    )}
                  >
                    Auto-saved {lastSavedTimeText}
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className={cn(
                  'p-1 rounded-lg transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content summary badge */}
            <div
              className={cn(
                'flex items-center gap-2 py-1.5 px-2.5 rounded-xl text-[11px] mb-3 border',
                theme === 'dark'
                  ? 'bg-gray-900/60 border-gray-800/80 text-gray-300'
                  : 'bg-slate-50 border-slate-100 text-slate-600'
              )}
            >
              <Layers size={13} className="text-indigo-400 shrink-0" />
              <span>
                <strong className="text-indigo-500 dark:text-indigo-300">
                  {availableDraft.strokeCount}
                </strong>{' '}
                {availableDraft.strokeCount === 1 ? 'stroke' : 'strokes'} across{' '}
                <strong className="text-indigo-500 dark:text-indigo-300">
                  {availableDraft.layers?.length || 2}
                </strong>{' '}
                {(availableDraft.layers?.length || 2) === 1 ? 'layer' : 'layers'}
              </span>
            </div>

            {/* Action Buttons with tactile Framer Motion animation */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                onClick={handleRestore}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check size={14} />
                <span>Restore Draft</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                onClick={handleDiscard}
                className={cn(
                  'py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border',
                  theme === 'dark'
                    ? 'border-gray-800 bg-gray-900/50 hover:bg-rose-500/10 hover:border-rose-500/30 text-gray-400 hover:text-rose-400'
                    : 'border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600'
                )}
                title="Discard this draft permanently"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Discard</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
