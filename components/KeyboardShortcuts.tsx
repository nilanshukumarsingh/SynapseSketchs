'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { playSound } from '@/lib/ai-handler';
import { 
  Keyboard, 
  X, 
  Pencil, 
  Eraser, 
  Hand, 
  Sparkles, 
  Layers, 
  Map, 
  Trash, 
  Download, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  Move,
  HelpCircle,
  Stamp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface KeyboardShortcutsProps {
  onTriggerClear?: () => void;
}

interface ShortcutItem {
  keyLabel: string | string[];
  description: string;
  icon: React.ReactNode;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export default function KeyboardShortcuts({ onTriggerClear }: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    setTool, 
    setIsAiOpen, 
    setIsLayersOpen, 
    setIsExportOpen, 
    setShowMinimap, 
    showMinimap, 
    isSettingsOpen, 
    toggleSettings, 
    setTopMessage,
    theme
  } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in an input, textarea, or contentEditable element
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || 
                      activeEl?.tagName === 'TEXTAREA' || 
                      activeEl?.tagName === 'SELECT' || 
                      (activeEl as HTMLElement)?.isContentEditable;

      if (isInput) return;

      // Handle '?' key (or Shift + '/') to toggle shortcuts slide-out menu
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen(prev => {
          const next = !prev;
          playSound(next ? 580 : 380, 'sine', 0.08);
          setTopMessage(next ? "Keyboard shortcuts menu opened [?]" : "Keyboard shortcuts menu closed");
          return next;
        });
        return;
      }

      // Handle Ctrl/Cmd+S for saving/export
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsExportOpen(true);
        setTopMessage("Export artwork menu opened [Ctrl+S] 💾");
        playSound(640, 'sine', 0.1);
        return;
      }

      // Escape to dismiss any open modals or panels
      if (e.key === 'Escape') {
        if (isOpen) {
          setIsOpen(false);
          playSound(350, 'sine', 0.08);
          return;
        }
        setIsExportOpen(false);
        setIsLayersOpen(false);
        setIsAiOpen(false);
        if (isSettingsOpen) toggleSettings();
        return;
      }

      // If other modifiers are pressed, skip single-key actions
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      switch (key) {
        // 'c' for Clear canvas
        case 'c': {
          e.preventDefault();
          if (onTriggerClear) {
            onTriggerClear();
          } else {
            const state = useStore.getState();
            if (state.settings.skipClearConfirmation) {
              state.clearCanvas();
              setTopMessage("Canvas cleared via [C] shortcut!");
              playSound(180, 'sawtooth', 0.2);
            } else {
              setTopMessage("Confirm clear canvas? Press [C] again or confirm on screen.");
              playSound(360, 'sine', 0.15);
            }
          }
          break;
        }

        // 'a' for AI Assistant toggle
        case 'a': {
          e.preventDefault();
          setIsAiOpen(prev => {
            const next = !prev;
            setTopMessage(next ? "AI Assistant opened [A] ✨" : "AI Assistant closed [A]");
            playSound(next ? 650 : 400, 'triangle', 0.1);
            return next;
          });
          break;
        }

        // 'l' for Layers panel toggle
        case 'l': {
          e.preventDefault();
          setIsLayersOpen(prev => {
            const next = !prev;
            setTopMessage(next ? "Layers panel opened [L] 🗂️" : "Layers panel closed [L]");
            playSound(next ? 540 : 340, 'sine', 0.08);
            return next;
          });
          break;
        }

        // 'p' for Pencil tool
        case 'p': {
          e.preventDefault();
          setTool('pencil');
          setTopMessage("Pencil tool selected [P] ✏️");
          playSound(520, 'sine', 0.06);
          break;
        }

        // 'e' for Eraser tool
        case 'e': {
          e.preventDefault();
          setTool('eraser');
          setTopMessage("Eraser tool selected [E] 🧹");
          playSound(420, 'sine', 0.06);
          break;
        }

        // 's' for Stamp tool
        case 's': {
          e.preventDefault();
          setTool('stamp');
          useStore.getState().setIsStampPickerOpen(true);
          setTopMessage("Stamp tool selected [S] 📐 Shape picker opened.");
          playSound(580, 'sine', 0.08);
          break;
        }

        // 'h' for Hand / Pan tool
        case 'h': {
          e.preventDefault();
          setTool('hand');
          setTopMessage("Hand / Pan canvas tool selected [H] ✋");
          playSound(480, 'sine', 0.06);
          break;
        }

        // 's' for Save / Export
        case 's': {
          e.preventDefault();
          setIsExportOpen(true);
          setTopMessage("Export artwork modal opened [S] 🎨");
          playSound(640, 'sine', 0.1);
          break;
        }

        // 'm' for Minimap toggle
        case 'm': {
          e.preventDefault();
          setShowMinimap(!showMinimap);
          setTopMessage(!showMinimap ? "Minimap enabled [M] 🗺️" : "Minimap hidden [M]");
          playSound(!showMinimap ? 550 : 350, 'sine', 0.08);
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    onTriggerClear,
    setIsAiOpen, 
    setIsLayersOpen, 
    setIsExportOpen, 
    setShowMinimap, 
    showMinimap, 
    setTool, 
    isSettingsOpen, 
    toggleSettings, 
    setTopMessage
  ]);

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "Drawing & Tools",
      items: [
        { keyLabel: "P", description: "Pencil / Freehand Drawing", icon: <Pencil size={13} className="text-amber-500" /> },
        { keyLabel: "S", description: "Stamp pre-defined shapes & icons", icon: <Stamp size={13} className="text-violet-500" /> },
        { keyLabel: "E", description: "Eraser with friction ripple", icon: <Eraser size={13} className="text-rose-500" /> },
        { keyLabel: "H", description: "Hand tool (Pan & move canvas)", icon: <Hand size={13} className="text-blue-500" /> },
        { keyLabel: "A", description: "AI Generative Assistant", icon: <Sparkles size={13} className="text-indigo-500" /> },
        { keyLabel: "L", description: "Layers panel toggle", icon: <Layers size={13} className="text-purple-500" /> },
        { keyLabel: "M", description: "Interactive Minimap radar", icon: <Map size={13} className="text-emerald-500" /> },
        { keyLabel: "C", description: "Clear active canvas", icon: <Trash size={13} className="text-red-500" /> },
      ]
    },
    {
      title: "History & Navigation",
      items: [
        { keyLabel: ["Ctrl", "Z"], description: "Undo last stroke", icon: <Undo2 size={13} className="text-sky-500" /> },
        { keyLabel: ["Ctrl", "Y"], description: "Redo stroke", icon: <Redo2 size={13} className="text-sky-500" /> },
        { keyLabel: ["Ctrl", "S"], description: "Export & Save artwork", icon: <Download size={13} className="text-teal-500" /> },
        { keyLabel: "Wheel", description: "Pan canvas in 2D", icon: <Move size={13} className="text-slate-400" /> },
        { keyLabel: ["Ctrl", "Wheel"], description: "Smooth zoom in & out", icon: <ZoomIn size={13} className="text-slate-400" /> },
        { keyLabel: "?", description: "Toggle this shortcut guide", icon: <HelpCircle size={13} className="text-indigo-500" /> },
      ]
    }
  ];

  return (
    <>
      {/* Floating subtle trigger pill at the bottom right */}
      <button
        id="keyboard-shortcuts-trigger-btn"
        onClick={() => {
          setIsOpen(prev => {
            const next = !prev;
            playSound(next ? 580 : 380, 'sine', 0.08);
            return next;
          });
        }}
        title="Keyboard Shortcuts (Press '?')"
        className={cn(
          "fixed bottom-4 right-4 z-40 hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md border transition-all duration-200 active:scale-95 group",
          theme === 'dark'
            ? "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60 hover:text-white"
            : "bg-white/90 hover:bg-white text-slate-700 border-slate-200/80 hover:text-slate-950 shadow-slate-200/50"
        )}
      >
        <Keyboard size={14} className="opacity-75 group-hover:opacity-100 transition-opacity" />
        <span className="hidden sm:inline text-[11px]">Shortcuts</span>
        <kbd className={cn(
          "px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border transition-colors",
          theme === 'dark' 
            ? "bg-slate-800 border-slate-700 text-slate-300" 
            : "bg-slate-100 border-slate-200 text-slate-600"
        )}>
          ?
        </kbd>
      </button>

      {/* Slide-out Menu / Floating Shortcuts Card */}
      <div 
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-4 pointer-events-none",
          "bottom-16 right-4 sm:bottom-16 sm:right-6 w-[calc(100vw-2rem)] sm:w-88 max-h-[80vh] flex flex-col"
        )}
      >
        <div 
          className={cn(
            "rounded-3xl shadow-2xl border backdrop-blur-xl flex flex-col overflow-hidden transition-colors duration-200",
            theme === 'dark'
              ? "bg-[#13161c]/95 border-slate-800 text-slate-100 shadow-black/60"
              : "bg-white/95 border-slate-200/80 text-slate-900 shadow-slate-400/20"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-5 py-4 border-b shrink-0",
            theme === 'dark' ? "border-slate-800/80 bg-slate-900/30" : "border-slate-100 bg-slate-50/50"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "p-2 rounded-xl border flex items-center justify-center",
                theme === 'dark' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600"
              )}>
                <Keyboard size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                  Keyboard Shortcuts
                </h3>
                <p className="text-[11px] text-slate-400">Quick keys for effortless navigation</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <kbd className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border",
                theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
              )}>
                ESC
              </kbd>
              <button
                onClick={() => {
                  setIsOpen(false);
                  playSound(350, 'sine', 0.08);
                }}
                className={cn(
                  "p-1.5 rounded-full transition-all hover:scale-105 active:scale-95",
                  theme === 'dark' 
                    ? "hover:bg-slate-800 text-slate-400 hover:text-white" 
                    : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                )}
                title="Close (Esc)"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Scrollable Shortcut List */}
          <div className="p-4 space-y-4 overflow-y-auto no-scrollbar max-h-[58vh]">
            {shortcutGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  {group.title}
                </h4>
                <div className={cn(
                  "rounded-2xl border divide-y overflow-hidden",
                  theme === 'dark' 
                    ? "border-slate-800/80 bg-slate-900/30 divide-slate-800/60" 
                    : "border-slate-100 bg-slate-50/40 divide-slate-100"
                )}>
                  {group.items.map((item, iIdx) => (
                    <div 
                      key={iIdx}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-xs transition-colors",
                        theme === 'dark' ? "hover:bg-slate-800/40" : "hover:bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="shrink-0">{item.icon}</span>
                        <span className={cn(
                          "truncate text-[12px]",
                          theme === 'dark' ? "text-slate-300" : "text-slate-700"
                        )}>
                          {item.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {Array.isArray(item.keyLabel) ? (
                          item.keyLabel.map((k, kIdx) => (
                            <React.Fragment key={kIdx}>
                              {kIdx > 0 && <span className="text-[10px] text-slate-400">+</span>}
                              <kbd className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-xs border",
                                theme === 'dark'
                                  ? "bg-slate-800 border-slate-700 text-slate-200"
                                  : "bg-white border-slate-200 text-slate-800 shadow-slate-100"
                              )}>
                                {k}
                              </kbd>
                            </React.Fragment>
                          ))
                        ) : (
                          <kbd className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-mono font-bold shadow-xs border min-w-[22px] text-center",
                            theme === 'dark'
                              ? "bg-slate-800 border-slate-700 text-slate-200"
                              : "bg-white border-slate-200 text-slate-800 shadow-slate-100"
                          )}>
                            {item.keyLabel}
                          </kbd>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer banner */}
          <div className={cn(
            "px-4 py-2.5 border-t text-[11px] flex items-center justify-between shrink-0",
            theme === 'dark' 
              ? "border-slate-800/80 bg-slate-900/40 text-slate-400" 
              : "border-slate-100 bg-slate-50/60 text-slate-500"
          )}>
            <span>Press <kbd className="font-mono font-bold text-indigo-500 dark:text-indigo-400">?</kbd> anytime to toggle</span>
            <span className="text-[10px] font-medium opacity-75">Synapse Sketch</span>
          </div>
        </div>
      </div>
    </>
  );
}
