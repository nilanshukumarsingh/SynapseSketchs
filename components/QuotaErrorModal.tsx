'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { AlertTriangle, Key, X, ArrowUpRight, ShieldAlert, Cpu } from 'lucide-react';
import { playSound } from '@/lib/ai-handler';

export default function QuotaErrorModal() {
  const { quotaError, setQuotaError, toggleSettings } = useStore();

  if (!quotaError) return null;

  const handleOpenSettings = () => {
    // Open settings and close this error modal
    toggleSettings();
    setQuotaError(null);
    playSound(440, 'sine', 0.1);
  };

  const handleDismiss = () => {
    setQuotaError(null);
    playSound(300, 'sine', 0.08);
  };

  return (
    <div id="quota-error-overlay" className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        id="quota-error-modal-container"
        className="rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(220,38,38,0.15)] bg-white text-slate-900 border border-red-100 w-full max-w-md overflow-hidden flex flex-col relative animate-scale-up"
      >
        {/* Top Warning Accented Header Bar */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        {/* Dismiss Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-6 right-6 p-2 rounded-full transition-all hover:scale-110 active:scale-95 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-500"
          title="Dismiss warning"
        >
          <X size={16} />
        </button>

        {/* Content Body */}
        <div className="p-8 pt-10 flex flex-col items-center text-center">
          {/* Glowing Caution Icon */}
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-5 relative shadow-[0_8px_20px_rgba(245,158,11,0.15)] animate-bounce" style={{ animationDuration: '4s' }}>
            <AlertTriangle size={28} />
          </div>

          <h3 className="text-xl font-extrabold tracking-tight text-slate-800">
            AI Api Limit Reached
          </h3>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold flex items-center gap-1">
            <Cpu size={12} className="text-amber-500" /> {quotaError.model}
          </p>

          <div className="mt-5 text-sm leading-relaxed text-slate-600 bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left w-full space-y-3">
            <p className="font-medium text-slate-700">What happened?</p>
            <p className="text-xs leading-relaxed text-slate-500">
              The shared free-tier Google AI Studio or Anthropic client key has temporarily run out of daily request quota due to high traffic from community collaborators.
            </p>
            <p className="font-medium text-slate-700 pt-1">How can I solve this?</p>
            <ul className="text-xs space-y-2 text-slate-500 list-disc list-inside">
              <li>Wait a few moments and try your sketch action again.</li>
              <li>
                <span className="font-bold text-slate-700">Recommended:</span> Enter your own private key in settings to bypass all limits instantly!
              </li>
            </ul>
          </div>

          {/* Key Generation Helpful Link */}
          <a
            href="https://aistudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound(600, 'triangle', 0.1)}
            className="mt-4 flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50/50 hover:bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100/40"
          >
            Get a free Gemini Client Key <ArrowUpRight size={12} />
          </a>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex items-center gap-3 shrink-0">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 bg-white hover:bg-slate-50 rounded-2xl shadow-xs transition-all active:scale-95"
          >
            Wait / Try Again
          </button>
          <button
            onClick={handleOpenSettings}
            className="flex-1 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.15)] transition-all hover:shadow-[0_12px_24px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 active:scale-95"
          >
            <Key size={14} />
            Configure API Key
          </button>
        </div>
      </div>
    </div>
  );
}
