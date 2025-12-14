
import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { ProjectData, AppSettings, Character, LabAssetSuggestion, TimelineSuggestion, TimelineFrame, ChatMessage, TimelineSettings, DirectorAction, GenerationLogEntry } from './types';
import { INITIAL_PROJECT_STATE, THEME_PRESETS, APP_FONTS, MODEL_IMAGE_FLASH, INITIAL_VALERA_MESSAGES, DIRECTOR_STYLES, VEL_DEFAULTS } from './constants';
import { TimelineManager } from './components/TimelineManager';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoAudioHub } from './components/VideoAudioHub';
import { PatrickAssistant } from './components/PatrickAssistant';
import { LayoutTemplate, Download, Save, RefreshCw, FolderOpen, Settings as SettingsIcon, Film, FileText, CheckCircle, Cloud, Presentation, FileArchive, Megaphone, Menu, X, Maximize2, Minimize2, Clapperboard } from 'lucide-react';
import { generateProjectPDF } from './services/pdfService';
import { generateProjectPPTX } from './services/pptxService';
import { saveProjectToIDB, loadProjectFromIDB } from './services/storageService';
import { telegramService } from './services/telegramService';
import { driveService } from './services/driveService';

declare var google: any;

const TelegramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.23 15.51 15.99C15.37 16.74 15.09 16.99 14.82 17.02C14.23 17.07 13.78 16.63 13.21 16.26C12.32 15.67 11.82 15.31 10.96 14.74C9.96 14.08 10.61 13.72 11.18 13.13C11.33 12.98 13.93 10.61 13.98 10.4C13.99 10.37 13.99 10.26 13.92 10.2C13.85 10.14 13.75 10.16 13.67 10.18C13.56 10.2 12.08 11.17 9.21 13.11C8.79 13.4 8.41 13.54 7.97 13.53C7.49 13.52 6.57 13.26 5.89 13.04C5.05 12.77 4.72 12.63 4.78 12.18C4.81 11.95 5.13 11.71 5.76 11.46C9.69 9.67 12.31 8.61 13.62 8.08C16.34 6.97 16.9 6.78 17.27 6.78C17.35 6.78 17.54 6.8 17.66 6.9C17.76 6.98 17.79 7.09 17.79 7.21C17.8 7.3 17.79 7.43 17.77 7.57L16.64 8.8Z" fill="currentColor"/>
  </svg>
);

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectData>(INITIAL_PROJECT_STATE);
  const [activeTab, setActiveTab] = useState<'timeline' | 'settings' | 'video_audio'>('timeline');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isPptxGenerating, setIsPptxGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // New: Director Full Screen Mode (Hides tabs/headers)
  const [isDirectorFullScreen, setIsDirectorFullScreen] = useState(false);
  
  // Lifted state for Director Hub persistence
  const [directorMessages, setDirectorMessages] = useState<ChatMessage[]>(INITIAL_VALERA_MESSAGES);
  
  const [notification, setNotification] = useState<{msg: string, type: 'info' | 'success'} | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    themeId: 'canvas-dark', 
    fontFamily: APP_FONTS[0].value,  
    imageModel: MODEL_IMAGE_FLASH,
    showAssistant: true, // Default ON for Vel
    chatFontSize: 12, // Default font size
    // AUTO-LOAD VEL DEFAULTS
    assistantIdleImage: VEL_DEFAULTS.IDLE,
    assistantWalkImage: VEL_DEFAULTS.WALK,
    assistantSitImage: VEL_DEFAULTS.SIT
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // Mouse Tracking for Ctrl+F
  useEffect(() => {
      const updateMousePos = (e: MouseEvent) => {
          mousePos.current = { x: e.clientX, y: e.clientY };
      };
      window.addEventListener('mousemove', updateMousePos);
      return () => window.removeEventListener('mousemove', updateMousePos);
  }, []);

  // Ctrl+F Fullscreen Handler
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
              e.preventDefault();
              const element = document.elementFromPoint(mousePos.current.x, mousePos.current.y);
              if (element) {
                  // Find the closest meaningful container (div, section, canvas)
                  const target = element.closest('div[class*="relative"], canvas, section') || element;
                  if (!document.fullscreenElement) {
                      target.requestFullscreen().catch(err => console.error(err));
                  } else {
                      document.exitFullscreen();
                  }
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for Fullscreen Change
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    telegramService.init();
    const isTG = telegramService.isTelegramPlatform();
    setIsTelegram(isTG);
    
    if (isTG) {
        setSettings(prev => ({ ...prev, themeId: 'telegram-native' }));
    }

    const handleBack = () => {
       if (isMobileMenuOpen) setIsMobileMenuOpen(false);
       else telegramService.WebApp.close();
    };

    if (telegramService.isVersionAtLeast('6.1') && telegramService.WebApp.BackButton) {
        telegramService.WebApp.BackButton.onClick(handleBack);
        if (isMobileMenuOpen) telegramService.WebApp.BackButton.show();
        else telegramService.WebApp.BackButton.hide();
    }

    return () => {
        if (telegramService.isVersionAtLeast('6.1') && telegramService.WebApp.BackButton) {
            telegramService.WebApp.BackButton.offClick(handleBack);
        }
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const theme = THEME_PRESETS.find(t => t.id === settings.themeId) || THEME_PRESETS[0];
    const root = document.documentElement;
    root.style.setProperty('--bg-main', theme.colors.bgMain);
    root.style.setProperty('--bg-card', theme.colors.bgCard);
    root.style.setProperty('--bg-header', (theme.colors as any).bgHeader || theme.colors.bgCard); 
    root.style.setProperty('--bg-input', theme.colors.bgInput);
    root.style.setProperty('--text-main', theme.colors.textMain);
    root.style.setProperty('--text-muted', theme.colors.textMuted);
    root.style.setProperty('--border-color', theme.colors.border);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--accent-text', theme.colors.accentText);
    document.body.style.fontFamily = settings.fontFamily;
    
    if (isTelegram && theme.colors.bgCard.startsWith('#')) {
        telegramService.WebApp.setHeaderColor((theme.colors as any).bgHeader || theme.colors.bgCard);
        telegramService.WebApp.setBackgroundColor(theme.colors.bgMain);
    }
  }, [settings, isTelegram]);

  useEffect(() => {
    const initLoad = async () => {
        const loadedProject = await loadProjectFromIDB();
        if (loadedProject) {
            const mergedProject = {
                ...INITIAL_PROJECT_STATE,
                ...loadedProject,
                timelineSettings: loadedProject.timelineSettings || INITIAL_PROJECT_STATE.timelineSettings,
                activeDirectorStyleId: loadedProject.activeDirectorStyleId || INITIAL_PROJECT_STATE.activeDirectorStyleId,
                directorDraft: loadedProject.directorDraft || "",
                generationLog: loadedProject.generationLog || [] // Load existing logs
            };
            setProject(mergedProject);

            if (loadedProject.directorHistory && loadedProject.directorHistory.length > 0) {
                setDirectorMessages(loadedProject.directorHistory);
            }
        }
    };
    initLoad();
  }, []);

  useEffect(() => {
    const saveData = async () => {
        setIsSyncing(true);
        try {
            const fullSaveState = { ...project, directorHistory: directorMessages };
            await saveProjectToIDB(fullSaveState);
            if (isDriveConnected) await new Promise(r => setTimeout(r, 800));
        } catch (e) {
            console.error("Autosave failed", e);
        } finally {
            setIsSyncing(false);
        }
    };
    const debounce = setTimeout(saveData, 3000); 
    return () => clearTimeout(debounce);
  }, [project, directorMessages, isDriveConnected]);

  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 3000);
        telegramService.haptic.impact('light');
        return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (msg: string, type: 'info' | 'success' = 'info') => {
      setNotification({ msg, type });
      if (type === 'success') telegramService.haptic.success();
  };

  // Google Drive Connection Handler
  const handleConnectDrive = () => {
      if (typeof google === 'undefined') {
          alert("Google Sign-In script not loaded. Please check your internet connection.");
          return;
      }

      // Initialize Token Client
      const client = google.accounts.oauth2.initTokenClient({
          client_id: 'YOUR_CLIENT_ID_PLACEHOLDER', // In a real app, this comes from ENV or Dashboard.
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (tokenResponse: any) => {
              if (tokenResponse && tokenResponse.access_token) {
                  driveService.setAccessToken(tokenResponse.access_token);
                  setIsDriveConnected(true);
                  showNotification("Google Drive Connected", "success");
              }
          },
          error_callback: (err: any) => {
              console.error("Auth Error", err);
              alert("Authentication failed. Please try again.");
          }
      });

      // If user hasn't provided a real Client ID in code, we warn them, but try anyway (it will fail or show 'origin mismatch' if not configured)
      // For this demo, we assume the user might replace the placeholder.
      try {
          client.requestAccessToken();
      } catch (e) {
          alert("Error requesting access token. Ensure a valid Client ID is configured in App.tsx");
      }
  };

  const updateCharacters = (action: Character[] | ((prev: Character[]) => Character[])) => {
    setProject(prev => ({ 
        ...prev, 
        references: typeof action === 'function' ? action(prev.references) : action 
    }));
  };

  const updateTimeline = (action: TimelineFrame[] | ((prev: TimelineFrame[]) => TimelineFrame[])) => {
    setProject(prev => ({ 
        ...prev, 
        timeline: typeof action === 'function' ? action(prev.timeline) : action 
    }));
  };
  
  const updateTimelineSettings = (newSettings: TimelineSettings) => {
      setProject(prev => ({ ...prev, timelineSettings: newSettings }));
  };

  const handleDirectorStyleChange = (id: string) => {
      setProject(prev => ({ ...prev, activeDirectorStyleId: id }));
  };

  const handleDirectorDraftChange = (text: string) => {
      setProject(prev => ({ ...prev, directorDraft: text }));
  };

  // LOGGING FUNCTION
  const logGeneration = (entry: GenerationLogEntry) => {
      setProject(prev => ({
          ...prev,
          generationLog: [...(prev.generationLog || []), entry]
      }));
  };

  const handleDirectorAction = (action: DirectorAction) => {
      if (action.action === 'SET_FORMAT') {
          const ratio = action.payload; // "16:9" or "9:16"
          const isVertical = ratio === "9:16";
          const newW = isVertical ? 1080 : 1920;
          const newH = isVertical ? 1920 : 1080;
          
          setProject(prev => ({
              ...prev,
              timelineSettings: { ...prev.timelineSettings, width: newW, height: newH },
              timeline: prev.timeline.map(f => ({ ...f, aspectRatio: ratio })),
              references: prev.references.map(c => ({ ...c, aspectRatio: ratio }))
          }));
          showNotification(`Format set to ${ratio} (Updated Assets)`, 'success');
      }
  };

  const handleAddAssetFromValera = (asset: LabAssetSuggestion) => {
      // Determine project aspect ratio based on timeline settings
      const isVertical = project.timelineSettings.width < project.timelineSettings.height;
      const currentRatio = isVertical ? "9:16" : "16:9";

      const newChar: Character = {
          id: Date.now().toString(),
          type: asset.type,
          name: asset.name,
          description: asset.description,
          triggerWord: asset.triggerWord || "",
          image: null,
          imageHistory: [],
          aspectRatio: currentRatio, // Use project ratio
          imageSize: "1K"
      };
      setProject(prev => ({ ...prev, references: [...prev.references, newChar] }));
      showNotification(`Added ${asset.name} to Lab`, 'success');
  };

  const handleAddTimelineFromValera = (scenes: TimelineSuggestion[]) => {
      const isVertical = scenes.some(s => s.shotType?.includes("9:16") || s.visualDescription.includes("vertical"));
      
      // Auto-switch project format if content implies vertical
      if (isVertical && project.timelineSettings.width > project.timelineSettings.height) {
          setProject(prev => ({
              ...prev,
              timelineSettings: { ...prev.timelineSettings, width: 1080, height: 1920 }
          }));
      }

      const newFrames: TimelineFrame[] = scenes.map((s, i) => {
          const matchedAssets = project.references.filter(ref => {
             const explicitMatch = s.assetNames?.some(name => ref.name.toLowerCase().includes(name.toLowerCase()));
             const nameInDesc = s.visualDescription.toLowerCase().includes(ref.name.toLowerCase());
             const triggerInDesc = ref.triggerWord && s.visualDescription.includes(ref.triggerWord);
             return explicitMatch || nameInDesc || triggerInDesc;
          });
          const assetIds = matchedAssets.map(a => a.id);
          let finalDescription = s.visualDescription;
          matchedAssets.forEach(asset => {
              if (asset.triggerWord && !finalDescription.includes(asset.triggerWord)) {
                  finalDescription = `${asset.triggerWord}, ${finalDescription}`;
              }
          });

          return {
            id: Date.now().toString() + i,
            title: s.title,
            description: finalDescription,
            shotType: s.shotType || "Wide Shot",
            duration: s.duration || 4,
            dialogue: s.dialogue,
            speechPrompt: s.speechPrompt,
            musicMood: s.musicMood,
            sunoPrompt: s.sunoPrompt || "",
            assignedAssetIds: assetIds,
            image: null,
            imageHistory: [],
            quality: 'standard',
            aspectRatio: isVertical ? "9:16" : "16:9",
          };
      });

      setProject(prev => ({ ...prev, timeline: [...prev.timeline, ...newFrames] }));
      showNotification(`Created ${newFrames.length} Scenes in Timeline`, 'success');
  };

  const handleSaveDB = () => {
    const exportData: ProjectData = { ...project, directorHistory: directorMessages };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Valera_Source_DB_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSavePDF = async () => {
      setIsPdfGenerating(true);
      try {
          if (isDriveConnected) {
              setIsSyncing(true);
              await new Promise(r => setTimeout(r, 1500));
              setIsSyncing(false);
          }
          const doc = await generateProjectPDF(project);
          doc.save(`Valera_Report_${new Date().toISOString().slice(0,10)}.pdf`);
          if (isDriveConnected) showNotification("Report synced to Drive", "success");
      } catch (e) {
          console.error(e);
          alert("Failed to generate PDF.");
      } finally {
          setIsPdfGenerating(false);
      }
  };

  const handleSavePPTX = async () => {
      setIsPptxGenerating(true);
      try {
          await generateProjectPPTX(project);
          showNotification("PowerPoint Generated", "success");
      } catch (e) {
          console.error(e);
          alert("Failed to generate PowerPoint.");
      } finally {
          setIsPptxGenerating(false);
      }
  };

  const handleLoadDBClick = () => {
    fileInputRef.current?.click();
    setIsMobileMenuOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.meta && Array.isArray(json.timeline)) {
            const mergedProject = {
                ...INITIAL_PROJECT_STATE,
                ...json,
                timelineSettings: json.timelineSettings || INITIAL_PROJECT_STATE.timelineSettings,
                activeDirectorStyleId: json.activeDirectorStyleId || INITIAL_PROJECT_STATE.activeDirectorStyleId,
                directorDraft: json.directorDraft || "",
                generationLog: json.generationLog || []
            };
            setProject(mergedProject);
            if (json.directorHistory && Array.isArray(json.directorHistory)) {
                setDirectorMessages(json.directorHistory);
            } else {
                setDirectorMessages(INITIAL_VALERA_MESSAGES);
            }
            alert("Valera Project Loaded!");
        } else {
            alert("Invalid database file format.");
        }
      } catch (err) {
        alert("Error reading file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportZip = async () => {
    setIsZipping(true);
    try {
        const zip = new JSZip();
        const root = zip.folder("Valera prePRO");
        if (!root) throw new Error("Could not create folder");

        // 1. Manifest
        let txtContent = `PROJECT: ${project.meta.appName}\n`;
        project.timeline.forEach((f, i) => {
            txtContent += `SCENE ${i+1}: ${f.title}\n${f.description}\n\n`;
        });
        root.file("project_manifest.txt", txtContent);

        // 2. SRT
        const START_OFFSET = 3600; 
        let srtContent = "";
        let currentTime = 0;
        
        project.timeline.forEach((frame, index) => {
            const duration = frame.duration || 4;
            const formatSrtTime = (seconds: number) => {
                const totalSeconds = seconds + START_OFFSET;
                const hrs = Math.floor(totalSeconds / 3600);
                const mins = Math.floor((totalSeconds % 3600) / 60);
                const secs = Math.floor(totalSeconds % 60);
                const ms = Math.floor((totalSeconds % 1) * 1000);
                const pad = (n: number) => n.toString().padStart(2, '0');
                const padMs = (n: number) => n.toString().padStart(3, '0');
                return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${padMs(ms)}`;
            };
            const startTime = formatSrtTime(currentTime);
            const endTime = formatSrtTime(currentTime + duration);
            const text = (frame.dialogue || frame.description || "").replace(/\n/g, ' ');
            srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`;
            currentTime += duration;
        });
        root.file("timeline_captions.srt", srtContent);
        
        // 3. Images (Active Timeline)
        const imgFolder = root.folder("images");
        if (imgFolder) {
            project.timeline.forEach((f, i) => {
                if (f.image) {
                     const imgData = f.image.split(',')[1];
                     const uniqueId = Math.random().toString(36).substring(2, 7);
                     imgFolder.file(`${i + 1}_Scene_${uniqueId}.png`, imgData, {base64: true});
                }
            });
            project.references.forEach((c, i) => {
                if (c.image) {
                    const imgData = c.image.split(',')[1];
                    imgFolder.file(`char_${c.name.replace(/\s+/g,'_')}.png`, imgData, {base64: true});
                }
            });
        }

        // 4. Generation History Export
        if (project.generationLog && project.generationLog.length > 0) {
            const histFolder = root.folder("_GenerationHistory");
            if (histFolder) {
                let logText = "GENERATION HISTORY LOG\n----------------------\n\n";
                project.generationLog.forEach((entry, idx) => {
                    logText += `ID: ${entry.id}\nTime: ${new Date(entry.timestamp).toLocaleString()}\nSource: ${entry.sourceName}\nPrompt: ${entry.prompt}\nFile: hist_${idx+1}.png\n\n`;
                    if (entry.imageData) {
                        const imgData = entry.imageData.split(',')[1];
                        histFolder.file(`hist_${idx+1}.png`, imgData, {base64: true});
                    }
                });
                histFolder.file("full_log.txt", logText);
            }
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Valera_PrePro_Assets.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("Zip Archive Created", "success");
    } catch (e) {
        alert("Zip failed: " + e);
    } finally {
        setIsZipping(false);
    }
  };

  // --- ADVANCED DAVINCI RESOLVE EXPORT (PYTHON SCRIPT + ASSETS) ---
  const handleExportDaVinci = async () => {
      setIsZipping(true);
      try {
          const zip = new JSZip();
          const mediaFolder = zip.folder("Media");
          if (!mediaFolder) throw new Error("Folder error");

          const fps = project.timelineSettings.fps || 24;
          
          // 1. Generate Placeholders
          const createSolidPNG = (w: number, h: number, color: string, opacity: number = 1) => {
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d');
              if(ctx) {
                  ctx.globalAlpha = opacity;
                  ctx.fillStyle = color;
                  ctx.fillRect(0,0,w,h);
              }
              return canvas.toDataURL('image/png').split(',')[1];
          };
          
          const blackPlaceholder = createSolidPNG(1920, 1080, '#000000', 1);
          const adjustmentPlaceholder = createSolidPNG(1920, 1080, '#ffffff', 0); // Transparent
          
          mediaFolder.file("Placeholder_Black.png", blackPlaceholder, { base64: true });
          mediaFolder.file("Adjustment_Layer.png", adjustmentPlaceholder, { base64: true });

          // 2. Export SRT (For Subtitles)
          const START_OFFSET = 3600; // DaVinci often starts at 01:00:00:00
          let srtContent = "";
          let currentTime = 0;
          project.timeline.forEach((frame, index) => {
              const duration = frame.duration || 4;
              const formatSrtTime = (seconds: number) => {
                  const totalSeconds = seconds + START_OFFSET;
                  const hrs = Math.floor(totalSeconds / 3600);
                  const mins = Math.floor((totalSeconds % 3600) / 60);
                  const secs = Math.floor(totalSeconds % 60);
                  const ms = Math.floor((totalSeconds % 1) * 1000);
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const padMs = (n: number) => n.toString().padStart(3, '0');
                  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${padMs(ms)}`;
              };
              const startTime = formatSrtTime(currentTime);
              const endTime = formatSrtTime(currentTime + duration);
              const text = (frame.dialogue || frame.description || "").replace(/\n/g, ' ');
              srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`;
              currentTime += duration;
          });
          zip.file("timeline_captions.srt", srtContent);

          // 3. Prepare JSON Manifest for Python
          const uniqueCharacters = Array.from(new Set(project.references.filter(c => c.type === 'character').map(c => c.name)));
          
          const projectDataForPython = {
              timelineName: "Valera Auto-Timeline",
              width: project.timelineSettings.width,
              height: project.timelineSettings.height,
              fps: fps,
              characters: uniqueCharacters, // List of characters to create audio tracks for
              clips: [] as any[]
          };

          project.timeline.forEach((frame, index) => {
              let filename = "Placeholder_Black.png"; // Default
              let isPlaceholder = true;

              if (frame.image) {
                  filename = `clip_${index + 1}_${frame.id}.png`;
                  const imgData = frame.image.split(',')[1];
                  mediaFolder.file(filename, imgData, { base64: true });
                  isPlaceholder = false;
              }
              
              projectDataForPython.clips.push({
                  filename: filename,
                  name: frame.title,
                  durationSec: frame.duration || 4,
                  durationFrames: Math.round((frame.duration || 4) * fps),
                  isPlaceholder: isPlaceholder,
                  description: frame.description,
                  dialogue: frame.dialogue || ""
              });
          });

          zip.file("project.json", JSON.stringify(projectDataForPython, null, 2));

          // 4. Advanced Python Script with Fusion Dialog & Robust Duration Handling
          const pythonScript = `
import sys
import os
import json

# 1. Polyfills for JSON-as-Python
false = False
true = True
null = None

def get_resolve():
    try: return resolve
    except:
        try:
            import DaVinciResolveScript as dvr_script
            return dvr_script.scriptapp("Resolve")
        except: return None

def request_file_path(resolve):
    # Try using Fusion to open a file dialog
    try:
        fusion = resolve.Fusion()
        # RequestFile(filename, filter, options)
        res = fusion.RequestFile("", "", "JSON Files (*.json)|*.json")
        if res and "Filename" in res:
            return res["Filename"]
        if res and isinstance(res, str):
            return res
    except Exception as e:
        print(f"Fusion dialog failed: {e}")
    return None

def main():
    resolve = get_resolve()
    if not resolve:
        print("❌ Error: Could not connect to DaVinci Resolve.")
        return

    print("✅ Connected to DaVinci Resolve")
    
    project_manager = resolve.GetProjectManager()
    project = project_manager.GetCurrentProject()
    if not project:
        print("Error: No project open in DaVinci Resolve.")
        return

    mediapool = project.GetMediaPool()

    # --- PATH DETECTION STRATEGY ---
    json_path = ""
    
    # Strategy A: Check if __file__ exists (running script from file)
    if '__file__' in globals():
        dirname = os.path.dirname(os.path.abspath(__file__))
        candidate = os.path.join(dirname, "project.json")
        if os.path.exists(candidate):
            json_path = candidate
            print(f"Found project.json next to script: {json_path}")

    # Strategy B: Ask User via Fusion Dialog (Bypasses stdin issues)
    if not json_path:
        print("Opening file dialog...")
        json_path = request_file_path(resolve)

    # Strategy C: Terminal Input (Fallback, known to fail in embedded console)
    if not json_path:
        print("\\n" + "="*40)
        print("Could not open file dialog.")
        print("Please Paste the full path to 'project.json' below:")
        print("="*40)
        try:
            try: input_func = raw_input 
            except NameError: input_func = input
            
            p = input_func("Path> ").strip()
            if (p.startswith('"') and p.endswith('"')) or (p.startswith("'") and p.endswith("'")):
                p = p[1:-1]
            json_path = p
        except Exception as e:
            print(f"Input error: {e}")
            print("❌ FAILED: Please edit the script and hardcode JSON_PATH variable.")
            return

    if not json_path or not os.path.exists(json_path):
        print(f"❌ Error: File not found or selection cancelled.")
        return

    data = None
    with open(json_path, 'r') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"JSON Load Error: {e}")
            return

    # Use strict absolute paths derived from json_path
    base_dir = os.path.dirname(os.path.abspath(json_path))
    media_dir = os.path.join(base_dir, "Media")
    srt_path = os.path.join(base_dir, "timeline_captions.srt")

    # Import Media
    print("Importing Media...")
    imported_clips = {}
    files_to_import = []
    
    # Always import placeholders
    files_to_import.append(os.path.join(media_dir, "Placeholder_Black.png"))
    files_to_import.append(os.path.join(media_dir, "Adjustment_Layer.png"))

    for clip_data in data['clips']:
        if not clip_data['isPlaceholder']:
            fpath = os.path.join(media_dir, clip_data['filename'])
            if os.path.exists(fpath): files_to_import.append(fpath)
    
    added_items = mediapool.ImportMedia(files_to_import)
    for item in added_items:
        imported_clips[item.GetName()] = item

    # Create Timeline
    timeline_name = data['timelineName']
    timeline = mediapool.CreateEmptyTimeline(timeline_name)
    if not timeline: return

    print("Constructing Timeline...")
    
    # Append Images
    for clip_data in data['clips']:
        fname = clip_data['filename']
        pool_item = None
        target_frames = clip_data['durationFrames']
        
        if fname in imported_clips:
            pool_item = imported_clips[fname]
        elif "Placeholder_Black.png" in imported_clips:
            pool_item = imported_clips["Placeholder_Black.png"]
            
        if pool_item:
            # FIX: Set the duration on the MediaPoolItem BEFORE appending
            # This is the safest way to ensure length for stills in DaVinci APIs where Resize() on timeline item is buggy
            try:
                # Set Clip 'Out' Frame (0-indexed, so frames - 1)
                pool_item.SetClipProperty("Out", str(target_frames - 1))
            except:
                pass

            # Append item to end of timeline
            new_items = mediapool.AppendToTimeline([pool_item])
            
            # Fallback resizing if Append didn't respect SetClipProperty
            if new_items:
                tl_item = new_items[0]
                
                # Metadata & Color
                tl_item.SetClipColor("Navy" if not clip_data['isPlaceholder'] else "Tan")
                tl_item.SetName(clip_data['name'])
                
                # Check actual duration
                current_dur = tl_item.GetDuration()
                if current_dur != target_frames:
                    try:
                        # Try Resize (newer APIs)
                        if hasattr(tl_item, 'Resize'):
                            tl_item.Resize(target_frames)
                        else:
                            # Try SetEnd (older APIs)
                            s = tl_item.GetStart()
                            tl_item.SetEnd(s + target_frames)
                    except Exception as e:
                        # Just print warning, do not crash script
                        print(f"⚠️ Warning: Could not adjust duration for '{clip_data['name']}'. Error: {e}")

    # Add Adjustment Layer
    if "Adjustment_Layer.png" in imported_clips:
        try:
            adj_item = imported_clips["Adjustment_Layer.png"]
            total_frames = sum(c['durationFrames'] for c in data['clips'])
            
            try:
                adj_item.SetClipProperty("Out", str(total_frames - 1))
            except: pass

            adj_tl_items = mediapool.AppendToTimeline([adj_item])
            if adj_tl_items:
                adj = adj_tl_items[0]
                adj.SetName("ADJUSTMENT LAYER")
                adj.SetClipColor("Pink")
                
                # Resize Fallback
                try:
                    if hasattr(adj, 'Resize'): adj.Resize(total_frames)
                    else: adj.SetEnd(adj.GetStart() + total_frames)
                except: pass
        except Exception as e:
            print(f"⚠️ Warning: Issue adding adjustment layer: {e}")

    # Import Subtitles (Wrapped in try/except to prevent total failure)
    if os.path.exists(srt_path):
        print("Importing Subtitles...")
        try:
            timeline.ImportSubtitleFromSRT(srt_path)
            print("✅ Subtitles Imported.")
        except Exception as e:
            print(f"❌ Error importing subtitles: {e}")
    else:
        print(f"⚠️ Subtitle file not found at: {srt_path}")

    print("Done! Timeline created.")

if __name__ == "__main__":
    main()
`;
          zip.file("import_script.py", pythonScript);

          const readme = `VALERA DAVINCI EXPORT INSTRUCTIONS:
-----------------------------------
1. Unzip this folder.
2. Open DaVinci Resolve.
3. Open "Workspace" > "Console" > Select "Py3".
4. Copy text from 'import_script.py' and paste into Console. Press Enter.
5. A file dialog will open. Select the 'project.json' file from the unzipped folder.

NOTE: If the dialog does not appear, check the console output.
`;
          zip.file("README_DAVINCI.txt", readme);

          const blob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Valera_DaVinci_Pack.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showNotification("DaVinci Pack Created", "success");

      } catch (e) {
          alert("DaVinci Export Failed: " + e);
          console.error(e);
      } finally {
          setIsZipping(false);
      }
  };

  const ActionButton = ({ icon, label, onClick, disabled = false, loading = false, primary = false }: any) => (
      <button 
        onClick={onClick} 
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm text-left
        ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--border-color)]' : 
          primary ? 'bg-[var(--accent)] text-[var(--accent-text)] hover:brightness-110' : 'bg-[var(--bg-header)] text-[var(--text-main)] hover:bg-[var(--bg-card)] hover:text-white border border-[var(--border-color)]'}`}
      >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : icon}
          <span>{label}</span>
      </button>
  );

  const renderActionButtons = () => (
      <div className="flex flex-col gap-2 p-2">
            <a href="https://t.me/derni108" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-header)] border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-all text-[#0088cc] font-bold text-sm">
                <TelegramIcon size={18} /> Contact Developer
            </a>
            <div className="h-px bg-[var(--border-color)] my-1"></div>
            <ActionButton icon={<FolderOpen size={18}/>} label="Load Project" onClick={handleLoadDBClick} />
            <ActionButton icon={<Save size={18}/>} label="Save Database" onClick={handleSaveDB} />
            <div className="h-px bg-[var(--border-color)] my-1"></div>
            <ActionButton icon={<Presentation size={18}/>} label="Export PPTX" onClick={handleSavePPTX} loading={isPptxGenerating} disabled={isPptxGenerating} />
            <ActionButton icon={<FileText size={18}/>} label="Export PDF" onClick={handleSavePDF} loading={isPdfGenerating} disabled={isPdfGenerating} />
            <ActionButton icon={<Clapperboard size={18}/>} label="DaVinci (Python)" onClick={handleExportDaVinci} loading={isZipping} disabled={isZipping} />
            <ActionButton icon={<FileArchive size={18}/>} label="Export ZIP" onClick={handleExportZip} loading={isZipping} disabled={isZipping} />
      </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans">
      
      {/* VEL (PATRICK) ASSISTANT OVERLAY - UPDATED PROPS */}
      {settings.showAssistant && (
          <PatrickAssistant 
              onClose={() => setSettings(prev => ({...prev, showAssistant: false}))} 
              walkGif={settings.assistantWalkImage}
              idleGif={settings.assistantIdleImage}
              sittingGif={settings.assistantSitImage}
          />
      )}

      {/* APP HEADER - Hidden in Director FullScreen Mode */}
      {!isDirectorFullScreen && (
        <header className="h-14 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-4 z-50 shrink-0 relative">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-blue-700 flex items-center justify-center shadow-lg">
                    <LayoutTemplate size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-sm text-[var(--text-main)] tracking-wide">by DERNI</h1>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                        Valera Pre-Pro
                        {isDriveConnected && (
                            <span className="flex items-center gap-1 text-[var(--accent)] bg-[var(--accent)]/10 px-1 rounded ml-1">
                                <Cloud size={8} /> Drive
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2" id="ui-header-export">
                <button onClick={toggleFullScreen} className="p-2 hover:bg-[var(--bg-header)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-[var(--bg-header)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <Menu size={18} />
                </button>
            </div>
            
            <button className="md:hidden p-2 text-[var(--text-muted)]" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={20} />
            </button>
        </header>
      )}

      {/* NAVIGATION TABS - Hidden in Director FullScreen Mode */}
      {!isDirectorFullScreen && (
        <div className="h-12 bg-[var(--bg-input)] border-b border-[var(--border-color)] flex overflow-x-auto scrollbar-hide shrink-0 items-end px-2 relative z-40">
                <button
                    key="timeline"
                    onClick={() => setActiveTab('timeline')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2
                    ${activeTab === 'timeline' 
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-card)] rounded-t-lg' 
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'}`}
                >
                    <Film size={16} />
                    <span>Timeline</span>
                </button>
                <button
                    key="video_audio"
                    id="ui-tab-tools"
                    onClick={() => setActiveTab('video_audio')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2
                    ${activeTab === 'video_audio' 
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-card)] rounded-t-lg' 
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'}`}
                >
                    <Megaphone size={16} />
                    <span>Tools</span>
                </button>
                <button
                    key="settings"
                    id="ui-tab-settings"
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2
                    ${activeTab === 'settings' 
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-card)] rounded-t-lg' 
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'}`}
                >
                    <SettingsIcon size={16} />
                    <span>Settings</span>
                </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden relative bg-[var(--bg-main)]">
          <div className="h-full overflow-y-auto custom-scrollbar p-0">
                {activeTab === 'timeline' && (
                    <div className="h-full flex flex-col">
                        <TimelineManager 
                            frames={project.timeline}
                            characters={project.references}
                            settings={project.timelineSettings}
                            onUpdate={updateTimeline}
                            onUpdateSettings={updateTimelineSettings}
                            onUpdateAssets={updateCharacters}
                            imageModel={settings.imageModel}
                            isDriveConnected={isDriveConnected}
                            onNotify={showNotification}
                            
                            // Director Props
                            directorMessages={directorMessages}
                            onUpdateDirectorMessages={setDirectorMessages}
                            onDirectorAddAsset={handleAddAssetFromValera}
                            onDirectorAddTimeline={handleAddTimelineFromValera}
                            directorStyleId={project.activeDirectorStyleId || DIRECTOR_STYLES[0].id}
                            onDirectorStyleChange={handleDirectorStyleChange}
                            directorDraft={project.directorDraft || ""}
                            onDirectorDraftChange={handleDirectorDraftChange}
                            onHandleDirectorAction={handleDirectorAction}
                            chatFontSize={settings.chatFontSize}
                            
                            // Full Screen State
                            isDirectorFullScreen={isDirectorFullScreen}
                            onToggleDirectorFullScreen={setIsDirectorFullScreen}
                            
                            // Generation Log
                            onLogGeneration={logGeneration}
                        />
                    </div>
                )}

                {activeTab === 'video_audio' && (
                    <div className="h-full p-4 md:p-6 max-w-[1600px] mx-auto">
                        <VideoAudioHub />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="h-full p-4 md:p-6 max-w-3xl mx-auto">
                        <SettingsPanel 
                            settings={settings} 
                            onUpdate={setSettings}
                            // Pass Export Handlers for the restored Settings buttons
                            onExportZip={handleExportZip}
                            onExportPDF={handleSavePDF}
                            onExportPPTX={handleSavePPTX}
                            onSaveDB={handleSaveDB}
                            onLoadDB={handleLoadDBClick}
                            onExportDaVinci={handleExportDaVinci}
                            onConnectDrive={handleConnectDrive}
                            isDriveConnected={isDriveConnected}
                        />
                    </div>
                )}
          </div>
      </main>

      {/* MOBILE MENU DRAWER */}
      <div 
          className={`fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsMobileMenuOpen(false)}
      >
          <div 
            className={`absolute right-0 top-0 h-full w-[80%] max-w-xs bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl transition-transform duration-300 transform flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            onClick={e => e.stopPropagation()}
          >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-main)]">Menu</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {renderActionButtons()}
              </div>
              <div className="p-4 border-t border-[var(--border-color)] text-center">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Valera v1.0</div>
              </div>
          </div>
      </div>

      {/* NOTIFICATIONS */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-50 animate-fade-in-up flex items-center gap-3 border
            ${notification.type === 'success' 
                ? 'bg-green-500/10 border-green-500/50 text-green-400'
                : 'bg-blue-500/10 border-blue-500/50 text-blue-400'
            }`}
        >
            {notification.type === 'success' ? <CheckCircle size={18} /> : <Cloud size={18} />}
            <span className="font-bold text-sm">{notification.msg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
