'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Map, GripVertical, Check, Eye, EyeOff, Crosshair } from 'lucide-react';

export default function Minimap() {
  const { strokes, offset, scale, setOffset, theme, showMinimap } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draggability position state
  const [position, setPosition] = useState({ x: 32, y: 110 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Custom interactive viewport click tracking
  const [isDirectNavigating, setIsDirectNavigating] = useState(false);

  // Prevent compiling issues in SSR
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mapWidth = 180;
  const mapHeight = 120;

  // Render loop for minimap drawing paths
  useEffect(() => {
    if (!isMounted || !showMinimap || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current screen dimensions
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Gather points list from active/visible strokes to compute bounds
    const strokesWithPoints = strokes.filter(s => s.points.some(p => p.x !== -9999 && p.y !== -9999));
    
    // Bounds tracking
    let minX = -offset.x / scale;
    let maxX = (screenWidth - offset.x) / scale;
    let minY = -offset.y / scale;
    let maxY = (screenHeight - offset.y) / scale;

    // Expand bounding box to fit strokes
    strokesWithPoints.forEach(s => {
      s.points.forEach(p => {
        if (p.x !== -9999 && p.y !== -9999) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      });
    });

    // Expand bounds with a uniform padding
    const padding = 150 / scale;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Maintain map aspect ratio (mapWidth / mapHeight = 1.5)
    let contentWidth = maxX - minX;
    let contentHeight = maxY - minY;
    const targetAspect = mapWidth / mapHeight;
    const contentAspect = contentWidth / contentHeight;

    if (contentAspect > targetAspect) {
      const targetHeight = contentWidth / targetAspect;
      const dy = (targetHeight - contentHeight) / 2;
      minY -= dy;
      maxY += dy;
    } else {
      const targetWidth = contentHeight * targetAspect;
      const dx = (targetWidth - contentWidth) / 2;
      minX -= dx;
      maxX += dx;
    }

    // Coordinates mapper helpers
    contentWidth = maxX - minX || 1;
    contentHeight = maxY - minY || 1;

    const toX = (cx: number) => ((cx - minX) / contentWidth) * mapWidth;
    const toY = (cy: number) => ((cy - minY) / contentHeight) * mapHeight;

    // Clear and draw grid backing
    ctx.clearRect(0, 0, mapWidth, mapHeight);
    
    // Fill background with elegant solid white so dark sketches are perfectly visible
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, mapWidth, mapHeight);
    
    // Base grid with soft light color
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 1;
    const gridSpacing = 20;
    for (let x = 0; x < mapWidth; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapHeight);
      ctx.stroke();
    }
    for (let y = 0; y < mapHeight; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapWidth, y);
      ctx.stroke();
    }

    // Draw drawings/strokes
    strokesWithPoints.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.save();
      
      // Determine stroke visual layout
      if (stroke.tool === 'eraser' || stroke.tool === 'ai-eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
      } else {
        // If drawing color is white, map it to a soft visible slate so it can be seen on the white minimap
        if (stroke.color === '#ffffff' || stroke.color?.toLowerCase() === '#fff' || stroke.color === 'white') {
          ctx.strokeStyle = '#cbd5e1';
        } else {
          ctx.strokeStyle = stroke.color;
        }
        ctx.lineWidth = 1.5;
      }
      
      ctx.beginPath();
      let isFirst = true;
      stroke.points.forEach(p => {
        if (p.x === -9999 && p.y === -9999) {
          isFirst = true;
          return;
        }
        const tx = toX(p.x);
        const ty = toY(p.y);
        
        if (isFirst) {
          ctx.moveTo(tx, ty);
          isFirst = false;
        } else {
          ctx.lineTo(tx, ty);
        }
      });
      ctx.stroke();
      ctx.restore();
    });

    // Draw physical viewing frame rectangle
    const viewL = toX(-offset.x / scale);
    const viewT = toY(-offset.y / scale);
    const viewR = toX((screenWidth - offset.x) / scale);
    const viewB = toY((screenHeight - offset.y) / scale);

    ctx.save();
    // Glassy indicator
    ctx.fillStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.fillRect(viewL, viewT, viewR - viewL, viewB - viewT);
    
    // Vibrant highlighted border matching premium UI standards
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(viewL, viewT, viewR - viewL, viewB - viewT);
    ctx.restore();

  }, [strokes, offset, scale, showMinimap, isMounted]);

  // Window map navigation interaction click/drag recentering
  const handleMapInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    
    // Obtain active mouse coords
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const mX = clientX - rect.left;
    const mY = clientY - rect.top;

    // Recalculate canvas coordinates matching clicked point
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const strokesWithPoints = strokes.filter(s => s.points.some(p => p.x !== -9999 && p.y !== -9999));
    
    let minX = -offset.x / scale;
    let maxX = (screenWidth - offset.x) / scale;
    let minY = -offset.y / scale;
    let maxY = (screenHeight - offset.y) / scale;

    strokesWithPoints.forEach(s => {
      s.points.forEach(p => {
        if (p.x !== -9999 && p.y !== -9999) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      });
    });

    const padding = 150 / scale;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    let contentWidth = maxX - minX;
    let contentHeight = maxY - minY;
    const targetAspect = mapWidth / mapHeight;
    const contentAspect = contentWidth / contentHeight;

    if (contentAspect > targetAspect) {
      const targetHeight = contentWidth / targetAspect;
      const dy = (targetHeight - contentHeight) / 2;
      minY -= dy;
      maxY += dy;
    } else {
      const targetWidth = contentHeight * targetAspect;
      const dx = (targetWidth - contentWidth) / 2;
      minX -= dx;
      maxX += dx;
    }

    contentWidth = maxX - minX || 1;
    contentHeight = maxY - minY || 1;

    const cx = minX + (mX / mapWidth) * contentWidth;
    const cy = minY + (mY / mapHeight) * contentHeight;

    // Teleport offset centering on click coordinate
    setOffset({
      x: (screenWidth / 2) - cx * scale,
      y: (screenHeight / 2) - cy * scale
    });
  };

  // Draggable handle events
  const handleDragDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleDragMove = (e: PointerEvent | TouchEvent) => {
    if (!isDragging) return;
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const nextX = Math.max(8, Math.min(window.innerWidth - 220, clientX - dragStart.x));
    const nextY = Math.max(8, Math.min(window.innerHeight - 170, clientY - dragStart.y));

    setPosition({ x: nextX, y: nextY });
  };

  const handleDragUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handleDragMove);
      window.addEventListener('pointerup', handleDragUp);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragUp);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragUp);
    };
  }, [isDragging, dragStart, handleDragMove]);

  if (!isMounted || !showMinimap) return null;

  return (
    <div 
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="absolute z-50 rounded-2xl border bg-white border-slate-200 shadow-[0_15px_35px_rgba(0,0,0,0.1)] p-3 pointer-events-auto flex flex-col select-none group/minimap w-[206px] transition-shadow duration-200 hover:shadow-[0_20px_45px_rgba(99,102,241,0.12)]"
    >
      {/* Premium drag handle and title */}
      <div 
        onMouseDown={handleDragDown}
        onTouchStart={handleDragDown}
        className="flex items-center justify-between cursor-move pb-2 shrink-0 border-b border-slate-100 mb-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical size={14} className="text-gray-400 hover:text-indigo-500" />
          <Map size={12} className="text-indigo-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-bold tracking-widest text-slate-700 uppercase truncate">
            MINI MAP
          </span>
        </div>
        
        {/* Navigation target crosshairs indicator */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => {
              // Center view to center coordinates of all drawings (or 0,0)
              const screenWidth = window.innerWidth;
              const screenHeight = window.innerHeight;
              if (strokes.length > 0) {
                let meanX = 0, meanY = 0, count = 0;
                strokes.forEach(s => s.points.forEach(p => {
                  if (p.x !== -9999 && p.y !== -9999) {
                    meanX += p.x;
                    meanY += p.y;
                    count++;
                  }
                }));
                if (count > 0) {
                  setOffset({
                    x: (screenWidth / 2) - (meanX / count) * scale,
                    y: (screenHeight / 2) - (meanY / count) * scale
                  });
                  return;
                }
              }
              setOffset({ x: 0, y: 0 });
            }}
            title="Focus Sketches Center"
            className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-indigo-500 hover:text-indigo-600 transition-colors inline-flex items-center justify-center"
          >
            <Crosshair size={10} />
          </button>
        </div>
      </div>

      {/* Map display canvas wrapper with elegant frame */}
      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 transition-colors">
        <canvas
          ref={canvasRef}
          width={mapWidth}
          height={mapHeight}
          onClick={handleMapInteraction}
          onMouseDown={handleMapInteraction}
          onTouchStart={handleMapInteraction}
          className="block cursor-crosshair hover:opacity-95"
          style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
        />
        
        {/* Click reminder caption */}
        <div className="absolute inset-x-0 bottom-0 py-1 text-center bg-white/90 text-[7px] font-bold text-gray-500 opacity-0 group-hover/minimap:opacity-100 transition-opacity pointer-events-none select-none tracking-wide uppercase border-t border-slate-100">
          Click Map to Teleport ⚡
        </div>
      </div>
    </div>
  );
}
