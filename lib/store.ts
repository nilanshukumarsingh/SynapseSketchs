import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type Tool = 'pencil' | 'eraser' | 'ascii' | 'ai-colorize' | 'ai-eraser' | 'hand' | 'text' | 'stamp';
export type Size = 'thin' | 'medium' | 'thick' | number;
export type Theme = 'light' | 'dark';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity?: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  tool: Tool;
  color: string;
  size: Size;
  points: Point[];
  layerId: string;
  text?: string;
  fill?: boolean;
  createdByAI?: boolean;
  stampId?: string;
  stampScale?: number;
  stampRotation?: number;
}

export interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  author: 'human' | 'ai';
}

export interface AiMemoryItem {
  prompt: string;
  recognizedObject: string;
  box: { x: number; y: number; width: number; height: number };
  timestamp: number;
}

export interface Settings {
  autoDraw: boolean;
  temperature: number;
  maxTokens: number;
  apiProvider: 'gemini' | 'claude';
  geminiApiKey: string;
  claudeApiKey: string;
  geminiModel: string;
  claudeModel: string;
  skipClearConfirmation: boolean;
  audioFeedback: boolean;
}

export interface AiPreviewBox {
  x: number;
  y: number;
  width: number;
  height: number;
  prompt: string;
  confirmed?: boolean;
}

interface AppState {
  theme: Theme;
  layers: Layer[];
  activeLayerId: string;
  strokes: Stroke[];
  history: Stroke[][];
  historyStep: number;
  comments: Comment[];
  currentTool: Tool;
  currentColor: string;
  currentSize: Size;
  settings: Settings;
  isSettingsOpen: boolean;
  offset: Point;
  scale: number;
  socket: Socket | null;
  backgroundImage: string | null;
  roomId: string;
  topMessage: string;
  aiThoughts: string;
  asciiChar: string;
  aiCursor: Point | null;
  sessionTokens: number;
  isGenerating: boolean;
  isGeneratingBg: boolean;
  latestHumanStrokeStartIndex: number;
  showMinimap: boolean;
  setShowMinimap: (val: boolean) => void;
  quotaError: { model: string; message: string; provider: string } | null;
  setQuotaError: (val: { model: string; message: string; provider: string } | null) => void;
  aiPreviewBox: AiPreviewBox | null;
  setAiPreviewBox: (box: AiPreviewBox | null) => void;
  updateAiPreviewBoxPos: (x: number, y: number, width: number, height: number) => void;
  aiMemory: AiMemoryItem[];
  addAiMemory: (item: AiMemoryItem) => void;
  clearAiMemory: () => void;
  
