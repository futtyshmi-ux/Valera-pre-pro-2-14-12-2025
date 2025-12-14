
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { TimelineManager } from './components/TimelineManager';
import { VideoAudioHub } from './components/VideoAudioHub';
import { SettingsPanel } from './components/SettingsPanel';
import { PatrickAssistant } from './components/PatrickAssistant';
import { telegramService } from './services/telegramService';
import { loadProjectFromIDB, saveProjectToIDB } from './services/storageService';
import { generateProjectPDF } from './services/pdfService';
import { generateProjectPPTX } from './services/pptxService';
import { generateDaVinciXML, generateEDL, generateDaVinciPythonScript } from './services/davinciService';
import { generateSRT } from './services/srtService';
import { INITIAL_PROJECT_STATE, THEME_PRESETS, MODEL_IMAGE_FLASH } from './constants';
import { ProjectData, AppSettings, TimelineFrame, Character, TimelineSettings, ChatMessage, LabAssetSuggestion, TimelineSuggestion, DirectorAction, GenerationLogEntry } from './types';
import { Clapperboard, Monitor, Settings as SettingsIcon, Film, Loader2, Download, Maximize, FileText, Presentation, Package, Captions, ListVideo, Code, Send } from 'lucide-react';

const App: React.FC = () => {
  const [projectData, setProjectData] = useState<ProjectData>(INITIAL_PROJECT_STATE);
  const [settings, setSettings] = useState<AppSettings>({
    themeId: 'canvas-dark',
    fontFamily: "'Inter', sans-serif",
    imageModel: MODEL_IMAGE_FLASH,
    showAssistant: true,
    chatFontSize: 12
  });
  const [activeTab, setActiveTab] = useState<'studio' | 'hub' | 'settings'>('studio');
  const [isDriveConnected, setIsDriveConnected] = useState(false); // Mock state
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{msg: string, type: 'info' | 'success'} | null>(null);
  const [isDirectorFullScreen, setIsDirectorFullScreen] = useState(false);

  // Init
  useEffect(() => {
    telegramService.init();
    loadProjectFromIDB().then(data => {
      if (data) setProjectData(data);
      setIsLoading(false);
    });
  }, []);

  // Autosave
  useEffect(() => {
    if (!isLoading) {
      saveProjectToIDB(projectData);
    }
  }, [projectData, isLoading]);

  // Apply Theme
  useEffect(() => {
    const theme = THEME_PRESETS.find(t => t.id === settings.themeId) || THEME_PRESETS[0];
    const root = document.documentElement;
    root.style.setProperty('--bg-main', theme.colors.bgMain);
    root.style.setProperty('--bg-card', theme.colors.bgCard);
    root.style.setProperty('--bg-header', theme.colors.bgHeader);
    root.style.setProperty('--bg-input', theme.colors.bgInput);
    root.style.setProperty('--text-main', theme.colors.textMain);
    root.style.setProperty('--text-muted', theme.colors.textMuted);
    root.style.setProperty('--border-color', theme.colors.border);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--accent-text', theme.colors.accentText);
    document.body.style.fontFamily = settings.fontFamily;
  }, [settings.themeId, settings.fontFamily]);

  const showNotify = (msg: string, type: 'info' | 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // State Updaters
  const updateTimeline = (updated: TimelineFrame[] | ((prev: TimelineFrame[]) => TimelineFrame[])) => {
    setProjectData(prev => ({
      ...prev,
      timeline: typeof updated === 'function' ? updated(prev.timeline) : updated
    }));
  };

  const updateCharacters = (updated: Character[] | ((prev: Character[]) => Character[])) => {
    setProjectData(prev => ({
      ...prev,
      references: typeof updated === 'function' ? updated(prev.references) : updated
    }));
  };

  // --- MASTER EXPORT HANDLER ---
  const handleExportZip = async () => {
    try {
        const zip = new JSZip();
        
        // 1. Assets & Frames Images
        const imgFolder = zip.folder("images");
        projectData.references.forEach(char => {
            if (char.image) imgFolder?.file(`${char.name.replace(/[^a-z0-9]/gi, '_')}.png`, char.image.split(',')[1], {base64: true});
        });
        projectData.timeline.forEach((frame, idx) => {
            if (frame.image) imgFolder?.file(`Scene_${idx+1}_${frame.title.replace(/[^a-z0-9]/gi, '_')}.png`, frame.image.split(',')[1], {base64: true});
        });
        
        // 2. Project Data (JSON)
        zip.file("project_data.json", JSON.stringify(projectData, null, 2));
        
        // 3. DaVinci: Python Automation Script (Recommended)
        const pyScript = generateDaVinciPythonScript(projectData);
        zip.file("import_project.py", pyScript);

        // 4. DaVinci: XML (Fallback 1)
        const daVinciXML = generateDaVinciXML(projectData);
        zip.file("timeline.fcpxml", daVinciXML);

        // 5. DaVinci: EDL (Fallback 2 - Universal)
        const edl = generateEDL(projectData);
        zip.file("timeline.edl", edl);

        // 6. Subtitles (SRT)
        const srtContent = generateSRT(projectData);
        zip.file("subtitles.srt", srtContent);

        // 7. Instructions
        const installText = `
VALERA PRE-PRODUCTION - MASTER EXPORT PACKAGE
=============================================

This ZIP contains everything you need for editing in DaVinci Resolve, Premiere Pro, or Final Cut.

----------------------------------------------------------------
OPTION 1: AUTOMATED IMPORT (DaVinci Resolve - FASTEST)
----------------------------------------------------------------
1. Extract this ZIP file to a folder.
2. Open DaVinci Resolve.
3. In the top menu, go to "Workspace" -> "Console".
4. Select "Py3" (Python 3) at the top of the console window.
5. Drag and drop the 'import_project.py' file into the console area.
   OR: Open the file in a text editor, copy the code, and paste it into the console.
   
   -> This will automatically import all images, create a sequence, and place clips with correct duration.

----------------------------------------------------------------
OPTION 2: MANUAL IMPORT (XML / FCPXML)
----------------------------------------------------------------
1. Extract the ZIP.
2. In DaVinci, go to File -> Import -> Timeline...
3. Select 'timeline.fcpxml'.
4. When asked for media, point to the 'images' folder.

----------------------------------------------------------------
OPTION 3: UNIVERSAL IMPORT (EDL)
----------------------------------------------------------------
1. Import all images from the 'images' folder into your Media Pool manually.
2. Go to File -> Import -> Timeline...
3. Select 'timeline.edl'.

----------------------------------------------------------------
SUBTITLES
----------------------------------------------------------------
- Drag 'subtitles.srt' into your timeline to get a subtitle track with all dialogue.
`;
        zip.file("README_IMPORT.txt", installText);

        const content = await zip.generateAsync({ type: "blob" });
        FileSaver.saveAs(content, `Valera_Project_${new Date().toISOString().slice(0,10)}.zip`);
        showNotify("Master Package Exported", "success");
    } catch(e) {
        console.error(e);
        showNotify("Export Failed", "info");
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#111] text-white flex-col gap-4">
            <Loader2 className="animate-spin text-cyan-500" size={48} />
            <div className="text-sm font-bold uppercase tracking-widest">Loading Valera...</div>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
        {/* Top Navigation */}
        {!isDirectorFullScreen && (
            <div className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-header)] flex items-center justify-between px-4 shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">V</div>
                    <span className="font-bold text-lg hidden sm:block tracking-tight">VALERA PRE-PRODUCTION <span className="text-[var(--text-muted)] text-xs font-normal">by DERNI</span></span>
                </div>
                
                <div id="ui-main-tabs" className="flex bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-color)]">
                    <button onClick={() => setActiveTab('studio')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'studio' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                        <Clapperboard size={14}/> Studio
                    </button>
                    <button onClick={() => setActiveTab('hub')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'hub' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                        <Monitor size={14}/> Hub
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                        <SettingsIcon size={14}/> Settings
                    </button>
                </div>

                <div id="ui-header-export" className="flex items-center gap-1">
                    <a href="https://t.me/derni108" target="_blank" rel="noopener noreferrer" className="p-2 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all flex items-center justify-center mr-2" title="Contact Developer">
                        <Send size={18} />
                    </a>
                    
                    {/* MASTER EXPORT BUTTON */}
                    <button 
                        onClick={handleExportZip} 
                        className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)] text-[var(--accent-text)] hover:brightness-110 rounded-lg transition-all shadow-lg font-bold text-xs uppercase tracking-wide" 
                        title="Export Project Package (ZIP with Python, XML, EDL, SRT)"
                    >
                        <Package size={16} /> Export Package
                    </button>

                    <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>

                    {/* Documentation Exports */}
                    <button onClick={() => generateProjectPDF(projectData).then(doc => doc.save('valera_report.pdf'))} className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-input)] rounded-lg transition-all" title="Export PDF Report">
                        <FileText size={18} />
                    </button>
                    <button onClick={() => generateProjectPPTX(projectData)} className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-input)] rounded-lg transition-all" title="Export PPTX Deck">
                        <Presentation size={18} />
                    </button>
                    
                    <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>
                    
                    <button onClick={() => {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(e => console.log(e));
                        } else {
                            document.exitFullscreen();
                        }
                    }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] rounded-lg transition-all" title="Full Screen">
                        <Maximize size={18} />
                    </button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'studio' && (
                <TimelineManager 
                    frames={projectData.timeline}
                    characters={projectData.references}
                    settings={projectData.timelineSettings}
                    onUpdate={updateTimeline}
                    onUpdateSettings={(s) => setProjectData(p => ({...p, timelineSettings: s}))}
                    onUpdateAssets={updateCharacters}
                    imageModel={settings.imageModel}
                    isDriveConnected={isDriveConnected}
                    onNotify={showNotify}
                    directorMessages={projectData.directorHistory || []}
                    onUpdateDirectorMessages={(updater) => {
                        setProjectData(prev => ({
                            ...prev,
                            directorHistory: typeof updater === 'function' ? updater(prev.directorHistory || []) : updater
                        }));
                    }}
                    onDirectorAddAsset={(asset) => {
                        const newChar: Character = {
                            id: Date.now().toString(),
                            type: asset.type,
                            name: asset.name,
                            description: asset.description,
                            triggerWord: asset.triggerWord,
                            image: null
                        };
                        updateCharacters(prev => [...prev, newChar]);
                        showNotify(`Added ${asset.type}: ${asset.name}`, "success");
                    }}
                    onDirectorAddTimeline={(scenes) => {
                       const newFrames: TimelineFrame[] = scenes.map((s, i) => ({
                           id: Date.now().toString() + i,
                           title: s.title,
                           description: s.visualDescription,
                           duration: s.duration || 4,
                           shotType: s.shotType,
                           dialogue: s.dialogue,
                           speechPrompt: s.speechPrompt,
                           musicMood: s.musicMood,
                           sunoPrompt: s.sunoPrompt,
                           assignedAssetIds: [],
                           image: null
                       }));
                       updateTimeline(prev => [...prev, ...newFrames]);
                       showNotify(`Added ${newFrames.length} scenes to Timeline`, "success");
                    }}
                    directorStyleId={projectData.activeDirectorStyleId || 'cinema-classic'}
                    onDirectorStyleChange={(id) => setProjectData(p => ({...p, activeDirectorStyleId: id}))}
                    directorDraft={projectData.directorDraft || ""}
                    onDirectorDraftChange={(txt) => setProjectData(p => ({...p, directorDraft: txt}))}
                    onHandleDirectorAction={(action) => {
                        console.log("Director Action", action);
                    }}
                    chatFontSize={settings.chatFontSize}
                    onLogGeneration={(entry) => setProjectData(p => ({...p, generationLog: [entry, ...(p.generationLog || [])]}))}
                    generationLog={projectData.generationLog}
                    isDirectorFullScreen={isDirectorFullScreen}
                    onToggleDirectorFullScreen={setIsDirectorFullScreen}
                />
            )}
            
            {activeTab === 'hub' && <VideoAudioHub />}
            
            {activeTab === 'settings' && (
                <SettingsPanel 
                    settings={settings}
                    onUpdate={setSettings}
                    onExportZip={handleExportZip}
                    onExportPDF={() => generateProjectPDF(projectData).then(doc => doc.save('valera_report.pdf'))}
                    onExportPPTX={() => generateProjectPPTX(projectData)}
                    onSaveDB={() => saveProjectToIDB(projectData).then(() => showNotify("Saved to DB", "success"))}
                    onLoadDB={() => loadProjectFromIDB().then(d => { if(d) setProjectData(d); showNotify("Loaded from DB", "success"); })}
                    isDriveConnected={isDriveConnected}
                    onConnectDrive={() => setIsDriveConnected(true)}
                />
            )}
        </div>

        {/* Notifications */}
        {notification && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#333] text-white px-4 py-2 rounded-full shadow-2xl z-[100] animate-fade-in-up flex items-center gap-2 border border-[var(--accent)]">
                {notification.type === 'success' ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                <span className="text-xs font-bold">{notification.msg}</span>
            </div>
        )}

        {/* Vel Assistant */}
        {settings.showAssistant && activeTab === 'studio' && !isDirectorFullScreen && (
            <PatrickAssistant 
                onClose={() => setSettings(s => ({...s, showAssistant: false}))} 
                walkGif={settings.assistantWalkImage}
                idleGif={settings.assistantIdleImage}
                sittingGif={settings.assistantSitImage}
            />
        )}
    </div>
  );
};

export default App;
