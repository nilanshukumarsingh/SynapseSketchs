import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
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

function safeParseJSON(rawText: string): any {
  if (!rawText) throw new Error("Empty response from AI model.");

  let cleanText = rawText.trim();

  // Extract JSON block if surrounded by markdown codeblock or extra text
  const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleanText = codeBlockMatch[1].trim();
  } else {
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    } else if (firstBrace !== -1) {
      cleanText = cleanText.substring(firstBrace);
    }
  }

  // Attempt 1: Direct standard JSON parse
  try {
    return JSON.parse(cleanText);
  } catch (e1) {
    console.warn("Direct JSON.parse failed. Sanitizing and repairing...", e1);
  }

  // Attempt 2: Sanitize control characters inside string literals (newlines, tabs, etc.)
  let repaired = cleanText.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
    if (c === '\n') return '\\n';
    if (c === '\r') return '\\r';
    if (c === '\t') return '\\t';
    return '';
  });

  try {
    return JSON.parse(repaired);
  } catch (e2) {
    // Attempt 3: Remove trailing commas before } or ]
    repaired = repaired.replace(/,\s*([\}\]])/g, '$1');
  }

  try {
    return JSON.parse(repaired);
  } catch (e3) {
    // Attempt 4: Auto-repair truncated JSON
    repaired = repairTruncatedJson(repaired);
    return JSON.parse(repaired);
  }
}

function repairTruncatedJson(jsonStr: string): string {
  let s = jsonStr.trim();
  let inString = false;
  let escape = false;
  const openBrackets: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        openBrackets.push(char);
      } else if (char === '}') {
        if (openBrackets.length > 0 && openBrackets[openBrackets.length - 1] === '{') {
          openBrackets.pop();
        }
      } else if (char === ']') {
        if (openBrackets.length > 0 && openBrackets[openBrackets.length - 1] === '[') {
          openBrackets.pop();
        }
      }
    }
  }

  if (inString) {
    s += '"';
  }

  s = s.replace(/[:,\s]+$/, '');

  while (openBrackets.length > 0) {
    const b = openBrackets.pop();
    if (b === '{') s += '}';
    else if (b === '[') s += ']';
  }

  s = s.replace(/,\s*([\}\]])/g, '$1');

  return s;
}

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt, schemaObj, image, settings } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const base64Data = image.split(',')[1] || image;
    const provider = settings?.apiProvider || 'gemini';

    if (provider === 'claude') {
      // Initialize Claude with dynamic private key or server key
      const finalApiKey = cleanApiKey(settings?.claudeApiKey) || cleanApiKey(process.env.CLAUDE_API_KEY) || cleanApiKey(process.env.ANTHROPIC_API_KEY);
      
      if (!finalApiKey) {
        return NextResponse.json({ 
          error: "Claude API key is missing or invalid. Please add your Anthropic key in system settings." 
        }, { status: 400 });
      }

      const anthropic = new Anthropic({ apiKey: finalApiKey });

      const preferredModel = settings?.claudeModel || 'claude-3-5-sonnet-latest';
      const allClaudeModels = [
        "claude-3-7-sonnet-latest",
        "claude-3-5-sonnet-latest",
        "claude-3-opus-latest",
        "claude-3-5-haiku-latest"
      ];
      // Dedup and sort with preferred model first
      const claudeModels = [
        preferredModel,
        ...allClaudeModels.filter(m => m !== preferredModel)
      ];

      let lastError: any = null;
      let responseText = "";
      let chosenModelUsed = "";
      let outputTokens = 500;

      const fullSystemPrompt = (systemPrompt || "") + 
        `\n\nOUTPUT SCHEMA: You MUST return a JSON object exactly matching this structure:\n${JSON.stringify(schemaObj, null, 2)}`;

      for (const modelName of claudeModels) {
        try {
          const msg = await anthropic.messages.create({
            model: modelName,
            max_tokens: 8192,
            temperature: settings?.temperature !== undefined ? Math.min(settings.temperature, 1.0) : 0.4,
            system: fullSystemPrompt,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/png",
                      data: base64Data,
                    },
                  },
                  {
                    type: "text",
                    text: prompt ? `User Prompt: ${prompt}\nPlease analyze image and fulfill request.` : "Please output the final JSON as requested."
                  }
                ],
              }
            ]
          });

          responseText = (msg.content[0] as any).text || "";
          outputTokens = msg.usage?.output_tokens || 500;
          chosenModelUsed = modelName;
          break; // Successfully got response
        } catch (e: any) {
          lastError = e;
          console.warn(`[Server Claude Fallback] Model ${modelName} failed. Error: ${e.message || e}. Failing over...`);
          continue;
        }
      }

      if (!responseText && lastError) {
        throw new Error(lastError.message || "All Claude models are exhausted or rate limited.");
      }

      const result = safeParseJSON(responseText);

      return NextResponse.json({
        ...result,
        tokensUsed: outputTokens,
        modelUsed: chosenModelUsed
      });

    } else {
      // Default: Google Gemini
      const finalApiKey = cleanApiKey(settings?.geminiApiKey) || cleanApiKey(process.env.GEMINI_API_KEY) || cleanApiKey(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

      if (!finalApiKey) {
        return NextResponse.json({ error: 'Gemini API key is missing or invalid. Please configure your key in settings.' }, { status: 400 });
      }

      const client = new GoogleGenAI({ apiKey: finalApiKey });

      const preferredModel = settings?.geminiModel || 'gemini-3.6-flash';
      const allPossibleModels = [
        preferredModel,
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.1-pro-preview',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash'
      ];
      // Dedup keeping order
      const geminiModels = Array.from(new Set(allPossibleModels)).filter(Boolean);

      let lastError: any = null;
      let responseText = "";
      let chosenModelUsed = "";
      let totalTokens = 500;

      for (const modelName of geminiModels) {
        try {
          const response = await client.models.generateContent({
            model: modelName, 
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType: 'image/png' } },
                { text: systemPrompt },
              ],
            },
            config: {
              maxOutputTokens: settings?.maxTokens || 8192,
              temperature: settings?.temperature !== undefined ? settings.temperature : 0.4,
              responseMimeType: 'application/json',
              responseSchema: schemaObj as any
            }
          });

          responseText = response.text || "";
          totalTokens = response.usageMetadata?.totalTokenCount || 500;
          chosenModelUsed = modelName;
          break; // Successfully got response
        } catch (e: any) {
          lastError = e;
          console.warn(`[Server Gemini Fallback] Model ${modelName} failed. Error: ${e.message || e}. Failing over...`);
          continue;
        }
      }

      if (!responseText && lastError) {
        throw new Error(lastError.message || "All Gemini models are exhausted or rate limited.");
      }

      const result = safeParseJSON(responseText);

      return NextResponse.json({
        ...result,
        tokensUsed: totalTokens,
        modelUsed: chosenModelUsed
      });
    }

  } catch (error: any) {
    console.error('Error in secure generate api route:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete artwork generation' }, { status: 500 });
  }
}
