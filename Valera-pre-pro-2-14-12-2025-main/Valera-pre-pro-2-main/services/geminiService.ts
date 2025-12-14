
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_IMAGE_FLASH, MODEL_TEXT, MODEL_IMAGE_PRO, VAL_SYSTEM_PROMPT } from "../constants";
import { ChatMessage, Character, TimelineFrame } from "../types";

// Singleton instance to prevent re-initialization overhead
let clientInstance: GoogleGenAI | null = null;

const getClient = () => {
  if (clientInstance) return clientInstance;
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  
  clientInstance = new GoogleGenAI({ apiKey });
  return clientInstance;
};

// Helper: Convert URL to Base64 Data URL
const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to fetch image URL for GenAI:", url, e);
        return "";
    }
};

/**
 * Sends a message to the "Val" Director Agent.
 */
export const sendDirectorMessage = async (
  history: ChatMessage[],
  newMessage: string,
  attachments: { data: string, mimeType: string }[] = [],
  styleSuffix: string = "",
  projectContext: Character[] = [],
  activeFrameContext?: TimelineFrame | null,
  timelineContext?: TimelineFrame[],
  currentRatio: string = "16:9"
): Promise<string> => {
  const ai = getClient();
  
  // Categorize Assets for Valera's Analysis
  const chars = projectContext.filter(c => c.type === 'character');
  const locs = projectContext.filter(c => c.type === 'location');
  const items = projectContext.filter(c => c.type === 'item');

  const assetsDesc = projectContext.length > 0 
    ? `\n\n## CURRENT PROJECT ASSETS (LAB):\n` +
      `CHARACTERS (${chars.length}):\n${chars.map(c => `- ${c.name} [Trigger: ${c.triggerWord || 'none'}]`).join('\n')}\n` +
      `LOCATIONS (${locs.length}):\n${locs.map(c => `- ${c.name} [Trigger: ${c.triggerWord || 'none'}]`).join('\n')}\n` +
      `ITEMS (${items.length}):\n${items.map(c => `- ${c.name} [Trigger: ${c.triggerWord || 'none'}]`).join('\n')}`
    : `\n\n## CURRENT PROJECT ASSETS: None yet.`;

  // Build Context for Valera regarding the current scene
  let sceneContext = "";
  
  // Timeline Summary
  const timelineSummary = timelineContext && timelineContext.length > 0 
    ? `\n\n## MASTER SEQUENCE STATUS:\nTotal Scenes: ${timelineContext.length}.`
    : `\n\n## MASTER SEQUENCE STATUS: Empty.`;

  if (activeFrameContext) {
      sceneContext = `\n\n## CURRENTLY SELECTED SCENE (For Coverage/Variations):\n` +
      `- ID: ${activeFrameContext.id}\n` +
      `- Title: ${activeFrameContext.title}\n` +
      `- Current Visual: ${activeFrameContext.description || "No description yet."}\n` +
      `- Shot Type: ${activeFrameContext.shotType || "Not specified"}\n` +
      `- Has Rendered Image: ${activeFrameContext.image ? "YES" : "NO"}`;
  }

  // Inject Aspect Ratio Rule WITH MANDATORY KEYWORDS
  const ratioKeywords = currentRatio === "9:16" 
    ? "VERTICAL FRAME (9:16), TALL COMPOSITION, SOCIAL MEDIA STYLE" 
    : "CINEMATIC WIDE (16:9), HORIZONTAL COMPOSITION, MOVIE STYLE";

  const formatRule = `\n\n## 🛑 MASTER FORMAT LOCK: ${currentRatio}\n` + 
    `You MUST enforce this aspect ratio for every single generated Asset and Scene.\n` + 
    `When writing 'visualDescription' for Scenes or 'description' for Assets, YOU MUST explicitly include these keywords to ensure the image generator respects the format: "${ratioKeywords}".\n` +
    `Do not allow assets or scenes to drift into square or opposite formats unless strictly requested.`;

  // Dynamic Deletion Check Instruction
  const deletionCheck = `\n\n## SECURITY CHECK:\nCompare the provided "CURRENT PROJECT ASSETS" and "MASTER SEQUENCE" lists above with the previous turn's context. If a user deleted a card/asset I previously suggested or one that existed before, I MUST ASK: "Эй, зачем удалил [Asset Name]? Нормально же сидели." (Hey, why did you delete [Name]?).`;

  const finalSystemInstruction = `${VAL_SYSTEM_PROMPT}\n\n${styleSuffix}${formatRule}${assetsDesc}${timelineSummary}${sceneContext}${deletionCheck}`;

  const contents = history.map((msg) => {
    const parts: any[] = [];
    if (msg.text) {
        parts.push({ text: msg.text });
    } else {
        parts.push({ text: "[Visual/File attachment from previous turn omitted for optimization]" });
    }
    return {
      role: msg.role,
      parts: parts
    };
  });

  const newParts: any[] = [];
  attachments.forEach(att => {
    newParts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data.split(',')[1]
      }
    });
  });
  newParts.push({ text: newMessage });
  
  contents.push({
    role: 'user',
    parts: newParts
  });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: contents,
      config: {
        systemInstruction: finalSystemInstruction,
        temperature: 0.85,
        tools: [{ googleSearch: {} }] 
      }
    });

    return response.text || "Эээ... что-то пленку зажевало. Повтори, братан? (Empty Response)";
  } catch (error: any) {
    console.error("Director Agent Error:", error);
    if (error.message?.includes('429')) {
        return "Action Cut! Too many requests (429). Give me a second to reload the film reel.";
    }
    return `Action Cut! Error: ${error.message || "Unknown API Error"}`;
  }
};

