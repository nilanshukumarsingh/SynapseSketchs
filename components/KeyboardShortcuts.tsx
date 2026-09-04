'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { playSound } from '@/lib/ai-handler';

interface KeyboardShortcutsProps {
  onTriggerClear?: () => void;
}

export default function KeyboardShortcuts({ onTriggerClear }: KeyboardShortcutsProps) {
  const { 
    setTool, 
    setIsAiOpen, 
    setIsLayersOpen, 
    setIsExportOpen, 
    setShowMinimap, 
    showMinimap, 
    isSettingsOpen, 
    toggleSettings, 
    setTopMessage 
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

      // Handle Ctrl/Cmd+S for saving/export
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsExportOpen(true);
        setTopMessage("Export artwork menu opened [Ctrl+S] 💾");
        playSound(640, 'sine', 0.1);
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

        // Escape to dismiss any open modals or panels
        case 'escape': {
          setIsExportOpen(false);
          setIsLayersOpen(false);
          setIsAiOpen(false);
          if (isSettingsOpen) toggleSettings();
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
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

  return null;
}
