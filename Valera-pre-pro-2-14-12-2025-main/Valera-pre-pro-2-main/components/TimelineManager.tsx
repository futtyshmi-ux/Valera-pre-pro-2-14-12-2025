
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TimelineFrame, Character, TimelineSettings, ChatMessage, LabAssetSuggestion, TimelineSuggestion, DirectorAction, GenerationLogEntry } from '../types';
import { enhancePrompt, generateImage, generateVoiceDirection } from '../services/geminiService';
import { driveService } from '../services/driveService';
import { Trash2, Film, Sparkles, Wand2, Image as ImageIcon, Music, Mic, Users, Eye, RefreshCw, Maximize2, MapPin, Box, CheckCircle, Clock, ChevronRight, Plus, Monitor, Settings2, Camera, User, ChevronLeft, ChevronDown, ChevronUp, SlidersHorizontal, PanelRightClose, PanelLeftClose, PanelLeftOpen, Upload, Gauge, Pencil, Play, SkipForward, SkipBack, Minimize2, Download, Scaling, ScanLine, Star, Clapperboard, Send, GripHorizontal, X, Eraser, Undo, Redo, PanelRightOpen, ArrowLeft, AlertTriangle, Layout } from 'lucide-react';
import { ImageEditorModal } from './ImageEditorModal';
import { CharacterManager } from './CharacterManager';
import { DirectingHub } from './DirectingHub';
import { ASPECT_RATIOS, CAMERA_PRESETS, MODEL_IMAGE_FLASH, MODEL_IMAGE_PRO, TIMELINE_FPS_OPTIONS, TIMELINE_RESOLUTIONS } from '../constants';

interface Props {
  frames: TimelineFrame[];
  characters: Character[];
  settings?: TimelineSettings;
  onUpdate: (updated: TimelineFrame[] | ((prev: TimelineFrame[]) => TimelineFrame[])) => void;
  onUpdateSettings?: (settings: TimelineSettings) => void;
  onUpdateAssets?: (updated: Character[] | ((prev: Character[]) => Character[])) => void;
  imageModel: string;
  isDriveConnected?: boolean;
  onNotify?: (msg: string, type: 'info' | 'success') => void;
  huggingFaceToken?: string;
  
  // Director Props
  directorMessages: ChatMessage[];
  onUpdateDirectorMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onDirectorAddAsset: (asset: LabAssetSuggestion) => void;
  onDirectorAddTimeline: (scenes: TimelineSuggestion[]) => void;
  directorStyleId: string;
  onDirectorStyleChange: (id: string) => void;
  directorDraft: string;
  onDirectorDraftChange: (text: string) => void;
  onHandleDirectorAction?: (action: DirectorAction) => void;
  chatFontSize?: number;
  
  // Director Full Screen State (Passed from App)
  isDirectorFullScreen?: boolean;
  onToggleDirectorFullScreen?: (isFull: boolean) => void;
  
  // Generation Logging
  onLogGeneration?: (entry: GenerationLogEntry) => void;
  generationLog?: GenerationLogEntry[]; 
}

// Internal Reusable Component for Input Fields with History
const TextAreaWithTools = ({ 
    value, 
    onChange, 
    placeholder, 
    className, 
    minHeight = "h-28",
    expandedHeight = "h-64",
    autoFocus = false
}: { 
    value: string, 
    onChange: (val: string) => void, 
    placeholder?: string, 
    className?: string,
    minHeight?: string,
    expandedHeight?: string,
    autoFocus?: boolean
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [history, setHistory] = useState<string[]>([value || '']);
    const [historyIndex, setHistoryIndex] = useState(0);
    const isUndoRedoAction = useRef(false);

    useEffect(() => {
        if (isUndoRedoAction.current) {
            isUndoRedoAction.current = false;
            return;
        }
        if (value !== history[historyIndex]) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(value || '');
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    }, [value, history, historyIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                if (historyIndex < history.length - 1) {
                    isUndoRedoAction.current = true;
                    const nextValue = history[historyIndex + 1];
                    setHistoryIndex(prev => prev + 1);
                    onChange(nextValue);
                }
            } else {
                if (historyIndex > 0) {
                    isUndoRedoAction.current = true;
                    const prevValue = history[historyIndex - 1];
                    setHistoryIndex(prev => prev - 1);
                    onChange(prevValue);
                }
            }
        }
    };

    return (
        <div className={`relative group/input transition-all duration-300 w-full ${isExpanded ? 'z-50' : 'h-full'}`}>
            <textarea 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)} 
                onKeyDown={handleKeyDown}
                placeholder={placeholder} 
                className={`${className} ${isExpanded ? expandedHeight : 'h-full'} transition-all duration-300 pr-8 resize-none`}
                autoFocus={autoFocus}
            />
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/input:opacity-100 transition-opacity bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] shadow-sm overflow-hidden">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-input)]"
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
                </button>
                {value && (
                    <button 
                        onClick={() => onChange('')} 
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-input)]"
                        title="Clear Text"
                    >
                        <Eraser size={12}/>
                    </button>
                )}
            </div>
        </div>
    );
};

