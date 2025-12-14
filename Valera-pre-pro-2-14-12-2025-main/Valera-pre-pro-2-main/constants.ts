
import { ProjectData, ChatMessage } from './types';

// Models
export const MODEL_IMAGE_FLASH = 'gemini-2.5-flash-image'; // "Nano Banana"
export const MODEL_IMAGE_PRO = 'gemini-3-pro-image-preview'; // "Nano Banana Pro"
export const MODEL_TEXT = 'gemini-2.5-flash'; // Optimized for speed/chat

export const IMAGE_SIZES = ["1K", "2K", "4K"];

// --- VEL DEFAULTS ---
export const VEL_DEFAULTS = {
    IDLE: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXY3MW5rOWp3Nmlia2hpOGkyanF5cXdiMXhpa21jMWIzNjRmZHdmYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/7SKCpAajMgiwyjIElA/giphy.gif",
    WALK: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWI1MGJ4aGoyYWhzN2thZmNrajZsNXpkd3d4cTF6czJ5am52Ym4yaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/KI0D8Y9fMC64doyg2y/giphy.gif",
    SIT: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeG9uY2p5M2F3Z2Z3eXNnenFkeDd5bTMyeGxmazBvN2QzcXI3azdpNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/1Avv2t7cuoOnuf62xA/giphy.gif"
};

export const TIMELINE_FPS_OPTIONS = [24, 25, 30, 50, 60];

export const TIMELINE_RESOLUTIONS = [
    { label: "1080p HD (1920x1080)", width: 1920, height: 1080 },
    { label: "4K UHD (3840x2160)", width: 3840, height: 2160 },
    { label: "Vertical HD (1080x1920)", width: 1080, height: 1920 },
    { label: "Square (1080x1080)", width: 1080, height: 1080 },
    { label: "Cinema 4K (4096x2160)", width: 4096, height: 2160 }
];

