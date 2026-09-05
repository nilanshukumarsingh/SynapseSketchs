'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStore, Layer } from '@/lib/store';
import { playSound } from '@/lib/ai-handler';
import { 
  Layers, 
  Plus, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  Eraser, 
  Check, 
  X, 
  Edit2, 
  Sliders, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LayerSidebar() {
  const { 
    layers, 
    activeLayerId, 
    setActiveLayer, 
    addLayer, 
    deleteLayer, 
    reorderLayers, 
    toggleLayerVisibility, 
    toggleLayerLock, 
    renameLayer, 
    setLayerOpacity, 
    duplicateLayer, 
    clearLayer, 
    moveLayer, 
    showAllLayers, 
    hideAllLayers, 
    isLayersOpen, 
    setIsLayersOpen, 
    theme, 
    strokes, 
    setTopMessage 
  } = useStore();

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [expandedOpacityLayerId, setExpandedOpacityLayerId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLayerId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingLayerId]);

  const handleStartRename = (layer: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
    playSound(520, 'sine', 0.05);
  };

  const handleSaveRename = (layerId: string) => {
    if (editingName.trim()) {
      renameLayer(layerId, editingName.trim());
      setTopMessage(`Layer renamed to "${editingName.trim()}"`);
      playSound(700, 'sine', 0.06);
    }
    setEditingLayerId(null);
  };

  const handleAddNewLayer = () => {
    const newId = `layer-${Date.now()}`;
    const layerNumber = layers.length + 1;
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layerNumber}`,
      visible: true,
      locked: false,
      opacity: 1
    };
    addLayer(newLayer);
    setActiveLayer(newId);
    setTopMessage(`Created and selected new Layer ${layerNumber} ✨`);
    playSound(880, 'sine', 0.08);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;

    const updatedLayers = [...layers];
    const [removed] = updatedLayers.splice(draggedIdx, 1);
    updatedLayers.splice(targetIndex, 0, removed);

    reorderLayers(updatedLayers);
    setDraggedIdx(null);
    playSound(620, 'triangle', 0.05);
  };

  // Compute stroke count for a layer
  const getStrokeCount = (layerId: string) => {
    return strokes.filter(s => (s.layerId || 'layer-fg') === layerId).length;
  };

  // Reverse display so that the topmost rendering layer appears at the top of the UI stack
  // Canvas renders in array order [0, 1, ... n-1], so layer n-1 is on top.
  const displayLayers = [...layers].map((layer, originalIndex) => ({
    layer,
    originalIndex
  })).reverse();

  return (
    <>
      {/* Floating edge trigger pill when sidebar is closed */}
      {!isLayersOpen && (
        <button
          id="layer-sidebar-open-tab"
          onClick={() => {
            setIsLayersOpen(true);
            setTopMessage("Layers panel opened [L] 🗂️");
            playSound(540, 'sine', 0.08);
          }}
          title="Open Layers Sidebar [L]"
          className={cn(
            "fixed right-0 top-24 z-30 flex items-center gap-1.5 px-3 py-2 rounded-l-2xl shadow-xl backdrop-blur-md border border-r-0 transition-all duration-200 hover:-translate-x-1 active:scale-95 group",
            theme === 'dark'
              ? "bg-[#13161c]/90 border-slate-700 text-slate-300 hover:text-white"
              : "bg-white/90 border-slate-200 text-slate-700 hover:text-slate-950 shadow-slate-300/30"
          )}
        >
          <Layers size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold tracking-tight hidden sm:inline">Layers</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
            theme === 'dark' ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
          )}>
            {layers.length}
          </span>
          {layers.some(l => !l.visible) && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Some layers are hidden" />
          )}
        </button>
      )}

      {/* Layer Management Sidebar */}
      <aside 
        id="layer-management-sidebar"
        className={cn(
          "fixed top-20 right-4 z-50 w-76 sm:w-84 max-h-[calc(100vh-6.5rem)] flex flex-col transition-all duration-300 ease-out select-none",
          isLayersOpen 
            ? "translate-x-0 opacity-100 pointer-events-auto" 
            : "translate-x-8 opacity-0 pointer-events-none"
        )}
      >
        <div 
          className={cn(
            "rounded-3xl shadow-2xl border backdrop-blur-2xl flex flex-col overflow-hidden max-h-full transition-colors duration-200",
            theme === 'dark'
              ? "bg-[#13161c]/95 border-slate-800 text-slate-100 shadow-black/60"
              : "bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-300/30"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-4 py-3.5 border-b shrink-0",
            theme === 'dark' ? "border-slate-800/80 bg-slate-900/30" : "border-slate-100 bg-slate-50/50"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-xl border flex items-center justify-center",
                theme === 'dark' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600"
              )}>
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                  Layers
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                    theme === 'dark' ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                  )}>
                    {layers.length}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Manage stack & visibility</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleAddNewLayer}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs",
                  "bg-indigo-600 hover:bg-indigo-700 text-white"
                )}
                title="Add new drawing layer"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
              <button
                onClick={() => {
                  setIsLayersOpen(false);
                  playSound(340, 'sine', 0.08);
                }}
                className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  theme === 'dark' ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                )}
                title="Close sidebar [L]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Quick Visibility All Tools Bar */}
          <div className={cn(
            "flex items-center justify-between px-4 py-2 border-b text-[11px] font-medium shrink-0",
            theme === 'dark' ? "border-slate-800/60 bg-slate-900/20 text-slate-400" : "border-slate-100 bg-slate-50/30 text-slate-500"
          )}>
            <span className="text-[10px] uppercase tracking-wider font-bold">Stack Order</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  showAllLayers();
                  setTopMessage("All layers set to visible 👁️");
                  playSound(520, 'sine', 0.06);
                }}
                className="hover:text-indigo-500 transition-colors text-[10px] font-semibold"
                title="Show all layers"
              >
                Show All
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  hideAllLayers();
                  setTopMessage("All layers hidden 🙈");
                  playSound(320, 'sine', 0.06);
                }}
                className="hover:text-amber-500 transition-colors text-[10px] font-semibold"
                title="Hide all layers"
              >
                Hide All
              </button>
            </div>
          </div>

          {/* Layers List (Scrollable) */}
          <div className="p-3 space-y-2 overflow-y-auto no-scrollbar max-h-[52vh]">
            {displayLayers.map(({ layer, originalIndex }) => {
              const strokeCount = getStrokeCount(layer.id);
              const isActive = activeLayerId === layer.id;
              const isEditing = editingLayerId === layer.id;
              const isOpacityOpen = expandedOpacityLayerId === layer.id;
              const layerOpacity = layer.opacity ?? 1;

              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, originalIndex)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, originalIndex)}
                  onDragEnd={() => setDraggedIdx(null)}
                  onClick={() => {
                    if (activeLayerId !== layer.id) {
                      setActiveLayer(layer.id);
                      setTopMessage(`Switched active drawing target to ${layer.name}`);
                      playSound(550, 'sine', 0.05);
                    }
                  }}
                  className={cn(
                    "group relative rounded-2xl border p-2.5 transition-all duration-200 cursor-pointer flex flex-col gap-2",
                    draggedIdx === originalIndex ? "opacity-35 scale-95 border-dashed border-indigo-500" : "",
                    isActive
                      ? (theme === 'dark' 
                          ? "bg-indigo-950/30 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/30" 
                          : "bg-indigo-50/80 border-indigo-200 shadow-sm ring-1 ring-indigo-400/20")
                      : (theme === 'dark'
                          ? "bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                          : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"),
                    !layer.visible && "opacity-60"
                  )}
                >
                  {/* Layer Primary Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Drag Handle, Active Dot, Name */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className={cn(
                          "cursor-grab active:cursor-grabbing p-0.5 rounded transition-colors shrink-0",
                          theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                        )}
                        title="Drag to reorder layer stack"
                      >
                        <GripVertical size={14} />
                      </div>

                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0 transition-all",
                        isActive 
                          ? "bg-indigo-500 ring-4 ring-indigo-500/20" 
                          : "bg-slate-300 dark:bg-slate-700"
                      )} />

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={inputRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(layer.id);
                                if (e.key === 'Escape') setEditingLayerId(null);
                              }}
                              className={cn(
                                "w-full text-xs font-bold px-2 py-0.5 rounded-lg border outline-none",
                                theme === 'dark' 
                                  ? "bg-slate-800 border-indigo-500 text-white" 
                                  : "bg-white border-indigo-500 text-slate-900"
                              )}
                            />
                            <button
                              onClick={() => handleSaveRename(layer.id)}
                              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                              title="Save name"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group/name">
                            <span 
                              onDoubleClick={(e) => handleStartRename(layer, e)}
                              className={cn(
                                "text-xs font-bold truncate cursor-text",
                                isActive 
                                  ? (theme === 'dark' ? "text-indigo-200" : "text-indigo-950") 
                                  : (theme === 'dark' ? "text-slate-200" : "text-slate-800")
                              )}
                              title="Double click to rename"
                            >
                              {layer.name}
                            </span>
                            <button
                              onClick={(e) => handleStartRename(layer, e)}
                              className="opacity-0 group-hover/name:opacity-100 p-0.5 text-slate-400 hover:text-indigo-500 transition-opacity"
                              title="Rename layer"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {strokeCount === 0 ? 'Empty' : `${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'}`}
                          </span>
                          {layerOpacity < 1 && (
                            <span className="text-[10px] font-mono px-1 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                              {Math.round(layerOpacity * 100)}%
                            </span>
                          )}
                          {layer.locked && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-0.5">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Visibility & Quick Action Icons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Visibility toggle button */}
                      <button
                        onClick={() => {
                          toggleLayerVisibility(layer.id);
                          setTopMessage(`${layer.name} is now ${layer.visible ? 'hidden' : 'visible'}`);
                          playSound(layer.visible ? 320 : 540, 'triangle', 0.05);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-all flex items-center justify-center",
                          layer.visible
                            ? (theme === 'dark' 
                                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" 
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")
                            : (theme === 'dark' 
                                ? "bg-slate-800/80 text-slate-500 hover:bg-slate-800 hover:text-slate-300" 
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600")
                        )}
                        title={layer.visible ? "Hide layer strokes" : "Show layer strokes"}
                      >
                        {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>

                      {/* Lock button */}
                      <button
                        onClick={() => {
                          toggleLayerLock(layer.id);
                          setTopMessage(`${layer.name} is now ${layer.locked ? 'unlocked' : 'locked'}`);
                          playSound(layer.locked ? 500 : 350, 'triangle', 0.05);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          layer.locked
                            ? (theme === 'dark' ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25" : "bg-rose-50 text-rose-600 hover:bg-rose-100")
                            : (theme === 'dark' ? "text-slate-500 hover:bg-slate-800 hover:text-slate-300" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")
                        )}
                        title={layer.locked ? "Unlock layer to draw" : "Lock layer to prevent drawing"}
                      >
                        {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>

                      {/* Opacity mini-toggle */}
                      <button
                        onClick={() => setExpandedOpacityLayerId(isOpacityOpen ? null : layer.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          isOpacityOpen || layerOpacity < 1
                            ? "text-indigo-500 bg-indigo-500/10"
                            : (theme === 'dark' ? "text-slate-500 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100")
                        )}
                        title="Adjust layer opacity"
                      >
                        <Sliders size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Opacity & Layer Tools Drawer */}
                  {isOpacityOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className={cn(
                        "pt-2 pb-1 px-2 border-t mt-1 flex flex-col gap-2 rounded-xl transition-all",
                        theme === 'dark' ? "border-slate-800/80 bg-slate-900/60" : "border-slate-100 bg-slate-50/60"
                      )}
                    >
                      {/* Opacity slider */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opacity</span>
                        <span className="text-[10px] font-mono font-bold text-indigo-500">
                          {Math.round(layerOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={layerOpacity}
                        onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-indigo-600"
                      />

                      {/* Actions toolbar */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                        {/* Move Up / Down in stack */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              moveLayer(layer.id, 'down'); // Down in UI = up in rendering stack
                              playSound(580, 'sine', 0.05);
                            }}
                            disabled={originalIndex === layers.length - 1}
                            className={cn(
                              "p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            )}
                            title="Bring layer forward"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => {
                              moveLayer(layer.id, 'up'); // Up in UI = down in rendering stack
                              playSound(460, 'sine', 0.05);
                            }}
                            disabled={originalIndex === 0}
                            className={cn(
                              "p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            )}
                            title="Send layer backward"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        {/* Duplicate, Clear, Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              duplicateLayer(layer.id);
                              setTopMessage(`Duplicated ${layer.name} with all strokes!`);
                              playSound(780, 'sine', 0.07);
                            }}
                            className={cn(
                              "p-1.5 rounded text-xs transition-colors text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            )}
                            title="Duplicate layer and strokes"
                          >
                            <Copy size={13} />
                          </button>

                          {strokeCount > 0 && (
                            <button
                              onClick={() => {
                                clearLayer(layer.id);
                                setTopMessage(`Cleared all strokes on ${layer.name}`);
                                playSound(240, 'sawtooth', 0.1);
                              }}
                              className={cn(
                                "p-1.5 rounded text-xs transition-colors text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              )}
                              title="Clear only this layer's strokes"
                            >
                              <Eraser size={13} />
                            </button>
                          )}

                          {layers.length > 1 && (
                            <button
                              onClick={() => {
                                deleteLayer(layer.id);
                                setTopMessage(`Deleted ${layer.name}`);
                                playSound(280, 'sawtooth', 0.1);
                              }}
                              className={cn(
                                "p-1.5 rounded text-xs transition-colors text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              )}
                              title="Delete layer"
                            >
                              <Trash size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Helper */}
          <div className={cn(
            "px-4 py-2.5 border-t text-[11px] flex items-center justify-between shrink-0",
            theme === 'dark' 
              ? "border-slate-800/80 bg-slate-900/40 text-slate-400" 
              : "border-slate-100 bg-slate-50/60 text-slate-500"
          )}>
            <div className="flex items-center gap-1.5 text-[11px]">
              <Sparkles size={12} className="text-indigo-500" />
              <span>Strokes target active layer</span>
            </div>
            <kbd className={cn(
              "px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border",
              theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
            )}>
              L
            </kbd>
          </div>
        </div>
      </aside>
    </>
  );
}