const ActiveSceneEditor: React.FC<{
  frame: TimelineFrame;
  characters: Character[];
  onUpdate: (id: string, updates: Partial<TimelineFrame>) => void;
  onDelete: (id: string) => void;
  onMagicEnhance: (frame: TimelineFrame) => void;
  onRenderImage: (frame: TimelineFrame) => void;
  onAddScene: () => void;
  isProcessing: boolean;
}> = ({ frame, characters, onUpdate, onDelete, onMagicEnhance, onRenderImage, onAddScene, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'visuals' | 'dialogue' | 'cast'>('visuals');
  const [isVoiceGenerating, setIsVoiceGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleGenerateVoicePrompt = async () => {
      if (!frame.dialogue) {
          alert("Please write some dialogue first.");
          return;
      }
      setIsVoiceGenerating(true);
      try {
          const instructions = await generateVoiceDirection(frame.dialogue, frame.description || frame.title);
          onUpdate(frame.id, { speechPrompt: instructions });
      } catch (e) {
          alert("Failed to generate voice instructions: " + e);
      } finally {
          setIsVoiceGenerating(false);
      }
  };

  const toggleAsset = (assetId: string) => {
    const currentIds = frame.assignedAssetIds || [];
    const newIds = currentIds.includes(assetId) 
        ? currentIds.filter(id => id !== assetId)
        : [...currentIds, assetId];
    onUpdate(frame.id, { assignedAssetIds: newIds });
  };

  const handleDeleteClick = () => {
      if (isDeleting) {
          onDelete(frame.id);
      } else {
          setIsDeleting(true);
          setTimeout(() => setIsDeleting(false), 3000);
      }
  };

  const renderAssetGrid = (type: 'character' | 'item' | 'location', title: string, icon: React.ReactNode) => {
    const filteredChars = characters.filter(c => c.type === type);
    if (filteredChars.length === 0) return null;

    return (
        <div className="mb-4">
            <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 flex items-center gap-2">
                {icon} {title}
            </h4>
            <div className="grid grid-cols-2 gap-2">
                {filteredChars.map(char => {
                    const isSelected = (frame.assignedAssetIds || []).includes(char.id);
                    return (
                        <button 
                            key={char.id}
                            onClick={() => toggleAsset(char.id)}
                            className={`relative flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left
                                ${isSelected 
                                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]' 
                                    : 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-[var(--text-muted)] opacity-70 hover:opacity-100'}
                            `}
                        >
                            <div className="w-8 h-8 rounded bg-black/30 overflow-hidden flex-shrink-0">
                                {char.image ? <img src={char.image} className="w-full h-full object-cover" alt={char.name} /> : <User size={12} className="m-auto text-gray-600"/>}
                            </div>
                            <div className="min-w-0">
                                <div className={`text-[9px] font-bold truncate ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{char.name}</div>
                            </div>
                            {isSelected && <CheckCircle size={10} className="ml-auto text-[var(--accent)] flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
  };
  
  return (
      <div className="flex flex-col h-full bg-[var(--bg-card)]">
        <div className="flex justify-between items-center p-3 border-b border-[var(--border-color)] bg-[var(--bg-header)]">
            <input 
              value={frame.title}
              onChange={(e) => onUpdate(frame.id, { title: e.target.value })}
              className="bg-transparent text-sm font-bold text-[var(--text-main)] focus:outline-none focus:text-[var(--accent)] w-full placeholder-[var(--text-muted)]"
              placeholder="Scene Title..."
            />
        </div>
        <div className="flex p-1 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
            {[
                { id: 'visuals', label: 'Visual', icon: <Eye size={12}/> }, 
                { id: 'dialogue', label: 'Audio', icon: <Mic size={12}/> }, 
                { id: 'cast', label: `Cast`, icon: <Users size={12}/> }
            ].map((tab) => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as 'visuals' | 'dialogue' | 'cast')} 
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 rounded transition-all ${activeTab === tab.id ? 'bg-[var(--bg-header)] text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'visuals' && (
                <div className="space-y-4 animate-fade-in">
                    
                    {/* 1. Prompt Input & Render Controls */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1"><Pencil size={10}/> Visual Description</label>
                            <button 
                                onClick={() => onMagicEnhance(frame)} 
                                disabled={isProcessing || !frame.description} 
                                className="text-[9px] font-bold uppercase text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
                                title="Magic Enhance Prompt"
                            >
                                <Wand2 size={10} /> Enhance
                            </button>
                        </div>
                        <div className="h-32 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] flex items-start focus-within:border-[var(--accent)] transition-colors relative overflow-hidden">
                            <TextAreaWithTools
                                value={frame.description || ''}
                                onChange={(val) => onUpdate(frame.id, { description: val })}
                                placeholder="Describe the scene visuals here..."
                                className="w-full bg-transparent text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] p-3 focus:outline-none resize-none leading-relaxed custom-scrollbar border-none"
                                minHeight="h-full"
                                expandedHeight="h-64"
                            />
                        </div>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => onRenderImage(frame)} disabled={isProcessing || !frame.description} className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg ${isProcessing ? 'bg-[var(--bg-input)] text-[var(--text-muted)] cursor-not-allowed' : 'bg-[var(--accent)] text-[var(--accent-text)] hover:brightness-110'}`} > 
                                {frame.quality === 'high' ? <Star size={14} fill="currentColor"/> : <ImageIcon size={14} />} 
                                {isProcessing ? 'Rendering...' : (frame.quality === 'high' ? 'Pro Render' : 'Render Frame')} 
                            </button>
                            <button onClick={onAddScene} className="px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 bg-[var(--bg-header)] border border-[var(--border-color)] hover:bg-[var(--bg-input)] text-[var(--text-muted)] transition-all" title="Add New Scene" > 
                                <Plus size={14} /> 
                            </button> 
                        </div>
                    </div>

                    {/* 2. Technical Settings */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                         <div><label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 flex items-center gap-1"><Monitor size={9}/> Ratio</label><select value={frame.aspectRatio || "16:9"} onChange={(e) => onUpdate(frame.id, { aspectRatio: e.target.value })} className="w-full bg-[var(--bg-header)] border border-[var(--border-color)] rounded px-2 py-1.5 text-[10px] text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none">{ASPECT_RATIOS.map(ratio => (<option key={ratio.value} value={ratio.value}>{ratio.label}</option>))}</select></div>
                         <div><label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 flex items-center gap-1"><Sparkles size={9}/> Quality</label><select value={frame.quality || "standard"} onChange={(e) => onUpdate(frame.id, { quality: e.target.value as any })} className="w-full bg-[var(--bg-header)] border border-[var(--border-color)] rounded px-2 py-1.5 text-[10px] text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none"><option value="standard">Standard</option><option value="high">Pro (High)</option></select></div>
                         <div className="col-span-2"><label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 flex items-center gap-1"><Clock size={9}/> Duration (sec)</label><input type="number" min="0.5" step="0.5" value={frame.duration || 4} onChange={(e) => onUpdate(frame.id, { duration: parseFloat(e.target.value) })} className="w-full bg-[var(--bg-header)] border border-[var(--border-color)] rounded px-2 py-1.5 text-[10px] text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none"/></div>
                    </div>
                    <div>
                        <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1.5 flex items-center gap-1"><Camera size={10} /> Camera Angle</label>
                        <select 
                            value={frame.shotType && CAMERA_PRESETS.some(p => p.value === frame.shotType) ? frame.shotType : 'custom'} 
                            onChange={(e) => { 
                                const newVal = e.target.value; 
                                if(newVal !== 'custom') { 
                                    const currentDesc = frame.description || "";
                                    let newDesc = currentDesc;
                                    if (!currentDesc.toLowerCase().includes(newVal.toLowerCase())) {
                                        newDesc = currentDesc ? `${currentDesc}, ${newVal}` : newVal;
                                    }
                                    onUpdate(frame.id, { shotType: newVal, description: newDesc }); 
                                } else { 
                                    onUpdate(frame.id, { shotType: '' }); 
                                } 
                            }} 
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-3 py-2 text-[11px] text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none"
                        >
                            <option value="custom">-- Custom Shot --</option>
                            {CAMERA_PRESETS.map((preset, idx) => (<option key={idx} value={preset.value}>{preset.label}</option>))}
                        </select>
                    </div>
                </div>
            )}
            {activeTab === 'dialogue' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                        <label className="text-[9px] text-orange-400 font-bold uppercase flex items-center gap-1"><Mic size={10} /> Dialogue / VO</label>
                        <TextAreaWithTools 
                            value={frame.dialogue || ''} 
                            onChange={(val) => onUpdate(frame.id, { dialogue: val })} 
                            placeholder="Character lines or Voiceover script..."
                            className="w-full bg-[var(--bg-input)] text-[var(--text-main)] p-3 rounded-xl border border-[var(--border-color)] focus:border-orange-500 focus:outline-none text-xs resize-y placeholder-[var(--text-muted)]"
                            minHeight="h-28"
                        />
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[9px] text-blue-400 font-bold uppercase flex items-center gap-1"><User size={10} /> TTS Direction (Use CAPS for stress)</label>
                            <button onClick={handleGenerateVoicePrompt} disabled={isVoiceGenerating || !frame.dialogue} className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-[9px] uppercase font-bold flex items-center gap-1 disabled:opacity-50 border border-blue-500/30"><Wand2 size={10} /> Auto-Generate</button>
                        </div>
                        <TextAreaWithTools 
                            value={frame.speechPrompt || ''} 
                            onChange={(val) => onUpdate(frame.id, { speechPrompt: val })} 
                            placeholder="Intonation, stress (CAPS), pauses..."
                            className="w-full bg-[var(--bg-input)] text-[var(--text-main)] p-3 rounded-xl border border-[var(--border-color)] focus:border-blue-500 focus:outline-none text-xs font-mono resize-y placeholder-[var(--text-muted)]"
                            minHeight="h-24"
                        />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                        <div><label className="text-[9px] text-violet-400 font-bold uppercase block flex items-center gap-1 mb-1"><Music size={10}/> Music Mood</label><input value={frame.musicMood || ''} onChange={(e) => onUpdate(frame.id, { musicMood: e.target.value })} placeholder="e.g. Dark synthwave" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-violet-500 focus:outline-none"/></div>
                        <div>
                            <label className="text-[9px] text-pink-400 font-bold uppercase block flex items-center gap-1 mb-1"><Sparkles size={10}/> Suno Prompt</label>
                            <TextAreaWithTools 
                                value={frame.sunoPrompt || ''} 
                                onChange={(val) => onUpdate(frame.id, { sunoPrompt: val })} 
                                placeholder="Detailed music prompt..."
                                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:border-pink-500 focus:outline-none resize-y"
                                minHeight="h-16"
                            />
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'cast' && (
                <div className="space-y-4 animate-fade-in">
                    {renderAssetGrid('character', 'Characters', <Users size={12} />)}
                    {renderAssetGrid('location', 'Locations', <MapPin size={12} />)}
                    {renderAssetGrid('item', 'Items', <Box size={12} />)}
                </div>
            )}

            {/* DELETE SCENE BUTTON (Moved to Bottom) */}
            <div className="mt-8 pt-4 border-t border-[var(--border-color)] pb-4">
               <button 
                   onClick={handleDeleteClick}
                   className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all duration-300
                   ${isDeleting 
                       ? 'bg-red-600 text-white animate-pulse' 
                       : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
               >
                   {isDeleting ? <AlertTriangle size={14}/> : <Trash2 size={14}/>}
                   {isDeleting ? "Are you sure? Click to Confirm" : "Delete Scene"}
               </button>
            </div>
        </div>
      </div>
  );
};

export const TimelineManager: React.FC<Props> = ({ 
    frames, 
    characters, 
    settings, 
    onUpdate, 
    onUpdateSettings, 
    onUpdateAssets, 
    imageModel, 
    isDriveConnected, 
    onNotify, 
    huggingFaceToken,
    directorMessages,
    onUpdateDirectorMessages,
    onDirectorAddAsset,
    onDirectorAddTimeline,
    directorStyleId,
    onDirectorStyleChange,
    directorDraft,
    onDirectorDraftChange,
    onHandleDirectorAction,
    chatFontSize,
    onLogGeneration,
    isDirectorFullScreen,
    onToggleDirectorFullScreen,
    generationLog = []
}) => {
  const [leftWidth, setLeftWidth] = useState(384); 
  const [rightWidth, setRightWidth] = useState(320); 
  const [timelineHeight, setTimelineHeight] = useState(220);
  const [mobileView, setMobileView] = useState<'director' | 'stage' | 'tools'>('stage');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const isResizingTimelineRef = useRef(false);

  const [isAutoPanelCollapsed, setIsAutoPanelCollapsed] = useState(false);
  const [isSettingsPanelCollapsed, setIsSettingsPanelCollapsed] = useState(false);
  const [isToolsFullScreen, setIsToolsFullScreen] = useState(false); 
  const [isSequenceVisible, setIsSequenceVisible] = useState(true);
  const [rightSidebarTab, setRightSidebarTab] = useState<'scene' | 'assets'>('assets'); 
  const [isTimelineFit, setIsTimelineFit] = useState(false);

  const [activeFrameId, setActiveFrameId] = useState<string | null>(frames.length > 0 ? frames[0].id : null);
  const [processingFrames, setProcessingFrames] = useState<Record<string, boolean>>({});
  const [editingImageFrame, setEditingImageFrame] = useState<TimelineFrame | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [resizingFrameId, setResizingFrameId] = useState<string | null>(null);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartDurationRef = useRef<number>(0);
  const currentPxPerSecRef = useRef<number>(20);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<'left' | 'right' | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const activeFrame = frames.find(f => f.id === activeFrameId) || null;
  const totalDuration = frames.reduce((acc, f) => acc + (f.duration || 4), 0);
  const isVerticalProject = (settings?.height || 0) > (settings?.width || 0);
  const projectRatio = isVerticalProject ? "9:16" : "16:9";
  
  const projectAspectRatioStyle: React.CSSProperties = { 
      aspectRatio: `${settings?.width || 1920} / ${settings?.height || 1080}`,
      maxHeight: '100%', 
      maxWidth: '100%', 
      height: isVerticalProject ? '100%' : 'auto', 
      width: isVerticalProject ? 'auto' : '100%', 
      objectFit: 'contain' 
  };

  useEffect(() => {
      const handleResize = () => {
          setIsMobile(window.innerWidth < 768);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { if (activeFrameId && !frames.find(f => f.id === activeFrameId)) { setActiveFrameId(frames.length > 0 ? frames[0].id : null); } else if (!activeFrameId && frames.length > 0) { setActiveFrameId(frames[0].id); } }, [frames, activeFrameId]);

  // --- DELETE FRAME LOGIC (UPDATED: NO CONFIRM MODAL) ---
  const deleteFrame = (id: string) => { 
      // If we are deleting the currently active frame, switch to a neighbor first
      if (activeFrameId === id) {
         const currentIndex = frames.findIndex(f => f.id === id);
         const nextId = frames[currentIndex - 1]?.id || frames[currentIndex + 1]?.id || null;
         setActiveFrameId(nextId);
      }
      onUpdate(prev => prev.filter(f => f.id !== id));
  };

  // --- KEYBOARD SHORTCUT FOR DELETION ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Skip if user is typing in an input or textarea
          if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
              return;
          }
          
          if ((e.key === 'Delete' || e.key === 'Backspace') && activeFrameId) {
              deleteFrame(activeFrameId);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFrameId, frames]); 

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (resizingRef.current && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            if (resizingRef.current === 'left') {
                const newWidth = e.clientX - containerRect.left;
                if (newWidth > 250 && newWidth < 600) setLeftWidth(newWidth);
            } else if (resizingRef.current === 'right') {
                const newWidth = containerRect.right - e.clientX;
                if (newWidth > 250 && newWidth < 600) setRightWidth(newWidth);
            }
        }
        if (isResizingTimelineRef.current) {
            e.preventDefault();
            const newHeight = window.innerHeight - e.clientY;
            if (newHeight > 100 && newHeight < window.innerHeight - 100) {
                setTimelineHeight(newHeight);
            }
        }
        if (resizingFrameId) {
            e.preventDefault();
            const deltaPixels = e.clientX - resizeStartXRef.current;
            const deltaSeconds = deltaPixels / currentPxPerSecRef.current;
            const newDuration = Math.max(0.5, resizeStartDurationRef.current + deltaSeconds);
            onUpdate(prev => prev.map(f => 
                f.id === resizingFrameId 
                ? { ...f, duration: parseFloat(newDuration.toFixed(1)) } 
                : f
            ));
        }
    };

    const handleMouseUp = () => {
        if (resizingRef.current) {
            resizingRef.current = null;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
        if (isResizingTimelineRef.current) {
            isResizingTimelineRef.current = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
        if (resizingFrameId) {
            setResizingFrameId(null);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingFrameId, onUpdate]);

  const startResizing = (side: 'left' | 'right') => {
      resizingRef.current = side;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
  };

  const handleFrameResizeStart = (e: React.MouseEvent, frame: TimelineFrame, pxPerSec: number) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingFrameId(frame.id);
      resizeStartXRef.current = e.clientX;
      resizeStartDurationRef.current = frame.duration || 4;
      currentPxPerSecRef.current = pxPerSec;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
  };

  // Drag and Drop Logic for Timeline
  const handleDragStartTimeline = (e: React.DragEvent, index: number) => {
      e.dataTransfer.setData('frameIndex', index.toString());
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverTimeline = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDropTimeline = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      const rawIdx = e.dataTransfer.getData('frameIndex');
      if (!rawIdx) return;
      
      const dragIndex = parseInt(rawIdx);
      if (isNaN(dragIndex) || dragIndex === dropIndex) return;

      const newFrames = [...frames];
      const [movedFrame] = newFrames.splice(dragIndex, 1);
      newFrames.splice(dropIndex, 0, movedFrame);
      onUpdate(newFrames);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = () => { setIsDraggingOver(false); };
  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      
      if (!activeFrameId) { alert("Please create or select a scene first."); return; }
      const assetJson = e.dataTransfer.getData('application/react-dnd-asset');
      if (assetJson) {
          try {
              const asset = JSON.parse(assetJson);
              if (asset.image) {
                  updateFrame(activeFrameId, { 
                      image: asset.image, 
                      description: (activeFrame?.description || "") + ` featuring ${asset.name}` 
                  });
                  onNotify?.(`Applied ${asset.name} to Scene`, 'success');
              }
          } catch (err) { console.error("Invalid Asset Drop", err); }
          return;
      }
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                  const result = ev.target?.result as string;
                  updateFrame(activeFrameId, { image: result });
                  onNotify?.("Image updated from file", 'success');
              };
              reader.readAsDataURL(file);
          }
      }
  };

  const handleUpdateSettings = (key: keyof TimelineSettings, value: number) => { if (!settings || !onUpdateSettings) return; onUpdateSettings({ ...settings, [key]: value }); };
  const handleResolutionChange = (width: number, height: number) => {
      if (!settings || !onUpdateSettings) return;
      onUpdateSettings({ ...settings, width, height });
      const isVertical = height > width;
      const newRatio = isVertical ? "9:16" : "16:9";
      onUpdate(prev => prev.map(f => ({ ...f, aspectRatio: newRatio })));
      if (onUpdateAssets) { onUpdateAssets(prev => prev.map(c => ({ ...c, aspectRatio: newRatio }))); }
      onNotify?.(`Switched to ${newRatio} Format`, 'info');
  };

  const handleAddFrame = () => { 
      const isVert = (settings?.height || 0) > (settings?.width || 0);
      const ratio = isVert ? "9:16" : "16:9";
      const newFrame: TimelineFrame = { 
          id: Date.now().toString(), 
          title: `Scene ${frames.length + 1}`, 
          description: "", 
          assignedAssetIds: [], 
          image: null, 
          imageHistory: [], 
          quality: 'standard', 
          aspectRatio: ratio, 
          duration: 4 
      }; 
      onUpdate(prev => [...prev, newFrame]); 
      setActiveFrameId(newFrame.id); 
  };
  const updateFrame = (id: string, updates: Partial<TimelineFrame>) => { onUpdate(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f)); };
  
  
  const handleMagicEnhance = async (frame: TimelineFrame) => { 
      if (!frame.description) return; 
      setProcessingFrames(prev => ({ ...prev, [frame.id]: true })); 
      try { 
          const assetContext = frame.assignedAssetIds.map(id => { const char = characters.find(c => c.id === id); return char ? `${char.name} (${char.description} - trigger: ${char.triggerWord || ''})` : ""; }).join("; "); 
          const enhanced = await enhancePrompt(frame.description, assetContext); 
          updateFrame(frame.id, { description: enhanced, enhancedPrompt: undefined }); 
      } catch (e) { alert("Enhancement failed"); } finally { setProcessingFrames(prev => ({ ...prev, [frame.id]: false })); } 
  };
  
  const handleMainImageUpload = (frameId: string, event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const result = e.target?.result as string; updateFrame(frameId, { image: result }); onUpdate(prev => prev.map(f => { if (f.id === frameId) { const history = f.imageHistory ? [...f.imageHistory] : (f.image ? [f.image] : []); return { ...f, image: result, imageHistory: [...history, result] }; } return f; })); }; reader.readAsDataURL(file); event.target.value = ''; };
  
  const handleRenderImage = async (frame: TimelineFrame) => {
      let prompt = frame.enhancedPrompt || frame.description;
      if (!prompt) return;
      setProcessingFrames(prev => ({ ...prev, [frame.id]: true }));
      try {
          const currentIdx = frames.findIndex(f => f.id === frame.id);
          const prevFrame = currentIdx > 0 ? frames[currentIdx - 1] : null;
          let finalPrompt = prompt;
          const referenceImages: string[] = [];
          if (prevFrame && prevFrame.image) { referenceImages.push(prevFrame.image); finalPrompt = `[CONTINUITY LOCK: Strict visual continuity with previous frame. Same lighting, environment, and film stock. New Action: ${finalPrompt}]`; } 
          else if (prevFrame && prevFrame.description) { finalPrompt = `(Sequence Context: Following a shot of ${prevFrame.description}). ` + finalPrompt; }
          if (frame.shotType) finalPrompt += `, ${frame.shotType}`;
          if (frame.stylePrompt) finalPrompt += `, ${frame.stylePrompt}`;
          frame.assignedAssetIds.forEach(id => { const char = characters.find(c => c.id === id); if (char && char.image) referenceImages.push(char.image); });
          
          const modelToUse = frame.quality === 'high' ? MODEL_IMAGE_PRO : (imageModel || MODEL_IMAGE_FLASH);
          
          const targetSize = modelToUse === MODEL_IMAGE_PRO ? '4K' : undefined;

          const imageUrl = await generateImage(
              finalPrompt, 
              referenceImages, 
              frame.aspectRatio || (isVerticalProject ? "9:16" : "16:9"), 
              modelToUse,
              targetSize
          );
          
          onUpdate(prev => prev.map(f => { if (f.id === frame.id) { const history = f.imageHistory ? [...f.imageHistory] : (f.image ? [f.image] : []); return { ...f, image: imageUrl, imageHistory: [...history, imageUrl] }; } return f; }));
          
          if (onLogGeneration) {
              onLogGeneration({ id: Date.now().toString(), timestamp: Date.now(), prompt: finalPrompt, imageData: imageUrl, sourceId: frame.id, sourceName: frame.title });
          }
          if (isDriveConnected) { onNotify?.("Uploading Render...", "info"); const filename = `Scene_${frame.title.replace(/\s+/g, '_')}_${Date.now()}.png`; await driveService.uploadImage(imageUrl, filename, 'Storyboards'); onNotify?.("Saved to Drive", "success"); }
      } catch (e) { alert("Render failed: " + e); } finally { setProcessingFrames(prev => ({ ...prev, [frame.id]: false })); }
  };

  const handleFillFrame = async (frame: TimelineFrame) => { 
      if (!frame.image) return;
      const targetW = settings?.width || 1920;
      const targetH = settings?.height || 1080;
      
      setProcessingFrames(prev => ({ ...prev, [frame.id]: true }));
      
      try {
          // 1. Prepare Canvas
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("Canvas context failed");

          // 2. Load Source Image
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = frame.image;
          await new Promise((resolve, reject) => { 
              img.onload = resolve; 
              img.onerror = reject; 
          });

          // 3. Calculate Layout
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const canvasRatio = targetW / targetH;
          const isSameRatio = Math.abs(imgRatio - canvasRatio) < 0.05;

          let drawW, drawH, drawX, drawY;

          if (isSameRatio) {
              const scaleFactor = 0.6;
              drawW = targetW * scaleFactor;
              drawH = targetH * scaleFactor;
              drawX = (targetW - drawW) / 2;
              drawY = (targetH - drawH) / 2;
          } else {
              const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
              drawW = img.naturalWidth * scale;
              drawH = img.naturalHeight * scale;
              drawX = (targetW - drawW) / 2;
              drawY = (targetH - drawH) / 2;
          }

          // 4. Draw to Canvas (Empty areas remain transparent)
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          const compositionBase64 = canvas.toDataURL('image/png');

          // 5. Generate with Outpainting Prompt
          const basePrompt = frame.description || "Cinematic scene";
          const outpaintPrompt = `Outpainting/Inpainting Task. The provided image contains a central subject surrounded by transparent (empty) space. 
          Seamlessly fill the transparent areas to extend the scene. Match the lighting, texture, style, and perspective of the central image exactly. 
          Do not alter the central content. Make it look like a single coherent wide shot. Context: ${basePrompt}`;

          const newImageUrl = await generateImage(outpaintPrompt, [compositionBase64], frame.aspectRatio || "16:9", imageModel);

          // 6. Update Frame
          onUpdate(prev => prev.map(f => {
              if (f.id === frame.id) {
                  const history = f.imageHistory ? [...f.imageHistory] : (f.image ? [f.image] : []);
                  return { 
                      ...f, 
                      image: newImageUrl, 
                      imageHistory: [...history, newImageUrl],
                      description: f.description + " (AI Expanded)"
                  };
              }
              return f;
          }));

          if (isDriveConnected) { 
              const filename = `Scene_${frame.title.replace(/\s+/g, '_')}_Expanded_${Date.now()}.png`; 
              driveService.uploadImage(newImageUrl, filename, 'Storyboards'); 
          }

      } catch (e) {
          console.error("AI Fill failed", e);
          alert("AI Expand/Fill failed: " + e);
      } finally {
          setProcessingFrames(prev => ({ ...prev, [frame.id]: false }));
      }
  };

  const handleImageEditSave = (frame: TimelineFrame, newImage: string) => { onUpdate(prev => prev.map(f => { if (f.id === frame.id) { const history = f.imageHistory ? [...f.imageHistory] : (f.image ? [f.image] : []); return { ...f, image: newImage, imageHistory: [...history, newImage] }; } return f; })); if (isDriveConnected) { onNotify?.("Uploading Edit...", "info"); const filename = `SceneEdit_${frame.title.replace(/\s+/g, '_')}_${Date.now()}.png`; driveService.uploadImage(newImage, filename, 'Storyboards'); } };
  const handleImageHistoryChange = (frame: TimelineFrame, newImage: string) => { setEditingImageFrame({ ...frame, image: newImage }); };
  const navigateHistory = (frame: TimelineFrame, direction: 'prev' | 'next') => { const history = frame.imageHistory || (frame.image ? [frame.image] : []); if (history.length <= 1) return; const currentIndex = history.findIndex(img => img === frame.image); let newIndex = currentIndex; if (direction === 'prev') { newIndex = currentIndex > 0 ? currentIndex - 1 : history.length - 1; } else { newIndex = currentIndex < history.length - 1 ? currentIndex + 1 : 0; } updateFrame(frame.id, { image: history[newIndex] }); };
  
  const togglePreviewFullscreen = () => { if (!previewRef.current) return; if (!document.fullscreenElement) { previewRef.current.requestFullscreen().catch(err => { console.error("Fullscreen blocked", err); }); } else { document.exitFullscreen(); } };
  const downloadImage = (frame: TimelineFrame) => { if (!frame.image) return; const link = document.createElement('a'); link.href = frame.image; link.download = `Scene_${frame.title.replace(/\s+/g, '_')}.png`; link.click(); };

  // New Navigation functions for Timeline
  const goToNextFrame = () => {
      const idx = frames.findIndex(f => f.id === activeFrameId);
      if (idx !== -1 && idx < frames.length - 1) {
          setActiveFrameId(frames[idx + 1].id);
      }
  };

  const goToPrevFrame = () => {
      const idx = frames.findIndex(f => f.id === activeFrameId);
      if (idx > 0) {
          setActiveFrameId(frames[idx - 1].id);
      }
  };

  const handleDeleteImage = () => {
      if (activeFrameId) {
          updateFrame(activeFrameId, { image: null });
      }
  };

  const renderTimelineStrip = (isVerticalLayout: boolean = false) => { 
      let pxPerSec = isVerticalLayout ? 8 : 20; 
      if (isTimelineFit && timelineContainerRef.current) { const availableWidth = timelineContainerRef.current.clientWidth - 100; const totalSecs = Math.max(totalDuration, 1); pxPerSec = availableWidth / totalSecs; }
      const step = isTimelineFit || pxPerSec < 10 ? 5 : 1; 
      const rulerTicks = []; for(let i=0; i <= totalDuration; i+=step) { rulerTicks.push(i); } 
      
      return ( 
        <div ref={timelineContainerRef} id="ui-timeline-strip" className={`h-full custom-scrollbar relative bg-[#101010] ${isTimelineFit ? 'overflow-hidden' : 'overflow-x-auto'}`}> 
            <div className="h-6 w-full min-w-max border-b border-[#333] flex items-end relative sticky top-0 bg-[#151515] z-10 pointer-events-none"> 
                {rulerTicks.map((tick) => ( <div key={tick} className="absolute bottom-0 h-3 border-l border-[#444] flex flex-col justify-end" style={{ left: tick * pxPerSec + 20 }}> <span className="text-[8px] text-[#666] font-mono ml-1 -mb-1">{tick}s</span> </div> ))} 
            </div> 
            <div className={`min-w-max flex gap-1 p-4 pt-6`}> 
                {frames.length === 0 && ( <div className="text-gray-600 text-xs ml-4 italic flex items-center gap-2"> <Film size={14}/> Timeline is empty. </div> )} 
                {frames.map((frame, index) => { 
                    const width = (frame.duration || 4) * pxPerSec; const minWidth = 20; 
                    const isDeleting = confirmDeleteId === frame.id;
                    return ( 
                        <div 
                            key={frame.id} 
                            onClick={() => setActiveFrameId(frame.id)} 
                            draggable={true}
                            onDragStart={(e) => handleDragStartTimeline(e, index)}
                            onDragOver={handleDragOverTimeline}
                            onDrop={(e) => handleDropTimeline(e, index)}
                            className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all group flex-shrink-0 ${activeFrameId === frame.id ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 z-10' : 'border-[#333] opacity-80 hover:opacity-100'} ${isVerticalProject ? 'aspect-[9/16]' : ''}`} 
                            style={{ width: `${Math.max(width, minWidth)}px`, height: isVerticalProject ? '130px' : '96px' }} 
                            title={`${frame.title} (${frame.duration}s)`} 
                        > 
                            {/* 2-Step Delete Cross (X) Button */}
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDeleting) {
                                        deleteFrame(frame.id);
                                        setConfirmDeleteId(null);
                                    } else {
                                        setConfirmDeleteId(frame.id);
                                        setTimeout(() => setConfirmDeleteId(null), 3000);
                                    }
                                }}
                                className={`absolute top-1 left-1 w-5 h-5 rounded-md flex items-center justify-center transition-all z-40 shadow-sm
                                ${isDeleting 
                                    ? 'bg-red-600 text-white opacity-100 scale-110' 
                                    : 'bg-red-600/90 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:scale-110'}`}
                                title={isDeleting ? "Click again to confirm" : "Delete Scene"}
                            >
                                {isDeleting ? <CheckCircle size={12}/> : <X size={12} />}
                            </button>

                            {frame.image ? ( <img src={frame.image} className="w-full h-full object-cover pointer-events-none" alt={frame.title} /> ) : ( <div className="w-full h-full bg-[#1a1a1a] flex flex-col items-center justify-center p-1 gap-1 pointer-events-none"> <span className="text-[9px] text-gray-500 font-bold truncate w-full text-center">{frame.title}</span> </div> )} 
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent px-1.5 py-1 pointer-events-none"> <div className="flex justify-between items-end"> <span className="text-[9px] text-white font-bold truncate max-w-[70%]">{index + 1}. {frame.title}</span> </div> </div> 
                            <div className="absolute top-1 right-1 bg-black/60 px-1 rounded text-[8px] text-[var(--accent)] font-mono font-bold pointer-events-none">{frame.duration}s</div>
                            <div className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-[var(--accent)]/50 transition-colors z-20 group-hover:bg-white/10" onMouseDown={(e) => handleFrameResizeStart(e, frame, pxPerSec)} title="Drag to resize duration"> <div className="absolute right-1 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/30 rounded-full"></div> </div>
                            {processingFrames[frame.id] && ( <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px] pointer-events-none"> <RefreshCw size={16} className="text-[var(--accent)] animate-spin" /> </div> )} 
                        </div> 
                    ); 
                })} 
                <button onClick={handleAddFrame} className={`border-2 border-dashed border-[#333] rounded-lg flex items-center justify-center text-[#555] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[#1a1a1a] transition-all ml-1 flex-shrink-0 ${isVerticalProject ? 'w-20 h-[130px]' : 'w-12 h-24'}`} title="Add Scene" > <Plus size={20} /> </button> 
            </div> 
        </div> 
      ); 
  };
  
  return (
    <div className="flex flex-col h-full animate-fade-in relative overflow-hidden bg-[var(--bg-main)]">
        
        {/* MOBILE TAB SWITCHER */}
        <div className="md:hidden flex border-b border-[var(--border-color)] bg-[var(--bg-header)] shrink-0">
            <button onClick={() => setMobileView('director')} className={`flex-1 py-3 text-[10px] font-bold uppercase transition-all ${mobileView === 'director' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}>Director</button>
            <button onClick={() => setMobileView('stage')} className={`flex-1 py-3 text-[10px] font-bold uppercase transition-all ${mobileView === 'stage' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}>Stage</button>
            <button onClick={() => setMobileView('tools')} className={`flex-1 py-3 text-[10px] font-bold uppercase transition-all ${mobileView === 'tools' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}>Tools</button>
        </div>

        <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 flex min-h-0" ref={containerRef}>
                
                {/* --- LEFT SIDEBAR (Director) --- */}
                <div id="ui-director-panel" className={`border-r border-[var(--border-color)] bg-[var(--bg-card)] flex-col transition-none z-30 ${isDirectorFullScreen ? 'fixed inset-0 w-full z-50 flex' : (mobileView === 'director' ? 'flex w-full' : 'hidden md:flex')}`} style={!isDirectorFullScreen && window.innerWidth >= 768 ? { width: isAutoPanelCollapsed ? '40px' : `${leftWidth}px` } : {}}>
                     <div className="h-10 border-b border-[var(--border-color)] flex items-center justify-between hover:bg-[var(--bg-header)] text-[var(--text-muted)] px-1">
                        <button onClick={() => setIsAutoPanelCollapsed(!isAutoPanelCollapsed)} className="p-2 hover:text-white hidden md:block">{isAutoPanelCollapsed ? <PanelRightClose size={16} /> : <PanelLeftClose size={16} />}</button>
                        {!isAutoPanelCollapsed && ( 
                            <div className="flex items-center gap-2 text-xs font-bold w-full px-2"> 
                                <Clapperboard size={14} className="text-[var(--accent)]"/> 
                                <span className="flex-1">DIRECTOR AI</span> 
                                <button 
                                    onClick={() => onToggleDirectorFullScreen && onToggleDirectorFullScreen(!isDirectorFullScreen)} 
                                    className="p-1 hover:text-[var(--accent)] hidden md:block" 
                                    title={isDirectorFullScreen ? "Minimize" : "Maximize"}
                                >
                                    {isDirectorFullScreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
                                </button> 
                            </div> 
                        )}
                     </div>
                     {!isAutoPanelCollapsed && ( 
                         <div className="flex-1 overflow-hidden h-full"> 
                            <DirectingHub 
                                messages={directorMessages} 
                                onUpdateMessages={onUpdateDirectorMessages} 
                                projectReferences={characters} 
                                onAddAsset={onDirectorAddAsset} 
                                onAddTimeline={onDirectorAddTimeline} 
                                activeStyleId={directorStyleId} 
                                onStyleChange={onDirectorStyleChange} 
                                draftInput={directorDraft} 
                                onDraftChange={onDirectorDraftChange} 
                                onHandleAction={onHandleDirectorAction} 
                                chatFontSize={chatFontSize} 
                                timelineFrames={frames} 
                                activeFrameId={activeFrameId}
                                currentRatio={projectRatio} 
                            /> 
                         </div> 
                     )}
                     {isAutoPanelCollapsed && ( <div className="flex-1 py-4 flex flex-col items-center gap-4 cursor-pointer hover:bg-[var(--bg-header)]" onClick={() => setIsAutoPanelCollapsed(false)}> <div className="[writing-mode:vertical-rl] text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">DIRECTOR AI</div> </div> )}
                </div>

                {!isAutoPanelCollapsed && !isDirectorFullScreen && !isToolsFullScreen && ( <div className="w-1 cursor-col-resize hover:bg-[var(--accent)] transition-colors bg-[var(--border-color)] z-10 flex-shrink-0 hidden md:block" onMouseDown={() => startResizing('left')} /> )}
                
                {/* --- CENTER (Preview/Stage) --- */}
                <div id="ui-main-stage" className={`bg-[var(--bg-main)] flex-col relative min-w-0 ${!isToolsFullScreen ? (mobileView === 'stage' ? 'flex flex-1' : 'hidden md:flex flex-1') : 'hidden'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    {isDraggingOver && ( <div className="absolute inset-0 bg-[var(--accent)]/10 z-50 flex items-center justify-center pointer-events-none border-4 border-[var(--accent)] border-dashed m-2 rounded-2xl animate-pulse"> <span className="text-xl font-bold text-[var(--accent)] uppercase tracking-widest bg-black/50 px-4 py-2 rounded-xl backdrop-blur"> Drop Asset to Apply </span> </div> )}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-hidden relative">
                        {activeFrame ? (
                            <div ref={previewRef} className={`relative group shadow-2xl rounded-sm overflow-hidden bg-[#2a0505] ring-1 ring-white/5 transition-all duration-300 flex flex-col items-center justify-center shrink-0 border-none`} style={projectAspectRatioStyle}>
                                {activeFrame.image ? ( <><img src={activeFrame.image} className="w-full h-full object-contain" alt="Preview" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"> <button onClick={() => setEditingImageFrame(activeFrame)} className="pointer-events-auto bg-black/50 hover:bg-[var(--accent)] text-white backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 font-bold text-xs uppercase transition-all transform hover:scale-105"> <Pencil size={14} /> Edit Image </button> </div></> ) : ( 
                                    <div className="w-full h-full bg-[#1a1a1a] flex flex-col items-center justify-center p-1 gap-2 relative"> 
                                        <div className="w-20 h-20 rounded-2xl bg-[var(--bg-header)] flex items-center justify-center shadow-lg border border-[var(--border-color)]"> 
                                            <ImageIcon size={40} className="opacity-30" /> 
                                        </div> 
                                        <span className="text-xs font-bold font-mono opacity-50 uppercase tracking-widest">Empty {settings?.width}x{settings?.height} Canvas</span> 
                                        
                                        {/* Added Button for Empty State */}
                                        <button 
                                            onClick={() => setEditingImageFrame(activeFrame)}
                                            className="mt-2 px-4 py-2 bg-[var(--accent)] hover:brightness-110 text-[var(--accent-text)] rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-2 shadow-lg transition-all"
                                        >
                                            <Pencil size={14} /> Open Canvas
                                        </button>
                                    </div> 
                                )}
                                <div className="absolute top-3 right-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto"> {activeFrame.image && ( <><button onClick={() => handleFillFrame(activeFrame)} className="p-2 bg-black/60 hover:bg-[var(--accent)] text-white rounded-lg backdrop-blur-sm" title="AI Expand / Fill Frame"><ScanLine size={14} /></button><button onClick={() => downloadImage(activeFrame)} className="p-2 bg-black/60 hover:bg-[var(--accent)] text-white rounded-lg backdrop-blur-sm" title="Download Image"><Download size={14}/></button><button onClick={togglePreviewFullscreen} className="p-2 bg-black/60 hover:bg-[var(--accent)] text-white rounded-lg backdrop-blur-sm" title="Maximize Preview"><Maximize2 size={14} /></button><button onClick={handleDeleteImage} className="p-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm" title="Delete Image Only"><Trash2 size={14} /></button></> )} <label className="p-2 bg-black/60 hover:bg-[var(--accent)] text-white rounded-lg cursor-pointer backdrop-blur-sm"><Upload size={14} /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleMainImageUpload(activeFrame.id, e)} /></label> </div>
                                {activeFrame.imageHistory && activeFrame.imageHistory.length > 1 && ( <><button onClick={() => navigateHistory(activeFrame, 'prev')} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={16}/></button><button onClick={() => navigateHistory(activeFrame, 'next')} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={16}/></button></> )}
                                {processingFrames[activeFrame.id] && ( <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm"> <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)] mb-3"></div> <span className="text-[10px] text-[var(--accent)] font-mono tracking-widest">RENDERING...</span> </div> )}
                            </div>
                        ) : ( <div className="text-[var(--text-muted)] flex flex-col items-center"> <Film size={48} className="mb-4 opacity-20"/> <p className="text-sm font-bold">Select a scene to preview</p> </div> )}
                    </div>
                </div>

                {!isSettingsPanelCollapsed && !isToolsFullScreen && ( <div className="w-1 cursor-col-resize hover:bg-[var(--accent)] transition-colors bg-[var(--border-color)] z-10 flex-shrink-0 hidden md:block" onMouseDown={() => startResizing('right')} /> )}
                
                {/* --- RIGHT SIDEBAR (Tools) --- */}
                <div id="ui-assets-panel" className={`border-l border-[var(--border-color)] bg-[var(--bg-card)] flex-col transition-none ${isToolsFullScreen ? 'w-full flex' : (mobileView === 'tools' ? 'flex w-full' : 'hidden md:flex')}`} style={!isToolsFullScreen && window.innerWidth >= 768 ? { width: isSettingsPanelCollapsed ? '40px' : `${rightWidth}px` } : {}}>
                    <div className="h-10 border-b border-[var(--border-color)] flex items-center justify-between hover:bg-[var(--bg-header)] text-[var(--text-muted)] px-1">
                        <button onClick={() => setIsSettingsPanelCollapsed(!isSettingsPanelCollapsed)} className="p-2 hover:text-white hidden md:block">
                             {isSettingsPanelCollapsed ? <PanelLeftOpen size={16} /> : <div className="flex items-center gap-2 text-xs font-bold w-full"><SlidersHorizontal size={14} className="text-[var(--text-muted)]"/> TOOLS</div>} 
                        </button>
                        {!isSettingsPanelCollapsed && (
                            <div className="flex items-center w-full md:w-auto justify-between md:justify-end px-2 md:px-0">
                                <div className="md:hidden flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]"><SlidersHorizontal size={14}/> TOOLS</div>
                                <div className="flex items-center">
                                    <button onClick={() => setIsToolsFullScreen(!isToolsFullScreen)} className="p-2 hover:text-[var(--accent)] transition-colors hidden md:block" title={isToolsFullScreen ? "Restore View" : "Maximize Tools"}>
                                        {isToolsFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                    </button>
                                    <button onClick={() => setIsSettingsPanelCollapsed(true)} className="p-2 hover:text-white transition-colors hidden md:block">
                                        <PanelLeftClose size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {!isSettingsPanelCollapsed && ( 
                        <div className="flex-1 overflow-hidden flex flex-col"> 
                            <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-header)]"> 
                                <button onClick={() => setRightSidebarTab('scene')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${rightSidebarTab === 'scene' ? 'text-[var(--accent)] bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}> <SlidersHorizontal size={12}/> Scene </button> 
                                <button onClick={() => setRightSidebarTab('assets')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${rightSidebarTab === 'assets' ? 'text-[var(--accent)] bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}> <Users size={12}/> Assets </button> 
                            </div> 
                            <div className="flex-1 overflow-y-auto custom-scrollbar"> 
                                {rightSidebarTab === 'scene' ? ( 
                                    activeFrame ? ( 
                                        <ActiveSceneEditor 
                                            key={activeFrame.id}
                                            frame={activeFrame} 
                                            characters={characters} 
                                            onUpdate={updateFrame} 
                                            onDelete={deleteFrame} 
                                            onMagicEnhance={handleMagicEnhance} 
                                            onRenderImage={handleRenderImage} 
                                            onAddScene={handleAddFrame} 
                                            isProcessing={!!(activeFrame && processingFrames[activeFrame.id])} 
                                        /> 
                                    ) : ( 
                                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs p-4 h-full"> <Film size={32} className="mb-2 opacity-20"/> No Scene Selected </div> 
                                    ) 
                                ) : ( 
                                    <div className="p-3 h-full"> 
                                        <CharacterManager 
                                            characters={characters} 
                                            onUpdate={onUpdateAssets || (() => {})} 
                                            imageModel={imageModel} 
                                            isDriveConnected={isDriveConnected} 
                                            onNotify={onNotify} 
                                            huggingFaceToken={huggingFaceToken} 
                                            isSidebarMode={!isToolsFullScreen} 
                                            currentProjectRatio={projectRatio} 
                                        /> 
                                    </div> 
                                )} 
                            </div> 
                        </div> 
                    )}
                </div>
            </div>
            
            {/* TIMELINE STRIP */}
            {isSequenceVisible && ( <div className="h-1 bg-[var(--border-color)] hover:bg-[var(--accent)] cursor-row-resize z-20 transition-colors hidden md:flex items-center justify-center" onMouseDown={() => { isResizingTimelineRef.current = true; document.body.style.cursor = 'row-resize'; }}> <GripHorizontal size={12} className="text-gray-500"/> </div> )}
            {isSequenceVisible ? (
                <div className={`border-t border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col shrink-0 transition-none ${mobileView === 'stage' ? 'flex' : 'hidden md:flex'}`} style={{ height: isMobile ? 'auto' : `${timelineHeight}px`, maxHeight: '50vh', minHeight: isMobile ? '160px' : 'auto' }}>
                    <div className="h-10 border-b border-[var(--border-color)] bg-[var(--bg-header)] px-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--text-muted)] uppercase overflow-hidden"> <span className="flex items-center gap-2 text-[var(--accent)] flex-shrink-0"><Film size={12} /> <span className="hidden sm:inline">Master Sequence</span></span> <div className="h-3 w-px bg-[#444] hidden sm:block"></div> <span className="hidden sm:inline">Total: {totalDuration.toFixed(1)}s</span> <div className="h-3 w-px bg-[#444] mx-2 hidden sm:block"></div> <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-2 border border-[#333]"> <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1"><Gauge size={10}/> FPS</span> <select value={settings?.fps || 24} onChange={(e) => handleUpdateSettings('fps', parseInt(e.target.value))} className="bg-transparent py-1 text-[10px] text-[var(--text-main)] focus:outline-none cursor-pointer">{TIMELINE_FPS_OPTIONS.map(fps => <option key={fps} value={fps}>{fps}</option>)}</select> </div> <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-2 border border-[#333]"> <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1"><Monitor size={10}/> Res</span> <select value={`${settings?.width}x${settings?.height}`} onChange={(e) => { const [w, h] = e.target.value.split('x').map(Number); handleResolutionChange(w, h); }} className="bg-transparent py-1 text-[10px] text-[var(--text-main)] focus:outline-none cursor-pointer">{TIMELINE_RESOLUTIONS.map(res => <option key={res.label} value={`${res.width}x${res.height}`}>{res.label}</option>)}</select> </div> </div>
                        <div className="flex gap-2 items-center"> 
                            <div className="flex gap-2 mr-4 border-r border-[#444] pr-4"> 
                                <button onClick={() => setIsTimelineFit(!isTimelineFit)} className={`p-1 rounded transition-colors ${isTimelineFit ? 'bg-[var(--accent)] text-white' : 'hover:text-[var(--accent)] text-[var(--text-muted)]'}`} title="Fit to Screen"> <Scaling size={12}/> </button> 
                                <button onClick={goToPrevFrame} className="p-1 hover:text-[var(--text-main)] text-[var(--text-muted)]"><SkipBack size={12}/></button> 
                                <button className="p-1 hover:text-[var(--accent)] text-[var(--text-muted)]"><Play size={12}/></button> 
                                <button onClick={goToNextFrame} className="p-1 hover:text-[var(--text-main)] text-[var(--text-muted)]"><SkipForward size={12}/></button> 
                            </div> 
                            <button onClick={() => setIsSequenceVisible(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]" title="Hide Timeline"> <ChevronDown size={14} /> </button> 
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">{renderTimelineStrip(false)}</div>
                </div>
            ) : ( <div className="h-6 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-header)] cursor-pointer transition-colors" onClick={() => setIsSequenceVisible(true)}> <ChevronUp size={14} className="text-[var(--text-muted)]" /> </div> )}
        </div>
        
        {editingImageFrame && ( 
            <ImageEditorModal 
                isOpen={!!editingImageFrame} 
                imageUrl={editingImageFrame.image || ''} 
                historyImages={editingImageFrame.imageHistory || (editingImageFrame.image ? [editingImageFrame.image] : [])} 
                globalHistory={generationLog.map(g => g.imageData)} // Pass global log
                onImageChange={(newUrl) => handleImageHistoryChange(editingImageFrame, newUrl)} 
                onClose={() => setEditingImageFrame(null)} 
                onSave={(newImg) => handleImageEditSave(editingImageFrame, newImg)} 
                imageModel={imageModel} 
                initialPrompt={editingImageFrame.enhancedPrompt || editingImageFrame.description} 
                initialAspectRatio={editingImageFrame.aspectRatio} 
            /> 
        )}
    </div>
  );
};
