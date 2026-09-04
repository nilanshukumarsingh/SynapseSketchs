import { useStore, Stroke } from './store';
import { findDatasetDrawing, DATASET_DRAWINGS } from './dataset-drawings';

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

    const rawText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {}

    if (!response.ok) {
      const msg = data?.error || data?.message || (rawText && rawText.length < 200 ? rawText : "Failed to generate bg");
      throw new Error(msg);
    }

    const imageUrl = data?.imageUrl;

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

export function prepareAiTargetPreview(promptText?: string) {
  const { strokes, offset, scale, setAiPreviewBox, aiMemory } = useStore.getState();
  
  let latestHumanStrokes: Stroke[] = [];
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    if (s.createdByAI) break;
    if (!s.createdByAI && s.tool !== 'text' && s.points.length > 0) {
      latestHumanStrokes.unshift(s);
    }
  }

  const canvas = document.querySelector('canvas');
  const canvasW = canvas ? canvas.width : window.innerWidth;
  const canvasH = canvas ? canvas.height : window.innerHeight;

  let boxX = 0, boxY = 0, boxW = 340, boxH = 240;
  const safeTop = 110;
  const safeBottom = Math.max(safeTop, canvasH - boxH - 110);
  const safeLeft = 30;
  const safeRight = Math.max(safeLeft, canvasW - boxW - 30);

  const s = scale || 1;

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
      const pMinX = minX * s + offset.x;
      const pMaxX = maxX * s + offset.x;
      const pMinY = minY * s + offset.y;
      const pMaxY = maxY * s + offset.y;
      boxW = Math.max(160, Math.round(pMaxX - pMinX + 40));
      boxH = Math.max(140, Math.round(pMaxY - pMinY + 40));
      boxX = Math.round(pMinX - 20);
      boxY = Math.round(pMinY - 20);

      // Safe viewport clamping so preview frame is never hidden behind top/bottom toolbars
      boxY = Math.max(safeTop, Math.min(safeBottom, boxY));
      boxX = Math.max(safeLeft, Math.min(safeRight, boxX));
    }
  } else {
    // Check if there is existing artwork already on the canvas (from previous human or AI generations)
    let contentMinX = Infinity, contentMaxX = -Infinity, contentMinY = Infinity, contentMaxY = -Infinity;
    if (strokes.length > 0) {
      strokes.forEach(str => {
        str.points.forEach(p => {
          if (p.x !== -9999 && p.y !== -9999) {
            const sx = p.x * s + offset.x;
            const sy = p.y * s + offset.y;
            if (sx < contentMinX) contentMinX = sx;
            if (sx > contentMaxX) contentMaxX = sx;
            if (sy < contentMinY) contentMinY = sy;
            if (sy > contentMaxY) contentMaxY = sy;
          }
        });
      });
    }

    // Also factor in recent AI memory bounding boxes
    if (aiMemory && aiMemory.length > 0) {
      const lastMem = aiMemory[aiMemory.length - 1];
      if (lastMem && lastMem.box) {
        contentMinX = Math.min(contentMinX, lastMem.box.x);
        contentMaxX = Math.max(contentMaxX, lastMem.box.x + lastMem.box.width);
        contentMinY = Math.min(contentMinY, lastMem.box.y);
        contentMaxY = Math.max(contentMaxY, lastMem.box.y + lastMem.box.height);
      }
    }

    const pLower = (promptText || '').toLowerCase();
    const wantsAnotherSide = /another\s*side|other\s*side|opposite\s*side|different\s*side|elsewhere/i.test(pLower);
    const wantsRight = /\b(right|next\s*to|beside|east)\b/i.test(pLower);
    const wantsLeft = /\b(left|west)\b/i.test(pLower);
    const wantsAbove = /\b(above|top|over|north)\b/i.test(pLower);
    const wantsBelow = /\b(below|bottom|under|south)\b/i.test(pLower);

    if (contentMinX !== Infinity) {
      let candidateX = Math.round(canvasW / 2 - boxW / 2);
      let candidateY = Math.round(Math.max(safeTop, canvasH / 2 - boxH / 2));

      if (wantsLeft) {
        // Explicitly place to the left of existing artwork
        candidateX = contentMinX - boxW - 50;
        candidateY = Math.max(safeTop, Math.min(safeBottom, contentMinY));
        if (candidateX < safeLeft) {
          // Fallback to right side if no room on left
          candidateX = contentMaxX + 50;
        }
      } else if (wantsAbove) {
        // Place above
        candidateX = Math.max(safeLeft, Math.min(safeRight, contentMinX));
        candidateY = contentMinY - boxH - 50;
        if (candidateY < safeTop) {
          candidateY = contentMaxY + 50;
        }
      } else if (wantsBelow) {
        // Place below
        candidateX = Math.max(safeLeft, Math.min(safeRight, contentMinX));
        candidateY = contentMaxY + 50;
        if (candidateY > safeBottom) {
          candidateY = contentMinY - boxH - 50;
        }
      } else if (wantsRight || wantsAnotherSide || strokes.length > 0) {
        // Primary choice: Place on the right side of existing artwork
        candidateX = contentMaxX + 50;
        candidateY = Math.max(safeTop, Math.min(safeBottom, contentMinY));

        // If right side is off screen or full, place to the left
        if (candidateX > safeRight) {
          candidateX = contentMinX - boxW - 50;
          candidateY = Math.max(safeTop, Math.min(safeBottom, contentMinY));

          // If left side is also out of space, place below or above
          if (candidateX < safeLeft) {
            candidateX = Math.round(canvasW / 2 - boxW / 2);
            candidateY = contentMaxY + 50;
            if (candidateY > safeBottom) {
              candidateY = contentMinY - boxH - 50;
            }
          }
        }
      }

      boxX = Math.round(Math.max(safeLeft, Math.min(safeRight, candidateX)));
      boxY = Math.round(Math.max(safeTop, Math.min(safeBottom, candidateY)));
    } else {
      // Blank canvas: Center comfortably
      boxX = Math.round(canvasW / 2 - boxW / 2);
      boxY = Math.round(Math.max(safeTop, canvasH / 2 - boxH / 2));
    }
  }

  // Conversational prompt inheritance: if the user says "draw on another side" or "another one", inherit last recognized object
  let effectivePrompt = promptText || 'Complete drawing / AI embellishment';
  const pLowerTrim = (promptText || '').toLowerCase().trim();
  const isGenericRelational = /^(draw\s+)?(on\s+)?(another|other|opposite)\s*side$/i.test(pLowerTrim) ||
    /^(draw\s+)?(another|one\s+more)(\s+on\s+the\s+(other|another|right|left)\s+side)?$/i.test(pLowerTrim) ||
    /^(draw\s+)?(on\s+the\s+)?(right|left)\s*side$/i.test(pLowerTrim);

  if (isGenericRelational && aiMemory && aiMemory.length > 0) {
    const prevObj = aiMemory[aiMemory.length - 1].recognizedObject || 'drawing';
    effectivePrompt = `Draw ${prevObj} on another side`;
  }

  setAiPreviewBox({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    prompt: effectivePrompt
  });
}