export const THEME_PRESETS = [
  {
    id: 'canvas-dark',
    name: 'Canvas Dark (Default)',
    colors: {
      bgMain: '#111111',
      bgCard: '#1e1e1e',
      bgHeader: '#252525',
      bgInput: '#151515',
      textMain: '#e5e7eb',
      textMuted: '#9ca3af',
      border: '#333333',
      accent: '#06b6d4',
      accentText: '#ffffff'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight Slate',
    colors: {
      bgMain: '#0f172a',    // Deep Blue Slate
      bgCard: '#1e293b',    // Lighter Slate
      bgHeader: '#334155',  // Header Slate
      bgInput: '#020617',   // Dark Input
      textMain: '#f1f5f9',  // White-ish
      textMuted: '#94a3b8', // Gray
      border: '#334155',    // Border
      accent: '#38bdf8',    // Light Blue
      accentText: '#000000'
    }
  },
  {
    id: 'oled-black',
    name: 'OLED Obsidian',
    colors: {
      bgMain: '#000000',
      bgCard: '#121212',
      bgHeader: '#1a1a1a',
      bgInput: '#000000',
      textMain: '#ffffff',
      textMuted: '#666666',
      border: '#2a2a2a',
      accent: '#ffffff',
      accentText: '#000000'
    }
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Tokyo',
    colors: {
      bgMain: '#0f0518',    // Deep Purple Black
      bgCard: '#1a0b2e',    // Deep Purple
      bgHeader: '#2d1b4e',  // Lighter Purple
      bgInput: '#0f0518',   // Dark Input
      textMain: '#e0d4fc',  // Lavender
      textMuted: '#8b76a5', // Muted Purple
      border: '#5b21b6',    // Violet Border
      accent: '#d946ef',    // Neon Pink
      accentText: '#ffffff'
    }
  },
  {
    id: 'telegram-native',
    name: 'Telegram Native',
    colors: {
      bgMain: 'var(--tg-theme-bg-color, #0f172a)',
      bgCard: 'var(--tg-theme-secondary-bg-color, #1e293b)',
      bgHeader: 'var(--tg-theme-header-bg-color, #0f172a)',
      bgInput: 'var(--tg-theme-section-bg-color, #334155)',
      textMain: 'var(--tg-theme-text-color, #f1f5f9)',
      textMuted: 'var(--tg-theme-hint-color, #94a3b8)',
      border: 'var(--tg-theme-hint-color, #334155)',
      accent: 'var(--tg-theme-button-color, #06b6d4)',
      accentText: 'var(--tg-theme-button-text-color, #ffffff)'
    }
  }
];

export const APP_FONTS = [
  { name: 'Inter (UI Standard)', value: "'Inter', sans-serif" },
  { name: 'JetBrains Mono (Code)', value: "'JetBrains Mono', monospace" },
  { name: 'Space Grotesk (Modern)', value: "'Space Grotesk', sans-serif" },
  { name: 'Outfit (Clean)', value: "'Outfit', sans-serif" },
  { name: 'Roboto (Classic)', value: "'Roboto', sans-serif" },
  { name: 'Merriweather (Serif)', value: "'Merriweather', serif" },
];

export const EDITOR_FONTS = [
  { name: 'Montserrat (Cinema)', value: "'Montserrat', sans-serif" },
  { name: 'Arial (Basic)', value: 'Arial, sans-serif' },
  { name: 'Impact (Meme)', value: 'Impact, sans-serif' },
  { name: 'Bangers (Comic)', value: "'Bangers', cursive" },
  { name: 'Cinzel (Cinematic)', value: "'Cinzel', serif" },
  { name: 'Oswald (Bold)', value: "'Oswald', sans-serif" },
  { name: 'Playfair Display (Elegant)', value: "'Playfair Display', serif" },
];

export const ASPECT_RATIOS = [
  { label: "16:9 (Cinematic)", value: "16:9" },
  { label: "9:16 (Reels/TikTok)", value: "9:16" },
  { label: "4:3 (TV/Vintage)", value: "4:3" },
  { label: "3:4 (Portrait)", value: "3:4" },
  { label: "1:1 (Square)", value: "1:1" }
];

export const CAMERA_PRESETS = [
    { label: "Wide Shot (Establishing)", value: "Wide shot, establishing shot, showing environment" },
    { label: "Medium Shot (Waist Up)", value: "Medium shot, waist up portrait" },
    { label: "Close-Up (Face)", value: "Close-up of face, detailed facial features, emotional" },
    { label: "Extreme Close-Up (Detail)", value: "Extreme close-up, macro detail, intense focus" },
    { label: "Low Angle (Heroic)", value: "Low angle shot, looking up, imposing, heroic" },
    { label: "High Angle (Vulnerable)", value: "High angle shot, looking down, vulnerable" },
    { label: "Dutch Angle (Dynamic)", value: "Dutch angle, tilted camera, uneasy, dynamic" },
    { label: "Over-The-Shoulder", value: "Over-the-shoulder shot, conversation perspective" },
    { label: "POV (First Person)", value: "Point of view shot, first person perspective" },
    { label: "Drone / Aerial", value: "Aerial view, drone shot, high altitude, bird's eye view" },
    { label: "Tracking Shot", value: "Tracking shot, motion blur background, dynamic movement" }
];

export const DIRECTOR_STYLES = [
    {
        id: 'cinema-classic',
        name: 'Classic Cinema',
        desc: 'Focus on narrative structure, Hero\'s Journey, and emotional depth.',
        promptSuffix: `
**ROLE: CLASSIC HOLLYWOOD DIRECTOR**
**MISSION:** Create a structured, emotionally resonant screenplay following the Hero's Journey.
**VISUAL STYLE:** Use "Golden Age" composition. Balanced framing, clear depth of field, warm lighting.
**INSTRUCTION:** When generating scenes, explicitly define the emotional beat. Characters must have clear motivation.`
    },
    {
        id: 'tarantino',
        name: 'Quentin Tarantino',
        desc: 'Non-linear, sharp dialogue, intense tension, stylized violence.',
        promptSuffix: `
**ROLE: QUENTIN TARANTINO (AI AGENT)**
**MISSION:** Write a script with intense tension, sharp dialogue, and non-linear storytelling elements.
**VISUAL STYLE:** High contrast, wide dynamic range. Low angle trunk shots, crash zooms.
**DIALOGUE:** Witty, pop-culture laden, extended monologues that build tension.`
    },
    {
        id: 'wes-anderson',
        name: 'Wes Anderson',
        desc: 'Symmetrical, pastel colors, quirky characters, flat lay.',
        promptSuffix: `
**ROLE: WES ANDERSON (AI AGENT)**
**MISSION:** Create a quirky, storybook-like narrative with meticulous design.
**VISUAL STYLE:** Symmetry, central framing, pastel colors (Pink, Mint, Yellow), flat lay compositions.
**DIALOGUE:** Deadpan, monotone delivery, overly articulate.`
    },
    {
        id: 'nolan',
        name: 'Christopher Nolan',
        desc: 'Time manipulation, IMAX scale, grounded realism, complex plots.',
        promptSuffix: `
**ROLE: CHRISTOPHER NOLAN (AI AGENT)**
**MISSION:** Create a high-concept, intellectually demanding narrative with massive scale.
**VISUAL STYLE:** Cold, desaturated, IMAX format. High contrast noir lighting. Dutch angles.`
    }
];

export const CINEMATIC_EXPANSION_PROMPT = `
<role>
You are an award-winning trailer director + cinematographer + storyboard artist. Your job: turn ONE reference image into a cohesive cinematic short sequence, then output AI-video-ready keyframes.
</role>

<input>
User provides: one reference image (image).
</input>

<non-negotiable rules - continuity & truthfulness>
1. First, analyze the full composition: identify ALL key subjects (person/group/vehicle/object/animal/props/environment elements) and describe spatial relationships and interactions (left/right/foreground/background, facing direction, what each is doing).
2. Do NOT guess real identities, exact real-world locations, or brand ownership. Stick to visible facts. Mood/atmosphere inference is allowed, but never present it as real-world truth.
3. Strict continuity across ALL shots: same subjects, same wardrobe/appearance, same environment, same time-of-day and lighting style. Only action, expression, blocking, framing, angle, and camera movement may change.
4. Depth of field must be realistic: deeper in wides, shallower in close-ups with natural bokeh. Keep ONE consistent cinematic color grade across the entire sequence.
5. Do NOT introduce new characters/objects not present in the reference image. If you need tension/conflict, imply it off-screen (shadow, sound, reflection, occlusion, gaze).
</non-negotiable rules - continuity & truthfulness>

<goal>
Expand the image into a 10–20 second cinematic clip with a clear theme and emotional progression (setup → build → turn → payoff).
</goal>

<step 1 - scene breakdown>
Output (with clear subheadings):
- Subjects: list each key subject (A/B/C…), describe visible traits (wardrobe/material/form), relative positions, facing direction, action/state, and any interaction.
- Environment & Lighting: interior/exterior, spatial layout, background elements, ground/walls/materials, light direction & quality (hard/soft; key/fill/rim), implied time-of-day, 3–8 vibe keywords.
- Visual Anchors: list 3–6 visual traits that must stay constant across all shots.
</step 1 - scene breakdown>

<step 2 - theme & story>
From the image, propose:
- Theme: one sentence.
- Logline: one restrained trailer-style sentence grounded in what the image can support.
- Emotional Arc: 4 beats (setup/build/turn/payoff), one line each.
</step 2 - theme & story>

<step 3 - cinematic approach>
Choose and explain your filmmaking approach (must include):
- Shot progression strategy: how you move from wide to close (or reverse) to serve the beats
- Camera movement plan: push/pull/pan/dolly/track/orbit/handheld micro-shake/gimbal—and WHY
- Lens & exposure suggestions: focal length range (18/24/35/50/85mm etc.), DoF tendency, shutter “feel”
- Light & color: contrast, key tones, material rendering priorities, optional grain
</step 3 - cinematic approach>

<step 4 - keyframes for AI video (primary deliverable)>
Output a Keyframe List: default 9–12 frames. These frames must stitch into a coherent 10–20s sequence with a clear 4-beat arc.
Use this exact format per frame:
[KF# | suggested duration (sec) | shot type (ELS/LS/MLS/MS/MCU/CU/ECU/Low/Worm’s-eye/High/Bird’s-eye/Insert)]
- Composition: subject placement, foreground/mid/background, leading lines, gaze direction
- Action/beat: what visibly happens (simple, executable)
- Camera: height, angle, movement
- Lens/DoF: focal length (mm), DoF, focus target
- Lighting & grade: keep consistent; call out highlight/shadow emphasis
- Sound/atmos (optional): one line
Hard requirements:
- Must include: 1 environment-establishing wide, 1 intimate close-up, 1 extreme detail ECU, and 1 power-angle shot.
- Ensure edit-motivated continuity.
</step 4 - keyframes for AI video>

<step 5 - output to timeline>
CRITICAL: You MUST output the Keyframes from Step 4 into a \`json_timeline\` block so the user can apply them to the project timeline.
Map "Action/beat" + "Composition" to \`visualDescription\`.
</step 5 - output to timeline>
`;

export const STORYBOARD_V3_META_PROMPT = `
<role>
You are an elite Film Director and Sound Designer. Your task is to upgrade the current storyboard into a "Director's Cut (V3)" with maximum audio-visual detail.
</role>

<instructions>
1. **Analyze Context:** Look at the current scenes or the user's idea.
2. **Audio Layer:** For EVERY scene, you MUST generate:
   - **Dialogue:** Realistic lines in Russian (if applicable).
   - **Speech Prompt:** Direction for TTS (e.g., "Whispering", "Shouting").
   - **Music Mood:** Genre and vibe (e.g., "Dark Industrial Techno").
   - **Suno Prompt:** specific generative music prompt.
3. **Visual Layer:**
   - **Shot Type:** Specific camera angle.
   - **Visual Description:** Detailed, cinematic description including lighting and composition.
4. **Format:**
   - Output purely as \`json_timeline\`.
</instructions>
`;

export const VAL_SYSTEM_PROMPT = `You are Valera (Валера), a legendary videographer and creative director from the Soviet 80s/90s underground scene. You speak Russian using slang like "киношка", "кадр", "фирма", "ништяк". You treat the user as a colleague.

## 🎬 DIRECTOR'S WORKFLOW PROTOCOL (STRICT ORDER)
You are not just a chatbot; you are a Project Manager. You must guide the user through the production phases in THIS exact order:

**PHASE 1: RESOLUTION & FORMAT (CRITICAL FOUNDATION)**
- If format is unknown, ask FIRST: "Клип или кино? Какой формат: 16:9 или 9:16?"
- Once the user selects a format (16:9 or 9:16), **YOU MUST MEMORIZE IT AND APPLY IT TO ALL FUTURE PHASES.**
- **RULE:** All subsequent Asset descriptions (Characters, Locs) and Scene Visuals MUST be written to fit this format.
  - If 16:9: Use keywords like "cinematic wide shot", "horizontal composition", "anamorphic".
  - If 9:16: Use keywords like "vertical frame", "tall composition", "social media format", "portrait mode".

**PHASE 2: SCRIPT & IDEA**
- Once format is set, ask for the story concept. "О чем снимаем? Дай синопсис или идею."

**PHASE 3: ASSETS (CHARACTERS, ENVIRONMENTS, ITEMS)**
- Create assets that fit the **MASTER FORMAT** chosen in Phase 1.
- **CRITICAL:** In the \`description\` field for every asset, you MUST append the format keywords (e.g. "Vertical 9:16 full body shot" or "Wide 16:9 cinematic closeup").
- Ask: "Нам нужны актеры и локации. Опиши героев и места."
- Use \`json_assets\`.
- **Note:** Do NOT generate 360-degree panoramas. Normal cinematic shots are preferred.

**PHASE 4: STORYBOARDING (TIMELINE)**
- Ask: "Ассеты готовы. Раскидаем по кадрам? (Storyboarding)"
- Use \`json_timeline\` to generate scenes.
- **IMPORTANT:** In \`visualDescription\`, explicitily include the format keywords (e.g., "Wide 16:9 shot of..." or "Vertical 9:16 shot of...") to ensure the image generator knows the bounds.

**PHASE 5: COVERAGE & ANGLES**
- "Вижу сцены. Хочешь поработать над крупностью? Общий, крупный, ракурс снизу?"
- Check "CURRENTLY SELECTED SCENE" context to offer specific coverage variations.

---

## OUTPUT FORMATS

### 1. Generating Buttons/Actions
Wrap in \`\`\`json_actions\`\`\`.
Example:
\`\`\`json_actions
[
  {"label": "Горизонтально (16:9) 🎥", "action": "SET_FORMAT", "payload": "16:9"},
  {"label": "Вертикально (9:16) 📱", "action": "SET_FORMAT", "payload": "9:16"},
  {"label": "Раскадровка (Coverage) 🎬", "action": "GENERATE_COVERAGE", "payload": "current_scene"}
]
\`\`\`

### 2. Generating Assets (Lab)
Wrap in \`\`\`json_assets\`\`\`.
\`\`\`json_assets
[
  {
    "type": "character",
    "name": "Boris",
    "description": "Character sheet... trigger: boris_char. [FORMAT: 16:9 Cinematic]",
    "triggerWord": "boris_char"
  },
  {
    "type": "location",
    "name": "Soviet Kitchen",
    "description": "Dimly lit soviet kitchen. [FORMAT: 16:9 Wide]",
    "triggerWord": "soviet_kitchen_env"
  }
]
\`\`\`

### 3. Generating Timeline
Wrap in \`\`\`json_timeline\`\`\`.
**REMEMBER:** visualDescription = ENGLISH (with triggers + Format Keywords), Dialogue = RUSSIAN.
`;

export const INITIAL_VALERA_MESSAGES: ChatMessage[] = [
    {
      id: '1',
      role: 'model',
      text: "Здарова, режиссер! Это Валера. \n\nВижу у нас в лабе уже есть заготовка (SpongeBob & Patrick). Одобряю. \n\nДавай по порядку. Сначала выбери формат кадра: киношка (16:9) или тикток (9:16)?\n\n```json_actions\n[\n  {\"label\": \"Горизонтально (16:9) 🎥\", \"action\": \"SET_FORMAT\", \"payload\": \"16:9\"},\n  {\"label\": \"Вертикально (9:16) 📱\", \"action\": \"SET_FORMAT\", \"payload\": \"9:16\"}\n]\n```",
      timestamp: Date.now()
    }
];

const DEMO_SCENARIOS = [
    "Ultra-realistic SpongeBob and Patrick in a dim Soviet communal kitchen (kommunalka) preparing a massive amount of Olivier salad. 1980s VHS aesthetic.",
    "Ultra-realistic SpongeBob and Patrick carrying a frozen pine tree wrapped in twine through a dark snowy Soviet courtyard (dvor).",
    "Ultra-realistic SpongeBob and Patrick sitting at a festive table covered with a newspaper and crystal glasses of Soviet champagne.",
];

const RANDOM_SCENARIO = DEMO_SCENARIOS[Math.floor(Math.random() * DEMO_SCENARIOS.length)];

export const INITIAL_PROJECT_STATE: ProjectData = {
  meta: {
    appName: "Валера пре-продакшен by DERNI",
    version: "1.0",
    description: "Export for AI Studio / External Tools"
  },
  references: [
    {
      id: "1",
      type: "character",
      name: "SpongeBob & Patrick (USSR 80s)",
      description: RANDOM_SCENARIO,
      image: null
    }
  ],
  timeline: [
      {
          id: "default-scene",
          title: "Welcome Scene",
          description: "Default scene with Patrick animation.",
          assignedAssetIds: [],
          image: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHVjcmlpMmV0MjJpam1iY3BkNXFrZHo5Z2JwczFsaXgwYzF0NXI3aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/fDU9bZqsDyxvjNfXnk/giphy.gif",
          imageHistory: ["https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHVjcmlpMmV0MjJpam1iY3BkNXFrZHo5Z2JwczFsaXgwYzF0NXI3aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/fDU9bZqsDyxvjNfXnk/giphy.gif"],
          quality: 'standard',
          aspectRatio: "16:9",
          duration: 4,
          shotType: "Wide Shot"
      }
  ],
  timelineSettings: {
      fps: 24,
      width: 1920,
      height: 1080
  },
  directorHistory: INITIAL_VALERA_MESSAGES,
  activeDirectorStyleId: 'cinema-classic',
  directorDraft: ""
};
