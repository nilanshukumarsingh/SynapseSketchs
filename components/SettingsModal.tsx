'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { X, SlidersHorizontal, Cpu, Key, Eye, EyeOff, Coins, Sparkles, AlertCircle, Check, Trash } from 'lucide-react';
import { playSound } from '@/lib/ai-handler';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SettingsModal() {
  const { theme, isSettingsOpen, toggleSettings, settings, updateSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'tuning' | 'models'>('tuning');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);

  // Keep local state in sync when modal opens
  useEffect(() => {
    if (isSettingsOpen) {
      setLocalSettings(settings);
      if (useStore.getState().quotaError) {
        setActiveTab('models');
      }
    }
  }, [isSettingsOpen, settings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        toggleSettings();
        useStore.getState().setTopMessage("Configuration settings closed.");
        playSound(350, 'sine', 0.08);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, toggleSettings]);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    toggleSettings();
    useStore.getState().setTopMessage("Configuration settings saved successfully! Model parameters modified.");
    playSound(880, 'sine', 0.15);
  };

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

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div 
        className={cn(
          "rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] relative border transition-colors duration-300",
          theme === 'dark' 
            ? 'bg-[#15171c] text-slate-100 border-slate-800' 
            : 'bg-white text-slate-900 border-slate-100'
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex justify-between items-center p-6 border-b shrink-0",
          theme === 'dark' ? 'border-slate-800/60' : 'border-slate-100'
        )}>
          <div>
            <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure cognitive intelligence limits & API provider rules</p>
          </div>
          <button 
            onClick={() => {
              toggleSettings();
              useStore.getState().setTopMessage("Configuration settings closed.");
              playSound(350, 'sine', 0.08);
            }} 
            className={cn(
              "p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 border",
              theme === 'dark' 
                ? 'bg-slate-800/80 border-slate-700/50 hover:bg-slate-700 text-slate-300' 
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-500'
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-5 shrink-0">
          <div className={cn(
            "flex p-1 rounded-2xl border",
            theme === 'dark' ? 'bg-slate-950/40 border-slate-800/85' : 'bg-slate-100/60 border-slate-200/50'
          )}>
            <button
              onClick={() => {
                setActiveTab('tuning');
                playSound(600, 'sine', 0.05);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all",
                activeTab === 'tuning'
                  ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-950 shadow-sm')
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              )}
            >
              <SlidersHorizontal size={14} />
              Tuning & Habits
            </button>
            <button
              onClick={() => {
                setActiveTab('models');
                playSound(650, 'sine', 0.05);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all",
                activeTab === 'models'
                  ? (theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-950 shadow-sm')
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              )}
            >
              <Cpu size={14} />
              Model & Keys
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-6 p-6 overflow-y-auto max-h-[50vh] scrollbar-thin">
          {activeTab === 'tuning' ? (
            <div className="space-y-6">
              {/* Auto-draw Option */}
              <div className={cn(
                "p-4 rounded-3xl border flex justify-between items-center transition-all",
                theme === 'dark' ? 'bg-slate-950/20 border-slate-800/50' : 'bg-slate-50 border-slate-100'
              )}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-sm font-bold">Auto-Draw Canvas</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">AI replaces user sketches in-place with clear vector primitives instantly</p>
                </div>
                <div className={cn(
                  "flex rounded-full p-1 border shrink-0",
                  theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                )}>
                  <button
                    onClick={() => {
                      setLocalSettings({ ...localSettings, autoDraw: false });
                      useStore.getState().setTopMessage("AI active auto-draw parameter disabled.");
                      playSound(320, 'sine', 0.08);
                    }}
                    className={cn(
                      "px-4 py-1 text-xs font-bold rounded-full transition-all",
                      !localSettings.autoDraw 
                        ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-150 text-slate-950 shadow-xs') 
                        : 'text-slate-400 hover:text-slate-500'
                    )}
                  >
                    Off
                  </button>
                  <button
                    onClick={() => {
                      setLocalSettings({ ...localSettings, autoDraw: true });
                      useStore.getState().setTopMessage("AI active auto-draw parameter enabled! 🔮");
                      playSound(720, 'sine', 0.08);
                    }}
                    className={cn(
                      "px-4 py-1 text-xs font-bold rounded-full transition-all",
                      localSettings.autoDraw 
                        ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-950 text-white shadow-xs') 
                        : 'text-slate-400 hover:text-slate-500'
                    )}
                  >
                    On
                  </button>
                </div>
              </div>

              {/* Skip Clear Confirmation Option */}
              <div className={cn(
                "p-4 rounded-3xl border flex justify-between items-center transition-all",
                theme === 'dark' ? 'bg-slate-950/20 border-slate-800/50' : 'bg-slate-50 border-slate-100'
              )}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Trash size={14} className="text-red-500" />
                    <span className="text-sm font-bold">Skip Clear Confirmation</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Clears the entire drawing space immediately without asking, speeding up fast experimental drawing flows.</p>
                </div>
                <div className={cn(
                  "flex rounded-full p-1 border shrink-0",
                  theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                )}>
                  <button
                    onClick={() => {
                      setLocalSettings({ ...localSettings, skipClearConfirmation: false });
                      useStore.getState().setTopMessage("Confirmation safety query enabled.");
                      playSound(320, 'sine', 0.08);
                    }}
                    className={cn(
                      "px-4 py-1 text-xs font-bold rounded-full transition-all",
                      !localSettings.skipClearConfirmation 
                        ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-150 text-slate-950 shadow-xs') 
                        : 'text-slate-400 hover:text-slate-500'
                    )}
                  >
                    Off
                  </button>
                  <button
                    onClick={() => {
                      setLocalSettings({ ...localSettings, skipClearConfirmation: true });
                      useStore.getState().setTopMessage("Confirmation bypassed! ⚡ Tap to wipe instantly.");
                      playSound(720, 'sine', 0.08);
                    }}
                    className={cn(
                      "px-4 py-1 text-xs font-bold rounded-full transition-all",
                      localSettings.skipClearConfirmation 
                        ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-950 text-white shadow-xs') 
                        : 'text-slate-400 hover:text-slate-500'
                    )}
                  >
                    On
                  </button>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className={cn(
                "p-4 rounded-3xl border transition-all",
                theme === 'dark' ? 'bg-slate-950/20 border-slate-800/50' : 'bg-slate-50 border-slate-100'
              )}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">Imagination Temperature</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-slate-900 border border-indigo-100/30 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {localSettings.temperature.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">Controls variability. Lower is analytical, higher has expressive flourish.</p>
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={localSettings.temperature}
                    onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-indigo-600 transition-all"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-semibold">
                  <span>Focused (0.0)</span>
                  <span>Balanced (1.0)</span>
                  <span>Artistic (2.0)</span>
                </div>
              </div>

              {/* Max tokens */}
              <div className={cn(
                "p-4 rounded-3xl border transition-all",
                theme === 'dark' ? 'bg-slate-950/20 border-slate-800/50' : 'bg-slate-50 border-slate-100'
              )}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">Max Tokens per Request</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-slate-900 border border-indigo-100/30 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {localSettings.maxTokens}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">Limits total strokes generated. High value supports complex full paintings.</p>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={localSettings.maxTokens}
                  onChange={(e) => setLocalSettings({ ...localSettings, maxTokens: parseInt(e.target.value) })}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-indigo-600 transition-all"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-semibold">
                  <span>Fast Sketches (256)</span>
                  <span>Rich Vector Scenes (8192)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* AI Provider selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Analytical Engine Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSettings({ ...localSettings, apiProvider: 'gemini' });
                      playSound(500, 'sine', 0.05);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left flex flex-col transition-all cursor-pointer",
                      localSettings.apiProvider === 'gemini'
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : (theme === 'dark' ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300')
                    )}
                  >
                    <span className="text-xs font-bold">Google Gemini</span>
                    <span className="text-[10px] text-slate-400 mt-1">Sturdy, fast native engine</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSettings({ ...localSettings, apiProvider: 'claude' });
                      playSound(550, 'sine', 0.05);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left flex flex-col transition-all cursor-pointer",
                      localSettings.apiProvider === 'claude'
                        ? 'border-orange-500 bg-orange-500/5 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20'
                        : (theme === 'dark' ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300')
                    )}
                  >
                    <span className="text-xs font-bold">Anthropic Claude</span>
                    <span className="text-[10px] text-slate-400 mt-1">Precise structured layouts</span>
                  </button>
                </div>
              </div>

              {/* Dynamic HIGHLY POLISHED Model Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {localSettings.apiProvider === 'gemini' ? 'Select Gemini Version' : 'Select Claude Version'}
                </label>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 select-none scrollbar-thin">
                  {localSettings.apiProvider === 'gemini' ? (
                    geminiModels.map(m => {
                      const isSelected = (localSettings.geminiModel || 'gemini-3.5-flash') === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setLocalSettings({ ...localSettings, geminiModel: m.id });
                            playSound(620, 'sine', 0.05);
                          }}
                          className={cn(
                            "w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/[0.04] text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/10'
                              : (theme === 'dark' ? 'border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900/80' : 'border-slate-100 bg-slate-50/50 text-slate-800 hover:bg-slate-50')
                          )}
                        >
                          {/* Selected circle check */}
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0 transition-all",
                            isSelected
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : (theme === 'dark' ? 'border-slate-700 bg-slate-950/20' : 'border-slate-300 bg-white')
                          )}>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          
                          {/* Inner labels */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs font-extrabold tracking-tight">{m.name}</span>
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded-md font-extrabold shadow-2xs self-center",
                                isSelected 
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                                  : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                              )}>
                                {m.version}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1 leading-normal font-medium">{m.desc}</span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    claudeModels.map(m => {
                      const isSelected = (localSettings.claudeModel || 'claude-3-5-sonnet-latest') === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setLocalSettings({ ...localSettings, claudeModel: m.id });
                            playSound(640, 'sine', 0.05);
                          }}
                          className={cn(
                            "w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                            isSelected
                              ? 'border-orange-500 bg-orange-500/[0.04] text-orange-950 dark:text-orange-100 ring-2 ring-orange-500/10'
                              : (theme === 'dark' ? 'border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900/80' : 'border-slate-100 bg-slate-50/50 text-slate-800 hover:bg-slate-50')
                          )}
                        >
                          {/* Selected circle check */}
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center border mt-0.5 shrink-0 transition-all",
                            isSelected
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : (theme === 'dark' ? 'border-slate-700 bg-slate-950/20' : 'border-slate-300 bg-white')
                          )}>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          
                          {/* Inner labels */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs font-extrabold tracking-tight">{m.name}</span>
                              <span className={cn(
                                "text-[9px] font-mono px-1.5 py-0.5 rounded-md font-extrabold shadow-2xs self-center",
                                isSelected 
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' 
                                  : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                              )}>
                                {m.version}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1 leading-normal font-medium">{m.desc}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dynamic API Key inputs */}
              <div className="space-y-4 pt-1">
                {localSettings.apiProvider === 'gemini' ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Gemini Authentication Token
                      </label>
                      <Key size={12} className="text-indigo-400" />
                    </div>
                    <div className="relative">
                      <input 
                        type={showGeminiKey ? "text" : "password"}
                        placeholder="Enter your Gemini API key..."
                        value={localSettings.geminiApiKey || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                        className={cn(
                          "w-full pl-4 pr-11 py-3 rounded-2xl text-xs border focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono",
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                        )}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400/90 mt-1.5 px-1 flex items-center gap-1.5 font-medium">
                      <AlertCircle size={10} className="text-slate-400" />
                      Optional: defaults to shared client key unless rate limits hit.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Claude Authentication Token
                      </label>
                      <Key size={12} className="text-orange-400" />
                    </div>
                    <div className="relative">
                      <input 
                        type={showClaudeKey ? "text" : "password"}
                        placeholder="Enter your Anthropic API key..."
                        value={localSettings.claudeApiKey || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, claudeApiKey: e.target.value })}
                        className={cn(
                          "w-full pl-4 pr-11 py-3 rounded-2xl text-xs border focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono",
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                        )}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowClaudeKey(!showClaudeKey)}
                        className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-100 transition-colors"
                      >
                        {showClaudeKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400/90 mt-1.5 px-1 flex items-center gap-1.5 font-medium">
                      <AlertCircle size={10} className="text-orange-400" />
                      Required: Claude demands a valid private credentials key to query.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Usage footer and Save */}
        <div className={cn(
          "p-6 border-t shrink-0 space-y-4",
          theme === 'dark' ? 'border-slate-800/60 bg-slate-950/25' : 'border-slate-100 bg-slate-50/40'
        )}>
          {/* Usage Stats Widget */}
          <div className="flex justify-between items-center bg-slate-500/5 px-4 py-2.5 rounded-2xl border border-slate-500/10">
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-emerald-500" />
              <span className="text-xs font-bold">Session Consumption</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                {useStore.getState().sessionTokens.toLocaleString()} Toks
              </span>
              <span className="text-[10px] font-semibold text-slate-400 block">
                Est. cost: ${(useStore.getState().sessionTokens * 0.0000005).toFixed(6)}
              </span>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white font-bold py-3.5 px-5 rounded-2xl transition-all hover:shadow-[0_4px_12px_rgba(99,102,241,0.2)] active:scale-95 text-xs tracking-wide uppercase shadow-sm cursor-pointer"
          >
            Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
