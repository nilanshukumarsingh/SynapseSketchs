'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Pencil, Eraser, Type, Settings, Send, Dices, Loader2, Wand2, Moon, Sun, Layers, Plus, PaintBucket, Sparkles, Undo2, Redo2, Lock, Unlock, Image as ImageIcon, ZoomIn, ZoomOut, Maximize, Palette, PenTool, Trash, Download, Hand, GripVertical, Check, Brain, RotateCcw, Map, Eye, EyeOff, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { handleAiAction, handleGenerateBg, prepareAiTargetPreview, playSound } from '@/lib/ai-handler';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_COLORS = ['#ffb3ba', '#baffc9', '#bae1ff', '#000000'];
const SIZES = ['thin', 'medium', 'thick'] as const;

export default function Toolbar() {
  const { currentTool, currentColor, currentSize, setTool, setColor, setSize, toggleSettings, theme, setTheme, layers, activeLayerId, setActiveLayer, toggleLayerVisibility, toggleLayerLock, deleteLayer, undo, redo, history, historyStep, asciiChar, setAsciiChar, setBackgroundImage, scale, setScale, setOffset, clearCanvas, isGenerating, setIsGenerating, isGeneratingBg, setIsGeneratingBg, settings, updateSettings, strokes, latestHumanStrokeStartIndex, eraseLatestHumanStrokes, showMinimap, setShowMinimap, isLayersOpen, setIsLayersOpen } = useStore();
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [bgPrompt, setBgPrompt] = useState('');
  const [showBgPrompt, setShowBgPrompt] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    
    const updatedLayers = [...layers];
    const [removed] = updatedLayers.splice(draggedIdx, 1);
    updatedLayers.splice(targetIndex, 0, removed);
    
    useStore.getState().reorderLayers(updatedLayers);
    setDraggedIdx(null);
    playSound(700, 'triangle', 0.05);
  };

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
    prepareAiTargetPreview(promptText);
  }, []);

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
      {/* Layers Panel */}
      {isLayersOpen && (
        <div 
          onPointerDown={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "fixed bottom-24 left-1/2 -translate-x-1/2 p-5 rounded-3xl shadow-2xl border z-40 transition-all min-w-[320px] max-w-[92vw]",
            theme === 'dark' ? "bg-gray-900/95 border-gray-700/50 text-white backdrop-blur-2xl" : "bg-white/95 border-white/60 text-gray-800 backdrop-blur-2xl"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide flex items-center gap-1.5">
                  <span>Layers Manager</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-indigo-500/20 text-indigo-400">
                    {layers.filter(l => l.visible).length}/{layers.length}
                  </span>
                </h3>
                <p className={cn("text-[11px]", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                  Show, hide, lock & reorder layers [L]
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const newLayerId = `layer-${Date.now()}`;
                  useStore.getState().addLayer({ id: newLayerId, name: `Layer ${layers.length + 1}`, visible: true, locked: false });
                  useStore.getState().setActiveLayer(newLayerId);
                  useStore.getState().setTopMessage(`Created new Layer ${layers.length + 1}!`);
                  playSound(900, 'sine', 0.05);
                }}
                suppressHydrationWarning
                className={cn(
                  "p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold", 
                  theme === 'dark' ? "bg-gray-800 hover:bg-gray-700 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
                title="Add new layer"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add</span>
              </button>
              <button
                onClick={() => setIsLayersOpen(false)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-400 hover:text-black hover:bg-gray-100"
                )}
                title="Close panel [Esc]"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
            {layers.map((layer, index) => {
              const strokeCount = strokes.filter(s => (s.layerId || 'layer-fg') === layer.id).length;
              return (
                <div 
                  key={layer.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => setDraggedIdx(null)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-2xl cursor-grab active:cursor-grabbing transition-all border",
                    draggedIdx === index ? "opacity-40 scale-95 border-dashed border-indigo-500" : "",
                    activeLayerId === layer.id 
                      ? (theme === 'dark' ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200" : "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm") 
                      : (theme === 'dark' ? "bg-gray-800/50 border-transparent hover:bg-gray-800 hover:border-gray-700 text-gray-300" : "bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200 text-gray-700")
                  )}
                  onClick={() => {
                    setActiveLayer(layer.id);
                    playSound(600 + index * 50, 'sine', 0.05);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className={cn("text-gray-400 hover:text-gray-600 transition-colors cursor-grab p-0.5", theme === 'dark' ? "hover:text-gray-200" : "hover:text-gray-700")}>
                      <GripVertical size={14} />
                    </div>
                    <div className={cn("w-2 h-2 rounded-full shrink-0", activeLayerId === layer.id ? "bg-indigo-500 ring-2 ring-indigo-500/30" : "bg-transparent")} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">{layer.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Independent Visibility Toggle */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        toggleLayerVisibility(layer.id);
                        useStore.getState().setTopMessage(`${layer.name} is now ${layer.visible ? 'hidden' : 'visible'} on canvas.`);
                        playSound(layer.visible ? 300 : 520, 'triangle', 0.05);
                      }}
                      suppressHydrationWarning
                      className={cn(
                        "px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold transition-all",
                        layer.visible 
                          ? (theme === 'dark' ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200") 
                          : (theme === 'dark' ? "bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300" : "bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700")
                      )}
                      title={layer.visible ? "Hide layer strokes from canvas" : "Show layer strokes on canvas"}
                    >
                      {layer.visible ? <Eye size={13} className="text-emerald-500" /> : <EyeOff size={13} className="text-gray-400" />}
                      <span>{layer.visible ? 'VISIBLE' : 'HIDDEN'}</span>
                    </button>

                    {/* Lock Toggle */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        toggleLayerLock(layer.id);
                        playSound(layer.locked ? 500 : 300, 'triangle', 0.05);
                      }}
                      suppressHydrationWarning
                      className={cn(
                        "p-1.5 rounded-lg transition-colors", 
                        layer.locked 
                          ? (theme === 'dark' ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-100") 
                          : (theme === 'dark' ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-200")
                      )}
                      title={layer.locked ? "Unlock layer for drawing" : "Lock layer to prevent drawing"}
                    >
                      {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>

                    {/* Delete Layer (Only if more than 1 layer) */}
                    {layers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                          useStore.getState().setTopMessage(`Deleted ${layer.name}.`);
                          playSound(280, 'sawtooth', 0.1);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          theme === 'dark' ? "text-gray-500 hover:text-rose-400 hover:bg-rose-500/10" : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        )}
                        title="Delete layer"
                      >
                        <Trash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Size Dropdown - Fixed to prevent overflow truncation */}
      {showSizeDropdown && (
        <div 
          onPointerDown={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "fixed bottom-24 left-1/2 -translate-x-1/2 p-4 rounded-3xl shadow-2xl border w-64 flex flex-col gap-4 z-40 backdrop-blur-2xl transition-all",
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
                  <button
                    key={sz}
                    onClick={() => {
                      setSize(sz as any);
                      playSound(800, 'sine', 0.05);
                    }}
                    className={cn(
                      "py-1.5 px-2 text-[10px] font-semibold rounded-lg border transition-all",
                      active 
                        ? (theme === 'dark' ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700")
                        : (theme === 'dark' ? "bg-gray-800 border-transparent hover:border-gray-700 text-gray-300" : "bg-gray-50 border-transparent hover:border-gray-200 text-gray-600")
                    )}
                  >
                    {presetLabel}
                  </button>
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
            "fixed bottom-24 left-1/2 -translate-x-1/2 p-5 rounded-3xl shadow-2xl border z-50 transition-all w-[342px] sm:w-[380px] md:w-[420px] max-h-[75vh] flex flex-col gap-3.5 animate-fade-in",
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
        className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1.5 p-1.5 rounded-2xl shadow-xl border border-slate-200/90 z-[60] transition-all max-w-[98vw] overflow-x-auto overflow-y-hidden no-scrollbar bg-white text-slate-800 shadow-2xl"
      >
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { 
              undo(); 
              useStore.getState().setTopMessage("Undid last trace ↩️");
              playSound(350, 'sine', 0.1); 
            }}
            disabled={historyStep === 0}
            suppressHydrationWarning
            className={cn('p-1.5 rounded-lg transition-all', historyStep === 0 ? 'opacity-30 cursor-not-allowed' : '', 'hover:bg-gray-150 text-slate-600 hover:text-slate-900')}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => { 
              redo(); 
              useStore.getState().setTopMessage("Redid history trace ↪️");
              playSound(420, 'sine', 0.1); 
            }}
            disabled={historyStep === history.length - 1}
            suppressHydrationWarning
            className={cn('p-1.5 rounded-lg transition-all', historyStep === history.length - 1 ? 'opacity-30 cursor-not-allowed' : '', 'hover:bg-gray-150 text-slate-600 hover:text-slate-900')}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
          <button
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
              'p-1.5 rounded-lg transition-all',
              !strokes.some(s => !s.createdByAI) ? 'opacity-30 cursor-not-allowed' : '',
              'hover:bg-gray-155 text-slate-600 hover:text-slate-900'
            )}
            title="Erase Latest Sketch (Clear what I drew latest to redraw)"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="w-px h-6 mx-1 bg-slate-200" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { 
              setScale(s => Math.max(0.1, s - 0.2)); 
              useStore.getState().setTopMessage(`Zoomed out. Camera scale adjusted!`);
              playSound(480, 'triangle', 0.08); 
            }}
            suppressHydrationWarning
            className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-slate-800 hover:bg-gray-100"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => { 
              setScale(1); 
              setOffset({x:0, y:0}); 
              useStore.getState().setTopMessage("Canvas fitted! Reset to standard 100% viewpoint 🎯");
              playSound(600, 'triangle', 0.1); 
            }}
            suppressHydrationWarning
            className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-slate-800 hover:bg-gray-100"
            title="Reset View"
          >
            <Maximize size={14} />
          </button>
          <button
            onClick={() => { 
              setScale(s => Math.min(5, s + 0.2)); 
              useStore.getState().setTopMessage(`Zooming in. Scale adjusted dynamically!`);
              playSound(720, 'triangle', 0.08); 
            }}
            suppressHydrationWarning
            className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-slate-800 hover:bg-gray-100"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="w-px h-6 mx-1 bg-slate-200" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { 
              setTool('hand'); 
              useStore.getState().setTopMessage("Hand tool selected ✋ Pan freely by dragging the canvas space.");
              playSound(520, 'sine', 0.06); 
            }}
            suppressHydrationWarning
            className={cn('p-1.5 sm:p-2 rounded-xl transition-all', currentTool === 'hand' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-500')}
            title="Hand Tool (Pan)"
          >
            <Hand size={16} />
          </button>
          <button
            onClick={() => { 
              setTool('pencil'); 
              useStore.getState().setTopMessage("Pencil selected ✏️ Paint and draft freeform line-strokes.");
              playSound(640, 'sine', 0.06); 
            }}
            suppressHydrationWarning
            className={cn('p-1.5 sm:p-2 rounded-xl transition-all', currentTool === 'pencil' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-500')}
            title="Pencil Tool (P)"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => { 
              setTool('ascii'); 
              useStore.getState().setTopMessage("ASCII brush tool enabled 🔠 Click-drag to stroke custom text characters.");
              playSound(500, 'square', 0.1); 
            }}
            suppressHydrationWarning
            className={cn('p-1.5 sm:p-2 rounded-xl transition-all', currentTool === 'ascii' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-500')}
            title="ASCII Text Tool (T)"
          >
            <Type size={16} />
          </button>
          <button
            onClick={() => { 
              setTool('eraser'); 
              useStore.getState().setTopMessage("Pencil eraser selected 🧼 Wipe away traces from the whiteboard canvas.");
              playSound(240, 'sawtooth', 0.12); 
            }}
            suppressHydrationWarning
            className={cn('p-1.5 sm:p-2 rounded-xl transition-all', currentTool === 'eraser' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100 text-gray-500')}
            title="Eraser (E)"
          >
            <Eraser size={16} />
          </button>
          <button
            onClick={() => { 
              setTool('ai-colorize'); 
              useStore.getState().setTopMessage("AI color fill active 🎨 Paints colors beautifully directly beneath outline strokes.");
              playSound(540, 'triangle', 0.14); 
            }}
            suppressHydrationWarning
            className={cn('p-1.5 sm:p-2 rounded-xl transition-all', currentTool === 'ai-colorize' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-500')}
            title="AI Colorize"
          >
            <PaintBucket size={16} />
          </button>
          <button
            onClick={() => { 
              setTool('ai-eraser'); 
              useStore.getState().setTopMessage("AI Magic Eraser active ✨ Draw over lines and ask the smart AI to clear them.");
              playSound(380, 'sawtooth', 0.1); 
            }}
            suppressHydrationWarning
            className={cn('p-1.5 sm:p-2 rounded-xl transition-all', currentTool === 'ai-eraser' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100 text-gray-500')}
            title="AI Magic Eraser"
          >
            <Sparkles size={16} />
          </button>
        </div>

                {/* ASCII Char Input */}
        {currentTool === 'ascii' && (
          <>
            <div className="flex items-center gap-1.5 px-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
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
                className="w-8 h-8 text-center rounded-lg font-mono text-sm border border-gray-300 bg-white text-black focus:border-indigo-400 outline-none"
                placeholder="🎲"
                title="Type a letter, or clear to use random characters"
              />
              <button
                onClick={() => {
                  setAsciiChar('');
                  useStore.getState().setTopMessage("ASCII Random Character matrix flow activated! 🎲");
                  playSound(740, 'sine', 0.08);
                }}
                suppressHydrationWarning
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  asciiChar === '' 
                    ? "bg-indigo-100 text-indigo-700 font-bold" 
                    : "text-gray-500 hover:text-indigo-650"
                )}
                title="Toggle Random Characters"
              >
                <Dices size={14} />
              </button>
            </div>
            <div className="w-px h-8 mx-1 bg-slate-200" />
          </>
        )}

        {/* Colors */}
        <div className="flex items-center gap-1.5 px-1">
          <div className="relative">
            <button
              onClick={() => {
                document.getElementById('color-picker-input')?.click();
                useStore.getState().setTopMessage("Custom spectrum picker active. Select your canvas ink style 🎨");
                playSound(710, 'sine', 0.08);
              }}
              suppressHydrationWarning
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-gradient-to-br from-red-400 via-green-400 to-blue-400 border border-black/5 animate-scale-up"
              title="Custom Color"
            >
              <Palette size={14} className="text-white drop-shadow-sm" />
            </button>
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
            <button
              key={color}
              onClick={() => {
                setColor(color);
                useStore.getState().setTopMessage(`Brush color swapped to standard ${color} 🎨`);
                playSound(850 + index * 50, 'sine', 0.06);
              }}
              suppressHydrationWarning
              className={cn(
                'w-7 h-7 rounded-full transition-all border border-black/5',
                currentColor === color ? 'scale-125 shadow-md ring-2 ring-indigo-500' : 'hover:scale-110'
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <button
            onClick={() => {
              shuffleColors();
              useStore.getState().setTopMessage("Color palette randomized! Try out these beautiful new colors 💥");
              playSound(450, 'triangle', 0.15);
            }}
            suppressHydrationWarning
            className="p-2 ml-1 transition-all rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 hover:shadow-sm"
            title="Shuffle Colors (D)"
          >
            <Dices size={16} />
          </button>
        </div>

        <div className="w-px h-8 mx-1 bg-slate-200" />

        {/* Sizes Dropdown */}
        <div className="relative">
          <button
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
              "px-3 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-gray-105",
              showSizeDropdown && "bg-gray-100 text-slate-900 shadow-sm"
            )}
            title="Brush Size"
          >
            {/* Visual indicator of current size */}
            <div 
              style={{ 
                width: typeof currentSize === 'number' ? Math.max(4, Math.min(16, currentSize)) : (currentSize === 'thin' ? 6 : currentSize === 'medium' ? 10 : 14),
                height: typeof currentSize === 'number' ? Math.max(4, Math.min(16, currentSize)) : (currentSize === 'thin' ? 6 : currentSize === 'medium' ? 10 : 14)
              }}
              className="rounded-full bg-slate-800"
            />
            <span>
              {typeof currentSize === 'number' ? `${currentSize}px` : (currentSize === 'thin' ? '2px' : currentSize === 'medium' ? '6px' : '12px')}
            </span>
          </button>
        </div>

        <div className="w-px h-8 mx-1 bg-slate-200" />

        {/* AI Actions */}
        <div className="flex items-center gap-1 group relative">
          <input 
            type="text" 
            placeholder="Tell AI what to draw/fix..." 
            suppressHydrationWarning
            className="w-48 px-3 py-2 rounded-xl text-xs outline-none border transition-all bg-gray-50 border-gray-200 text-black focus:border-indigo-400 focus:bg-white"
            onFocus={() => {
              useStore.getState().setTopMessage("Instruct prompt active. Describe your object, shape or idea, then click 'Draw' command!");
              playSound(500, 'sine', 0.05);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                useStore.getState().setTopMessage("Flickering synapses... Gemini 3.5 Flash is analyzing your dabs or lines to paint request! ✨");
                handleSend(e.currentTarget.value);
                e.currentTarget.value = '';
                playSound(850, 'triangle', 0.25);
              }
            }}
            id="ai-prompt-input"
          />
          <button 
            onClick={() => {
              const input = document.getElementById('ai-prompt-input') as HTMLInputElement;
              useStore.getState().setTopMessage("Flickering synapses... Gemini 3.5 Flash is analyzing your dabs or lines to paint request! ✨");
              handleSend(input?.value);
              if (input) input.value = '';
              playSound(850, 'triangle', 0.25);
            }}
            suppressHydrationWarning
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95",
              isGenerating 
                ? "bg-indigo-400 text-white cursor-not-allowed animate-pulse"
                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"
            )}
            title="Ask AI to draw"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Draw</span>
          </button>
        </div>

        <div className="w-px h-8 mx-1 bg-slate-200" />

        {/* Theme/Dark Mode Toggle */}
        <div className="relative">
          <button 
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              useStore.getState().setTopMessage(`Workspace theme adjusted to ${nextTheme === 'dark' ? 'Midnight Dark' : 'Clean Light'}! 🌗`);
              playSound(nextTheme === 'dark' ? 380 : 580, 'sine', 0.1);
            }}
            suppressHydrationWarning
            className="p-2.5 rounded-xl transition-all text-slate-500 hover:text-slate-800 hover:bg-gray-100"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-600" />}
          </button>
        </div>

        <button 
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
            "p-2.5 rounded-xl transition-all text-slate-500 hover:text-slate-800 hover:bg-gray-100 relative", 
            isLayersOpen && "bg-gray-100 text-slate-900 shadow-sm"
          )}
          title="Layers & Visibility [L]"
        >
          <Layers size={18} />
          {layers.some(l => !l.visible) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-900" title="Some layers are currently hidden" />
          )}
        </button>

        <div className="w-px h-8 mx-1 bg-slate-200" />

        {/* Minimap Toggle Option */}
        <button
          onClick={() => {
            const next = !showMinimap;
            setShowMinimap(next);
            useStore.getState().setTopMessage(next ? "Minimap enabled! Infinite view navigation active 🗺️" : "Minimap disabled.");
            playSound(next ? 550 : 350, 'sine', 0.08);
          }}
          suppressHydrationWarning
          className={cn(
            "p-2.5 rounded-xl transition-all text-slate-500 hover:text-slate-800 hover:bg-gray-100", 
            showMinimap && "bg-indigo-100 text-indigo-700 shadow-sm"
          )}
          title={`Toggle Mini Map (Currently: ${showMinimap ? 'ON' : 'OFF'})`}
        >
          <Map size={18} className={cn(showMinimap && "animate-pulse text-indigo-500")} />
        </button>

        <button 
          onClick={() => {
            toggleSettings();
            useStore.getState().setTopMessage("Advanced parameters and models setup configurations opened ⚙️");
            playSound(550, 'triangle', 0.1);
          }}
          suppressHydrationWarning
          className="p-2.5 rounded-xl transition-all group text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 active:scale-95 border border-indigo-100 bg-white"
          title="Settings Configuration"
        >
          <Settings size={18} className="transition-transform duration-300 group-hover:rotate-45" />
        </button>
      </div>
    </>
  );
}
