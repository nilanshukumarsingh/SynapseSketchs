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

  // Strip markdown code block wrapper if present
  const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleanText = codeBlockMatch[1].trim();
  } else {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Attempt 1: Direct standard JSON parse on cleanText
  try {
    return JSON.parse(cleanText);
  } catch (e1) {
    console.warn("Direct JSON.parse failed. Sanitizing and repairing...", e1);
  }

  // Attempt 2: If there's extra text around JSON, extract from first { to last }
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleanText.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch (_) {
      // Continue to repairing
    }
  }

  // Attempt 3: Sanitize control characters inside string literals (newlines, tabs, etc.)
  let repaired = cleanText.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
    if (c === '\n') return '\\n';
    if (c === '\r') return '\\r';
    if (c === '\t') return '\\t';
    return '';
  });

  try {
    return JSON.parse(repaired);
  } catch (_) {}

  // Attempt 4: Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([\}\]])/g, '$1');
  try {
    return JSON.parse(repaired);
  } catch (_) {}

  // Attempt 5: Auto-repair truncated JSON using iterative repair algorithm
  const repairedResult = repairTruncatedJson(cleanText);
  return JSON.parse(repairedResult);
}

function repairTruncatedJson(jsonStr: string): string {
  let raw = jsonStr.trim();
  
  // Clean markdown prefixes/suffixes
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = raw.search(/[\{\[]/);
  if (firstBrace !== -1) {
    raw = raw.substring(firstBrace);
  }

  let currentWorking = raw;

  // Progressive repair loop: try repairing current working string; if JSON.parse fails, trim back trailing char
  for (let attempt = 0; attempt < 25; attempt++) {
    let s = currentWorking.trim();

    // Check if we are inside a string literal
    let inString = false;
    let escape = false;

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
      }
    }

    if (inString) {
      s += '"';
    }

    // Strip trailing incomplete key/value or punctuation e.g. ,"key": or ,"key" or : or ,
    s = s.replace(/(?:,|\{)\s*"[^"]*"\s*:\s*$/g, (m) => m.startsWith('{') ? '{' : '');
    s = s.replace(/(?:,|\{)\s*"[^"]*"\s*$/g, (m) => m.startsWith('{') ? '{' : '');
    s = s.replace(/[:,\s]+$/, '');

    // Track open brackets to balance
    const openBrackets: string[] = [];
    let insideStr = false;
    let esc = false;

    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === '"') {
        insideStr = !insideStr;
        continue;
      }
      if (!insideStr) {
        if (c === '{' || c === '[') {
          openBrackets.push(c);
        } else if (c === '}') {
          if (openBrackets.length > 0 && openBrackets[openBrackets.length - 1] === '{') {
            openBrackets.pop();
          }
        } else if (c === ']') {
          if (openBrackets.length > 0 && openBrackets[openBrackets.length - 1] === '[') {
            openBrackets.pop();
          }
        }
      }
    }

    if (insideStr) {
      s += '"';
    }

    s = s.replace(/[:,\s]+$/, '');

    // Close remaining open brackets
    for (let i = openBrackets.length - 1; i >= 0; i--) {
      const b = openBrackets[i];
      if (b === '{') s += '}';
      else if (b === '[') s += ']';
    }

    s = s.replace(/,\s*([\}\]])/g, '$1');

    try {
      JSON.parse(s);
      return s; // Repair successful!
    } catch (err) {
      // Step back in currentWorking to try the next boundary
      if (currentWorking.length > 10) {
        // Try trimming off last char or last token
        const lastComma = currentWorking.lastIndexOf(',');
        const lastBraceOrBracket = Math.max(currentWorking.lastIndexOf('}'), currentWorking.lastIndexOf(']'));
        const cutPoint = Math.max(lastComma, lastBraceOrBracket);
        if (cutPoint > 10 && cutPoint > currentWorking.length - 100) {
          currentWorking = currentWorking.substring(0, cutPoint);
        } else {
          currentWorking = currentWorking.substring(0, currentWorking.length - 1);
        }
      } else {
        break;
      }
    }
  }

  return currentWorking;
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

      const preferredModel = settings?.geminiModel || 'gemini-2.5-flash';
      const allPossibleModels = [
        preferredModel,
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash'
      ];
      // Dedup keeping order
      const geminiModels = Array.from(new Set(allPossibleModels)).filter(Boolean);

      let lastError: any = null;
      let responseText = "";
      let chosenModelUsed = "";
      let totalTokens = 500;

      const fullPromptText = prompt ? `${systemPrompt}\n\nUSER PROMPT: "${prompt}"` : systemPrompt;

      for (const modelName of geminiModels) {
        // Try up to 2 attempts per model (1 immediate + 1 retry after short delay for 503/429)
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await client.models.generateContent({
              model: modelName, 
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType: 'image/png' } },
                  { text: fullPromptText },
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
            const errMsg = String(e?.message || e);
            const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
            
            if (isTransient && attempt === 0) {
              // Wait 1.2s before retrying same model once
              await new Promise(res => setTimeout(res, 1200));
              continue;
            }
            console.warn(`[Server Gemini Fallback] Model ${modelName} attempt ${attempt + 1} failed. Error: ${errMsg}. Failing over...`);
            break; // Move to next model
          }
        }
        if (responseText) break;
      }

      if (!responseText && lastError) {
        const errStr = String(lastError?.message || lastError);
        if (errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
          throw new Error("Gemini service is currently experiencing high demand. Please wait a few seconds and try again!");
        }
        throw new Error(lastError.message || "All Gemini models are exhausted or unavailable.");
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
