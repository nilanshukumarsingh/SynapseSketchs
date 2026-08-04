import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type Tool = 'pencil' | 'eraser' | 'ascii' | 'ai-colorize' | 'ai-eraser' | 'hand' | 'text';
export type Size = 'thin' | 'medium' | 'thick' | number;
export type Theme = 'light' | 'dark';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface Point {
  x: number;
  y: number;
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
}

export interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  author: 'human' | 'ai';
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
  reorderLayers: (layers: Layer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setAsciiChar: (char: string) => void;
  setAiCursor: (point: Point | null) => void;
  setIsGenerating: (val: boolean) => void;
  setIsGeneratingBg: (val: boolean) => void;
  addTokens: (tokens: number) => void;
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
    const newHistory = state.history.slice(0, state.historyStep + 1);
    newHistory.push([...state.strokes]);
    return { history: newHistory, historyStep: newHistory.length - 1 };
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
  reorderLayers: (newLayers) => set({ layers: newLayers }),
  toggleLayerVisibility: (layerId) => set((state) => ({
    layers: state.layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
  })),
  toggleLayerLock: (layerId) => set((state) => ({
    layers: state.layers.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l)
  })),
  setAsciiChar: (char) => set({ asciiChar: char }),
  setAiCursor: (point) => set({ aiCursor: point }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setIsGeneratingBg: (val) => set({ isGeneratingBg: val }),
  addTokens: (tokens) => set((state) => ({ sessionTokens: state.sessionTokens + tokens })),
  setShowMinimap: (val) => set({ showMinimap: val }),
}));
