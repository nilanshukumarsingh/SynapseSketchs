import { useStore, Stroke } from './store';

// Sound helper
export const playSound = (frequency: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
  try {
    if (typeof window === 'undefined') return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    if (type === 'sine' || type === 'triangle') {
      oscillator.frequency.exponentialRampToValueAtTime(frequency / 2, audioCtx.currentTime + duration);
    }
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Ignore audio errors
  }
};

export async function handleGenerateBg(prompt: string, onGeneratingStateChange?: (state: boolean) => void) {
  const { setTopMessage, setBackgroundImage, settings, addTokens } = useStore.getState();
  
  onGeneratingStateChange?.(true);
  setTopMessage("Generating background image...");
  playSound(880, 'sine', 0.2);

  try {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error("Drawing canvas not found");
    const base64Data = canvas.toDataURL('image/png');

    const response = await fetch('/api/generate-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image: base64Data,
        settings
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to generate bg");
    }

    const data = await response.json();
    const imageUrl = data.imageUrl;

    // Rough token tracking for bg (images are fixed cost usually, but we'll estimate)
    addTokens(1500);
    
    if (imageUrl) {
      setBackgroundImage(imageUrl);
      setTopMessage("Background generated successfully!");
      playSound(600, 'triangle', 0.3);
      return true;
    } else {
      throw new Error("No image generated");
    }
  } catch (error: any) {
    console.error('Error generating background:', error);
    const msg = (error.message || "").toLowerCase();
    const isQuota = msg.includes('quota') || msg.includes('429') || msg.includes('limit') || msg.includes('exhausted') || msg.includes('resource_exhausted') || msg.includes('rate');
    
    if (isQuota) {
      useStore.getState().setQuotaError({
        model: 'gemini-2.5-flash-image',
        message: error.message || "Quota exceeded. This sketch feature is in high demand right now.",
        provider: 'gemini'
      });
      setTopMessage("Daily quota limit exceeded! Click Settings to enter API Key ⚠️");
    } else {
      setTopMessage("Failed to generate background. Try another prompt.");
    }
    playSound(200, 'sawtooth', 0.3);
    return false;
  } finally {
    onGeneratingStateChange?.(false);
  }
}

