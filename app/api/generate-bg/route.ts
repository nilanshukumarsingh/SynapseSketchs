import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

function cleanApiKey(key?: string | null): string | null {
  if (!key) return null;
  const k = key.trim();
  if (!k) return null;
  const lower = k.toLowerCase();
  if (
    lower === 'my_gemini_api_key' ||
    lower === 'my_api_key' ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower.includes('placeholder') ||
    lower.includes('your_') ||
    k.length < 15
  ) {
    return null;
  }
  return k;
}

export async function POST(req: Request) {
  try {
    const { prompt, image, settings } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const finalApiKey = cleanApiKey(settings?.geminiApiKey) || cleanApiKey(process.env.GEMINI_API_KEY) || cleanApiKey(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

    if (!finalApiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing or invalid. Please check your configurations in the system settings.' }, { status: 400 });
    }

    const client = new GoogleGenAI({ apiKey: finalApiKey });

    const base64Data = image.split(',')[1] || image;
    
    const preferredModel = settings?.geminiModel && settings.geminiModel.includes('image') ? settings.geminiModel : 'gemini-3.1-flash-lite-image';
    const imageModels = [
      preferredModel,
      'gemini-3.1-flash-lite-image',
      'gemini-3.1-flash-image'
    ];
    // Dedup keeping order
    const dedupedModels = Array.from(new Set(imageModels)).filter(Boolean);

    let lastError: any = null;
    let imageUrl = '';

    for (const modelName of dedupedModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'image/png',
                },
              },
              {
                text: `Generate a beautiful, subtle background image based on this sketch and the prompt: "${prompt}". The background should be light, abstract, styled with clean aesthetics and not overpower the line drawings.`,
              },
            ],
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
        if (imageUrl) break;
      } catch (e: any) {
        lastError = e;
        console.warn(`[Server BG Image Fallback] Model ${modelName} failed. Error: ${e.message || e}. Failing over...`);
      }
    }

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Error generating background:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate background' }, { status: 500 });
  }
}
