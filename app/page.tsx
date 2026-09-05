'use client';

import React, { useRef, useEffect, useState } from 'react';
import Canvas from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import SettingsModal from '@/components/SettingsModal';
import QuotaErrorModal from '@/components/QuotaErrorModal';
import CommentOverlay from '@/components/CommentOverlay';
import Minimap from '@/components/Minimap';
import ExportModal from '@/components/ExportModal';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import LayerSidebar from '@/components/LayerSidebar';
import DraftRecoveryPrompt from '@/components/DraftRecoveryPrompt';
import StampPicker from '@/components/StampPicker';
import { useStore } from '@/lib/store';
import { ChevronLeft, Trash, Download, Smile, UserPlus, Sparkles, Wand2, Loader2, Settings, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { handleAiAction, playSound } from '@/lib/ai-handler';
import AiDrawingCursor from '@/components/AiDrawingCursor';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Typing effect component
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const theme = useStore((state) => state.theme);
  
  useEffect(() => {
    // When text changes, we always restart the animation
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [text]); // Re-run on text change

  return (
    <div className="flex items-center gap-1.5 px-2">
      <span className={cn("inline-block min-w-[20px] font-extrabold", theme === 'dark' ? "text-white" : "text-black")}>{displayedText}</span>
      <span className={cn("animate-pulse opacity-80 font-extrabold", theme === 'dark' ? "text-indigo-400" : "text-indigo-600")}>|</span>
    </div>
  );
};

export default function Home() {
  const { theme, offset, scale, topMessage, aiThoughts, isGenerating, initSocket, settings, toggleSettings, isAiOpen, setIsAiOpen, isExportOpen, setIsExportOpen } = useStore();
  const [isCopied, setIsCopied] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    // Generate or get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.get('room');
    if (!roomId) {
      roomId = Math.random().toString(36).substring(2, 9);
      const newUrl = `${window.location.pathname}?room=${roomId}`;
      window.history.replaceState({}, '', newUrl);
    }
    initSocket(roomId);
  }, [initSocket]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInvite = () => {
    setIsInviteOpen(true);
    useStore.getState().setTopMessage("Collaborative invitation window configured live! 🤝");
    playSound(520, 'sine', 0.15);
  };

  const confirmClear = () => {
    setIsClearing(true);
    useStore.getState().clearCanvas();
    useStore.getState().setTopMessage("Drawing canvas completely cleared. Fresh start!");
    playSound(180, 'sawtooth', 0.25);
    setTimeout(() => setIsClearing(false), 1500);
  };

  const handleClear = () => {
    if (settings.skipClearConfirmation) {
      confirmClear();
    } else {
      useStore.getState().setTopMessage("Are you sure you want to clear the entire canvas?");
      playSound(360, 'sine', 0.15);
      setShowClearConfirm(true);
    }
  };

  return (
    <main ref={containerRef} className={cn("relative w-full h-screen overflow-hidden select-none transition-colors duration-300", theme === 'dark' ? "bg-[#0f1115] text-white" : "bg-white text-black")}>
      {/* Subtle Grid Pattern for drawing feel */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-5" 
        style={{ backgroundImage: theme === 'dark' ? 'radial-gradient(#ffffff 1px, transparent 1px)' : 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      {/* Floating Status Message */}
      <div 
        onPointerDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()} 
        className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[90%] sm:w-auto text-center flex justify-center"
      >
        <div className={cn("px-5 sm:px-6 py-2.5 rounded-full backdrop-blur-2xl shadow-xl flex items-center gap-2 transition-all duration-300 border", theme === 'dark' ? "bg-gray-900/95 border-gray-800 text-white" : "bg-white/95 border-gray-200 text-black")}>
          <Sparkles size={14} className="text-indigo-400 shrink-0 animate-pulse" />
          <span className={cn("text-[10px] sm:text-xs font-extrabold tracking-wide", theme === 'dark' ? "text-gray-100" : "text-black")}><TypewriterText text={topMessage} /></span>
        </div>
      </div>

      {/* Top Right Actions */}
      <div 
        onPointerDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()} 
        className="absolute top-4 sm:top-8 right-4 sm:right-8 z-[60] flex items-center gap-1 sm:gap-2 pointer-events-auto"
      >
        <button
          onClick={() => { handleInvite(); playSound(600, 'triangle', 0.1); }}
          suppressHydrationWarning
          className={cn(
            "h-8 sm:h-10 px-2 sm:px-4 flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold backdrop-blur-md shadow-sm border transition-all active:scale-95",
            theme === 'dark' ? 'bg-gray-900/60 border-gray-700/50 text-gray-300 hover:text-white' : 'bg-white/60 border-gray-200 text-gray-700 hover:text-black',
            isCopied && "bg-green-500/10 border-green-500/20 text-green-500"
          )}
          title="Invite collaborators"
        >
          <UserPlus size={14} className={isCopied ? "animate-bounce" : ""} />
          <span className="hidden sm:inline">{isCopied ? 'Copied Link' : 'Invite'}</span>
        </button>
        <button
          onClick={handleClear}
          suppressHydrationWarning
          className={cn(
            "flex items-center gap-1.5 h-8 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl backdrop-blur-md shadow-sm border transition-all active:scale-95",
            theme === 'dark' ? 'bg-gray-900/60 border-gray-700/50 text-gray-300 hover:text-red-400' : 'bg-white/60 border-gray-200 text-gray-500 hover:text-red-500',
            isClearing && (theme === 'dark' ? "bg-red-500/20 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-600")
          )}
          title="Clear Canvas [C]"
        >
          <Trash size={14} className="sm:w-4 sm:h-4" />
          {isClearing && <span className="hidden sm:inline text-[10px] font-bold">CLEARED</span>}
        </button>
        <button
          onClick={() => {
            setIsExportOpen(true);
            playSound(640, 'sine', 0.1);
          }}
          suppressHydrationWarning
          className={cn(
            "flex items-center gap-1.5 h-8 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl backdrop-blur-md shadow-sm border transition-all active:scale-95",
            theme === 'dark' ? 'bg-gray-900/60 border-gray-700/50 text-gray-300 hover:text-indigo-400' : 'bg-white/60 border-gray-200 text-gray-500 hover:text-indigo-600',
            isExportOpen && (theme === 'dark' ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-600")
          )}
          title="Export Canvas (PNG, JPEG, SVG) [S]"
        >
          <Download size={14} className="sm:w-4 sm:h-4 text-indigo-500" />
          <span className="hidden sm:inline text-[10px] font-bold">EXPORT</span>
        </button>
      </div>

      {/* Canvas Area Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none z-30 bg-transparent" />
      <Canvas />
      <CommentOverlay />

      {/* AI Precision Drawing Cursor */}
      <AiDrawingCursor />

      {/* AI Assistant Sidebar */}
      <div 
        onPointerDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()}
        className={cn(
          "absolute bottom-32 right-8 z-40 flex flex-col items-end pointer-events-auto",
        )}
      >
        {isAiOpen && (
          <div className={cn(
            "backdrop-blur-xl p-6 rounded-3xl shadow-2xl w-80 md:w-96 max-h-[60vh] flex flex-col pointer-events-auto transition-all duration-300 border mb-4",
            theme === 'dark' ? 'bg-gray-900/95 border-gray-700/50 text-white' : 'bg-white/95 border border-gray-200 text-gray-900'
          )}>
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className={cn("font-bold text-base", theme === 'dark' ? 'text-gray-100' : 'text-gray-950')}>AI Assistant</h3>
              <button onClick={() => setIsAiOpen(false)} suppressHydrationWarning className="text-gray-400 hover:text-gray-650 p-1 rounded-lg hover:bg-gray-100/10 transition-colors">
                <ChevronLeft size={16} className="rotate-180" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 select-text custom-scrollbar max-h-[40vh] mb-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 size={32} className="animate-spin text-indigo-500" />
                  <p className={cn("text-sm font-medium animate-pulse", theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>AI is studying your sketch...</p>
                </div>
              ) : aiThoughts ? (
                <div className="mb-4">
                  <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-2 px-2 py-1 rounded bg-indigo-500/10 text-indigo-500 inline-block")}>
                    AI thoughts:
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed italic border select-text whitespace-pre-line",
                    theme === 'dark' ? 'bg-gray-800/60 border-gray-700/50 text-gray-200 font-medium' : 'bg-gray-50 border-gray-200 text-gray-800 font-medium'
                  )}>
                    &quot;{aiThoughts}&quot;
                  </div>
                </div>
              ) : (
                <p className={cn("text-sm leading-relaxed mb-4", theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                  Draw a shape and click <span className={cn("font-bold", theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600')}>Draw / Improve</span> to complete it. AI will recognize your sketches and finish them.
                </p>
              )}

              {!isGenerating && (
                <p className={cn("text-xs mb-2 px-1", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                  {aiThoughts ? "AI completed the drawing based on what it recognized with smart precision." : "Try drawing a simple flower shape, a box, a cat face, or an outline sketch!"}
                </p>
              )}
            </div>

            <div className={cn("pt-4 border-t flex justify-between items-center shrink-0", theme === 'dark' ? 'border-gray-700/50' : 'border-gray-100')}>
              <span className={cn("text-[10px]", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>Powered by {settings.apiProvider === 'claude' ? 'Claude' : 'Gemini'}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); useStore.getState().toggleSettings(); playSound(700, 'sine', 0.1); }} 
                suppressHydrationWarning
                className={cn("text-[10px] font-bold transition-colors", theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800')}
              >
                API Settings
              </button>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setIsAiOpen(!isAiOpen)}
          suppressHydrationWarning
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 pointer-events-auto",
            isAiOpen ? 'bg-indigo-500 text-white' : (theme === 'dark' ? 'bg-gray-800 border border-gray-700 text-indigo-400' : 'bg-white border border-gray-200 text-indigo-600')
          )}
          title="Toggle AI Assistant [A]"
        >
          <Sparkles size={20} className={cn(isAiOpen ? '' : 'animate-pulse')} />
        </button>
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* Dedicated Layer Management Sidebar */}
      <LayerSidebar />

      {/* Periodic Canvas Draft Recovery Prompt */}
      <DraftRecoveryPrompt />

      {/* Minimap Overlay (rendered dynamically when toggled on) */}
      <Minimap />

      {/* Settings Modal */}
      <SettingsModal />

      {/* Quota Error Modal */}
      <QuotaErrorModal />

      {/* Invite Collaborators Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in select-none">
          <div className="bg-white border border-slate-200 rounded-[2.25rem] p-8 max-w-md w-full mx-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] relative animate-scale-up">
            {/* Close button */}
            <button 
              onClick={() => {
                setIsInviteOpen(false);
                playSound(300, 'sine', 0.08);
              }}
              className="absolute top-6 right-6 p-2 rounded-full transition-all hover:bg-slate-50 border border-slate-100 hover:scale-110 text-slate-400 hover:text-slate-600"
              title="Close panel"
            >
              <X size={14} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
                <UserPlus size={24} className="animate-pulse" />
              </div>

              <h3 className="text-xl font-extrabold tracking-tight text-slate-800">
                Collaborate Live
              </h3>
              <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                Invite friends or team members to draw together in real time. Whiteboard updates sync perfectly across screens!
              </p>

              {/* URL Display Area */}
              <div className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col gap-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
                  Collaboration URL
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={typeof window !== 'undefined' ? window.location.href : ''} 
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select();
                      playSound(550, 'sine', 0.05);
                    }}
                    className="flex-1 bg-white border border-slate-200 text-xs font-mono rounded-xl px-3 py-2 text-slate-700 select-all outline-none focus:border-indigo-400"
                  />
                  <button 
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? window.location.href : '';
                      try {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(url).then(() => {
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                            playSound(600, 'sine', 0.1);
                          });
                        } else {
                          // Fallback
                          const ta = document.createElement('textarea');
                          ta.value = url;
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                          playSound(600, 'sine', 0.1);
                        }
                      } catch (e) {
                        console.error("Clipboard copy error:", e);
                      }
                    }}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 whitespace-nowrap",
                      isCopied 
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
                    )}
                  >
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-4 text-[10px] text-slate-400">
                <span>⚡ Real-time synchronization active for this room.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Canvas Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
          <div className={cn(
            "p-6 rounded-3xl shadow-2xl border max-w-sm w-full mx-4 transition-all duration-300 transform scale-100",
            theme === 'dark' ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-800"
          )}>
            <h3 className="text-lg font-bold mb-2">Clear entire canvas?</h3>
            <p className={cn("text-xs mb-6", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
              This will permanently delete all strokes on all layers. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  playSound(300, 'sine', 0.1);
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold hover:bg-opacity-80 transition-all",
                  theme === 'dark' ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  confirmClear();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-95"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Export Modal */}
      <ExportModal />

      {/* Stamp Tool Shape & Wireframe Library Picker */}
      <StampPicker />

      {/* Keyboard Shortcuts Listener */}
      <KeyboardShortcuts onTriggerClear={handleClear} />
    </main>
  );
}