/**
 * Enhances a simple description into a vivid visual prompt using Gemini 3 
 */
export const enhancePrompt = async (userInput: string, assetsContext?: string): Promise<string> => {
  try {
    const ai = getClient();
    const systemInstruction = `You are NanoBanana Prompt Polisher – a professional AI prompt refiner.
    Transform short or vague prompts into detailed, cinematic visual descriptions.
    Always output in English.`;

    let prompt = `Raw idea: "${userInput}".`;
    if (assetsContext) {
      prompt += `\nContext (Assets details): ${assetsContext}`;
    }

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { systemInstruction, temperature: 0.7 }
    });

    const fullText = response.text || userInput;
    const match = fullText.match(/Refined Prompt:\s*([\s\S]+?)(?=\s*(?:🧩|Elements Expanded:|$))/i);
    if (match && match[1]) return match[1].trim();
    return fullText; 
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return userInput; 
  }
};

/**
 * Generates an image using Nano Banana (Flash) or Pro.
 */
export const generateImage = async (
  prompt: string, 
  referenceImages?: string[],
  aspectRatio: string = "16:9",
  modelName: string = MODEL_IMAGE_FLASH,
  imageSize?: string
): Promise<string> => {
  const ai = getClient();
  const parts: any[] = [];

  if (referenceImages && referenceImages.length > 0) {
    // 1. Resolve all images (convert URLs to Base64)
    const processedImages = await Promise.all(referenceImages.map(async (img) => {
        if (img.startsWith('http') || img.startsWith('https')) {
            return await urlToBase64(img);
        }
        return img;
    }));

    // 2. Add to parts
    processedImages.forEach(img => {
        if (!img) return; // Skip failed downloads

        // Detect if Data URL
        const matches = img.match(/^data:(.+);base64,(.+)$/);
        let mimeType = 'image/png';
        let cleanBase64 = img;

        if (matches && matches.length === 3) {
            mimeType = matches[1];
            cleanBase64 = matches[2];
        } else if (img.includes('base64,')) {
             // Fallback split if regex misses
             cleanBase64 = img.split('base64,')[1];
        }

        parts.push({
            inlineData: {
                mimeType,
                data: cleanBase64
            }
        });
    });

    // Add text prompt last as recommended
    parts.push({
      text: "Using the visual style and subjects from the attached reference images, generate: " + prompt
    });
  } else {
    parts.push({ text: prompt });
  }

  const config: any = {
      imageConfig: { aspectRatio: aspectRatio as any }
  };
  
  if (imageSize && modelName === MODEL_IMAGE_PRO) {
      config.imageConfig.imageSize = imageSize;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config
  });

  if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
  }

  throw new Error("No image data returned from Gemini.");
};

export const generateVoiceDirection = async (dialogue: string, sceneDescription: string): Promise<string> => {
  try {
    const ai = getClient();
    const systemInstruction = `You are a professional Voice Director. Rewrite the dialogue specifically for Text-to-Speech engines.
    CRITICAL RULE: Do NOT use acute accents (e.g., 'á') for stress. Instead, capitalize the entire stressed syllable or word (e.g., 'HEL-lo', 'WHAT').
    Add intonation, pauses (using commas or ellipses), and speed instructions in brackets if needed.`;
    const prompt = `Scene Context: "${sceneDescription}"\nRaw Dialogue: "${dialogue}"`;
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { systemInstruction, temperature: 0.5 }
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};

export const generateStoryboard = async (
  storyIdea: string,
  availableCharacters: { id: string, name: string, description: string, triggerWord?: string }[],
  languageStrategy: 'english' | 'russian' | 'hybrid' = 'hybrid',
  stylePrompt?: string
) => {
  const ai = getClient();
  const characterList = availableCharacters.map(c => `- ${c.name} ${c.triggerWord ? `(Trigger: "${c.triggerWord}")` : ''}: ${c.description}`).join('\n');

  const systemInstruction = `You are a world-class Film Director. Create a cinematic storyboard.
  ${stylePrompt ? `Style: ${stylePrompt}` : ''}
  ## Available Characters
  ${characterList}
  Return JSON array of scenes.`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: `Story Idea: ${storyIdea}`,
    config: {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            visualDescription: { type: Type.STRING },
            shotType: { type: Type.STRING },
            duration: { type: Type.NUMBER },
            dialogue: { type: Type.STRING },
            speechPrompt: { type: Type.STRING },
            musicMood: { type: Type.STRING },
            sunoPrompt: { type: Type.STRING },
            characterName: { type: Type.STRING }
          },
          required: ["title", "visualDescription", "shotType", "duration"]
        }
      }
    }
  });

  if (response.text) return JSON.parse(response.text);
  return [];
};
