import { NextRequest, NextResponse } from 'next/server';
import categoriesList from '@/quickdraw-categories.json';

// In-memory server cache so fetched categories are lightning fast on subsequent requests
const categoryCache = new Map<string, any>();

function strokesToSvg(drawing: number[][][]) {
  return drawing.map(stroke => {
    const [xs, ys] = stroke;
    if (!xs || xs.length === 0) return '';
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 1; i < xs.length; i++) {
      d += ` L ${xs[i]} ${ys[i]}`;
    }
    return d;
  }).filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = (body.prompt || '').toLowerCase().trim();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Clean conversational filler words
    const cleanPrompt = prompt
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanPrompt.split(' ');

    // Match against official 345 Quick, Draw! categories
    let matchedCategory: string | null = null;

    // 1. Check exact phrase match
    for (const cat of categoriesList) {
      if (cleanPrompt === cat || cleanPrompt.includes(cat)) {
        matchedCategory = cat;
        break;
      }
    }

    // 2. Check individual words or plural variations
    if (!matchedCategory) {
      for (const word of words) {
        if (word.length < 3) continue;
        const singular = word.endsWith('s') ? word.slice(0, -1) : word;
        const found = categoriesList.find(c => c === word || c === singular || c.includes(word));
        if (found) {
          matchedCategory = found;
          break;
        }
      }
    }

    if (!matchedCategory) {
      return NextResponse.json({ found: false, message: 'No Quick, Draw! category matched' });
    }

    // Check in-memory server cache
    if (categoryCache.has(matchedCategory)) {
      return NextResponse.json({ found: true, drawing: categoryCache.get(matchedCategory) });
    }

    // Fetch on-demand from Google Quick, Draw! Cloud Storage
    const url = `https://storage.googleapis.com/quickdraw_dataset/full/simplified/${encodeURIComponent(matchedCategory)}.ndjson`;
    const res = await fetch(url, {
      headers: { Range: 'bytes=0-25000' },
      next: { revalidate: 86400 } // Cache for 24h
    });

    if (!res.ok) {
      return NextResponse.json({ found: false, message: `Could not retrieve category: ${matchedCategory}` });
    }

    const text = await res.text();
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        if (item.recognized && item.drawing && item.drawing.length >= 1) {
          const svgParts = strokesToSvg(item.drawing);
          const formatted = {
            id: matchedCategory.toLowerCase().replace(/\s+/g, '_'),
            name: matchedCategory.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            keywords: [matchedCategory, `${matchedCategory}s`],
            description: `Live Google Quick, Draw! vector stroke sketch of ${matchedCategory}`,
            viewBox: { width: 256, height: 256 },
            svgParts,
            isLiveQuickDraw: true
          };

          categoryCache.set(matchedCategory, formatted);
          return NextResponse.json({ found: true, drawing: formatted });
        }
      } catch (parseErr) {}
    }

    return NextResponse.json({ found: false, message: 'No recognized vector sample found' });
  } catch (error: any) {
    console.error('QuickDraw API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