export async function handleAiAction(promptText?: string, onGeneratingStateChange?: (state: boolean) => void) {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  const { strokes, currentTool, currentColor, currentSize, theme, activeLayerId, layers, offset, scale, setTopMessage, setAiThoughts, setAiCursor, addStroke, updateLastStroke, finishStroke, settings } = useStore.getState();

  let finalPrompt = promptText || "Analyze the sketch within the workspace boundary, and gracefully complete/improve it using beautiful shapes or Standard SVGs (like standard heart/tree/dog/cat paths). If a bounding box is focused, trace your corrected vector shapes strictly inside that box so it perfectly replaces my messy lines. Maintain style as line-art (outline, 'fill': false) unless I asked for color.";  
  
  if (promptText) {
      finalPrompt += `\n\nCRITICAL INSTRUCTION: Read the user's prompt carefully to determine the desired style! 
      - If they ask for "filled", "detailed", "full scene", or a complex character (like anime, Luffy, etc.), you MUST generate a highly detailed, multi-colored composition using \`"fill": true\` on multiple overlapping strokes! NEVER draw a stick figure or simple outlines if they ask for a detailed or filled scene.
      - OTHERWISE, if they do NOT explicitly ask for colors/fill, default to drawing a simple line-art outline without fill (\`"fill": false\`). 
      - If they ask for a complex object like a "bike" or "bicycle" or "car" or "heart" or "tree", you MUST use the provided Standard SVG string perfectly! Do not try to hallucinate an SVG for standard recognized objects.
      - PRESERVATION RULE: If you are adding to or correcting a sketch, align your new shapes to the bounding box of the latest sketch. Do not modify or replace pristine finished drawings on other parts of the canvas.
      Adapt your shape complexity and fill properties to exactly what they request! Make the final result impressively high-quality!`;
  }

  if (currentTool === 'ai-colorize') {
    finalPrompt = "Colorize the outlines in this drawing. Intelligently suggest and apply colors to the sketches, using a wider palette and considering context. Analyze shapes and suggest complementary colors or a coherent color theme. Output multiple overlapping filled shapes (`\"fill\": true`) or thick strokes with `ai-colorize` tool to form a beautiful colored image!";
  } else if (currentTool === 'ai-eraser') {
    finalPrompt = "Clean up the drawing. Remove messy lines or scribbles by drawing over them with background colors.";
  }

  // Extract conversational context from previous AI prompt histories stored in strokes memory
  let conversationHistory = "";
  const recentStrokes = strokes.slice(-20);
  const aiMemory = recentStrokes.filter(s => s.tool === 'text' && s.text?.startsWith('USER:'));
  if (aiMemory.length > 0) {
      conversationHistory = "\nRECENT CONVERSATION HISTORY (Remember previous actions!):\n" + aiMemory.slice(-3).map(s => `- ${s.text}`).join('\n');
  }

  // Smart contiguous user drawing segment tracking (e.g. tracking tree vs car)
  let latestHumanStrokes: Stroke[] = [];
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    if (s.createdByAI) {
      break; // Stop at the last AI element: only isolate what the human drew *just now*!
    }
    if (!s.createdByAI && s.tool !== 'text' && s.points.length > 0) {
      latestHumanStrokes.unshift(s);
    }
  }

  let recentStrokeInfo = "";
  let pMinX = 0, pMaxX = 0, pMinY = 0, pMaxY = 0;
  let hasLatestHumanBbox = false;

  if (latestHumanStrokes.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    latestHumanStrokes.forEach(s => {
      s.points.forEach(p => {
        if (p.x !== -9999 && p.y !== -9999) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      });
    });

    if (minX !== Infinity) {
      const s = scale || 1;
      pMinX = minX * s + offset.x;
      pMaxX = maxX * s + offset.x;
      pMinY = minY * s + offset.y;
      pMaxY = maxY * s + offset.y;
      hasLatestHumanBbox = true;

      const w = Math.round(pMaxX - pMinX);
      const h = Math.round(pMaxY - pMinY);

      recentStrokeInfo = `
CRITICAL BOUNDED WORKSPACE LIMITS:
- The user's newest/latest messy hand-drawn sketch that you MUST beautify/complete is located strictly inside the box: X: [${Math.round(pMinX)} to ${Math.round(pMaxX)}] (Width: ${w}) and Y: [${Math.round(pMinY)} to ${Math.round(pMaxY)}] (Height: ${h}).
- Your task is to ONLY beautify/replace the drawing inside this SPECIFIC bounding box. DO NOT edit, erase, draw over, or touch any other area of the canvas outside this bounding box.
- Since the user's hand-drawn lines inside this bounding box are messy, you MUST prepend an eraser rectangle at the very beginning of your 'strokes' array matching this boundary EXACTLY to wipe their lines before placing your pristine SVG shape there. Example:
  {
    "tool": "eraser",
    "color": "${theme === 'dark' ? '#0f1115' : '#ffffff'}",
    "size": "thick",
    "shapeType": "rectangle",
    "fill": true,
    "x": ${Math.round(pMinX - 15)},
    "y": ${Math.round(pMinY - 15)},
    "width": ${w + 30},
    "height": ${h + 30}
  }
- PRESERVATION MANDATE: There may be other pristine drawings already on the canvas (like a car drawn previously by AI). You are strictly FORBIDDEN from modifying, erasing, or overlaying them! Leave them in place. Focus 100% of your strokes and surgical erasing ONLY on the bounding box of the user's latest sketch [X: ${Math.round(pMinX)} to ${Math.round(pMaxX)}, Y: ${Math.round(pMinY)} to ${Math.round(pMaxY)}].
`;
    }
  }

  // Backup fallback if we have older strokes but no new contiguous human strokes post-AI
  if (!hasLatestHumanBbox) {
    const visibleStrokes = strokes.filter(s => !s.points.every(p => p.x === -9999 && p.y === -9999));
    const lastStroke = visibleStrokes[visibleStrokes.length - 1];
    if (lastStroke && lastStroke.points.length > 0) {
      const minX = Math.min(...lastStroke.points.map(p => p.x));
      const maxX = Math.max(...lastStroke.points.map(p => p.x));
      const minY = Math.min(...lastStroke.points.map(p => p.y));
      const maxY = Math.max(...lastStroke.points.map(p => p.y));
      const s = scale || 1;
      pMinX = minX * s + offset.x;
      pMaxX = maxX * s + offset.x;
      pMinY = minY * s + offset.y;
      pMaxY = maxY * s + offset.y;
      recentStrokeInfo = `\nCRITICAL FOCUS: The user's most recent stroke region is roughly located between X:${Math.round(pMinX)}-${Math.round(pMaxX)} and Y:${Math.round(pMinY)}-${Math.round(pMaxY)}. Focus on this region to align your shapes beautifully, but ensure previous artwork is respected.`;
    }
  }
  
  // Calculate broadly occupied areas to help AI find empty space
  let allOccupiedInfo = "";
  if (strokes.length > 0) {
    let globalMinX = Infinity, globalMaxX = -Infinity, globalMinY = Infinity, globalMaxY = -Infinity;
    strokes.forEach(s => {
      s.points.forEach(p => {
        if (p.x !== -9999 && p.y !== -9999) {
          if (p.x < globalMinX) globalMinX = p.x;
          if (p.x > globalMaxX) globalMaxX = p.x;
          if (p.y < globalMinY) globalMinY = p.y;
          if (p.y > globalMaxY) globalMaxY = p.y;
        }
      });
    });
    if (globalMinX !== Infinity) {
      const s = scale || 1;
      const gMinX = Math.round(globalMinX * s + offset.x);
      const gMaxX = Math.round(globalMaxX * s + offset.x);
      const gMinY = Math.round(globalMinY * s + offset.y);
      const gMaxY = Math.round(globalMaxY * s + offset.y);
      allOccupiedInfo = `\nOCCUPIED SPACE: The canvas currently has drawings between roughly X:${gMinX} to ${gMaxX} and Y:${gMinY} to ${gMaxY}. If drawing a NEW separate object, you MUST place it completely OUTSIDE this occupied area (e.g., place it at X: ${gMaxX + 150} or Y: ${gMaxY + 150}).`;
    }
  }

  const aiNameDisplay = settings?.apiProvider === 'claude' ? 'Claude' : 'Gemini';

  onGeneratingStateChange?.(true);
  
  const brainstormingMessages = [
    `Brainstorming ideas...`,
    `Analyzing your sketch...`,
    `Preparing perfect shapes...`,
    `Thinking about colors...`,
    `Measuring coordinates...`,
    `Applying artistic touches...`
  ];
  let msgIndex = 0;
  setTopMessage(brainstormingMessages[msgIndex]);
  const brainstormingInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % brainstormingMessages.length;
    useStore.getState().setTopMessage(brainstormingMessages[msgIndex]);
  }, 2000);

  playSound(880, 'sine', 0.2);

  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.fillStyle = theme === 'dark' ? '#0f1115' : '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
    }
    const image = tempCanvas.toDataURL('image/png');
    const base64Data = image.split(',')[1];
    
    const { settings, addTokens } = useStore.getState();
      const systemPrompt = `SYSTEM: Professional Digital Illustrator & AI Assistant.
CANVAS: ${canvas.width}x${canvas.height} pixels.
THEME: ${theme}.
BACKGROUND COLOR: ${theme === 'dark' ? '#0f1115' : '#ffffff'}
ACTIVE SELECTED COLOR: ${currentColor}
ACTIVE SELECTED SIZE: ${currentSize}
${conversationHistory}
${recentStrokeInfo}
${allOccupiedInfo}
USER REQUEST: "${finalPrompt}"

GOAL: Cleanly and beautifully draw, correct, or enhance the sketches on the canvas.
- If a CRITICAL BOUNDED WORKSPACE LIMITS box is provided, your goal is to ONLY draw, complete, or beautify the sketch located inside that specified bounding box. Leave any other beautiful elements outside that box completely untouched!
- If NO bounded workspace limits are provided, analyze the canvas, identify user hand sketches, and beautify/complete them.

DIRECTIONS:
1. RECOGNITION & PLAN: Detail your observations in "thoughts". What did the user draw? What do they want? State your precise strategy, locating the bounding boxes.
2. COMPOSITIONAL INTELLIGENCE: For complex structured objects (bicycles, cars, buildings), you SHOULD COMPUTE the object out of multiple layered geometric primitives! For example, a bike is easily drawn as two mathematically perfect circles for wheels, followed by several thick lines connecting the axles to form the frame, and paths for the handlebar and seat. This uses spatial awareness and produces much more accurate objects than trying to hallucinate a single intricate SVG path.
3. IN-PLACE COMPLETION AND BEAUTIFICATION: When the user asks to complete, beautify, or "Auto-Draw" their sketches, scale and align your shapes EXACTLY over the respective bounding box coordinates of the sketched items. Do not misinterpret abstract outline symbols (like a fluffy outline with a trunk = tree; or a two-lobed symmetrical shape = heart). Translate them accurately to the provided standard shapes instead of hallucinating human anatomical structures. To prevent messy overlapping lines (answering 'why it draw on same drawing which i made???'), you MUST ALWAYS prepend an eraser stroke ('tool: "eraser"', 'shapeType: "rectangle"', with matching coords) at the start of your strokes list FIRST to cleanly wipe the user's messy scribble before tracing your pristine new SVG shape in its place! This guarantees a clean, gorgeous, and professional final artwork. Ensure your eraser is perfectly scaled to the bounds of the sketch being replaced so other drawings are never affected!
4. COLORS & SIZES: Use the ACTIVE SELECTED COLOR (${currentColor}) and ACTIVE SELECTED SIZE (${currentSize}) by default for new strokes unless the user explicitly asks for a different color or brush size.
5. MAGIC ERASER: If tasked with erasing, you MUST use the tool="eraser" property. Do not attempt to draw background-colored shapes.
6. PRIMITIVES & FILL:
   - CRITICAL FILL RULE: If the user draws a simple outline and does NOT ask for it to be filled or colored, YOU MUST keep "fill": false. Do not fill simple outlines! Only use "fill": true if explicitly requested, or if drawing a highly detailed multi-colored character from scratch.
   - To draw solid filled vectors (when appropriate), set "fill": true on the stroke object! If you don't set "fill": true, the shape will ONLY be drawn as a hollow outline.
   - SVG paths (hearts, clouds, dogs, cats, faces, logos, humans, home, tree, bike, car): use shapeType="svg", provide ONLY the raw SVG "d" attribute path string in "svgPath" (NO HTML/XML TAGS). YOU MUST provide "x", "y", "width", and "height" to establish the exact bounding box so the engine can accurately scale your standard path.
   - IMPORTANT: For multi-colored or highly complex objects (like anime characters, specific cartoon figures, detailed humans, animals, logos), YOU MUST NOT use generic or stick-figure outlines. Instead, compose them out of MULTIPLE overlapping strokes in the 'strokes' array! Build the face, hair, iconic clothing, and accessories as separate, rich, full-color SVG paths. For example, if asked for an "anime character" or "Luffy", generate separate colored shapes for the straw hat, the face, hair, eyes, and outfit. Push your capabilities to generate detailed, recognizable SVG paths from your training data!
   - Standard SVGs: CRITICAL: If the user asks for ONE OF THESE objects, YOU MUST ALWAYS USE THE EXACT SVG STRING BELOW instead of hallucinating your own! Use shapeType="svg" with these paths:
     * Bike / Bicycle: "M20,80 A20,20 0 1,0 20,40 A20,20 0 1,0 20,80 M80,80 A20,20 0 1,0 80,40 A20,20 0 1,0 80,80 M20,60 L45,60 L35,25 L70,25 L80,60 M20,60 L35,25 M45,60 L70,25 M80,60 L65,15 L60,15 L75,15 L80,10 M25,25 L45,25 L40,20 L30,20 Z"
     * Happy Face: "M50,95 A45,45 0 1,0 50,5 A45,45 0 1,0 50,95 M25,60 Q50,85 75,60 M35,35 A5,5 0 1,0 35,45 A5,5 0 1,0 35,35 M65,35 A5,5 0 1,0 65,45 A5,5 0 1,0 65,35"
     * Sad Face: "M50,95 A45,45 0 1,0 50,5 A45,45 0 1,0 50,95 M25,75 Q50,50 75,75 M35,35 A5,5 0 1,0 35,45 A5,5 0 1,0 35,35 M65,35 A5,5 0 1,0 65,45 A5,5 0 1,0 65,35"
     * House / Home: "M 50 10 L 10 40 L 10 90 L 90 90 L 90 40 Z M 10 40 L 90 40 M 40 90 L 40 60 L 60 60 L 60 90 Z M 20 50 L 35 50 L 35 65 L 20 65 Z M 65 50 L 80 50 L 80 65 L 65 65 Z"
     * Heart: "M 10,30 A 20,20 0,0,1 50,30 A 20,20 0,0,1 90,30 Q 90,60 50,90 Q 10,60 10,30 z"
     * Star: "M 50,5 L 61,39 L 97,39 L 68,60 L 79,95 L 50,74 L 21,95 L 32,60 L 3,39 L 39,39 z"
     * Cloud: "M 25,60 a 20,20 1 0,0 0,40 h 50 a 20,20 1 0,0 0,-40 a 10,10 1 0,0 -15,-10 a 15,15 1 0,0 -35,10 z"
     * Checkmark: "M 10,50 L 40,80 L 90,20"
     * Basic Stick Figure (ONLY use if explicitly asked for 'stick figure'): "M 50,15 A 10,10 0 1,0 50,35 A 10,10 0 1,0 50,15 Z M 50,35 L 50,70 M 20,45 L 80,45 M 50,70 L 30,95 M 50,70 L 70,95"
     * Sun: "M 50 20 A 30 30 0 1 0 50 80 A 30 30 0 1 0 50 20 M 50 5 L 50 15 M 50 85 L 50 95 M 15 50 L 5 50 M 95 50 L 85 50 M 20 20 L 27 27 M 80 80 L 73 73 M 20 80 L 27 73 M 80 20 L 73 27"
     * Tree: "M 50,10 L 25,40 H 35 L 15,70 H 45 V 93 H 55 V 70 H 85 L 65,40 H 75 Z"
     * Dog: "M309.6 158.5L332.7 19.8C334.6 8.4 344.5 0 356.1 0c7.5 0 14.5 3.5 19 9.5L392 32l52.1 0c12.7 0 24.9 5.1 33.9 14.1L496 64l56 0c13.3 0 24 10.7 24 24l0 24c0 44.2-35.8 80-80 80l-32 0-16 0-21.3 0-5.1 30.5-112-64zM416 256.1L416 480c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-115.2c-24 12.3-51.2 19.2-80 19.2s-56-6.9-80-19.2L160 480c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-230.2c-28.8-10.9-51.4-35.3-59.2-66.5L1 167.8c-4.3-17.1 6.1-34.5 23.3-38.8s34.5 6.1 38.8 23.3l3.9 15.5C70.5 182 83.3 192 98 192l30 0 16 0 159.8 0L416 256.1zM464 80a16 16 0 1 0 -32 0 16 16 0 1 0 32 0z"
     * Cat: "M320 192l17.1 0c22.1 38.3 63.5 64 110.9 64c11 0 21.8-1.4 32-4l0 4 0 32 0 192c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-140.8L280 448l56 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-144 0c-53 0-96-43-96-96l0-223.5c0-16.1-12-29.8-28-31.8l-7.9-1c-17.5-2.2-30-18.2-27.8-35.7s18.2-30 35.7-27.8l7.9 1c48 6 84.1 46.8 84.1 95.3l0 85.3c34.4-51.7 93.2-85.8 160-85.8zm160 26.5s0 0 0 0c-10 3.5-20.8 5.5-32 5.5c-28.4 0-54-12.4-71.6-32c0 0 0 0 0 0c-3.7-4.1-7-8.5-9.9-13.2C357.3 164 352 146.6 352 128c0 0 0 0 0 0l0-96 0-20 0-1.3C352 4.8 356.7 .1 362.6 0l.2 0c3.3 0 6.4 1.6 8.4 4.2c0 0 0 0 0 .1L384 21.3l27.2 36.3L416 64l64 0 4.8-6.4L512 21.3 524.8 4.3c0 0 0 0 0-.1c2-2.6 5.1-4.2 8.4-4.2l.2 0C539.3 .1 544 4.8 544 10.7l0 1.3 0 20 0 96c0 17.3-4.6 33.6-12.6 47.6c-11.3 19.8-29.6 35.2-51.4 42.9zM432 128a16 16 0 1 0 -32 0 16 16 0 1 0 32 0zm48 16a16 16 0 1 0 0-32 16 16 0 1 0 0 32z"
     * Boy: "M50,10 A15,15 0 1,0 50,40 A15,15 0 1,0 50,10 Z M50,40 L50,60 M30,45 L70,45 L70,60 L30,60 Z M50,60 L35,95 M50,60 L65,95 M35,10 C 40,5 60,5 65,10 C 60,15 40,15 35,10 Z"
     * Girl: "M50,15 A12,12 0 1,0 50,39 A12,12 0 1,0 50,15 Z M50,39 L50,48 M40,48 L60,48 L75,70 L25,70 Z M45,70 L45,95 M55,70 L55,95 M38,15 Q25,25 35,39 M62,15 Q75,25 65,39"
     * Car: "M20,60 L30,30 L70,30 L85,60 L95,60 C98,60 100,62 100,65 L100,75 C100,78 98,80 95,80 L90,80 A10,10 0 1,1 70,80 L30,80 A10,10 0 1,1 10,80 L5,80 C2,80 0,78 0,75 L0,65 C0,62 2,60 5,60 L20,60 Z M33,35 L25,55 L45,55 L45,35 Z M50,35 L50,55 L75,55 L68,35 Z"
     * Credit Card: "M 5 20 C 2 20 0 22 0 25 L 0 75 C 0 78 2 80 5 80 L 95 80 C 98 80 100 78 100 75 L 100 25 C 100 22 98 20 95 20 L 5 20 Z M 0 35 L 100 35 L 100 45 L 0 45 Z M 10 55 L 30 55 L 30 65 L 10 65 Z"
   - circle: use shapeType="circle", provide "cx", "cy", "r".
   - rectangle: use shapeType="rectangle", provide "x", "y", "width", "height".
   - line: use shapeType="line", provide "x1", "y1", "x2", "y2".
   - path (hand-drawn style): use shapeType="path" and provide "points" [{x,y}, ...]. DANGER: NEVER use shapeType="path" for complex or entirely new objects. ONLY use it for tiny, simple line corrections. Massive point arrays WILL CRASH the generation limit! ALWAYS prefer "svg", "circle", or "rectangle" instead!
7. COORDINATES: All coordinates must be absolute physical pixel locations mapping from 0 to ${canvas.width} for x, and 0 to ${canvas.height} for y.
8. COMMUNICATION: Provide a short, fun, conversational status update in "topMessage" saying exactly what you did. DO NOT mention technical terms like "SVG", "path", "coordinates", or "JSON". Make it sound like a friendly human artist. YOU MUST ONLY RETURN RAW JSON WITH NO MARKDOWN FORMATTING!`;

    const schemaObj = {
      type: "OBJECT",
      required: ['action', 'topMessage', 'thoughts', 'strokes'],
      properties: {
        action: { type: "STRING", enum: ['draw'] },
        topMessage: { type: "STRING" },
        thoughts: { type: "STRING", description: "Your internal reasoning about the sketch and plan." },
        strokes: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            required: ['tool', 'color', 'size', 'shapeType'],
            properties: {
              tool: { type: "STRING", enum: ['pencil', 'eraser', 'ascii', 'ai-colorize'] },
              color: { type: "STRING" },
              size: { type: "STRING", enum: ['thin', 'medium', 'thick'] },
              shapeType: { type: "STRING", enum: ['path', 'circle', 'rectangle', 'line', 'svg'] },
              fill: { type: "BOOLEAN", description: "Whether the shape should be filled with a solid color instead of just a stroke outine" },
              svgPath: { type: "STRING", description: 'SVG d attribute path string for shapeType svg' },
              cx: { type: "NUMBER", description: 'Center X for circle' },
              cy: { type: "NUMBER", description: 'Center Y for circle' },
              r: { type: "NUMBER", description: 'Radius for circle' },
              x: { type: "NUMBER", description: 'Target-box top-left X coordinate' },
              y: { type: "NUMBER", description: 'Target-box top-left Y coordinate' },
              width: { type: "NUMBER", description: 'Target-box width' },
              height: { type: "NUMBER", description: 'Target-box height' },
              x1: { type: "NUMBER", description: 'Start X for line' },
              y1: { type: "NUMBER", description: 'Start Y for line' },
              x2: { type: "NUMBER", description: 'End X for line' },
              y2: { type: "NUMBER", description: 'End Y for line' },
              points: {
                type: "ARRAY",
                description: 'Used only if shapeType is path',
                items: {
                  type: "OBJECT",
                  required: ['x', 'y'],
                  properties: {
                    x: { type: "NUMBER" },
                    y: { type: "NUMBER" }
                  }
                }
              }
            }
          }
        }
      }
    };

    let data: any = null;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText || null,
          systemPrompt,
          schemaObj,
          image: base64Data,
          settings,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "AI Generation Request failed.");
      }

      data = await response.json();
      if (data.tokensUsed) {
        addTokens(data.tokensUsed);
      }
    } catch (e: any) {
      console.error("AI proxy secure call error:", e);
      throw e;
    }

    if (data && data.topMessage) setTopMessage(data.topMessage);
    else setTopMessage("Drawing completed! ✨");

    if (data && data.thoughts) setAiThoughts(data.thoughts);
    
    if (data && data.action === 'draw' && Array.isArray(data.strokes)) {
          if (data.strokes.length === 0) {
              setTopMessage("AI returned 0 strokes.");
              return;
          }
          
          // Play completion sound effect
          setTimeout(() => playSound(600, 'triangle', 0.1), 0);
          setTimeout(() => playSound(800, 'triangle', 0.15), 100);
          setTimeout(() => playSound(1200, 'sine', 0.2), 250);

          
          const mapPoint = (p: {x: number, y: number}) => {
            const s = scale || 1;
            return {
              x: (p.x - offset.x) / s,
              y: (p.y - offset.y) / s
            };
          };

          for (const stroke of data.strokes) {
            let points: {x: number, y: number}[] = [];
            let subPaths: {x: number, y: number}[][] = [];
            
            // Generate points based on shape primitive
            if (stroke.shapeType === 'circle' && stroke.cx != null && stroke.cy != null && stroke.r != null) {
              const steps = 36;
              for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                // Add a tiny bit of jitter so it looks hand-drawn, unless filled
                const jitter = stroke.fill ? 0 : (Math.random() - 0.5) * 2;
                points.push({
                  x: stroke.cx + Math.cos(angle) * (stroke.r + jitter),
                  y: stroke.cy + Math.sin(angle) * (stroke.r + jitter)
                });
              }
              subPaths.push(points);
            } else if (stroke.shapeType === 'rectangle' && stroke.x != null && stroke.y != null && stroke.width != null && stroke.height != null) {
              points = [
                {x: stroke.x, y: stroke.y},
                {x: stroke.x + stroke.width, y: stroke.y},
                {x: stroke.x + stroke.width, y: stroke.y + stroke.height},
                {x: stroke.x, y: stroke.y + stroke.height},
                {x: stroke.x, y: stroke.y}
              ];
              // Subdivide rectangle lines to make drawing animation smooth
              const subdivided = [];
              for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const steps = Math.max(2, Math.floor(dist / 10));
                for (let j = 0; j <= steps; j++) {
                  const jitterFunc = () => stroke.fill ? 0 : (Math.random() - 0.5) * 1.5;
                  subdivided.push({
                    x: p1.x + (p2.x - p1.x) * (j / steps) + jitterFunc(),
                    y: p1.y + (p2.y - p1.y) * (j / steps) + jitterFunc()
                  });
                }
              }
              subPaths.push(subdivided);
            } else if (stroke.shapeType === 'line' && stroke.x1 != null && stroke.y1 != null && stroke.x2 != null && stroke.y2 != null) {
              const p1 = {x: stroke.x1, y: stroke.y1};
              const p2 = {x: stroke.x2, y: stroke.y2};
              const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              const steps = Math.max(2, Math.floor(dist / 10));
              for (let j = 0; j <= steps; j++) {
                const jitter = stroke.fill ? 0 : (Math.random() - 0.5) * 1.5;
                points.push({
                  x: p1.x + (p2.x - p1.x) * (j / steps) + jitter,
                  y: p1.y + (p2.y - p1.y) * (j / steps) + jitter
                });
              }
              subPaths.push(points);
            } else if (stroke.shapeType === 'svg' && stroke.svgPath) {
              let cleanPath = stroke.svgPath;
              if (cleanPath.includes('d=')) {
                const match = stroke.svgPath.match(/d\s*=\s*(['"])(.*?)\1/i);
                if (match) cleanPath = match[2];
              }
              const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              pathEl.setAttribute('d', cleanPath);
              
              const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svgEl.style.position = 'absolute';
              svgEl.style.opacity = '0';
              svgEl.style.pointerEvents = 'none';
              svgEl.style.width = '100px';
              svgEl.style.height = '100px';
              svgEl.appendChild(pathEl);
              document.body.appendChild(svgEl);
              
              try {
                const bbox = pathEl.getBBox();
                const length = pathEl.getTotalLength();
                
                if (length > 0) {
                  // Default to last drawn stroke if AI hallucinates boundaries
                  // We add a gap (e.g. 20px) to shift it NEXT to the drawing
                  const gap = 20;
                  const defaultW = (typeof pMaxX !== 'undefined' && typeof pMinX !== 'undefined') ? (pMaxX - pMinX) || 100 : bbox.width || 100;
                  const defaultH = (typeof pMaxY !== 'undefined' && typeof pMinY !== 'undefined') ? (pMaxY - pMinY) || 100 : bbox.height || 100;
                  // Shift target X over to right side plus the width and gap
                  const defaultX = typeof pMaxX !== 'undefined' ? (pMaxX + gap) : bbox.x;
                  const defaultY = typeof pMinY !== 'undefined' ? pMinY : bbox.y;

                  let targetX = stroke.x != null ? Number(stroke.x) : defaultX;
                  let targetY = stroke.y != null ? Number(stroke.y) : defaultY;
                  const targetWidth = stroke.width != null ? Number(stroke.width) : defaultW;
                  const targetHeight = stroke.height != null ? Number(stroke.height) : defaultH;

                  // Fallbacks for zero width/height to avoid NaN
                  const safeBboxWidth = bbox.width > 0.1 ? bbox.width : 1;
                  const safeBboxHeight = bbox.height > 0.1 ? bbox.height : 1;
                  const scaleX = targetWidth / safeBboxWidth;
                  const scaleY = targetHeight / safeBboxHeight;
                  
                  const sampleRate = 3;
                  const steps = Math.max(10, Math.floor(length / sampleRate));
                  let currentSubPath: {x: number, y: number}[] = [];
                  let lastSvgPt: DOMPoint | null = null;
                  
                  for (let i = 0; i <= steps; i++) {
                    const p = pathEl.getPointAtLength((i / steps) * length);
                    
                    const mappedX = Number(targetX) + (p.x - bbox.x) * scaleX;
                    const mappedY = Number(targetY) + (p.y - bbox.y) * scaleY;
                    
                    const jitterX = stroke.fill ? 0 : (Math.random() - 0.5) * 1.0;
                    const jitterY = stroke.fill ? 0 : (Math.random() - 0.5) * 1.0;
                    
                    const newPt = { x: mappedX + jitterX, y: mappedY + jitterY };
                    
                    if (currentSubPath.length > 0 && lastSvgPt) {
                      const svgDist = Math.hypot(p.x - lastSvgPt.x, p.y - lastSvgPt.y);
                      const stepLen = length / steps;
                      // Maximum straight-line distance cannot exceed path length. If it does by a margin, it's an M jump!
                      if (svgDist > stepLen * 1.5 + 1) {
                        subPaths.push(currentSubPath);
                        currentSubPath = [];
                      }
                    }
                    currentSubPath.push(newPt);
                    lastSvgPt = p;
                  }
                  if (currentSubPath.length > 0) {
                    subPaths.push(currentSubPath);
                  }
                }
              } catch (e) {
                console.error("Error parsing SVG path:", e);
              } finally {
                if (svgEl.parentNode) document.body.removeChild(svgEl);
              }

              // Log warning if SVG parsing failed entirely 
              if (subPaths.length === 0) {
                console.warn("SVG path empty/failed, dropping invalid shape.", stroke);
                // Fallback: draw a simple rect based on the provided coordinates so the token isn't totally wasted
                const fbX = stroke.x != null ? Number(stroke.x) : 100;
                const fbY = stroke.y != null ? Number(stroke.y) : 100;
                const fbW = stroke.width != null ? Number(stroke.width) : 100;
                const fbH = stroke.height != null ? Number(stroke.height) : 100;
                subPaths.push([
                  {x: fbX, y: fbY},
                  {x: fbX + fbW, y: fbY},
                  {x: fbX + fbW, y: fbY + fbH},
                  {x: fbX, y: fbY + fbH},
                  {x: fbX, y: fbY}
                ]);
              }
            } else if (stroke.shapeType === 'svg') {
                // shapeType was svg but no svgPath provided!
                console.warn("SVG requested but no svgPath provided, dropping invalid shape.", stroke);
            } else if (stroke.points && Array.isArray(stroke.points)) {
              subPaths.push(stroke.points.map((p: any) => ({ x: Number(p.x), y: Number(p.y) })));
            }

            for (let points of subPaths) {
              // Filter out any NaNs which can break drawing
              points = points.filter((p: any) => !isNaN(p.x) && !isNaN(p.y));

              if (!points || points.length === 0) {
                continue;
              }
              
              const newStrokeId = Math.random().toString(36).substr(2, 9);
              const color = stroke.color || (theme === 'dark' ? '#ffffff' : '#000000');
              const size: 'thin' | 'medium' | 'thick' = stroke.size || 'medium';

              const startPoint = mapPoint(points[0]);
              setAiCursor(startPoint);
              let fillVal = stroke.fill;
              if ((stroke.tool === 'eraser' || stroke.tool === 'ai-eraser') &&
                  (stroke.shapeType === 'rectangle' || stroke.shapeType === 'circle')) {
                fillVal = true;
              }

              addStroke({
                id: newStrokeId,
                tool: stroke.tool || 'pencil' as any,
                color,
                size,
                fill: fillVal,
                points: [startPoint],
                layerId: activeLayerId,
                createdByAI: true,
              });
              
              // Smooth observable progressive drawing pace so the user can watch the AI draw step-by-step
              const totalPoints = points.length;
              const BATCH_SIZE = totalPoints > 120 ? 3 : (totalPoints > 40 ? 2 : 1);
              for (let i = 1; i < points.length; i += BATCH_SIZE) {
                const chunk = points.slice(i, i + BATCH_SIZE);
                const mappedChunk = chunk.map(mapPoint);
                useStore.getState().updateStrokePointsById(newStrokeId, mappedChunk);
                const lastP = mappedChunk[mappedChunk.length - 1];
                if (lastP) setAiCursor(lastP);
                const speed = 15;
                await new Promise(r => setTimeout(r, speed));
              }
              finishStroke();
              // A pleasant pen pause before starting the next stroke
              await new Promise(r => setTimeout(r, 70));
            }
            // Pause between major shape elements
            await new Promise(r => setTimeout(r, 150));
          }
          
          // Save conversational history to canvas strokes purely as hidden memory records length
          addStroke({
            id: `ai-history-${Date.now()}`,
            tool: 'text',
            color: 'transparent',
            size: 'thin',
            text: `USER: ${finalPrompt}\n${aiNameDisplay}: Generated ${data.strokes.length} strokes. Message: ${data.topMessage || 'none'}`,
            points: [{x: -9999, y: -9999}], // Hidden far off screen
            layerId: activeLayerId,
            createdByAI: true,
          });

          // CRITICAL: point latestHumanStrokeStartIndex to the new total strokes length!
          useStore.setState({ latestHumanStrokeStartIndex: useStore.getState().strokes.length });
        }
  } catch (error: any) {
    console.error('AI Error:', error);
    const msg = (error.message || "").toLowerCase();
    const isQuota = msg.includes('quota') || msg.includes('429') || msg.includes('limit') || msg.includes('exhausted') || msg.includes('resource_exhausted') || msg.includes('rate');
    
    if (isQuota) {
      useStore.getState().setQuotaError({
        model: settings.apiProvider === 'claude' ? settings.claudeModel : settings.geminiModel,
        message: error.message || "Quota exceeded for Google AI Studio shared client key. Please supply a custom API key.",
        provider: settings.apiProvider || 'gemini'
      });
      setTopMessage("Service rate limit reached ⚠️ Click Settings to add key.");
    } else {
      setTopMessage(error.message || "AI is quiet right now. Try again?");
    }
    playSound(200, 'sawtooth', 0.3);
  } finally {
    clearInterval(brainstormingInterval);
    onGeneratingStateChange?.(false);
    setTimeout(() => setAiCursor(null), 1000);
  }
}
