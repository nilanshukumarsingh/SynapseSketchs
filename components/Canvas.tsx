'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore, Point, Stroke } from '@/lib/store';
import AiTargetPreviewOverlay from '@/components/AiTargetPreviewOverlay';
import { tactileAudio } from '@/lib/tactile-audio';
import { getStampDefinition } from '@/lib/stamps';
import { playSound } from '@/lib/ai-handler';

const ASCII_CHARS = ['#', 'a', 't', 'g', 'o', 'p', 'l', '%', '=', 'i', 'p', 'n', 'm', 'd', 'a', 'o', 'Y', 's', '@', '«', 'I', 'f', '÷', '(', '~', 'c', '1', '8', 'K', '3', 'M'];

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strokes, currentTool, currentColor, currentSize, addStroke, updateLastStroke, finishStroke, offset, scale, setOffset, setScale, undo, redo, backgroundImage, theme, layers, activeLayerId, asciiChar, settings } = useStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const hoverCoordRef = useRef<Point | null>(null);

  const getLineWidth = (size: string | number) => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'thin': return 2;
      case 'medium': return 6;
      case 'thick': return 12;
      default: return 6;
    }
  };

  const getPressureLineWidth = (baseW: number, pressure?: number): number => {
    const p = typeof pressure === 'number' && pressure > 0 ? pressure : 0.5;
    // Dynamic non-linear curve for sketching:
    // Light stroke (p ~ 0.15): ~0.42x width
    // Balanced stroke (p ~ 0.50): ~1.00x width
    // Deep stroke (p ~ 0.90): ~1.85x width
    const factor = 0.25 + 1.75 * Math.pow(Math.min(1, Math.max(0.05, p)), 1.25);
    return Math.max(0.8, baseW * factor);
  };

  const drawGrid = React.useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#fef08a'; // tailwind yellow-200 for a light yellow dot
    const dotSize = 2;
    const spacing = 40;
    
    // Calculate visible grid area based on offset and scale
    const startX = -offset.x / scale;
    const startY = -offset.y / scale;
    const endX = startX + width / scale;
    const endY = startY + height / scale;

    const offsetX = startX % spacing;
    const offsetY = startY % spacing;

    for (let x = startX - offsetX; x < endX; x += spacing) {
      for (let y = startY - offsetY; y < endY; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize / 2 / scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [offset, scale]);

  const drawAsciiPath = React.useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    ctx.fillStyle = stroke.color;
    ctx.font = `${getLineWidth(stroke.size) * 4}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (theme === 'dark') {
      ctx.shadowBlur = getLineWidth(stroke.size) * 4;
      ctx.shadowColor = stroke.color;
    } else {
      ctx.shadowBlur = 0;
    }
    
    // Only draw a char every N pixels to avoid clutter
    let lastDrawPoint = stroke.points[0];
    const minDistance = getLineWidth(stroke.size) * 4;

    stroke.points.forEach((p, i) => {
      // Use stable hash from coordinates so characters don't flicker on zoom/pan redraw
      const charIndex = Math.floor(Math.abs(p.x * 12345 + p.y * 67890)) % ASCII_CHARS.length;
      const character = asciiChar || ASCII_CHARS[charIndex];

      if (i === 0) {
        ctx.fillText(character, p.x, p.y);
        return;
      }
      
      const dx = p.x - lastDrawPoint.x;
      const dy = p.y - lastDrawPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist >= minDistance) {
        ctx.fillText(character, p.x, p.y);
        lastDrawPoint = p;
      }
    });
  }, [theme, asciiChar]);

  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fadingRipplesRef = useRef<{ x: number; y: number; radius: number; createdAt: number }[]>([]);
  const redrawRef = useRef<() => void>(() => {});
  const smoothedPressureRef = useRef<number>(0.5);
  const lastPointTimeRef = useRef<number>(0);
  const lastPointCoordRef = useRef<{ x: number; y: number } | null>(null);

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreenCanvas = offscreenCanvasRef.current;
    if (offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
    }
    const offCtx = offscreenCanvas.getContext('2d');
    if (!offCtx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    if (bgImageRef.current) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(bgImageRef.current, 0, 0);
    }

    drawGrid(ctx, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));

    // Group strokes by layer
    const strokesByLayer = new Map<string, Stroke[]>();
    strokes.forEach(stroke => {
      const layerId = stroke.layerId || 'layer-fg';
      if (visibleLayerIds.has(layerId)) {
        if (!strokesByLayer.has(layerId)) {
          strokesByLayer.set(layerId, []);
        }
        strokesByLayer.get(layerId)!.push(stroke);
      }
    });

    // Draw layers in order
    layers.forEach(layer => {
      if (!layer.visible) return;
      const layerStrokes = strokesByLayer.get(layer.id) || [];
      if (layerStrokes.length === 0) return;

      // Clear offscreen for the layer
      offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';

      // Apply transformations to the offscreen canvas
      offCtx.save();
      offCtx.translate(offset.x, offset.y);
      offCtx.scale(scale, scale);

      layerStrokes.forEach(stroke => {
        // Reset to source-over for every stroke unless specialized
        offCtx.globalCompositeOperation = 'source-over';
        
        if (stroke.tool === 'eraser' || stroke.tool === 'ai-eraser') {
          offCtx.globalCompositeOperation = 'destination-out';
          offCtx.lineWidth = getLineWidth(stroke.size) * 4;
          offCtx.strokeStyle = 'rgba(0,0,0,1)';
          offCtx.fillStyle = 'rgba(0,0,0,1)';
          offCtx.shadowBlur = 0;
        } else {
          offCtx.lineWidth = getLineWidth(stroke.size);
          offCtx.strokeStyle = stroke.color;
          if (theme === 'dark') {
            offCtx.shadowBlur = getLineWidth(stroke.size) * 2;
            offCtx.shadowColor = stroke.color;
          } else {
            offCtx.shadowBlur = 0;
          }
        }

        if (stroke.tool === 'ascii') {
          drawAsciiPath(offCtx, stroke);
        } else if (stroke.tool === 'stamp') {
          if (stroke.points.length > 0) {
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

            offCtx.lineWidth = getLineWidth(stroke.size);
            stampDef.draw(offCtx, p0.x, p0.y, size, stroke.color, !!stroke.fill, rotation);
          }
        } else if (stroke.tool === 'ai-colorize') {
          // Drawing behind existing content on this layer
          offCtx.globalCompositeOperation = 'destination-over';
          offCtx.lineWidth = getLineWidth(stroke.size) * 3;
          offCtx.strokeStyle = stroke.color;
          if (stroke.points.length === 0) return;
          
          const baseW = getLineWidth(stroke.size) * 3;
          const hasVaryingPressure = stroke.points.some(p => p.pressure !== undefined && p.pressure > 0 && Math.abs(p.pressure - 0.5) > 0.02);
          
          if (hasVaryingPressure) {
            for (let i = 0; i < stroke.points.length - 1; i++) {
              const p1 = stroke.points[i];
              const p2 = stroke.points[i + 1];
              const avgP = ((p1.pressure ?? 0.5) + (p2.pressure ?? 0.5)) / 2;
              offCtx.lineWidth = getPressureLineWidth(baseW, avgP);
              offCtx.beginPath();
              offCtx.moveTo(p1.x, p1.y);
              offCtx.lineTo(p2.x, p2.y);
              offCtx.stroke();
            }
          } else {
            offCtx.beginPath();
            offCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
            if (stroke.points.length === 1) {
              offCtx.lineTo(stroke.points[0].x, stroke.points[0].y);
            } else {
              for (let i = 1; i < stroke.points.length - 1; i++) {
                const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
                const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
                offCtx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
              }
              offCtx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
            }
            offCtx.stroke();
          }
        } else {
          // Normal pencil, eraser, etc. with pointer pressure intensity variation
          if (stroke.points.length === 0) return;
          const baseW = (stroke.tool === 'eraser' || stroke.tool === 'ai-eraser') 
            ? getLineWidth(stroke.size) * 4 
            : getLineWidth(stroke.size);

          if (stroke.points.length === 1) {
            const p = stroke.points[0];
            const w = getPressureLineWidth(baseW, p.pressure);
            offCtx.lineWidth = w;
            offCtx.beginPath();
            offCtx.arc(p.x, p.y, Math.max(0.5, w / 2), 0, Math.PI * 2);
            offCtx.fillStyle = (stroke.tool === 'eraser' || stroke.tool === 'ai-eraser') ? 'rgba(0,0,0,1)' : stroke.color;
            offCtx.fill();
          } else {
            const hasVaryingPressure = stroke.points.some(p => p.pressure !== undefined && p.pressure > 0 && Math.abs(p.pressure - 0.5) > 0.02);
            
            if (hasVaryingPressure) {
              for (let i = 0; i < stroke.points.length - 1; i++) {
                const p1 = stroke.points[i];
                const p2 = stroke.points[i + 1];
                const pr1 = p1.pressure !== undefined && p1.pressure > 0 ? p1.pressure : 0.5;
                const pr2 = p2.pressure !== undefined && p2.pressure > 0 ? p2.pressure : 0.5;
                const avgPressure = (pr1 + pr2) / 2;
                offCtx.lineWidth = getPressureLineWidth(baseW, avgPressure);
                offCtx.beginPath();
                offCtx.moveTo(p1.x, p1.y);
                offCtx.lineTo(p2.x, p2.y);
                offCtx.stroke();
              }
            } else {
              offCtx.lineWidth = baseW;
              offCtx.beginPath();
              offCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
              for (let i = 1; i < stroke.points.length - 1; i++) {
                const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
                const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
                offCtx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
              }
              offCtx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
              offCtx.stroke();
            }
          }
          
          if (stroke.fill) {
            offCtx.fillStyle = (stroke.tool === 'eraser' || stroke.tool === 'ai-eraser') ? 'rgba(0,0,0,1)' : stroke.color;
            offCtx.beginPath();
            offCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              offCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            offCtx.closePath();
            offCtx.fill();
            offCtx.stroke(); 
          }
        }
      });

      offCtx.restore();

      // Draw the offscreen canvas onto the main canvas with layer opacity
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to identity
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = typeof layer.opacity === 'number' ? Math.max(0.05, Math.min(1, layer.opacity)) : 1;
      ctx.drawImage(offscreenCanvas, 0, 0);
      ctx.restore();
    });

    // Draw subtle preserved highlight halo around user strokes in the vicinity of AI drawing
    const { aiPreviewBox, aiCursor, isGenerating: isGeneratingActive } = useStore.getState();
    if (isGeneratingActive || aiPreviewBox) {
      let vicinityFilter = (s: Stroke) => true;

      if (aiPreviewBox) {
        const vMinX = (aiPreviewBox.x - offset.x) / scale - 120;
        const vMaxX = (aiPreviewBox.x + aiPreviewBox.width - offset.x) / scale + 120;
        const vMinY = (aiPreviewBox.y - offset.y) / scale - 120;
        const vMaxY = (aiPreviewBox.y + aiPreviewBox.height - offset.y) / scale + 120;

        vicinityFilter = (s: Stroke) => s.points.some(p => p.x >= vMinX && p.x <= vMaxX && p.y >= vMinY && p.y <= vMaxY);
      } else if (aiCursor) {
        const cX = (aiCursor.x - offset.x) / scale;
        const cY = (aiCursor.y - offset.y) / scale;
        vicinityFilter = (s: Stroke) => s.points.some(p => Math.hypot(p.x - cX, p.y - cY) <= 180);
      }

      const preservedStrokes = strokes.filter(s => 
        !s.createdByAI && 
        s.tool !== 'eraser' && 
        s.tool !== 'ai-eraser' && 
        s.points.length > 0 &&
        vicinityFilter(s)
      );

      if (preservedStrokes.length > 0) {
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);

        const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 180);
        ctx.shadowColor = theme === 'dark' ? '#38bdf8' : '#0284c7';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = theme === 'dark' 
          ? `rgba(56, 189, 248, ${0.55 * pulse})` 
          : `rgba(2, 132, 199, ${0.45 * pulse})`;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        preservedStrokes.forEach(s => {
          if (s.points.length === 0) return;
          ctx.beginPath();
          ctx.moveTo(s.points[0].x, s.points[0].y);
          for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y);
          }
          ctx.stroke();
        });

        ctx.restore();
      }
    }

    // Fading transition effect for eraser tool when clearing paths
    const now = Date.now();
    fadingRipplesRef.current = fadingRipplesRef.current.filter(r => now - r.createdAt < 350);

    if (fadingRipplesRef.current.length > 0) {
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      fadingRipplesRef.current.forEach(r => {
        const elapsed = now - r.createdAt;
        const progress = elapsed / 350; // 0 to 1
        const alpha = (1 - progress) * 0.7;
        const curR = r.radius * (1 + progress * 0.25);

        const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, curR);
        grad.addColorStop(0, `rgba(244, 63, 94, ${alpha * 0.35})`);
        grad.addColorStop(0.7, `rgba(244, 63, 94, ${alpha * 0.18})`);
        grad.addColorStop(1, 'rgba(244, 63, 94, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, curR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, curR, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.restore();
    }

    // Ghost preview for stamp tool when hovering over canvas
    if (currentTool === 'stamp' && hoverCoordRef.current && !isDrawing) {
      const hp = hoverCoordRef.current;
      const { selectedStampId, stampFilled, stampScale, stampRotation, currentColor: curCol } = useStore.getState();
      const stampDef = getStampDefinition(selectedStampId);
      const previewSize = 56 * (stampScale || 1);

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([4, 4]);
      stampDef.draw(ctx, hp.x, hp.y, previewSize, curCol, stampFilled, stampRotation);
      ctx.restore();
    }
    
    ctx.restore();

    // Schedule next frame only if ripple animations are ongoing
    if (fadingRipplesRef.current.length > 0) {
      requestAnimationFrame(() => redrawRef.current());
    }
  }, [offset, scale, layers, strokes, theme, currentTool, isDrawing, drawGrid, drawAsciiPath]);

  useEffect(() => {
    redrawRef.current = redraw;
  }, [redraw]);

  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
        redraw();
      };
      img.src = backgroundImage;
    } else {
      bgImageRef.current = null;
      redraw();
    }
  }, [backgroundImage, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    };

    window.addEventListener('resize', resize);
    resize();

    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [strokes, offset, scale, redraw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const getCoordinates = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent | PointerEvent | MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    let pressure = 0.5;

    if ('touches' in e && (e as any).touches && (e as any).touches.length > 0) {
      clientX = (e as any).touches[0].clientX;
      clientY = (e as any).touches[0].clientY;
      const touch = (e as any).touches[0];
      if (typeof touch.force === 'number' && touch.force > 0) {
        pressure = touch.force;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
      if ('pressure' in e && typeof (e as any).pressure === 'number' && (e as any).pressure > 0) {
        pressure = (e as any).pressure;
      }
    }

    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
      pressure
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      
      setScale(prevScale => {
        const newScale = Math.min(Math.max(0.1, prevScale * (1 + delta)), 5);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          setOffset(prevOffset => ({
            x: mouseX - (mouseX - prevOffset.x) * (newScale / prevScale),
            y: mouseY - (mouseY - prevOffset.y) * (newScale / prevScale)
          }));
        }
        return newScale;
      });
    } else {
      // Pan
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const startInteraction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (useStore.getState().isGenerating) {
      useStore.getState().setTopMessage("Please wait for AI to finish drawing.");
      return;
    }
    
    // Middle click, altKey, or Hand tool for panning
    if (e.button === 1 || e.altKey || currentTool === 'hand') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    // Drawing only with primary button if mouse
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.locked) {
      useStore.getState().setTopMessage("Layer is locked. Cannot draw.");
      return;
    }

    const point = getCoordinates(e);
    if (!point) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const now = performance.now();
    lastPointTimeRef.current = now;
    lastPointCoordRef.current = { x: point.x, y: point.y };

    let initialPressure = 0.5;
    if (typeof (e as any).pressure === 'number' && (e as any).pressure > 0) {
      initialPressure = (e as any).pressure;
    } else if (e.pointerType === 'mouse') {
      initialPressure = 0.38;
    }
    smoothedPressureRef.current = initialPressure;
    point.pressure = initialPressure;

    setIsDrawing(true);
    if (settings.audioFeedback !== false) {
      tactileAudio.onPointerDown(currentTool, point.pressure);
    }
    if (currentTool === 'eraser' || currentTool === 'ai-eraser') {
      const baseW = getLineWidth(currentSize) * 4;
      fadingRipplesRef.current.push({
        x: point.x,
        y: point.y,
        radius: baseW / 2 + 8,
        createdAt: Date.now()
      });
      requestAnimationFrame(() => redrawRef.current());
    }

    if (currentTool === 'stamp') {
      const { selectedStampId, stampFilled, stampScale, stampRotation } = useStore.getState();
      setIsDrawing(true);
      addStroke({
        id: Date.now().toString(),
        tool: 'stamp',
        color: currentColor,
        size: currentSize,
        points: [point],
        layerId: activeLayerId,
        stampId: selectedStampId,
        fill: stampFilled,
        stampScale: stampScale,
        stampRotation: stampRotation
      });
      return;
    }

    addStroke({
      id: Date.now().toString(),
      tool: currentTool,
      color: currentColor,
      size: currentSize,
      points: [point],
      layerId: activeLayerId
    });
  };

  const interact = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning && lastPanPoint) {
      const clientX = e.clientX;
      const clientY = e.clientY;

      setOffset(prev => ({
        x: prev.x + (clientX - lastPanPoint.x),
        y: prev.y + (clientY - lastPanPoint.y)
      }));
      setLastPanPoint({ x: clientX, y: clientY });
      return;
    }

    if (!isDrawing) {
      const pt = getCoordinates(e);
      if (pt) {
        hoverCoordRef.current = pt;
        if (currentTool === 'stamp') {
          redrawRef.current();
        }
      }
      return;
    }
    if (useStore.getState().isGenerating) {
      setIsDrawing(false);
      tactileAudio.onPointerUp();
      return;
    }
    const point = getCoordinates(e);
    if (!point) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastPointTimeRef.current);

    const isPen = e.pointerType === 'pen';
    const rawPressure = typeof (e as any).pressure === 'number' ? (e as any).pressure : 0.5;

    if (isPen || (rawPressure > 0 && Math.abs(rawPressure - 0.5) > 0.02)) {
      // Direct stylus pointer pressure (Apple Pencil, Surface Pen, Wacom, etc.)
      smoothedPressureRef.current = smoothedPressureRef.current * 0.3 + rawPressure * 0.7;
    } else if (lastPointCoordRef.current) {
      // Dynamic velocity-sensitive sketching for mouse/trackpad:
      // Fast flick = lighter/tapered line; Slow deliberate movement = rich ink deposit
      const dx = point.x - lastPointCoordRef.current.x;
      const dy = point.y - lastPointCoordRef.current.y;
      const dist = Math.hypot(dx, dy);
      const speed = dist / dt; // px/ms
      const targetPressure = Math.max(0.22, Math.min(0.88, 0.74 - Math.min(0.48, speed * 0.28)));
      smoothedPressureRef.current = smoothedPressureRef.current * 0.65 + targetPressure * 0.35;
    }

    point.pressure = smoothedPressureRef.current;
    lastPointTimeRef.current = now;
    lastPointCoordRef.current = { x: point.x, y: point.y };

    if (settings.audioFeedback !== false) {
      tactileAudio.onPointerMove(point, currentTool, point.pressure);
    }

    if (currentTool === 'eraser' || currentTool === 'ai-eraser') {
      const baseW = getLineWidth(currentSize) * 4;
      fadingRipplesRef.current.push({
        x: point.x,
        y: point.y,
        radius: baseW / 2 + 8,
        createdAt: Date.now()
      });
      requestAnimationFrame(() => redrawRef.current());
    }

    updateLastStroke(point);
  };

  const stopInteraction = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    tactileAudio.onPointerUp();
    if (e && e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (isDrawing && !useStore.getState().isGenerating) {
      finishStroke();
      if (currentTool === 'stamp') {
        const { selectedStampId } = useStore.getState();
        const stampDef = getStampDefinition(selectedStampId);
        useStore.getState().setTopMessage(`Placed ${stampDef.name} stamp on canvas 📌`);
        playSound(680, 'triangle', 0.08);
      }
    }
    setIsDrawing(false);
    setIsPanning(false);
    setLastPanPoint(null);
    lastPointCoordRef.current = null;
    smoothedPressureRef.current = 0.5;
  };

  // Custom cursor based on tool
  const getCursor = () => {
    if (isPanning) return 'cursor-grab active:cursor-grabbing';
    
    // Solid colors for the dynamic outline cursor
    const cursorColor = theme === 'dark' ? '#ffffff' : '#000000';
    const cursorFill = theme === 'dark' ? '#1e293b' : '#f8fafc';
    const cursorStroke = theme === 'dark' ? '#000000' : '#ffffff';
    
    // Helper to generate safe URL encoded SVGs for cursors to guarantee chrome/firefox render them correctly
    const createSvgCursor = (svgContent: string, x: number, y: number) => {
      const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">${svgContent}</svg>`;
      return `url('data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}') ${x} ${y}, crosshair`;
    };

    if (currentTool === 'pencil') {
      return createSvgCursor(`<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" fill="${cursorFill}" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`, 2, 22);
    } else if (currentTool === 'stamp') {
      return createSvgCursor(`<path d="M5 22h14M5 18h14M10 14h4l1.5-6h-7L10 14Z" fill="${cursorFill}" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="5" r="2" fill="${cursorColor}"/>`, 12, 18);
    } else if (currentTool === 'eraser') {
      return createSvgCursor(`<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" fill="${cursorFill}" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 21H7" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m5 11 9 9" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`, 2, 22);
    } else if (currentTool === 'ai-colorize') {
      return createSvgCursor(`<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" fill="${cursorFill}" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m5 2 5 5" stroke="${cursorColor}" stroke-width="2"/><path d="M2 13h15" stroke="${cursorColor}" stroke-width="2"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" stroke="${cursorColor}" stroke-width="2"/>`, 2, 22);
    } else if (currentTool === 'ai-eraser') {
      return createSvgCursor(`<path d="m9.937 15.5 2.561-2.561a1.53 1.53 0 0 1 2.161 0l5.682 5.682a1.53 1.53 0 0 1 0 2.162l-1.14 1.14a1.53 1.53 0 0 1-2.162 0L11.357 16.24" fill="${cursorFill}" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m13 10.736-2.561-2.561a1.53 1.53 0 0 0-2.161 0l-5.682 5.682a1.53 1.53 0 0 0 0 2.162l1.14 1.14a1.53 1.53 0 0 0 2.162 0L11.58 11.47" stroke="${cursorColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m10.5 14.5 3-3" stroke="${cursorColor}" stroke-width="2"/><path d="M6 10V8a2 2 0 0 1 2-2h2" stroke="${cursorColor}" stroke-width="2"/><path d="M14 4h2a2 2 0 0 1 2 2v2" stroke="${cursorColor}" stroke-width="2"/><path d="m14 14 3 3" stroke="${cursorColor}" stroke-width="2"/>`, 2, 22);
    }
    
    const pointerSvg = `<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="${cursorColor}" stroke="${cursorStroke}" stroke-width="1.5" stroke-linejoin="round"/>`;
    return createSvgCursor(pointerSvg, 0, 0);
  };

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none pointer-events-auto"
        onPointerDown={startInteraction}
        onPointerMove={interact}
        onPointerUp={stopInteraction}
        onPointerCancel={stopInteraction}
        onPointerLeave={(e) => {
          hoverCoordRef.current = null;
          stopInteraction(e);
          redrawRef.current();
        }}
        onWheel={handleWheel}
        style={{ backgroundColor: 'transparent', cursor: getCursor() }}
      />
      
      {/* AI Target Bounding Box Preview Overlay & Confirmation Popup */}
      <AiTargetPreviewOverlay />
    </div>
  );
}
