'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { X, Download, FileImage, Layers, Sparkles, Check, Image as ImageIcon, Sliders } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { playSound } from '@/lib/ai-handler';
import { getStampDefinition } from '@/lib/stamps';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ExportFormat = 'png' | 'jpeg' | 'svg';
type BgChoice = 'theme' | 'white' | 'dark' | 'transparent';

export default function ExportModal() {
  const { isExportOpen, setIsExportOpen, theme, strokes, layers, offset, scale } = useStore();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [bgChoice, setBgChoice] = useState<BgChoice>('theme');
  const [exportScale, setExportScale] = useState<number>(1);
  const [visibleOnly, setVisibleOnly] = useState<boolean>(true);
  const [filename, setFilename] = useState<string>('synapse-sketch');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExportOpen) {
        setIsExportOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportOpen, setIsExportOpen]);

  // Update preview canvas whenever options change
  useEffect(() => {
    if (!isExportOpen) return;
    const canvas = document.querySelector('canvas');
    const previewCanvas = previewCanvasRef.current;
    if (!canvas || !previewCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    previewCanvas.width = 320;
    previewCanvas.height = 180;

    // Background
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    if (bgChoice === 'transparent' && (format === 'png' || format === 'svg')) {
      // Checkerboard pattern for transparency
      const tileSize = 8;
      for (let x = 0; x < previewCanvas.width; x += tileSize) {
        for (let y = 0; y < previewCanvas.height; y += tileSize) {
          const isEven = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
          ctx.fillStyle = isEven ? '#e2e8f0' : '#ffffff';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else {
      let bg = '#ffffff';
      if (bgChoice === 'dark') bg = '#0f1115';
      else if (bgChoice === 'white') bg = '#ffffff';
      else if (bgChoice === 'theme') bg = theme === 'dark' ? '#0f1115' : '#ffffff';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    }

    // Draw miniature scaled representation of canvas
    try {
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, previewCanvas.width, previewCanvas.height);
    } catch {
      // Canvas might be tainted or empty
    }
  }, [isExportOpen, format, bgChoice, theme, strokes, layers]);

  if (!isExportOpen) return null;

  const getEffectiveBgColor = (): string => {
    if (bgChoice === 'transparent') return 'transparent';
    if (bgChoice === 'dark') return '#0f1115';
    if (bgChoice === 'white') return '#ffffff';
    return theme === 'dark' ? '#0f1115' : '#ffffff';
  };

  const handleDownload = async () => {
    setIsExporting(true);
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      setIsExporting(false);
      return;
    }

    const safeFilename = (filename.trim() || 'synapse-sketch').replace(/[^a-zA-Z0-9-_]/g, '_');
    const bgColor = getEffectiveBgColor();

    if (format === 'svg') {
      // Vector SVG export
      const width = canvas.width || 1920;
      const height = canvas.height || 1080;

      const visibleLayerIds = new Set(
        visibleOnly ? layers.filter(l => l.visible).map(l => l.id) : layers.map(l => l.id)
      );

      const targetStrokes = strokes.filter(s => visibleLayerIds.has(s.layerId || 'layer-fg'));

      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
      
      if (bgColor !== 'transparent') {
        svgContent += `  <rect width="100%" height="100%" fill="${bgColor}" />\n`;
      }

      svgContent += `  <g transform="translate(${offset.x}, ${offset.y}) scale(${scale})">\n`;

      targetStrokes.forEach(stroke => {
        if (stroke.points.length === 0) return;
        if (stroke.tool === 'eraser' || stroke.tool === 'ai-eraser') return; // Vector strokes skip eraser nodes already recalculated

        if (stroke.tool === 'stamp') {
          const p0 = stroke.points[0];
          const stampDef = getStampDefinition(stroke.stampId);
          let size = 56 * (stroke.stampScale || 1);
          let rotation = stroke.stampRotation || 0;

          if (stroke.points.length > 1) {
            const p1 = stroke.points[stroke.points.length - 1];
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 8) {
              size = Math.max(16, dist * 2);
              rotation = Math.atan2(dy, dx);
            }
          }

          svgContent += `    ${stampDef.toSvg(p0.x, p0.y, size, stroke.color, !!stroke.fill, rotation)}\n`;
          return;
        }

        const sizeVal = typeof stroke.size === 'number' 
          ? stroke.size 
          : (stroke.size === 'thin' ? 2 : stroke.size === 'medium' ? 6 : 12);

        if (stroke.points.length === 1) {
          const p = stroke.points[0];
          svgContent += `    <circle cx="${p.x}" cy="${p.y}" r="${sizeVal / 2}" fill="${stroke.color}" />\n`;
          return;
        }

        let d = `M ${stroke.points[0].x} ${stroke.points[0].y}`;
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          d += ` Q ${stroke.points[i].x} ${stroke.points[i].y}, ${xc} ${yc}`;
        }
        const last = stroke.points[stroke.points.length - 1];
        d += ` L ${last.x} ${last.y}`;

        if (stroke.fill) {
          svgContent += `    <path d="${d} Z" fill="${stroke.color}" stroke="${stroke.color}" stroke-width="${sizeVal}" stroke-linecap="round" stroke-linejoin="round" />\n`;
        } else {
          svgContent += `    <path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${sizeVal}" stroke-linecap="round" stroke-linejoin="round" />\n`;
        }
      });

      svgContent += `  </g>\n`;
      svgContent += `</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Raster PNG or JPEG export
      const targetScale = exportScale;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width * targetScale;
      exportCanvas.height = canvas.height * targetScale;

      const exportCtx = exportCanvas.getContext('2d');
      if (exportCtx) {
        exportCtx.scale(targetScale, targetScale);

        if (format === 'jpeg' || bgColor !== 'transparent') {
          exportCtx.fillStyle = format === 'jpeg' && bgColor === 'transparent' ? '#ffffff' : bgColor;
          exportCtx.fillRect(0, 0, canvas.width, canvas.height);
        }

        exportCtx.drawImage(canvas, 0, 0);

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${safeFilename}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        a.click();
      }
    }

    useStore.getState().setTopMessage(`Canvas exported as ${format.toUpperCase()}! Download saved.`);
    playSound(880, 'sine', 0.2);

    setTimeout(() => {
      setIsExporting(false);
      setIsExportOpen(false);
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto"
      onClick={() => setIsExportOpen(false)}
    >
      <div 
        className={cn(
          "relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border transition-all duration-300",
          theme === 'dark' ? "bg-gray-900 border-gray-700/60 text-white" : "bg-white border-gray-200 text-gray-900"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200/20 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Download size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Export Artwork</h2>
              <p className={cn("text-xs", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                Select format, resolution and background options
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExportOpen(false)}
            className={cn(
              "p-2 rounded-xl transition-colors",
              theme === 'dark' ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-500 hover:text-black hover:bg-gray-100"
            )}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Thumbnail */}
        <div className="mb-5 flex flex-col items-center">
          <div className="w-full h-36 sm:h-40 rounded-2xl overflow-hidden border border-gray-200/30 flex items-center justify-center bg-gray-100 dark:bg-gray-800 relative">
            <canvas ref={previewCanvasRef} className="w-full h-full object-contain" />
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md bg-black/50 text-white">
              {format} • {format === 'svg' ? 'Vector' : `${exportScale}x`}
            </div>
          </div>
        </div>

        {/* Format Selection Cards */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'png', name: 'PNG', desc: 'Lossless raster with alpha', tag: 'Bitmap' },
              { id: 'jpeg', name: 'JPEG', desc: 'Compressed universal image', tag: 'Fast' },
              { id: 'svg', name: 'SVG', desc: 'Infinite vector scale', tag: 'Vector' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFormat(item.id as ExportFormat);
                  if (item.id === 'jpeg' && bgChoice === 'transparent') {
                    setBgChoice('white');
                  }
                  playSound(600, 'sine', 0.05);
                }}
                className={cn(
                  "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-98",
                  format === item.id
                    ? (theme === 'dark' ? "border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500" : "border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-600")
                    : (theme === 'dark' ? "border-gray-800 bg-gray-800/40 text-gray-300 hover:border-gray-700 hover:bg-gray-800" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white")
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm">{item.name}</span>
                  {format === item.id && <Check size={14} className="text-indigo-500" />}
                </div>
                <span className="text-[10px] opacity-70 leading-tight mb-2">{item.desc}</span>
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase self-start",
                  format === item.id 
                    ? "bg-indigo-500 text-white" 
                    : (theme === 'dark' ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700")
                )}>
                  {item.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Background choice */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              Background Canvas
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'theme', label: 'Theme (' + theme + ')' },
                { id: 'white', label: 'Solid White' },
                { id: 'dark', label: 'Midnight Dark' },
                { id: 'transparent', label: 'Transparent', disabled: format === 'jpeg' },
              ].map(b => (
                <button
                  key={b.id}
                  type="button"
                  disabled={b.disabled}
                  onClick={() => {
                    setBgChoice(b.id as BgChoice);
                    playSound(500, 'sine', 0.04);
                  }}
                  className={cn(
                    "px-2.5 py-2 text-xs font-medium rounded-xl border text-center transition-all truncate",
                    b.disabled && "opacity-30 cursor-not-allowed",
                    bgChoice === b.id
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                      : (theme === 'dark' ? "border-gray-800 bg-gray-800/50 text-gray-400 hover:bg-gray-800" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100")
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Resolution or Vector Info */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              {format === 'svg' ? 'Vector Precision' : 'Output Resolution'}
            </label>
            {format === 'svg' ? (
              <div className={cn(
                "p-3 rounded-xl border text-xs leading-relaxed",
                theme === 'dark' ? "border-gray-800 bg-gray-800/40 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700"
              )}>
                Infinite scalable vectors preserving all strokes, curves, and layers.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { scale: 1, label: '1x (Standard)' },
                  { scale: 2, label: '2x (HiDPI)' },
                  { scale: 3, label: '3x (Print 4K)' },
                ].map(item => (
                  <button
                    key={item.scale}
                    type="button"
                    onClick={() => {
                      setExportScale(item.scale);
                      playSound(550, 'sine', 0.04);
                    }}
                    className={cn(
                      "px-2 py-2 text-xs font-medium rounded-xl border text-center transition-all",
                      exportScale === item.scale
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                        : (theme === 'dark' ? "border-gray-800 bg-gray-800/50 text-gray-400 hover:bg-gray-800" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100")
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filename & Layer Options */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
          <div className="w-full sm:flex-1">
            <label className="block text-[11px] font-semibold mb-1 opacity-70">
              File Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="synapse-sketch"
                className={cn(
                  "w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono transition-all",
                  theme === 'dark' 
                    ? "bg-gray-800/70 border-gray-700 text-white focus:border-indigo-500" 
                    : "bg-gray-50 border-gray-200 text-black focus:border-indigo-500"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-gray-400 pointer-events-none">
                .{format === 'jpeg' ? 'jpg' : format}
              </span>
            </div>
          </div>

          <label className="w-full sm:w-auto flex items-center gap-2 cursor-pointer pt-3 sm:pt-4">
            <input
              type="checkbox"
              checked={visibleOnly}
              onChange={(e) => setVisibleOnly(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-medium select-none">
              Visible layers only
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExportOpen(false)}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all border",
              theme === 'dark' ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700" : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-98 disabled:opacity-50"
          >
            <Download size={15} />
            <span>{isExporting ? 'Generating File...' : `Download ${format.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