  initSocket: (roomId: string) => void;
  addStroke: (stroke: Stroke, emit?: boolean) => void;
  updateLastStroke: (point: Point, emit?: boolean) => void;
  updateStrokeById: (id: string, point: Point, emit?: boolean) => void;
  updateStrokePointsById: (id: string, newPoints: Point[], emit?: boolean) => void;
  finishStroke: () => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: (emit?: boolean) => void;
  eraseLatestHumanStrokes: () => void;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setSize: (size: Size) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  toggleSettings: () => void;
  addComment: (comment: Comment, emit?: boolean) => void;
  setOffset: (offset: Point | ((prev: Point) => Point)) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;
  setBackgroundImage: (url: string | null, emit?: boolean) => void;
  setTopMessage: (msg: string) => void;
  setAiThoughts: (thoughts: string) => void;
  setTheme: (theme: Theme) => void;
  setActiveLayer: (layerId: string) => void;
  addLayer: (layer: Layer) => void;
  deleteLayer: (layerId: string) => void;
  reorderLayers: (layers: Layer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  renameLayer: (layerId: string, newName: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  duplicateLayer: (layerId: string) => void;
  clearLayer: (layerId: string) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  showAllLayers: () => void;
  hideAllLayers: () => void;
  setAsciiChar: (char: string) => void;
  setAiCursor: (point: Point | null) => void;
  setIsGenerating: (val: boolean) => void;
  setIsGeneratingBg: (val: boolean) => void;
  addTokens: (tokens: number) => void;
  isExportOpen: boolean;
  setIsExportOpen: (val: boolean) => void;
  isAiOpen: boolean;
  setIsAiOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  isLayersOpen: boolean;
  setIsLayersOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  selectedStampId: string;
  setSelectedStampId: (id: string) => void;
  stampFilled: boolean;
  setStampFilled: (val: boolean | ((prev: boolean) => boolean)) => void;
  stampScale: number;
  setStampScale: (scale: number | ((prev: number) => number)) => void;
  stampRotation: number;
  setStampRotation: (rot: number | ((prev: number) => number)) => void;
  isStampPickerOpen: boolean;
  setIsStampPickerOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  restoreDraft: (draft: { strokes: Stroke[]; layers?: Layer[]; activeLayerId?: string; backgroundImage?: string | null }) => void;
}

export const useStore = create<AppState>((set, get) => ({
  theme: 'light',
  layers: [
    { id: 'layer-bg', name: 'Background', visible: true, locked: false },
    { id: 'layer-fg', name: 'Foreground', visible: true, locked: false }
  ],
  activeLayerId: 'layer-fg',
  strokes: [],
  history: [[]],
  historyStep: 0,
  comments: [],
  currentTool: 'pencil',
  currentColor: '#000000',
  currentSize: 'medium',
  settings: {
    autoDraw: false,
    temperature: 1.0,
    maxTokens: 8192,
    apiProvider: 'gemini',
    geminiApiKey: '',
    claudeApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    claudeModel: 'claude-3-5-sonnet-latest',
    skipClearConfirmation: false,
    audioFeedback: true,
  },
  isSettingsOpen: false,
  offset: { x: 0, y: 0 },
  scale: 1,
  socket: null,
  backgroundImage: null,
  roomId: 'default',
  topMessage: 'Oh. A blank canvas. Hi.',
  aiThoughts: '',
  asciiChar: '',
  aiCursor: null,
  sessionTokens: 0,
  isGenerating: false,
  isGeneratingBg: false,
  latestHumanStrokeStartIndex: 0,
  showMinimap: false,
  quotaError: null,
  isExportOpen: false,
  setIsExportOpen: (val) => set({ isExportOpen: val }),
  isAiOpen: false,
  setIsAiOpen: (val) => set((state) => ({ isAiOpen: typeof val === 'function' ? val(state.isAiOpen) : val })),
  isLayersOpen: false,
  setIsLayersOpen: (val) => set((state) => ({ isLayersOpen: typeof val === 'function' ? val(state.isLayersOpen) : val })),
  selectedStampId: 'star',
  setSelectedStampId: (id) => set({ selectedStampId: id }),
  stampFilled: false,
  setStampFilled: (val) => set((state) => ({ stampFilled: typeof val === 'function' ? val(state.stampFilled) : val })),
  stampScale: 1,
  setStampScale: (scale) => set((state) => ({ stampScale: typeof scale === 'function' ? scale(state.stampScale) : scale })),
  stampRotation: 0,
  setStampRotation: (rot) => set((state) => ({ stampRotation: typeof rot === 'function' ? rot(state.stampRotation) : rot })),
  isStampPickerOpen: false,
  setIsStampPickerOpen: (val) => set((state) => ({ isStampPickerOpen: typeof val === 'function' ? val(state.isStampPickerOpen) : val })),
  aiPreviewBox: null,
  setAiPreviewBox: (box) => set({ aiPreviewBox: box }),
  updateAiPreviewBoxPos: (x, y, width, height) => set((state) => ({
    aiPreviewBox: state.aiPreviewBox ? { ...state.aiPreviewBox, x, y, width, height } : null
  })),
  aiMemory: [],
  addAiMemory: (item) => set((state) => ({ aiMemory: [...state.aiMemory.slice(-10), item] })),
  clearAiMemory: () => set({ aiMemory: [] }),
  setQuotaError: (val) => set({ quotaError: val }),

  initSocket: (roomId: string) => {
    if (get().socket) return;
    
    const socket = io({ path: '/api/socket', query: { room: roomId } });
    
    socket.on('init', (data: { strokes: Stroke[], comments: Comment[], backgroundImage: string | null }) => {
      set({ strokes: data.strokes, comments: data.comments, backgroundImage: data.backgroundImage, history: [data.strokes], historyStep: 0, roomId, latestHumanStrokeStartIndex: data.strokes.length });
    });

    socket.on('stroke:add', (stroke: Stroke) => {
      set((state) => ({ strokes: [...state.strokes, stroke] }));
    });

    socket.on('stroke:update', ({ id, point }: { id: string, point: Point }) => {
      set((state) => {
        const strokes = [...state.strokes];
        const stroke = strokes.find(s => s.id === id);
        if (stroke) {
          stroke.points.push(point);
        }
        return { strokes };
      });
    });

    socket.on('comment:add', (comment: Comment) => {
      set((state) => ({ comments: [...state.comments, comment] }));
    });

    socket.on('canvas:clear', () => {
      set((state) => {
        const newHistory = state.history.slice(0, state.historyStep + 1);
        newHistory.push([]);
        return { strokes: [], comments: [], backgroundImage: null, history: newHistory, historyStep: newHistory.length - 1, latestHumanStrokeStartIndex: 0 };
      });
    });

    socket.on('background:set', (url: string | null) => {
      set({ backgroundImage: url });
    });

    socket.on('message:set', (msg: string) => {
      set({ topMessage: msg });
    });

    set({ socket });
  },

  addStroke: (stroke, emit = true) => {
    set((state) => {
      const newStrokes = [...state.strokes, stroke];
      if (emit && state.socket) {
        state.socket.emit('stroke:add', stroke);
      }
      return { strokes: newStrokes };
    });
  },
  updateLastStroke: (point, emit = true) => {
    set((state) => {
      const strokes = [...state.strokes];
      if (strokes.length > 0) {
        const lastStroke = { ...strokes[strokes.length - 1] };
        lastStroke.points = [...lastStroke.points, point];
        strokes[strokes.length - 1] = lastStroke;
        
        if (emit && state.socket) {
          state.socket.emit('stroke:update', { id: lastStroke.id, point });
        }
      }
      return { strokes };
    });
  },
  updateStrokeById: (id, point, emit = true) => {
    set((state) => {
      const strokes = [...state.strokes];
      const strokeIndex = strokes.findIndex(s => s.id === id);
      if (strokeIndex !== -1) {
        const targetStroke = { ...strokes[strokeIndex] };
        targetStroke.points = [...targetStroke.points, point];
        strokes[strokeIndex] = targetStroke;
        
        if (emit && state.socket) {
          state.socket.emit('stroke:update', { id: targetStroke.id, point });
        }
      }
      return { strokes };
    });
  },
  updateStrokePointsById: (id, newPoints, emit = true) => {
    set((state) => {
      const strokes = [...state.strokes];
      const strokeIndex = strokes.findIndex(s => s.id === id);
      if (strokeIndex !== -1) {
        const targetStroke = { ...strokes[strokeIndex] };
        targetStroke.points = [...targetStroke.points, ...newPoints];
        strokes[strokeIndex] = targetStroke;
        
        if (emit && state.socket) {
          newPoints.forEach(point => {
             state.socket?.emit('stroke:update', { id: targetStroke.id, point });
          });
        }
      }
      return { strokes };
    });
  },
  finishStroke: () => set((state) => {
    let currentStrokes = [...state.strokes];
    const lastStroke = currentStrokes[currentStrokes.length - 1];

    if (lastStroke && (lastStroke.tool === 'eraser' || lastStroke.tool === 'ai-eraser') && lastStroke.points.length > 0) {
      const getLineWidth = (size: Size) => {
        if (typeof size === 'number') return size;
        switch (size) {
          case 'thin': return 2;
          case 'medium': return 6;
          case 'thick': return 12;
          default: return 6;
        }
      };

      const eraserRadius = (getLineWidth(lastStroke.size) * 4) / 2 + 8;
      const eraserPts = lastStroke.points;
      const r2 = eraserRadius * eraserRadius;

      // Distance from point to line segment squared
      const distToSegmentSq = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (l2 === 0) {
          const dx = px - x1, dy = py - y1;
          return dx * dx + dy * dy;
        }
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const dx = px - projX, dy = py - projY;
        return dx * dx + dy * dy;
      };

      const isPointErased = (pt: Point) => {
        for (let j = 0; j < eraserPts.length; j++) {
          const ePt = eraserPts[j];
          const dx = pt.x - ePt.x;
          const dy = pt.y - ePt.y;
          if (dx * dx + dy * dy <= r2) return true;
          if (j > 0) {
            const prev = eraserPts[j - 1];
            if (distToSegmentSq(pt.x, pt.y, prev.x, prev.y, ePt.x, ePt.y) <= r2) return true;
          }
        }
        return false;
      };

      // Recalculate prior strokes: split and prune node points that fall within eraser radius
      const recalculatedStrokes: Stroke[] = [];
      for (let i = 0; i < currentStrokes.length - 1; i++) {
        const s = currentStrokes[i];
        if (s.tool === 'eraser' || s.tool === 'ai-eraser') {
          // Do not keep old eraser strokes in vector history
          continue;
        }

        // Split continuous points into sub-paths where points are erased
        const subPaths: Point[][] = [];
        let currentSegment: Point[] = [];

        for (const pt of s.points) {
          if (!isPointErased(pt)) {
            currentSegment.push(pt);
          } else {
            if (currentSegment.length > 0) {
              subPaths.push(currentSegment);
              currentSegment = [];
            }
          }
        }
        if (currentSegment.length > 0) {
          subPaths.push(currentSegment);
        }

        // Filter out tiny crumb remnants (artifacts with total length < 4px)
        for (let k = 0; k < subPaths.length; k++) {
          const path = subPaths[k];
          if (path.length === 0) continue;
          if (path.length === 1) {
            // Lone dot artifact: discard to eliminate remnant crumbs
            continue;
          }
          let totalLen = 0;
          for (let m = 1; m < path.length; m++) {
            totalLen += Math.hypot(path[m].x - path[m - 1].x, path[m].y - path[m - 1].y);
          }
          if (totalLen >= 4) {
            recalculatedStrokes.push({
              ...s,
              id: `${s.id}-split-${k}`,
              points: path
            });
          }
        }
      }
      // Cleanly replace strokes array without the eraser artifact stroke
      currentStrokes = recalculatedStrokes;
    }

    const newHistory = state.history.slice(0, state.historyStep + 1);
    newHistory.push(currentStrokes);
    return { strokes: currentStrokes, history: newHistory, historyStep: newHistory.length - 1 };
  }),
  undo: () => set((state) => {
    if (state.historyStep > 0) {
      const newStep = state.historyStep - 1;
      return { historyStep: newStep, strokes: [...state.history[newStep]] };
    }
    return state;
  }),
  redo: () => set((state) => {
    if (state.historyStep < state.history.length - 1) {
      const newStep = state.historyStep + 1;
      return { historyStep: newStep, strokes: [...state.history[newStep]] };
    }
    return state;
  }),
  clearCanvas: (emit = true) => set((state) => {
    const newHistory = state.history.slice(0, state.historyStep + 1);
    newHistory.push([]);
    if (emit && state.socket) {
      state.socket.emit('canvas:clear');
    }
    return { strokes: [], comments: [], history: newHistory, historyStep: newHistory.length - 1, latestHumanStrokeStartIndex: 0 };
  }),
  restoreDraft: (draft) => set((state) => {
    const newLayers = draft.layers && draft.layers.length > 0 ? draft.layers : state.layers;
    const newActiveId = draft.activeLayerId && newLayers.some(l => l.id === draft.activeLayerId)
      ? draft.activeLayerId
      : (newLayers[0]?.id || state.activeLayerId);
    const newStrokes = [...draft.strokes];
    return {
      strokes: newStrokes,
      layers: newLayers,
      activeLayerId: newActiveId,
      backgroundImage: draft.backgroundImage !== undefined ? draft.backgroundImage : state.backgroundImage,
      history: [newStrokes],
      historyStep: 0,
      latestHumanStrokeStartIndex: newStrokes.length
    };
  }),
  eraseLatestHumanStrokes: () => set((state) => {
    const strokes = state.strokes;
    if (strokes.length === 0) return {};

    // Find the last user-drawn stroke
    let lastHumanIndex = -1;
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (!strokes[i].createdByAI) {
        lastHumanIndex = i;
        break;
      }
    }

    if (lastHumanIndex === -1) {
      // No human strokes found on the canvas to erase!
      return {};
    }

    // Trace backwards to locate the starting boundary of this specific contiguous user sketching block.
    // This defines the "latest drawing" they made, bounded naturally by any AI strokes or canvas edges.
    let startHumanIndex = lastHumanIndex;
    while (startHumanIndex > 0 && !strokes[startHumanIndex - 1].createdByAI) {
      startHumanIndex--;
    }

    // Splice out the contiguous human stroke stream, keeping both historical and future portions
    const newStrokes = [
      ...strokes.slice(0, startHumanIndex),
      ...strokes.slice(lastHumanIndex + 1)
    ];

    const newHistory = state.history.slice(0, state.historyStep + 1);
    newHistory.push(newStrokes);

    return { 
      strokes: newStrokes, 
      history: newHistory, 
      historyStep: newHistory.length - 1,
      latestHumanStrokeStartIndex: newStrokes.length
    };
  }),
  setTool: (tool) => set({ currentTool: tool }),
  setColor: (color) => set({ currentColor: color }),
  setSize: (size) => set({ currentSize: size }),
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  addComment: (comment, emit = true) => set((state) => {
    if (emit && state.socket) {
      state.socket.emit('comment:add', comment);
    }
    return { comments: [...state.comments, comment] };
  }),
  setOffset: (offset) => set((state) => ({ 
    offset: typeof offset === 'function' ? offset(state.offset) : offset 
  })),
  setScale: (scale) => set((state) => ({ 
    scale: typeof scale === 'function' ? scale(state.scale) : scale 
  })),
  setBackgroundImage: (url, emit = true) => set((state) => {
    if (emit && state.socket) {
      state.socket.emit('background:set', url);
    }
    return { backgroundImage: url };
  }),
  setTopMessage: (msg, emit = true) => set((state) => {
    if (emit && state.socket) {
      state.socket.emit('message:set', msg);
    }
    return { topMessage: msg };
  }),
  setAiThoughts: (thoughts) => set({ aiThoughts: thoughts }),
  setTheme: (theme) => set({ theme }),
  setActiveLayer: (layerId) => set({ activeLayerId: layerId }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  deleteLayer: (layerId) => set((state) => {
    if (state.layers.length <= 1) return state; // Keep at least one layer
    const remainingLayers = state.layers.filter(l => l.id !== layerId);
    const newActiveId = state.activeLayerId === layerId ? remainingLayers[0].id : state.activeLayerId;
    // Filter out strokes on deleted layer or move to first remaining layer
    const newStrokes = state.strokes.filter(s => s.layerId !== layerId);
    const newHistory = state.history.slice(0, state.historyStep + 1);
    newHistory.push(newStrokes);
    return {
      layers: remainingLayers,
      activeLayerId: newActiveId,
      strokes: newStrokes,
      history: newHistory,
      historyStep: newHistory.length - 1
    };
  }),
  reorderLayers: (newLayers) => set({ layers: newLayers }),
  toggleLayerVisibility: (layerId) => set((state) => ({
    layers: state.layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
  })),
  toggleLayerLock: (layerId) => set((state) => ({
    layers: state.layers.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l)
  })),
  renameLayer: (layerId, newName) => set((state) => ({
    layers: state.layers.map(l => l.id === layerId ? { ...l, name: newName.trim() || l.name } : l)
  })),
  setLayerOpacity: (layerId, opacity) => set((state) => ({
    layers: state.layers.map(l => l.id === layerId ? { ...l, opacity: Math.max(0.05, Math.min(1, opacity)) } : l)
  })),
  duplicateLayer: (layerId) => set((state) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return state;
    const newId = `layer-${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: `${layer.name} (Copy)`,
      visible: true,
      locked: false,
      opacity: layer.opacity ?? 1
    };
    // Duplicate all strokes belonging to the original layer
    const sourceStrokes = state.strokes.filter(s => (s.layerId || 'layer-fg') === layerId);
    const duplicatedStrokes: Stroke[] = sourceStrokes.map(s => ({
      ...s,
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      layerId: newId,
      points: s.points.map(p => ({ ...p }))
    }));
    const newStrokes = [...state.strokes, ...duplicatedStrokes];
    const newHistory = state.history.slice(0, state.historyStep + 1);
    newHistory.push(newStrokes);
    return {
      layers: [...state.layers, newLayer],
      activeLayerId: newId,
      strokes: newStrokes,
      history: newHistory,
      historyStep: newHistory.length - 1
    };
  }),
  clearLayer: (layerId) => set((state) => {
    const newStrokes = state.strokes.filter(s => (s.layerId || 'layer-fg') !== layerId);
    const newHistory = state.history.slice(0, state.historyStep + 1);
    newHistory.push(newStrokes);
    return {
      strokes: newStrokes,
      history: newHistory,
      historyStep: newHistory.length - 1
    };
  }),
  moveLayer: (layerId, direction) => set((state) => {
    const idx = state.layers.findIndex(l => l.id === layerId);
    if (idx === -1) return state;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= state.layers.length) return state;
    const newLayers = [...state.layers];
    const [moved] = newLayers.splice(idx, 1);
    newLayers.splice(targetIdx, 0, moved);
    return { layers: newLayers };
  }),
  showAllLayers: () => set((state) => ({
    layers: state.layers.map(l => ({ ...l, visible: true }))
  })),
  hideAllLayers: () => set((state) => ({
    layers: state.layers.map(l => ({ ...l, visible: false }))
  })),
  setAsciiChar: (char) => set({ asciiChar: char }),
  setAiCursor: (point) => set({ aiCursor: point }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setIsGeneratingBg: (val) => set({ isGeneratingBg: val }),
  addTokens: (tokens) => set((state) => ({ sessionTokens: state.sessionTokens + tokens })),
  setShowMinimap: (val) => set({ showMinimap: val }),
}));