export interface TargetBox {
  x: number;
  y: number;
  width: number;
  height: number;
  prompt?: string;
}

export async function handleAiAction(
  promptText?: string, 
  onGeneratingStateChange?: (state: boolean) => void,
  targetBox?: TargetBox
) {
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

  // Extract conversational & object memory so the AI permanently remembers what has been drawn on canvas!
  let conversationHistory = "";
  const storeAiMemory = useStore.getState().aiMemory || [];
  if (storeAiMemory.length > 0) {
    conversationHistory = "\nOBJECT MEMORY OF PREVIOUSLY DRAWN ITEMS (You MUST remember these objects and their exact canvas locations!):\n" + 
      storeAiMemory.slice(-6).map((m, idx) => 
        `${idx + 1}. Previously drew a "${m.recognizedObject}" at X: [${Math.round(m.box.x)} to ${Math.round(m.box.x + m.box.width)}], Y: [${Math.round(m.box.y)} to ${Math.round(m.box.y + m.box.height)}] for prompt: "${m.prompt}".`
      ).join('\n');
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

  if (targetBox) {
    // Exact user-confirmed target bounding box from visual overlay
    pMinX = targetBox.x;
    pMaxX = targetBox.x + targetBox.width;
    pMinY = targetBox.y;
    pMaxY = targetBox.y + targetBox.height;
    hasLatestHumanBbox = true;

    const w = Math.round(targetBox.width);
    const h = Math.round(targetBox.height);

    recentStrokeInfo = `
CRITICAL USER-CONFIRMED TARGET BOUNDING BOX:
- The user has explicitly confirmed the target drawing location on screen!
- TARGET BOUNDING BOX: X: [${Math.round(pMinX)} to ${Math.round(pMaxX)}] (Width: ${w}) and Y: [${Math.round(pMinY)} to ${Math.round(pMaxY)}] (Height: ${h}).
- YOU MUST DRAW YOUR ARTWORK STRICTLY INSIDE THIS TARGET BOX!
- Set your shape coordinates: "x": ${Math.round(pMinX)}, "y": ${Math.round(pMinY)}, "width": ${w}, "height": ${h}.
- DO NOT draw in any other area of the canvas or relocate to another side!
- PRESERVATION MANDATE: There may be other drawings already on the canvas outside this box. You are strictly FORBIDDEN from modifying or drawing over them. Focus exclusively inside the confirmed box.
`;
  } else if (latestHumanStrokes.length > 0) {
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
    recentStrokeInfo = `\nCRITICAL LAYOUT MANDATE: The user HAS NOT drawn any new human hand strokes on the canvas for this command. The user is asking to add a new object via text prompt. Do NOT erase or draw over existing drawings (such as a previously drawn car)! Place the new object in open, unused canvas space (e.g. adjacent to existing drawings).`;
  }
  
  // Calculate broadly occupied areas to help AI find empty space
  let allOccupiedInfo = "";
  let globalMinX = Infinity, globalMaxX = -Infinity, globalMinY = Infinity, globalMaxY = -Infinity;
  if (strokes.length > 0) {
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
      allOccupiedInfo = `\nOCCUPIED SPACE: The canvas currently has drawings occupying X: ${gMinX} to ${gMaxX} and Y: ${gMinY} to ${gMaxY}.
- When drawing a NEW object (and NOT replacing an existing sketch inside a bounding box), you MUST specify explicit "x" and "y" coordinates for your shapes to place them in OPEN SPACE completely OUTSIDE this occupied area (e.g., set "x": ${Math.min(canvas.width - 250, gMaxX + 60)}, "y": ${gMinY}).`;
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
2. SINGLE OBJECT RULE: When the user asks to draw a requested single object (like a car, bike, house, flower, dog, cat, etc.), generate EXACTLY ONE stroke object in the 'strokes' array! DO NOT repeat the stroke object multiple times, do NOT draw 3 cars or duplicate shapes!
3. IN-PLACE COMPLETION vs NEW OBJECTS:
   - If a CRITICAL BOUNDED WORKSPACE LIMITS box is provided (the user drew a messy hand sketch), scale and align your shapes inside that box and prepend an eraser stroke ('tool': "eraser", 'shapeType': "rectangle") FIRST to wipe their messy lines.
   - If NO bounded workspace limits are provided (user typed a text command like "draw a bike to go with your car"), DO NOT use an eraser stroke! Do NOT overwrite or erase existing artwork! Instead, specify explicit "x" and "y" coordinates to place the new object in open space next to existing drawings!
4. COLORS & SIZES: Use the ACTIVE SELECTED COLOR (${currentColor}) and ACTIVE SELECTED SIZE (${currentSize}) by default for new strokes unless the user explicitly asks for a different color or brush size.
5. MAGIC ERASER: If tasked with erasing, you MUST use the tool="eraser" property. Do not attempt to draw background-colored shapes.
6. PRIMITIVES & FILL:
   - CRITICAL FILL RULE: If the user draws a simple outline and does NOT ask for it to be filled or colored, YOU MUST keep "fill": false. Do not fill simple outlines! Only use "fill": true if explicitly requested, or if drawing a highly detailed multi-colored character from scratch.
   - To draw solid filled vectors (when appropriate), set "fill": true on the stroke object! If you don't set "fill": true, the shape will ONLY be drawn as a hollow outline.
   - SVG paths (hearts, clouds, dogs, cats, faces, logos, humans, home, tree, bike, car): use shapeType="svg", provide ONLY the raw SVG "d" attribute path string in "svgPath" (NO HTML/XML TAGS). YOU MUST provide "x", "y", "width", and "height" to establish the exact bounding box so the engine can accurately scale your standard path.
   - IMPORTANT: For multi-colored or highly complex objects (like anime characters, specific cartoon figures, detailed humans, animals, logos), YOU MUST NOT use generic or stick-figure outlines. Instead, compose them out of MULTIPLE overlapping strokes in the 'strokes' array! Build the face, hair, iconic clothing, and accessories as separate, rich, full-color SVG paths. For example, if asked for an "anime character" or "Luffy", generate separate colored shapes for the straw hat, the face, hair, eyes, and outfit. Push your capabilities to generate detailed, recognizable SVG paths from your training data!
   - Standard SVGs: CRITICAL: If the user asks for ONE OF THESE objects, YOU MUST ALWAYS USE THE EXACT SVG STRING BELOW instead of hallucinating your own! Use shapeType="svg" with these paths:
     * Bike / Bicycle / Cycle / Cycling: "M 20 70 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 M 70 70 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 M 38 70 L 62 70 L 50 35 L 80 35 L 88 70 M 50 35 L 45 22 H 58 M 80 35 L 75 20 H 88 M 62 70 L 38 70"
     * Flower / Rose / Blossom / Plant: "M 50 50 C 50 30 35 30 35 45 C 20 35 20 50 35 55 C 20 65 35 80 45 65 C 50 80 65 80 65 65 C 80 65 80 50 65 55 C 80 35 65 35 55 45 C 55 30 50 30 50 50 Z M 50 65 V 95 M 50 80 C 65 75 75 85 75 85 C 75 85 65 95 50 85 M 50 85 C 35 80 25 90 25 90 C 25 90 35 100 50 90"
     * Airplane / Plane / Aircraft: "M 10 50 L 40 42 L 35 15 L 50 15 L 62 40 L 85 38 C 92 38 98 42 98 48 C 98 54 92 58 85 58 L 62 56 L 50 81 L 35 81 L 40 54 L 10 50 Z"
     * Boat / Ship / Yacht / Sailboat: "M 15 65 L 25 85 H 75 L 85 65 Z M 50 65 V 15 L 80 45 H 50 Z M 45 25 L 25 45 H 45 Z"
     * Fish / Sea creature: "M 85 50 C 60 20 25 30 10 50 C 25 70 60 80 85 50 Z M 85 50 L 100 30 V 70 Z M 30 42 A 3 3 0 1 0 30 46 A 3 3 0 1 0 30 42"
     * Bird / Flying bird: "M 10 50 C 25 30 40 35 50 50 C 60 35 75 30 90 50 C 75 40 60 45 50 60 C 40 45 25 40 10 50 Z"
     * Mountain / Landscape: "M 5 85 L 35 30 L 60 65 L 80 40 L 95 85 Z M 35 30 L 28 42 L 35 40 L 42 45 Z M 80 40 L 74 50 L 80 48 L 86 52 Z"
     * Camera / Photo: "M 15 35 H 32 L 38 25 H 62 L 68 35 H 85 C 88 35 90 37 90 40 V 80 C 90 83 88 85 85 85 H 15 C 12 85 10 83 10 80 V 40 C 10 37 12 35 15 35 Z M 50 45 A 15 15 0 1 0 50 75 A 15 15 0 1 0 50 45 Z"
     * Coffee / Cup / Mug / Tea: "M 20 30 H 70 V 70 C 70 80 60 85 50 85 C 40 85 30 80 30 70 V 30 Z M 70 40 H 82 C 87 40 90 43 90 48 V 58 C 90 63 87 66 82 66 H 70 Z M 15 90 H 75"
     * Apple / Fruit: "M 50 35 C 30 20 10 35 10 60 C 10 85 35 95 50 95 C 65 95 90 85 90 60 C 90 35 70 20 50 35 Z M 50 35 C 50 20 60 10 70 10 M 50 25 C 40 15 30 18 30 18"
     * Rocket / Space / Spaceship: "M 50 10 C 65 30 65 60 65 80 H 35 C 35 60 35 30 50 10 Z M 35 60 L 15 80 V 90 L 35 80 Z M 65 60 L 85 80 V 90 L 65 80 Z M 50 40 A 8 8 0 1 0 50 56 A 8 8 0 1 0 50 40 Z"
     * Lightbulb / Idea / Lamp: "M 50 15 A 25 25 0 0 0 32 58 L 38 72 H 62 L 68 58 A 25 25 0 0 0 50 15 Z M 38 78 H 62 M 42 84 H 58 M 46 90 H 54"
     * Umbrella / Rain: "M 10 50 C 10 25 30 15 50 15 C 70 15 90 25 90 50 C 75 42 65 42 50 50 C 35 42 25 42 10 50 Z M 50 15 V 80 C 50 86 44 90 38 90"
     * Guitar / Music / Note: "M 50 10 L 50 50 C 42 45 30 48 30 58 C 30 68 40 72 50 68 C 60 65 65 55 65 50 V 25 L 85 18 V 40"
     * Butterfly: "M 50 30 V 75 M 50 40 C 30 15 10 20 10 42 C 10 58 35 60 50 50 M 50 40 C 70 15 90 20 90 42 C 90 58 65 60 50 50 M 50 52 C 30 52 15 65 20 80 C 25 90 42 85 50 68 M 50 52 C 70 52 85 65 80 80 C 75 90 58 85 50 68 M 46 22 L 35 10 M 54 22 L 65 10"
     * Crown / King / Queen: "M 15 75 L 10 30 L 32 50 L 50 20 L 68 50 L 90 30 L 85 75 Z M 15 83 H 85"
     * Diamond / Gem / Jewel: "M 50 10 L 85 35 L 50 90 L 15 35 Z M 15 35 H 85 M 35 35 L 50 90 M 65 35 L 50 90 M 35 35 L 50 10 M 65 35 L 50 10"
     * Clock / Time / Watch: "M 50 10 A 40 40 0 1 0 50 90 A 40 40 0 1 0 50 10 Z M 50 50 L 50 25 M 50 50 L 70 50"
     * Moon / Crescent: "M 60 15 A 35 35 0 1 0 85 70 C 60 70 40 50 60 15 Z"
     * Happy Face / Smile: "M50,95 A45,45 0 1,0 50,5 A45,45 0 1,0 50,95 M25,60 Q50,85 75,60 M35,35 A5,5 0 1,0 35,45 A5,5 0 1,0 35,35 M65,35 A5,5 0 1,0 65,45 A5,5 0 1,0 65,35"
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
     * Car / Automobile / Vehicle / Van: "M 10 52 C 7 52 4 54 4 57 L 4 60 C 4 62 6 63 10 63 L 18 63 A 14 14 0 0 1 46 63 L 96 63 A 14 14 0 0 1 124 63 L 138 63 C 142 63 145 61 145 57 L 145 50 C 145 46 142 45 137 45 L 122 45 L 102 23 C 100 21 96 20 90 20 L 52 20 C 47 20 44 22 42 26 L 27 45 L 14 48 C 11 49 10 50 10 52 Z M 45 24 L 30 44 L 68 44 L 68 24 Z M 73 24 L 73 44 L 116 44 L 98 24 Z M 20 63 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 M 26 63 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0 M 98 63 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 M 104 63 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0 M 7 51 L 18 50 L 17 56 L 6 55 Z M 139 47 L 144 48 L 144 54 L 139 53 Z M 70 24 L 70 63 M 76 48 H 86 M 41 42 C 37 39 35 41 35 45 C 35 47 38 47 41 45 Z"
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

    // 1. DATASET VOCABULARY & OBJECT MEMORY ENGINE:
    // Check if the prompt requests a known object from our high-precision vector dataset dictionary
    const { aiMemory } = useStore.getState();
    const lastMemoryObject = aiMemory && aiMemory.length > 0 ? aiMemory[aiMemory.length - 1].recognizedObject : undefined;
    const matchedDataset = promptText ? findDatasetDrawing(promptText, lastMemoryObject) : null;
    if (matchedDataset) {
      // Calculate precise target placement coordinates
      let dW = targetBox ? targetBox.width : (hasLatestHumanBbox ? Math.max(160, pMaxX - pMinX) : 340);
      let dH = targetBox ? targetBox.height : (hasLatestHumanBbox ? Math.max(140, pMaxY - pMinY) : 240);
      let dX = targetBox ? targetBox.x : (hasLatestHumanBbox ? pMinX : Math.round(canvas.width / 2 - dW / 2));
      let dY = targetBox ? targetBox.y : (hasLatestHumanBbox ? pMinY : Math.round(Math.max(120, canvas.height / 2 - dH / 2)));

      // If no box was selected and existing artwork is present, place adjacent in open canvas space
      if (!targetBox && !hasLatestHumanBbox && globalMinX !== Infinity) {
        const s = scale || 1;
        const gMaxX = Math.round(globalMaxX * s + offset.x);
        const gMinX = Math.round(globalMinX * s + offset.x);
        const gMinY = Math.round(globalMinY * s + offset.y);
        const pLower = (promptText || '').toLowerCase();
        const wantsLeft = /\b(left|west)\b/i.test(pLower);
        if (wantsLeft && gMinX - dW - 50 >= 30) {
          dX = gMinX - dW - 50;
          dY = Math.max(120, gMinY);
        } else if (gMaxX + dW + 50 <= canvas.width - 30) {
          dX = gMaxX + 50;
          dY = Math.max(120, gMinY);
        } else if (gMinX - dW - 50 >= 30) {
          dX = gMinX - dW - 50;
          dY = Math.max(120, gMinY);
        }
      }

      // Safe viewport clamping: drawing is always safely below top floating bar & above bottom controls
      const safeTop = 110;
      const safeBottom = Math.max(safeTop, canvas.height - dH - 110);
      dY = Math.max(safeTop, Math.min(safeBottom, dY));
      dX = Math.max(30, Math.min(Math.max(30, canvas.width - dW - 30), dX));

      // Combine all subpaths into a unified drawing path to preserve relative coordinates & scale
      const combinedSvgPath = matchedDataset.svgParts.join(' ');

      data = {
        action: 'draw',
        topMessage: `✨ Drawing authentic ${matchedDataset.name}!`,
        thoughts: `Recognized '${matchedDataset.name}' in dataset vocabulary. Synthesizing authentic multi-stroke vector geometry inside frame [X: ${dX}, Y: ${dY}, W: ${dW}, H: ${dH}].`,
        strokes: [
          {
            tool: currentTool === 'ai-colorize' ? 'ai-colorize' : 'pencil',
            color: currentColor || (theme === 'dark' ? '#f8fafc' : '#1e293b'),
            size: currentSize || 'medium',
            shapeType: 'svg',
            svgPath: combinedSvgPath,
            fill: false,
            x: dX,
            y: dY,
            width: dW,
            height: dH,
          }
        ]
      };

      // Save to persistent AI object memory so subsequent actions remember this object!
      useStore.getState().addAiMemory({
        prompt: promptText || matchedDataset.name,
        recognizedObject: matchedDataset.name,
        box: { x: dX, y: dY, width: dW, height: dH },
        timestamp: Date.now()
      });
    } else {
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

        const rawText = await response.text();
        try {
          data = JSON.parse(rawText);
        } catch {}

        if (!response.ok) {
          let msg = data?.error || data?.message;
          if (!msg) {
            if (rawText.includes('Rate exceeded') || response.status === 429) {
              msg = "Gemini service is experiencing high demand / rate limits. Please wait a few seconds and try again!";
            } else {
              msg = rawText && rawText.length < 200 ? rawText : "AI Generation Request failed.";
            }
          }
          throw new Error(msg);
        }

        if (!data) {
          throw new Error("Invalid response from AI server.");
        }

        if (data.tokensUsed) {
          addTokens(data.tokensUsed);
        }

        // Register in AI object memory for future context
        const detectedName = promptText ? promptText.slice(0, 30) : "Artwork";
        useStore.getState().addAiMemory({
          prompt: promptText || "Sketch drawing",
          recognizedObject: detectedName,
          box: {
            x: targetBox ? targetBox.x : (hasLatestHumanBbox ? pMinX : 0),
            y: targetBox ? targetBox.y : (hasLatestHumanBbox ? pMinY : 0),
            width: targetBox ? targetBox.width : (hasLatestHumanBbox ? pMaxX - pMinX : canvas.width),
            height: targetBox ? targetBox.height : (hasLatestHumanBbox ? pMaxY - pMinY : canvas.height),
          },
          timestamp: Date.now()
        });
      } catch (e: any) {
        console.error("AI proxy secure call error:", e);
        throw e;
      }
    }

    if (data && data.topMessage) setTopMessage(data.topMessage);
    else setTopMessage("Drawing completed! ✨");

    if (data && data.thoughts) setAiThoughts(data.thoughts);
    
    if (data && data.action === 'draw' && Array.isArray(data.strokes)) {
          if (data.strokes.length === 0) {
              setTopMessage("AI returned 0 strokes.");
              return;
          }

          // Deduplicate SVG strokes if AI returned identical repeated copies (e.g. preventing 3 cars from rendering)
          const seenSvgPaths = new Set<string>();
          const filteredStrokes: any[] = [];
          for (const str of data.strokes) {
            if (str.shapeType === 'svg' && str.svgPath) {
              const cleanKey = str.svgPath.trim().replace(/\s+/g, ' ');
              if (seenSvgPaths.has(cleanKey)) {
                continue; // Skip duplicate SVG path!
              }
              seenSvgPaths.add(cleanKey);
            }
            filteredStrokes.push(str);
          }
          data.strokes = filteredStrokes;

          if (hasLatestHumanBbox && data.strokes.length > 0) {
            useStore.setState((state) => {
              let newStrokes = state.strokes;
              // Remove the user's messy hand strokes/selection rectangle from memory
              if (latestHumanStrokes.length > 0) {
                const targetIds = new Set(latestHumanStrokes.map(s => s.id));
                newStrokes = newStrokes.filter(s => !targetIds.has(s.id));
              }
              // Cleanly erase any messy strokes/points inside the user's sketch bounding box
              const margin = 20;
              newStrokes = newStrokes.filter((s) => {
                if (s.createdByAI) return true; // Keep previous pristine AI drawings outside box
                const overlaps = s.points.some((pt) =>
                  pt.x >= pMinX - margin && pt.x <= pMaxX + margin &&
                  pt.y >= pMinY - margin && pt.y <= pMaxY + margin
                );
                return !overlaps;
              });

              const newHistory = state.history.slice(0, state.historyStep + 1);
              newHistory.push(newStrokes);
              return {
                strokes: newStrokes,
                history: newHistory,
                historyStep: newHistory.length - 1,
                latestHumanStrokeStartIndex: newStrokes.length
              };
            });
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

          // Helper to convert non-path SVG elements to path d strings
          const convertSvgElementToPathD = (el: Element): string | null => {
            const tagName = el.tagName.toLowerCase();
            if (tagName === 'path') return el.getAttribute('d');
            if (tagName === 'rect') {
              const x = parseFloat(el.getAttribute('x') || '0');
              const y = parseFloat(el.getAttribute('y') || '0');
              const w = parseFloat(el.getAttribute('width') || '0');
              const h = parseFloat(el.getAttribute('height') || '0');
              if (w > 0 && h > 0) return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
            }
            if (tagName === 'circle') {
              const cx = parseFloat(el.getAttribute('cx') || '0');
              const cy = parseFloat(el.getAttribute('cy') || '0');
              const r = parseFloat(el.getAttribute('r') || '0');
              if (r > 0) return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
            }
            if (tagName === 'ellipse') {
              const cx = parseFloat(el.getAttribute('cx') || '0');
              const cy = parseFloat(el.getAttribute('cy') || '0');
              const rx = parseFloat(el.getAttribute('rx') || '0');
              const ry = parseFloat(el.getAttribute('ry') || '0');
              if (rx > 0 && ry > 0) return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
            }
            if (tagName === 'line') {
              const x1 = parseFloat(el.getAttribute('x1') || '0');
              const y1 = parseFloat(el.getAttribute('y1') || '0');
              const x2 = parseFloat(el.getAttribute('x2') || '0');
              const y2 = parseFloat(el.getAttribute('y2') || '0');
              return `M ${x1} ${y1} L ${x2} ${y2}`;
            }
            if (tagName === 'polygon' || tagName === 'polyline') {
              const pointsAttr = el.getAttribute('points');
              if (pointsAttr) {
                const pts = pointsAttr.trim().split(/[\s,]+/);
                if (pts.length >= 4) {
                  let d = `M ${pts[0]} ${pts[1]}`;
                  for (let i = 2; i < pts.length - 1; i += 2) {
                    d += ` L ${pts[i]} ${pts[i+1]}`;
                  }
                  if (tagName === 'polygon') d += ' Z';
                  return d;
                }
              }
            }
            return null;
          };

          for (const stroke of data.strokes) {
            let points: {x: number, y: number}[] = [];
            let subPaths: {x: number, y: number}[][] = [];
            
            // Calculate safe visible center screen coordinates
            const visibleCenterX = Math.round(canvas.width / 2);
            const visibleCenterY = Math.round(canvas.height / 2);

            const computeTargetPos = (rawX: any, rawY: any, shapeW: number, shapeH: number) => {
              const numX = rawX != null ? Number(rawX) : NaN;
              const numY = rawY != null ? Number(rawY) : NaN;

              if (targetBox) {
                // Strictly lock to user-confirmed target bounding box - never relocate
                return { x: Math.round(targetBox.x), y: Math.round(targetBox.y) };
              }

              if (hasLatestHumanBbox) {
                const finalX = !isNaN(numX) && numX >= pMinX - 100 && numX <= pMaxX + 100 ? numX : Math.round(pMinX);
                const finalY = !isNaN(numY) && numY >= pMinY - 100 && numY <= pMaxY + 100 ? numY : Math.round(pMinY);
                return { x: finalX, y: finalY };
              }

              const s = scale || 1;
              const gMinX = isFinite(globalMinX) ? Math.round(globalMinX * s + offset.x) : Infinity;
              const gMaxX = isFinite(globalMaxX) ? Math.round(globalMaxX * s + offset.x) : -Infinity;
              const gMinY = isFinite(globalMinY) ? Math.round(globalMinY * s + offset.y) : Infinity;
              const gMaxY = isFinite(globalMaxY) ? Math.round(globalMaxY * s + offset.y) : -Infinity;

              if (isFinite(gMinX) && isFinite(gMaxX) && isFinite(gMinY) && isFinite(gMaxY)) {
                let candidateX = !isNaN(numX) ? numX : visibleCenterX - shapeW / 2;
                let candidateY = !isNaN(numY) ? numY : visibleCenterY - shapeH / 2;

                const margin = 30;
                const isOverlapping = (
                  candidateX < gMaxX + margin &&
                  candidateX + shapeW > gMinX - margin &&
                  candidateY < gMaxY + margin &&
                  candidateY + shapeH > gMinY - margin
                );

                if (isOverlapping || isNaN(numX) || isNaN(numY)) {
                  // Place in open space on canvas window without overlapping existing drawing
                  if (gMaxX + shapeW + 50 <= canvas.width - 30) {
                    return { x: Math.round(gMaxX + 50), y: Math.round(gMinY) };
                  }
                  if (gMinX - shapeW - 50 >= 30) {
                    return { x: Math.round(gMinX - shapeW - 50), y: Math.round(gMinY) };
                  }
                  if (gMaxY + shapeH + 50 <= canvas.height - 30) {
                    return { x: Math.round(Math.max(30, gMinX)), y: Math.round(gMaxY + 50) };
                  }
                  if (gMinY - shapeH - 50 >= 30) {
                    return { x: Math.round(Math.max(30, gMinX)), y: Math.round(gMinY - shapeH - 50) };
                  }
                }
                return { x: Math.round(candidateX), y: Math.round(candidateY) };
              }

              const safeTop = 110;
              const safeBottom = Math.max(safeTop, canvas.height - shapeH - 110);
              const defaultX = !isNaN(numX) && numX >= 30 && numX <= canvas.width - shapeW - 30 ? numX : Math.max(30, Math.round(visibleCenterX - shapeW / 2));
              const defaultY = !isNaN(numY) && numY >= safeTop && numY <= safeBottom ? numY : Math.max(safeTop, Math.round(visibleCenterY - shapeH / 2));
              return { 
                x: Math.round(Math.max(30, Math.min(Math.max(30, canvas.width - shapeW - 30), defaultX))), 
                y: Math.round(Math.max(safeTop, Math.min(safeBottom, defaultY))) 
              };
            };

            const computeTargetX = (rawX: any, shapeW: number, rawY?: any, shapeH?: number) =>
              computeTargetPos(rawX, rawY, shapeW, shapeH || 100).x;

            const computeTargetY = (rawY: any, shapeH: number, rawX?: any, shapeW?: number) =>
              computeTargetPos(rawX, rawY, shapeW || 100, shapeH).y;

            // Generate points based on shape primitive
            if (stroke.shapeType === 'circle') {
              const r = targetBox 
                ? Math.round(Math.min(targetBox.width, targetBox.height) / 2)
                : (stroke.r != null && !isNaN(Number(stroke.r)) && Number(stroke.r) > 0 ? Number(stroke.r) : 100);
              const rawXVal = stroke.cx != null ? stroke.cx : (stroke.x != null ? Number(stroke.x) + r : null);
              const rawYVal = stroke.cy != null ? stroke.cy : (stroke.y != null ? Number(stroke.y) + r : null);
              const cx = computeTargetX(rawXVal, r * 2, rawYVal, r * 2);
              const cy = computeTargetY(rawYVal, r * 2, rawXVal, r * 2);
              const steps = 36;
              for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const jitter = stroke.fill ? 0 : (Math.random() - 0.5) * 2;
                points.push({
                  x: cx + Math.cos(angle) * (r + jitter),
                  y: cy + Math.sin(angle) * (r + jitter)
                });
              }
              subPaths.push(points);
            } else if (stroke.shapeType === 'rectangle') {
              const w = targetBox ? Math.round(targetBox.width) : (stroke.width != null && !isNaN(Number(stroke.width)) && Number(stroke.width) > 0 ? Number(stroke.width) : 320);
              const h = targetBox ? Math.round(targetBox.height) : (stroke.height != null && !isNaN(Number(stroke.height)) && Number(stroke.height) > 0 ? Number(stroke.height) : 220);
              const x = computeTargetX(stroke.x, w, stroke.y, h);
              const y = computeTargetY(stroke.y, h, stroke.x, w);
              points = [
                {x, y},
                {x: x + w, y},
                {x: x + w, y: y + h},
                {x, y: y + h},
                {x, y}
              ];
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
            } else if (stroke.shapeType === 'line') {
              const x1 = stroke.x1 != null && !isNaN(Number(stroke.x1)) ? Number(stroke.x1) : visibleCenterX - 150;
              const y1 = stroke.y1 != null && !isNaN(Number(stroke.y1)) ? Number(stroke.y1) : visibleCenterY;
              const x2 = stroke.x2 != null && !isNaN(Number(stroke.x2)) ? Number(stroke.x2) : visibleCenterX + 150;
              const y2 = stroke.y2 != null && !isNaN(Number(stroke.y2)) ? Number(stroke.y2) : visibleCenterY;
              const p1 = {x: x1, y: y1};
              const p2 = {x: x2, y: y2};
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
              const tempDiv = document.createElement('div');
              tempDiv.style.position = 'absolute';
              tempDiv.style.left = '-9999px';
              tempDiv.style.top = '-9999px';
              tempDiv.style.visibility = 'hidden';

              const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svgContainer.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
              svgContainer.setAttribute('width', '2000');
              svgContainer.setAttribute('height', '2000');
              tempDiv.appendChild(svgContainer);
              document.body.appendChild(tempDiv);

              const rawSvg = stroke.svgPath.trim();
              if (rawSvg.includes('<')) {
                svgContainer.innerHTML = rawSvg;
              } else {
                // Split multi-part paths starting with M/m so subpaths trace without jumping lines!
                const subParts = rawSvg.split(/(?=[Mm]\s*[-+]?\d)/).map((s: string) => s.trim()).filter((s: string) => s.length > 2);
                if (subParts.length > 1) {
                  for (const part of subParts) {
                    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathEl.setAttribute('d', part);
                    svgContainer.appendChild(pathEl);
                  }
                } else {
                  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  pathEl.setAttribute('d', rawSvg);
                  svgContainer.appendChild(pathEl);
                }
              }

              // Convert all non-path SVG elements to path elements
              const allSvgElements = Array.from(svgContainer.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline'));
              for (const el of allSvgElements) {
                if (el.tagName.toLowerCase() !== 'path') {
                  const pathD = convertSvgElementToPathD(el);
                  if (pathD) {
                    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    p.setAttribute('d', pathD);
                    el.parentNode?.replaceChild(p, el);
                  }
                }
              }

              try {
                let pathElements = Array.from(svgContainer.querySelectorAll('path')) as SVGPathElement[];

                // Fallback if innerHTML didn't produce path elements directly
                if (pathElements.length === 0) {
                  const dMatches = [...rawSvg.matchAll(/d\s*=\s*(['"])(.*?)\1/gi)];
                  if (dMatches.length > 0) {
                    for (const m of dMatches) {
                      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                      p.setAttribute('d', m[2]);
                      svgContainer.appendChild(p);
                    }
                  } else {
                    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    p.setAttribute('d', rawSvg);
                    svgContainer.appendChild(p);
                  }
                  pathElements = Array.from(svgContainer.querySelectorAll('path')) as SVGPathElement[];
                }

                if (pathElements.length > 0) {
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  const pathData: { el: SVGPathElement; len: number }[] = [];

                  for (const pEl of pathElements) {
                    try {
                      const len = pEl.getTotalLength();
                      if (len > 0) {
                        let bX = 0, bY = 0, bW = 0, bH = 0;
                        try {
                          const b = pEl.getBBox();
                          if (b && (b.width > 0 || b.height > 0)) {
                            bX = b.x;
                            bY = b.y;
                            bW = b.width;
                            bH = b.height;
                          }
                        } catch (_) {}

                        // If getBBox was 0 (e.g. headless/off-screen), compute accurate bbox via sample points
                        if (bW === 0 && bH === 0) {
                          let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
                          const samples = 10;
                          for (let s = 0; s <= samples; s++) {
                            const pt = pEl.getPointAtLength((s / samples) * len);
                            if (pt) {
                              sMinX = Math.min(sMinX, pt.x);
                              sMinY = Math.min(sMinY, pt.y);
                              sMaxX = Math.max(sMaxX, pt.x);
                              sMaxY = Math.max(sMaxY, pt.y);
                            }
                          }
                          bX = sMinX;
                          bY = sMinY;
                          bW = sMaxX - sMinX;
                          bH = sMaxY - sMinY;
                        }

                        minX = Math.min(minX, bX);
                        minY = Math.min(minY, bY);
                        maxX = Math.max(maxX, bX + bW);
                        maxY = Math.max(maxY, bY + bH);
                        pathData.push({ el: pEl, len });
                      }
                    } catch (err) {
                      // ignore unparseable path
                    }
                  }

                  if (pathData.length > 0) {
                    const overallWidth = (maxX > minX && isFinite(maxX - minX)) ? maxX - minX : 100;
                    const overallHeight = (maxY > minY && isFinite(maxY - minY)) ? maxY - minY : 100;
                    const overallX = isFinite(minX) ? minX : 0;
                    const overallY = isFinite(minY) ? minY : 0;

                    const targetWidth = targetBox 
                      ? Math.round(targetBox.width) 
                      : ((stroke.width != null && !isNaN(Number(stroke.width)) && Number(stroke.width) > 0) ? Number(stroke.width) : Math.max(overallWidth, 220));
                    const targetHeight = targetBox 
                      ? Math.round(targetBox.height) 
                      : ((stroke.height != null && !isNaN(Number(stroke.height)) && Number(stroke.height) > 0) ? Number(stroke.height) : Math.max(overallHeight, 160));

                    const targetX = computeTargetX(stroke.x, targetWidth, stroke.y, targetHeight);
                    const targetY = computeTargetY(stroke.y, targetHeight, stroke.x, targetWidth);

                    // Preserve aspect ratio to prevent squishing/stretching shapes (e.g. keeping wheels circular!)
                    const uniformScale = Math.min(
                      overallWidth > 0.1 ? targetWidth / overallWidth : 1,
                      overallHeight > 0.1 ? targetHeight / overallHeight : 1
                    );
                    const renderW = overallWidth * uniformScale;
                    const renderH = overallHeight * uniformScale;
                    const startX = targetX + (targetWidth - renderW) / 2;
                    const startY = targetY + (targetHeight - renderH) / 2;

                    for (const item of pathData) {
                      const sampleRate = 3.2;
                      const steps = Math.max(20, Math.floor(item.len / sampleRate));
                      const stepLen = item.len / steps;
                      let currentSubPath: { x: number; y: number }[] = [];
                      let lastSvgPt: DOMPoint | null = null;

                      for (let i = 0; i <= steps; i++) {
                        const p = item.el.getPointAtLength((i / steps) * item.len);
                        const mappedX = startX + (p.x - overallX) * uniformScale;
                        const mappedY = startY + (p.y - overallY) * uniformScale;

                        const jitterX = stroke.fill ? 0 : (Math.random() - 0.5) * 0.8;
                        const jitterY = stroke.fill ? 0 : (Math.random() - 0.5) * 0.8;
                        const newPt = { x: mappedX + jitterX, y: mappedY + jitterY };

                        if (currentSubPath.length > 0 && lastSvgPt) {
                          const svgDist = Math.hypot(p.x - lastSvgPt.x, p.y - lastSvgPt.y);
                          if (svgDist > Math.max(3.5, stepLen * 2.2)) {
                            if (currentSubPath.length > 0) {
                              subPaths.push(currentSubPath);
                            }
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
                  }
                }
              } catch (e) {
                console.error("Error parsing SVG path:", e);
              } finally {
                if (tempDiv.parentNode) {
                  document.body.removeChild(tempDiv);
                }
              }
            } else if (stroke.shapeType === 'svg') {
                console.warn("SVG requested but no svgPath provided, fallback to standard box.", stroke);
            } else if (stroke.points && Array.isArray(stroke.points)) {
              let pts: { x: number; y: number }[] = stroke.points.map((p: any) => ({ x: Number(p.x), y: Number(p.y) }));
              subPaths.push(pts);
            }

            // Fallback safety if no subPaths generated
            if (subPaths.length === 0) {
              const fbW = 260;
              const fbH = 180;
              const fbX = Math.round(visibleCenterX - fbW / 2);
              const fbY = Math.round(visibleCenterY - fbH / 2);
              subPaths.push([
                { x: fbX, y: fbY },
                { x: fbX + fbW, y: fbY },
                { x: fbX + fbW, y: fbY + fbH },
                { x: fbX, y: fbY + fbH },
                { x: fbX, y: fbY }
              ]);
            }

            for (let points of subPaths) {
              // Filter out any NaNs which can break drawing
              points = points.filter((p: any) => !isNaN(p.x) && !isNaN(p.y));

              if (!points || points.length === 0) {
                continue;
              }
              
              const newStrokeId = Math.random().toString(36).substr(2, 9);
              let color = stroke.color || (theme === 'dark' ? '#ffffff' : '#000000');
              
              // Ensure color visibility in current theme
              if (theme === 'light' && (color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff' || color.toLowerCase() === 'white')) {
                if (stroke.tool !== 'eraser' && stroke.tool !== 'ai-eraser') {
                  color = '#1e293b'; // Fallback to dark slate in light mode
                }
              } else if (theme === 'dark' && (color.toLowerCase() === '#000000' || color.toLowerCase() === '#0f1115' || color.toLowerCase() === 'black')) {
                if (stroke.tool !== 'eraser' && stroke.tool !== 'ai-eraser') {
                  color = '#f8fafc'; // Fallback to light in dark mode
                }
              }

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
              
              // Smooth, high-framerate progressive drawing pace so the user can watch the AI draw step-by-step
              const totalPoints = points.length;
              const targetFrames = Math.min(22, Math.max(8, Math.round(totalPoints / 6)));
              const stepCount = Math.max(1, Math.ceil((totalPoints - 1) / targetFrames));

              for (let i = 1; i < totalPoints; i += stepCount) {
                const chunk = points.slice(i, Math.min(totalPoints, i + stepCount));
                const mappedChunk = chunk.map(mapPoint);
                useStore.getState().updateStrokePointsById(newStrokeId, mappedChunk, false);
                const lastP = mappedChunk[mappedChunk.length - 1];
                if (lastP) setAiCursor(lastP);
                // Sync smoothly with display refresh via requestAnimationFrame
                await new Promise(r => {
                  if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(r);
                  } else {
                    setTimeout(r, 16);
                  }
                });
              }
              finishStroke();
              // A brief, natural pen pause before beginning the next stroke segment
              await new Promise(r => setTimeout(r, 40));
            }
            // Brief pause between major shape elements
            await new Promise(r => setTimeout(r, 60));
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
    setTimeout(() => setAiCursor(null), 250);
  }
}
