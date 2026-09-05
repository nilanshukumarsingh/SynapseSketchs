'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Pencil, Eraser, Type, Settings, Send, Dices, Loader2, Wand2, Moon, Sun, Layers, Plus, PaintBucket, Sparkles, Undo2, Redo2, Lock, Unlock, Image as ImageIcon, ZoomIn, ZoomOut, Maximize, Palette, PenTool, Trash, Download, Hand, GripVertical, Check, Brain, RotateCcw, Map, Eye, EyeOff, X, Stamp } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { handleAiAction, handleGenerateBg, playSound } from '@/lib/ai-handler';
import ToolbarButton from './ToolbarButton';
import { STAMP_MAP } from '@/lib/stamps';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_COLORS = ['#ffb3ba', '#baffc9', '#bae1ff', '#000000'];
const SIZES = ['thin', 'medium', 'thick'] as const;

export default function Toolbar() {
  const { currentTool, currentColor, currentSize, setTool, setColor, setSize, toggleSettings, theme, setTheme, layers, activeLayerId, setActiveLayer, toggleLayerVisibility, toggleLayerLock, deleteLayer, undo, redo, history, historyStep, asciiChar, setAsciiChar, setBackgroundImage, scale, setScale, setOffset, clearCanvas, isGenerating, setIsGenerating, isGeneratingBg, setIsGeneratingBg, settings, updateSettings, strokes, latestHumanStrokeStartIndex, eraseLatestHumanStrokes, showMinimap, setShowMinimap, isLayersOpen, setIsLayersOpen, selectedStampId, isStampPickerOpen, setIsStampPickerOpen, stampFilled, setStampFilled, stampScale, setStampScale, stampRotation, setStampRotation } = useStore();
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [bgPrompt, setBgPrompt] = useState('');
  const [showBgPrompt, setShowBgPrompt] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const geminiModels = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', version: 'v2.5', desc: 'Recommended — ultra-fast & intelligent visual parsing' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', version: 'v2.5', desc: 'Complex — deep multi-object reasoning & analysis' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', version: 'v2.0', desc: 'Next-gen fast multimodal generation' }
  ];

  const claudeModels = [
    { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', version: 'v3.7', desc: 'SOTA hybrid reasoning — best-in-class sketching' },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', version: 'v3.5', desc: 'Extremely high-precision spatial layout vectors' },
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', version: 'v3.0', desc: 'Classic — rich artistic style & textual depth' },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', version: 'v3.5', desc: 'Fast turnaround — perfect for drafting' }
  ];

  const handleSave = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.fillStyle = useStore.getState().theme === 'dark' ? '#0f1115' : '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
    }
    
    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'ai-canvas.png';
    a.click();
    useStore.getState().setTopMessage("Saved!");
    playSound(800, 'sine', 0.1);
  };

  const shuffleColors = () => {
    playSound(400, 'triangle', 0.15);
    const generateRandomColor = () => {
      const letters = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    };

    const newColors = colors.map((c, i) => i === colors.length - 1 ? '#000000' : generateRandomColor());
    setColors(newColors);
    if (!newColors.includes(currentColor)) {
      setColor(newColors[0]);
    }
  };

  const handleSend = React.useCallback(async (promptText?: string) => {
    useStore.getState().setAiPreviewBox(null);
    await handleAiAction(promptText?.trim() || undefined, setIsGenerating);
  }, [setIsGenerating]);

  const onGenerateBg = async () => {
    if (await handleGenerateBg(bgPrompt, setIsGeneratingBg)) {
      setShowBgPrompt(false);
      setBgPrompt('');
    }
  };

  // Listen for Space key to trigger AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault(); // Prevent scrolling
        handleSend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, handleSend]);

  return (
    <>
      {/* Size Dropdown - Fixed to prevent overflow truncation */}
      {showSizeDropdown && (
        <div 
          onPointerDown={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "fixed bottom-28 left-1/2 -translate-x-1/2 p-4 rounded-3xl shadow-2xl border w-64 flex flex-col gap-4 z-40 backdrop-blur-2xl transition-all",
            theme === 'dark' ? "bg-gray-900/95 border-gray-700/80 text-white" : "bg-white/95 border-gray-200 text-gray-800"
          )}
        >
          <div className="flex flex-col gap-1.5">
            <span className={cn("text-[10px] font-bold tracking-wider uppercase", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Presets</span>
            <div className="grid grid-cols-3 gap-1">
              {['thin', 'medium', 'thick'].map((sz) => {
                const presetLabel = sz === 'thin' ? 'Thin' : sz === 'medium' ? 'Medium' : 'Thick';
                const active = currentSize === sz;
                return (
                  <ToolbarButton
                    key={sz}
                    onClick={() => {
                      setSize(sz as any);
                      playSound(800, 'sine', 0.05);
                    }}
                    className={cn(
                      "py-1.5 px-2 text-[10px] font-semibold rounded-lg border",
                      active 
                        ? (theme === 'dark' ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700")
                        : (theme === 'dark' ? "bg-gray-800 border-transparent hover:border-gray-700 text-gray-300" : "bg-gray-50 border-transparent hover:border-gray-200 text-gray-600")
                    )}
                    rippleColor="rgba(99, 102, 241, 0.25)"
                  >
                    {presetLabel}
                  </ToolbarButton>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={cn("text-[10px] font-bold tracking-wider uppercase", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Custom Brush Width</span>
              <span className="text-xs font-mono font-bold text-indigo-500">
                {typeof currentSize === 'number' ? currentSize : (currentSize === 'thin' ? 2 : currentSize === 'medium' ? 6 : 12)}px
              </span>
            </div>
            
            <input
              type="range"
              min="1"
              max="48"
              value={typeof currentSize === 'number' ? currentSize : (currentSize === 'thin' ? 2 : currentSize === 'medium' ? 6 : 12)}
              onChange={(e) => {
                setSize(parseInt(e.target.value, 10));
              }}
              className="w-full accent-indigo-500 cursor-pointer h-1 rounded-lg bg-gray-200 dark:bg-gray-700 outline-none"
            />
          </div>
        </div>
      )}



      {/* Dynamic HIGHLY POLISHED Model Selection Dropdown Popup */}
      {showModelDropdown && (
        <div 
          onPointerDown={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "fixed bottom-28 left-1/2 -translate-x-1/2 p-5 rounded-3xl shadow-2xl border z-50 transition-all w-[342px] sm:w-[380px] md:w-[420px] max-h-[75vh] flex flex-col gap-3.5 animate-fade-in",
            theme === 'dark' ? "bg-gray-950/95 border-gray-800 text-white backdrop-blur-2xl" : "bg-white/95 border-gray-200 text-gray-800 backdrop-blur-2xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500 animate-pulse" />
              <h3 className="text-sm font-extrabold tracking-tight">Analytical Engine Style</h3>
            </div>
            <span className={cn(
              "text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full select-none",
              settings.apiProvider === 'gemini' ? "bg-indigo-500/10 text-indigo-500" : "bg-orange-500/10 text-orange-500"
            )}>
              {settings.apiProvider === 'gemini' ? 'Gemini Active' : 'Claude Active'}
            </span>
          </div>

          {/* Provider Select Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-500/5 shrink-0">
            <button
              onClick={() => {
                updateSettings({ apiProvider: 'gemini' });
                playSound(500, 'sine', 0.05);
              }}
              className={cn(
                "py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                settings.apiProvider === 'gemini'
                  ? (theme === 'dark' ? "bg-gray-800 text-white shadow-md" : "bg-white text-gray-950 shadow-xs border border-gray-100")
                  : "text-gray-400 hover:text-gray-650"
              )}
            >
              Google Gemini
            </button>
            <button
              onClick={() => {
                updateSettings({ apiProvider: 'claude' });
                playSound(550, 'sine', 0.05);
              }}
              className={cn(
                "py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                settings.apiProvider === 'claude'
                  ? (theme === 'dark' ? "bg-gray-800 text-white shadow-md" : "bg-white text-gray-950 shadow-xs border border-gray-100")
                  : "text-gray-400 hover:text-gray-650"
              )}
            >
              Anthropic Claude
            </button>
          </div>

          {/* Scrollable models listing */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar shrink-1">
            {settings.apiProvider === 'gemini' ? (
              geminiModels.map(m => {
                const isSelected = settings.geminiModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      updateSettings({ geminiModel: m.id });
                      setShowModelDropdown(false);
                      useStore.getState().setTopMessage(`Cognitive intelligence adjusted to ${m.name} ✨`);
                      playSound(600, 'sine', 0.05);
                    }}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/[0.04] text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/10'
                        : (theme === 'dark' ? 'border-gray-800 bg-gray-905/40 text-gray-200 hover:bg-gray-900/80' : 'border-gray-100 bg-gray-50/50 text-gray-800 hover:bg-gray-50/80')
                    )}
                  >
                    {/* Circle check */}
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0 transition-all",
                      isSelected
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : (theme === 'dark' ? 'border-gray-700 bg-gray-950/20' : 'border-gray-300 bg-white')
                    )}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-extrabold tracking-tight">{m.name}</span>
                        <span className={cn(
                          "text-[9px] font-mono px-1.5 py-0.5 rounded-md font-extrabold",
                          isSelected 
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                            : (theme === 'dark' ? 'bg-gray-800 text-slate-400' : 'bg-gray-100 text-slate-500')
                        )}>
                          {m.version}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-405 dark:text-gray-400 block mt-1 leading-normal font-medium">{m.desc}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              claudeModels.map(m => {
                const isSelected = settings.claudeModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      updateSettings({ claudeModel: m.id });
                      setShowModelDropdown(false);
                      useStore.getState().setTopMessage(`Cognitive intelligence adjusted to ${m.name} ✨`);
                      playSound(640, 'sine', 0.05);
                    }}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                      isSelected
                        ? 'border-orange-500 bg-orange-500/[0.04] text-orange-950 dark:text-orange-100 ring-2 ring-orange-500/10'
                        : (theme === 'dark' ? 'border-gray-800 bg-gray-905/40 text-gray-200 hover:bg-gray-900/80' : 'border-gray-100 bg-gray-50/50 text-gray-800 hover:bg-gray-100/60')
                    )}
                  >
                    {/* Circle check */}
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0 transition-all",
                      isSelected
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : (theme === 'dark' ? 'border-gray-700 bg-gray-950/20' : 'border-gray-300 bg-white')
                    )}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-extrabold tracking-tight">{m.name}</span>
                        <span className={cn(
                          "text-[9px] font-mono px-1.5 py-0.5 rounded-md font-extrabold",
                          isSelected 
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' 
                            : (theme === 'dark' ? 'bg-gray-800 text-slate-400' : 'bg-gray-100 text-slate-500')
                        )}>
                          {m.version}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-405 dark:text-gray-400 block mt-1 leading-normal font-medium">{m.desc}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <div 
        onPointerDown={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()}
        className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-1.5 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] transition-all pointer-events-auto select-none"
      >
        {/* Upper AI Prompt Bar - Always visible across all screen sizes and full-screen view */}
        <div 
          className={cn(
            "w-full max-w-full flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl shadow-xl border backdrop-blur-xl transition-all",
            theme === 'dark' 
              ? "bg-gray-950/95 border-gray-800 text-gray-100 shadow-indigo-950/30" 
              : "bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-300/40"
          )}
        >
          <div className="flex items-center gap-1.5 shrink-0 pl-0.5 sm:pl-1">
            <Sparkles size={15} className="text-indigo-500 animate-pulse" />
            <span className="text-[11px] font-bold text-indigo-500 hidden xs:inline tracking-tight">AI Assist</span>
          </div>

          <div className="flex-1 min-w-0 relative flex items-center">
            <input 
              type="text" 
              value={aiPromptText}
              onChange={(e) => setAiPromptText(e.target.value)}
              placeholder={isGenerating ? "Gemini is drawing artwork..." : "Tell AI what to draw/fix..."} 
              suppressHydrationWarning
              disabled={isGenerating}
              className={cn(
                "w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 rounded-xl text-xs outline-none border transition-all truncate placeholder:truncate",
                theme === 'dark' 
                  ? "bg-gray-900 border-gray-750 text-white placeholder-gray-500 focus:border-indigo-500 focus:bg-gray-850"
                  : "bg-gray-50 border-gray-200 text-black placeholder-gray-400 focus:border-indigo-400 focus:bg-white"
              )}
              onFocus={() => {
                useStore.getState().setTopMessage("Instruct prompt active. Describe your object, shape or idea, then click 'Draw' command!");
                playSound(500, 'sine', 0.05);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.currentTarget.blur();
                  return;
                }
                if (e.key === 'Enter') {
                  useStore.getState().setTopMessage("Analyzing and improving drawing... ✨");
                  handleSend(aiPromptText);
                  setAiPromptText('');
                  playSound(850, 'triangle', 0.25);
                }
              }}
              id="ai-prompt-input"
            />
            {aiPromptText && (
              <button
                type="button"
                onClick={() => setAiPromptText('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                title="Clear input"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <ToolbarButton 
            onClick={() => {
              useStore.getState().setTopMessage("Analyzing and improving drawing... ✨");
              handleSend(aiPromptText);
              setAiPromptText('');
              playSound(850, 'triangle', 0.25);
            }}
            suppressHydrationWarning
            disabled={isGenerating}
            hoverScale={1.05}
            tapScale={0.94}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl font-bold text-xs shadow-sm transition-all",
              isGenerating 
                ? "bg-indigo-400 text-white cursor-not-allowed animate-pulse"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
            rippleColor="rgba(255, 255, 255, 0.45)"
            title="Ask AI to draw"
          >
            {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            <span>Draw</span>
          </ToolbarButton>
        </div>

        {/* Main Tools Strip */}
        <div 
          className={cn(
            "flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl shadow-2xl border transition-all max-w-full overflow-x-auto overflow-y-hidden no-scrollbar backdrop-blur-xl",
            theme === 'dark' 
              ? "bg-gray-950/90 border-gray-800 text-gray-100 shadow-indigo-950/30" 
              : "bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-300/40"
          )}
        >
        {/* Undo / Redo / Erase Latest */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            onClick={() => { 
              undo(); 
              useStore.getState().setTopMessage("Undid last trace ↩️");
              playSound(350, 'sine', 0.1); 
            }}
            disabled={historyStep === 0}
            suppressHydrationWarning
            className={cn(
              'p-1.5 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white',
              historyStep === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-gray-800'
            )}
            rippleColor="rgba(99, 102, 241, 0.25)"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              redo(); 
              useStore.getState().setTopMessage("Redid history trace ↪️");
              playSound(420, 'sine', 0.1); 
            }}
            disabled={historyStep === history.length - 1}
            suppressHydrationWarning
            className={cn(
              'p-1.5 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white',
              historyStep === history.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-gray-800'
            )}
            rippleColor="rgba(99, 102, 241, 0.25)"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              const hasHuman = strokes.some(s => !s.createdByAI);
              if (hasHuman) {
                eraseLatestHumanStrokes();
                useStore.getState().setTopMessage("Erased your latest drawing segment! Ready to sketch again ✍️");
                playSound(320, 'sawtooth', 0.15);
              } else {
                useStore.getState().setTopMessage("No user drawings found to erase!");
                playSound(220, 'sine', 0.1);
              }
            }}
            disabled={!strokes.some(s => !s.createdByAI)}
            suppressHydrationWarning
            className={cn(
              'p-1.5 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white',
              !strokes.some(s => !s.createdByAI) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-gray-800'
            )}
            rippleColor="rgba(244, 63, 94, 0.25)"
            title="Erase Latest Sketch (Clear what I drew latest to redraw)"
          >
            <RotateCcw size={16} />
          </ToolbarButton>
        </div>

        <div className={cn("w-px h-6 mx-0.5 sm:mx-1 shrink-0", theme === 'dark' ? "bg-gray-800" : "bg-slate-200")} />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ToolbarButton
            onClick={() => { 
              setScale(s => Math.max(0.1, s - 0.2)); 
              useStore.getState().setTopMessage(`Zoomed out. Camera scale adjusted!`);
              playSound(480, 'triangle', 0.08); 
            }}
            suppressHydrationWarning
            className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800"
            rippleColor="rgba(99, 102, 241, 0.2)"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              setScale(1); 
              setOffset({x:0, y:0}); 
              useStore.getState().setTopMessage("Canvas fitted! Reset to standard 100% viewpoint 🎯");
              playSound(600, 'triangle', 0.1); 
            }}
            suppressHydrationWarning
            className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800"
            rippleColor="rgba(99, 102, 241, 0.2)"
            title="Reset View"
          >
            <Maximize size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              setScale(s => Math.min(5, s + 0.2)); 
              useStore.getState().setTopMessage(`Zooming in. Scale adjusted dynamically!`);
              playSound(720, 'triangle', 0.08); 
            }}
            suppressHydrationWarning
            className="p-1.5 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800"
            rippleColor="rgba(99, 102, 241, 0.2)"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </ToolbarButton>
        </div>

        <div className={cn("w-px h-6 mx-0.5 sm:mx-1 shrink-0", theme === 'dark' ? "bg-gray-800" : "bg-slate-200")} />

        {/* Tools */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <ToolbarButton
            onClick={() => { 
              setTool('hand'); 
              useStore.getState().setTopMessage("Hand tool selected ✋ Pan freely by dragging the canvas space.");
              playSound(520, 'sine', 0.06); 
            }}
            suppressHydrationWarning
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-all',
              currentTool === 'hand' 
                ? (theme === 'dark' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700') 
                : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            )}
            rippleColor="rgba(99, 102, 241, 0.3)"
            title="Hand Tool (Pan)"
          >
            <Hand size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              setTool('pencil'); 
              useStore.getState().setTopMessage("Pencil selected ✏️ Paint and draft freeform line-strokes.");
              playSound(640, 'sine', 0.06); 
            }}
            suppressHydrationWarning
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-all',
              currentTool === 'pencil' 
                ? (theme === 'dark' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700') 
                : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            )}
            rippleColor="rgba(99, 102, 241, 0.3)"
            title="Pencil Tool (P)"
          >
            <Pencil size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              setTool('ascii'); 
              useStore.getState().setTopMessage("ASCII brush tool enabled 🔠 Click-drag to stroke custom text characters.");
              playSound(500, 'square', 0.1); 
            }}
            suppressHydrationWarning
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-all',
              currentTool === 'ascii' 
                ? (theme === 'dark' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700') 
                : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            )}
            rippleColor="rgba(99, 102, 241, 0.3)"
            title="ASCII Text Tool (T)"
          >
            <Type size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              if (currentTool !== 'stamp') {
                setTool('stamp');
                setIsStampPickerOpen(true);
              } else {
                setIsStampPickerOpen(!isStampPickerOpen);
              }
              const stamp = STAMP_MAP.get(selectedStampId);
              useStore.getState().setTopMessage(`Stamp tool active [${stamp?.name || 'Shape'}] 📐 Click or drag canvas to place.`);
              playSound(580, 'sine', 0.08); 
            }}
            suppressHydrationWarning
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-all relative',
              currentTool === 'stamp' 
                ? (theme === 'dark' ? 'bg-indigo-900/60 text-indigo-300 ring-1 ring-indigo-500/50' : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400/50') 
                : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            )}
            rippleColor="rgba(99, 102, 241, 0.3)"
            title="Stamp Tool (S) — Pre-defined Shapes & Wireframes"
          >
            <Stamp size={16} />
            {currentTool === 'stamp' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-gray-900" />
            )}
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              setTool('eraser'); 
              useStore.getState().setTopMessage("Pencil eraser selected 🧼 Wipe away traces from the whiteboard canvas.");
              playSound(240, 'sawtooth', 0.12); 
            }}
            suppressHydrationWarning
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-all',
              currentTool === 'eraser' 
                ? (theme === 'dark' ? 'bg-rose-950/60 text-rose-300' : 'bg-red-100 text-red-700') 
                : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            )}
            rippleColor="rgba(244, 63, 94, 0.3)"
            title="Eraser (E)"
          >
            <Eraser size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              setTool('ai-colorize'); 
              useStore.getState().setTopMessage("AI color fill active 🎨 Paints colors beautifully directly beneath outline strokes.");
              playSound(540, 'triangle', 0.14); 
            }}
            suppressHydrationWarning
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-all',
              currentTool === 'ai-colorize' 
                ? (theme === 'dark' ? 'bg-blue-950/60 text-blue-300' : 'bg-blue-100 text-blue-700') 
                : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            )}
            rippleColor="rgba(59, 130, 246, 0.3)"
            title="AI Colorize"
          >
            <PaintBucket size={16} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => { 
              setTool('ai-eraser'); 
              useStore.getState().setTopMessage("AI Magic Eraser active ✨ Draw over lines and ask the smart AI to clear them.");
              playSound(380, 'sawtooth', 0.1); 
            }}
            suppressHydrationWarning
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-all',
              currentTool === 'ai-eraser' 
                ? (theme === 'dark' ? 'bg-purple-950/60 text-purple-300' : 'bg-purple-100 text-purple-700') 
                : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500')
            )}
            rippleColor="rgba(168, 85, 247, 0.3)"
            title="AI Magic Eraser"
          >
            <Sparkles size={16} />
          </ToolbarButton>
        </div>

        {/* ASCII Char Input */}
        {currentTool === 'ascii' && (
          <>
            <div className={cn("flex items-center gap-1.5 px-1 p-1 rounded-xl border", theme === 'dark' ? "bg-gray-900 border-gray-750" : "bg-gray-50 border-gray-200")}>
              <input 
                type="text" 
                maxLength={1}
                value={asciiChar}
                onChange={(e) => {
                  setAsciiChar(e.target.value);
                  if (e.target.value) {
                    useStore.getState().setTopMessage(`ASCII brush letter updated to '${e.target.value}' 🔤`);
                  } else {
                    useStore.getState().setTopMessage("ASCII Random Character matrix flow activated! 🎲");
                  }
                  playSound(680, 'sine', 0.05);
                }}
                suppressHydrationWarning
                className={cn(
                  "w-8 h-8 text-center rounded-lg font-mono text-sm border outline-none",
                  theme === 'dark' ? "border-gray-700 bg-gray-800 text-white focus:border-indigo-400" : "border-gray-300 bg-white text-black focus:border-indigo-400"
                )}
                placeholder="🎲"
                title="Type a letter, or clear to use random characters"
              />
              <ToolbarButton
                onClick={() => {
                  setAsciiChar('');
                  useStore.getState().setTopMessage("ASCII Random Character matrix flow activated! 🎲");
                  playSound(740, 'sine', 0.08);
                }}
                suppressHydrationWarning
                className={cn(
                  "p-1.5 rounded-lg",
                  asciiChar === '' 
                    ? (theme === 'dark' ? "bg-indigo-900/60 text-indigo-300 font-bold" : "bg-indigo-100 text-indigo-700 font-bold")
                    : (theme === 'dark' ? "text-gray-400 hover:text-indigo-300" : "text-gray-500 hover:text-indigo-650")
                )}
                rippleColor="rgba(99, 102, 241, 0.25)"
                title="Toggle Random Characters"
              >
                <Dices size={14} />
              </ToolbarButton>
            </div>
            <div className={cn("w-px h-8 mx-1 shrink-0", theme === 'dark' ? "bg-gray-800" : "bg-slate-200")} />
          </>
        )}

        {/* Stamp Contextual Controls */}
        {currentTool === 'stamp' && (
          <>
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-1 rounded-xl border shrink-0",
              theme === 'dark' ? "bg-gray-900/90 border-gray-750 text-white" : "bg-gray-50 border-gray-200 text-gray-800"
            )}>
              {/* Stamp selector button */}
              <ToolbarButton
                onClick={() => {
                  setIsStampPickerOpen(true);
                  playSound(580, 'sine', 0.06);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border transition-all",
                  theme === 'dark'
                    ? "bg-indigo-950/60 border-indigo-700/50 text-indigo-300 hover:bg-indigo-900/60"
                    : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                )}
                title="Change Stamp Shape (Click to open stamp library)"
              >
                <div 
                  className="w-3.5 h-3.5 flex items-center justify-center shrink-0"
                  dangerouslySetInnerHTML={{ __html: STAMP_MAP.get(selectedStampId)?.iconSvg || '' }}
                />
                <span className="text-[11px] font-bold max-w-[70px] truncate">
                  {STAMP_MAP.get(selectedStampId)?.name || 'Stamp'}
                </span>
              </ToolbarButton>

              {/* Fill Toggle */}
              <ToolbarButton
                onClick={() => {
                  setStampFilled(!stampFilled);
                  playSound(stampFilled ? 400 : 600, 'sine', 0.05);
                }}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                  stampFilled
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : (theme === 'dark' ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100")
                )}
                title={stampFilled ? "Filled Mode (Click for Outline)" : "Outline Mode (Click for Fill)"}
              >
                {stampFilled ? 'Filled' : 'Outline'}
              </ToolbarButton>

              {/* Quick scale cycles */}
              <ToolbarButton
                onClick={() => {
                  const scales = [0.7, 1.0, 1.5, 2.2];
                  const idx = scales.findIndex(s => Math.abs(s - stampScale) < 0.05);
                  const nextScale = scales[(idx + 1) % scales.length];
                  setStampScale(nextScale);
                  playSound(620, 'sine', 0.05);
                }}
                className={cn(
                  "px-1.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all",
                  theme === 'dark' ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-600"
                )}
                title="Cycle Stamp Scale (0.7x, 1x, 1.5x, 2.2x)"
              >
                {stampScale}x
              </ToolbarButton>
            </div>
            <div className={cn("w-px h-8 mx-1 shrink-0", theme === 'dark' ? "bg-gray-800" : "bg-slate-200")} />
          </>
        )}

        {/* Colors */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-0.5 sm:px-1 shrink-0">
          <div className="relative">
            <ToolbarButton
              onClick={() => {
                document.getElementById('color-picker-input')?.click();
                useStore.getState().setTopMessage("Custom spectrum picker active. Select your canvas ink style 🎨");
                playSound(710, 'sine', 0.08);
              }}
              suppressHydrationWarning
              className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 via-green-400 to-blue-400 border border-black/10 shadow-xs"
              rippleColor="rgba(255, 255, 255, 0.6)"
              hoverScale={1.15}
              title="Custom Color"
            >
              <Palette size={14} className="text-white drop-shadow-sm" />
            </ToolbarButton>
            <input 
              id="color-picker-input"
              type="color" 
              value={currentColor} 
              onChange={(e) => {
                setColor(e.target.value);
                useStore.getState().setTopMessage(`Tone color successfully adjusted to ${e.target.value}`);
                playSound(760, 'sine', 0.04);
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
          {colors.map((color, index) => (
            <ToolbarButton
              key={color}
              onClick={() => {
                setColor(color);
                useStore.getState().setTopMessage(`Brush color swapped to standard ${color} 🎨`);
                playSound(850 + index * 50, 'sine', 0.06);
              }}
              suppressHydrationWarning
              className={cn(
                'w-7 h-7 rounded-full border border-black/10 transition-transform',
                currentColor === color ? 'scale-115 shadow-md ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
              )}
              hoverScale={1.16}
              tapScale={0.88}
              rippleColor="rgba(255, 255, 255, 0.6)"
              style={{ backgroundColor: color }}
              title={color}
            >
              {currentColor === color && (
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
              )}
            </ToolbarButton>
          ))}
          <ToolbarButton
            onClick={() => {
              shuffleColors();
              useStore.getState().setTopMessage("Color palette randomized! Try out these beautiful new colors 💥");
              playSound(450, 'triangle', 0.15);
            }}
            suppressHydrationWarning
            className={cn(
              "p-2 ml-0.5 rounded-full",
              theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            )}
            rippleColor="rgba(99, 102, 241, 0.25)"
            title="Shuffle Colors (D)"
          >
            <Dices size={16} />
          </ToolbarButton>
        </div>

        <div className={cn("w-px h-8 mx-1 shrink-0", theme === 'dark' ? "bg-gray-800" : "bg-slate-200")} />

        {/* Sizes Dropdown */}
        <div className="relative shrink-0">
          <ToolbarButton
            onClick={() => { 
              const next = !showSizeDropdown;
              setShowSizeDropdown(next);
              if (next) {
                setIsLayersOpen(false);
                setShowBgPrompt(false);
                useStore.getState().setTopMessage("Brush width parameters opened. Slide to customize or pick presets.");
              } else {
                useStore.getState().setTopMessage("Brush diameter menu closed.");
              }
              playSound(next ? 520 : 320, 'sine', 0.08); 
            }}
            suppressHydrationWarning
            className={cn(
              "px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold",
              theme === 'dark' 
                ? (showSizeDropdown ? "bg-gray-800 text-white" : "text-gray-300 hover:text-white hover:bg-gray-800")
                : (showSizeDropdown ? "bg-gray-100 text-slate-900" : "text-slate-600 hover:text-slate-900 hover:bg-gray-105")
            )}
            rippleColor="rgba(99, 102, 241, 0.25)"
            title="Brush Size"
          >
            {/* Visual indicator of current size */}
            <div 
              style={{ 
                width: typeof currentSize === 'number' ? Math.max(4, Math.min(16, currentSize)) : (currentSize === 'thin' ? 6 : currentSize === 'medium' ? 10 : 14),
                height: typeof currentSize === 'number' ? Math.max(4, Math.min(16, currentSize)) : (currentSize === 'thin' ? 6 : currentSize === 'medium' ? 10 : 14)
              }}
              className={cn("rounded-full", theme === 'dark' ? "bg-slate-200" : "bg-slate-800")}
            />
            <span>
              {typeof currentSize === 'number' ? `${currentSize}px` : (currentSize === 'thin' ? '2px' : currentSize === 'medium' ? '6px' : '12px')}
            </span>
          </ToolbarButton>
        </div>

        <div className={cn("w-px h-8 mx-1 shrink-0", theme === 'dark' ? "bg-gray-800" : "bg-slate-200")} />

        {/* Theme/Dark Mode Toggle */}
        <div className="relative shrink-0">
          <ToolbarButton 
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              useStore.getState().setTopMessage(`Workspace theme adjusted to ${nextTheme === 'dark' ? 'Midnight Dark' : 'Clean Light'}! 🌗`);
              playSound(nextTheme === 'dark' ? 380 : 580, 'sine', 0.1);
            }}
            suppressHydrationWarning
            className={cn(
              "p-2.5 rounded-xl shrink-0",
              theme === 'dark' ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-slate-500 hover:text-slate-800 hover:bg-gray-100"
            )}
            rippleColor="rgba(245, 158, 11, 0.3)"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
          </ToolbarButton>
        </div>

        <ToolbarButton 
          onClick={() => { 
            const next = !isLayersOpen;
            setIsLayersOpen(next);
            if (next) {
              setShowSizeDropdown(false);
              setShowBgPrompt(false);
              useStore.getState().setTopMessage("Layers panel opened [L]. Manage independent drawing layers & visibility!");
            } else {
              useStore.getState().setTopMessage("Layers manager closed.");
            }
            playSound(next ? 540 : 340, 'sine', 0.08); 
          }}
          suppressHydrationWarning
          className={cn(
            "p-2.5 rounded-xl relative shrink-0", 
            isLayersOpen 
              ? (theme === 'dark' ? "bg-gray-800 text-white shadow-xs" : "bg-gray-100 text-slate-900 shadow-xs")
              : (theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-slate-500 hover:text-slate-800 hover:bg-gray-100")
          )}
          rippleColor="rgba(99, 102, 241, 0.3)"
          title="Layers & Visibility [L]"
        >
          <Layers size={18} />
          {layers.some(l => !l.visible) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-900" title="Some layers are currently hidden" />
          )}
        </ToolbarButton>

        <div className={cn("w-px h-8 mx-1 shrink-0", theme === 'dark' ? "bg-gray-800" : "bg-slate-200")} />

        {/* Minimap Toggle Option */}
        <ToolbarButton
          onClick={() => {
            const next = !showMinimap;
            setShowMinimap(next);
            useStore.getState().setTopMessage(next ? "Minimap enabled! Infinite view navigation active 🗺️" : "Minimap disabled.");
            playSound(next ? 550 : 350, 'sine', 0.08);
          }}
          suppressHydrationWarning
          className={cn(
            "p-2.5 rounded-xl shrink-0", 
            showMinimap 
              ? (theme === 'dark' ? "bg-indigo-950/70 text-indigo-300 shadow-xs" : "bg-indigo-100 text-indigo-700 shadow-xs")
              : (theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-slate-500 hover:text-slate-800 hover:bg-gray-100")
          )}
          rippleColor="rgba(99, 102, 241, 0.3)"
          title={`Toggle Mini Map (Currently: ${showMinimap ? 'ON' : 'OFF'})`}
        >
          <Map size={18} className={cn(showMinimap && "animate-pulse text-indigo-500")} />
        </ToolbarButton>

        <ToolbarButton 
          onClick={() => {
            toggleSettings();
            useStore.getState().setTopMessage("Advanced parameters and models setup configurations opened ⚙️");
            playSound(550, 'triangle', 0.1);
          }}
          suppressHydrationWarning
          className={cn(
            "p-2.5 rounded-xl group border shrink-0",
            theme === 'dark'
              ? "border-indigo-900/60 bg-gray-900 text-indigo-400 hover:text-indigo-200 hover:bg-indigo-950/40"
              : "border-indigo-100 bg-white text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
          )}
          rippleColor="rgba(99, 102, 241, 0.35)"
          title="Settings Configuration"
        >
          <Settings size={18} className="transition-transform duration-300 group-hover:rotate-45" />
        </ToolbarButton>
        </div>
      </div>
    </>
  );
}
