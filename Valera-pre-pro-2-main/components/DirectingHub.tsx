
import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Paperclip, X, Image as ImageIcon, FileText, Bot, User, Settings2, PlusCircle, Check, Film, ArrowRight, CornerDownLeft, ChevronUp, MousePointer, Maximize2, Minimize2, Eraser, Trash2, Copy, Mic, StopCircle, Download, FileAudio, AlertTriangle } from 'lucide-react';
import { DIRECTOR_STYLES, INITIAL_VALERA_MESSAGES, CINEMATIC_EXPANSION_PROMPT, STORYBOARD_V3_META_PROMPT } from '../constants';
import { ChatMessage, ChatAttachment, Character, LabAssetSuggestion, TimelineSuggestion, DirectorAction, TimelineFrame } from '../types';
import { sendDirectorMessage } from '../services/geminiService';

interface Props {
    messages: ChatMessage[];
    onUpdateMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    projectReferences: Character[];
    onAddAsset: (asset: LabAssetSuggestion) => void;
    onAddTimeline: (scenes: TimelineSuggestion[]) => void;
    
    // Persistence Props
    activeStyleId: string;
    onStyleChange: (id: string) => void;
    draftInput: string;
    onDraftChange: (text: string) => void;
    
    // New: Action Handler for Buttons
    onHandleAction?: (action: DirectorAction) => void;
    
    // Font Size Preference
    chatFontSize?: number;
    
    // Timeline Access for Contextual Actions
    timelineFrames?: TimelineFrame[];
    activeFrameId?: string | null;
    
    // Aspect Ratio Context
    currentRatio?: string;
}

// --- HELPER FUNCTIONS ---

const parseMessageContent = (text: string, msgId: string) => {
    const parts: { type: 'text' | 'assets' | 'timeline' | 'actions', content: any }[] = [];
    let cursor = 0;
    // Используем non-greedy захват для JSON блоков
    const combinedRegex = /```(json_assets|json_timeline|json_actions)([\s\S]*?)```/g;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
        if (match.index > cursor) {
            parts.push({ type: 'text', content: text.substring(cursor, match.index) });
        }
        
        const blockType = match[1];
        const jsonStr = match[2];

        try {
            const data = JSON.parse(jsonStr);
            if (blockType === 'json_assets') {
                parts.push({ type: 'assets', content: data });
            } else if (blockType === 'json_timeline') {
                parts.push({ type: 'timeline', content: data });
            } else if (blockType === 'json_actions') {
                parts.push({ type: 'actions', content: data });
            }
        } catch (e) {
            console.warn(`Failed to parse ${blockType} block in message ${msgId}`, e);
            parts.push({ type: 'text', content: `[Error parsing ${blockType}]` });
        }

        cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
        parts.push({ type: 'text', content: text.substring(cursor) });
    }

    return parts;
};

const renderTextWithLinks = (text: string) => {
  // Исправлен сплит для корректной работы с React ключами
  const parts = text.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
          return (
              <a 
                  key={`link-${i}`} 
                  href={match[2]} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[var(--accent)] hover:underline font-bold"
              >
                  {match[1]}
              </a>
          );
      }
      return <span key={`text-${i}`}>{part}</span>;
  });
};

// --- MEMOIZED MESSAGE COMPONENT ---

const MessageBubble = memo(({ 
    msg, 
    addedAssets, 
    addedTimelines, 
    onActionClick, 
    onAddAsset, 
    onAddTimeline,
    setAddedAssets,
    setAddedTimelines,
    fontSize
}: {
    msg: ChatMessage;
    addedAssets: Record<string, boolean>;
    addedTimelines: Record<string, boolean>;
    onActionClick: (action: DirectorAction) => void | Promise<void>;
    onAddAsset: (asset: LabAssetSuggestion) => void;
    onAddTimeline: (scenes: TimelineSuggestion[]) => void;
    setAddedAssets: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setAddedTimelines: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    fontSize: number;
}) => {
    // Memoize parsed content to avoid regex heavy lifting on every parent render
    const parsedContent = useMemo(() => parseMessageContent(msg.text, msg.id), [msg.text, msg.id]);

    const handleAddAssetClick = (asset: LabAssetSuggestion) => {
        onAddAsset(asset);
        setAddedAssets(prev => ({ ...prev, [asset.name]: true }));
    };

    const handleAddTimelineClick = (scenes: TimelineSuggestion[]) => {
        onAddTimeline(scenes);
        setAddedTimelines(prev => ({ ...prev, [msg.id]: true }));
    };

    return (
        <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border border-[var(--border-color)] ${msg.role === 'user' ? 'bg-[var(--bg-header)] text-[var(--text-muted)]' : 'bg-[var(--bg-header)] text-[var(--accent)]'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            
            {/* Message Content */}
            <div className={`max-w-[90%] md:max-w-[85%] flex flex-col gap-2`}>
                {/* Attachments Display */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className={`flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.attachments.map((att, i) => (
                            <div key={`att-${i}`} className="relative group rounded-lg overflow-hidden border border-[var(--border-color)] bg-black/50 hover:border-[var(--accent)] transition-colors">
                                {att.type === 'image' ? (
                                    <img src={att.data} className="h-16 w-auto object-cover" alt="attachment" />
                                ) : att.type === 'audio' ? (
                                    <div className="h-16 w-16 flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] bg-[var(--bg-input)]">
                                        <FileAudio size={16} />
                                        <span className="text-[8px] truncate max-w-[80%]">Audio</span>
                                    </div>
                                ) : (
                                    <div className="h-16 w-16 flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]">
                                        <FileText size={16} />
                                        <span className="text-[8px] truncate max-w-[80%]">{att.name}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Bubble */}
                <div 
                    className={`p-3 rounded-2xl leading-relaxed shadow-lg whitespace-pre-wrap 
                    ${msg.role === 'user' 
                        ? 'bg-[var(--accent)] text-[var(--accent-text)] rounded-tr-sm' 
                        : 'bg-[var(--bg-header)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm'}`}
                    style={{ fontSize: `${fontSize}px` }}
                >
                    
                    {parsedContent.map((part, idx) => {
                        const partKey = `part-${idx}`;
                        if (part.type === 'text') {
                            return <span key={partKey}>{renderTextWithLinks(part.content as string)}</span>;
                        } else if (part.type === 'actions') {
                            const actions = part.content as DirectorAction[];
                            return (
                                <div key={partKey} className="my-2 flex flex-wrap gap-2 relative z-10 pointer-events-auto">
                                    {actions.map((act, aIdx) => (
                                        <button 
                                            key={`action-${aIdx}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onActionClick(act);
                                            }}
                                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold uppercase shadow-md hover:brightness-110 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer"
                                            style={{ fontSize: `${Math.max(10, fontSize - 2)}px` }}
                                        >
                                            <MousePointer size={fontSize}/> {act.label}
                                        </button>
                                    ))}
                                </div>
                            );
                        } else if (part.type === 'assets') {
                            const assets = part.content as LabAssetSuggestion[];
                            return (
                                <div key={partKey} className="my-2 grid grid-cols-1 gap-2">
                                    {assets.map((asset, aIdx) => {
                                        const isAdded = addedAssets[asset.name];
                                        return (
                                            <div key={`asset-${aIdx}-${asset.name}`} className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg p-2 flex items-center justify-between group hover:border-[var(--accent)] transition-colors">
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[8px] text-[var(--accent)] font-bold uppercase tracking-wider bg-[var(--accent)]/10 px-1 rounded">{asset.type}</div>
                                                    </div>
                                                    <div className="font-bold text-[var(--text-main)] truncate" style={{ fontSize: `${fontSize}px` }}>{asset.name}</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleAddAssetClick(asset)}
                                                    disabled={isAdded}
                                                    className={`flex-shrink-0 p-1.5 rounded transition-all
                                                    ${isAdded 
                                                        ? 'text-green-500 cursor-default' 
                                                        : 'bg-[var(--bg-header)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--accent)]'}`}
                                                    title="Add to Lab"
                                                >
                                                    {isAdded ? <Check size={14}/> : <PlusCircle size={14}/>}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        } else if (part.type === 'timeline') {
                            const scenes = part.content as TimelineSuggestion[];
                            const isAdded = addedTimelines[msg.id];
                            return (
                                <div key={partKey} className="my-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg overflow-hidden group hover:border-orange-500/50 transition-colors">
                                        <div className="bg-[var(--bg-header)] p-2 flex items-center justify-between border-b border-[var(--border-color)]">
                                        <div className="flex items-center gap-2">
                                            <Film size={14} className="text-orange-500" />
                                            <span className="font-bold text-[var(--text-main)] text-[10px] uppercase tracking-wide">Storyboard ({scenes.length} Scenes)</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAddTimelineClick(scenes)}
                                            disabled={isAdded}
                                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all flex items-center gap-1
                                            ${isAdded ? 'text-green-500' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                        >
                                            {isAdded ? <><Check size={10}/> Done</> : <>Apply <ArrowRight size={10}/></>}
                                        </button>
                                        </div>
                                        <div className="p-2">
                                        <div className="text-[var(--text-muted)] space-y-1" style={{ fontSize: `${Math.max(10, fontSize - 2)}px` }}>
                                            {scenes.slice(0, 2).map((s, i) => (
                                                <div key={i} className="truncate flex gap-2">
                                                    <span className="text-orange-500/50 font-mono">{i+1}.</span> {s.title}
                                                </div>
                                            ))}
                                            {scenes.length > 2 && <div className="opacity-50 pl-4">+{scenes.length - 2} more...</div>}
                                        </div>
                                        </div>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---

export const DirectingHub: React.FC<Props> = ({ 
    messages, 
    onUpdateMessages, 
    projectReferences, 
    onAddAsset, 
    onAddTimeline,
    activeStyleId,
    onStyleChange,
    draftInput,
    onDraftChange,
    onHandleAction,
    chatFontSize = 12,
    timelineFrames = [],
    activeFrameId,
    currentRatio = "16:9"
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [addedAssets, setAddedAssets] = useState<Record<string, boolean>>({}); 
  const [addedTimelines, setAddedTimelines] = useState<Record<string, boolean>>({});
  const [isInputExpanded, setIsInputExpanded] = useState(false); 
  const [isRecording, setIsRecording] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const selectedStyle = DIRECTOR_STYLES.find(s => s.id === activeStyleId) || DIRECTOR_STYLES[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Очистка ресурсов при размонтировании
  useEffect(() => {
      return () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
              mediaRecorderRef.current.stop();
          }
      };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ChatAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const promise = new Promise<void>((resolve) => {
            reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                let type: ChatAttachment['type'] = 'image';
                if (file.type.startsWith('audio')) type = 'audio';
                if (file.type.startsWith('video')) type = 'video';
                if (file.type.includes('pdf')) type = 'pdf';
                newAttachments.push({ type, name: file.name, data: base64, mimeType: file.type });
                resolve();
            };
        });
        reader.readAsDataURL(file);
        await promise;
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyPrompt = () => {
      navigator.clipboard.writeText(draftInput);
  };

  const handleClearPrompt = () => {
      onDraftChange("");
  };

  const handleDownloadHistory = () => {
      const historyText = messages.map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n\n');
      const blob = new Blob([historyText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valera_history_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleToggleRecord = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              mediaRecorderRef.current = recorder;
              audioChunksRef.current = [];

              recorder.ondataavailable = (e) => {
                  if (e.data.size > 0) audioChunksRef.current.push(e.data);
              };

              recorder.onstop = () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      const base64 = reader.result as string;
                      setAttachments(prev => [...prev, {
                          type: 'audio',
                          name: `Voice_Note_${Date.now()}.webm`,
                          data: base64,
                          mimeType: 'audio/webm'
                      }]);
                  };
                  reader.readAsDataURL(audioBlob);
                  // Важно: останавливаем треки, чтобы убрать иконку микрофона в браузере
                  stream.getTracks().forEach(track => track.stop());
              };

              recorder.start();
              setIsRecording(true);
          } catch (err) {
              console.error("Mic access denied", err);
              alert("Could not access microphone. Please allow microphone permissions in your browser.");
          }
      }
  };

  // Modified handleSend with error handling and safety checks
  const handleSend = async (overrideText?: string, overrideAttachments?: ChatAttachment[], hiddenPromptOverride?: string) => {
      const textToSend = overrideText || draftInput;
      const attachmentsToSend = overrideAttachments || attachments;

      if ((!textToSend.trim() && attachmentsToSend.length === 0) || isTyping) return;

      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: textToSend, 
          attachments: [...attachmentsToSend],
          timestamp: Date.now()
      };

      onUpdateMessages(prev => [...prev, userMsg]);
      onDraftChange(""); 
      setAttachments([]);
      setIsTyping(true);

      try {
          // Create a temporary history where the last message uses the HIDDEN prompt if provided
          const historyForApi = [...messages];
          if (hiddenPromptOverride) {
              historyForApi.push({
                  ...userMsg,
                  text: hiddenPromptOverride // AI sees the heavy prompt
              });
          } else {
              historyForApi.push(userMsg);
          }

          // Determine active frame context
          const activeFrame = timelineFrames?.find(f => f.id === activeFrameId) || null;

          const responseText = await sendDirectorMessage(
              historyForApi.slice(0, -1), 
              historyForApi[historyForApi.length - 1].text, 
              userMsg.attachments?.map(a => ({ data: a.data, mimeType: a.mimeType })), 
              selectedStyle.promptSuffix,
              projectReferences,
              activeFrame, 
              timelineFrames || [], // Safe fallback
              currentRatio
          );

          const modelMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'model',
              text: responseText,
              timestamp: Date.now()
          };

          onUpdateMessages(prev => [...prev, modelMsg]);
      } catch (error) {
          console.error("Director Chat Error:", error);
          const errorMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'model',
              text: "Извини, произошла ошибка связи. Попробуй еще раз или проверь соединение.",
              timestamp: Date.now()
          };
          onUpdateMessages(prev => [...prev, errorMsg]);
      } finally {
          setIsTyping(false);
      }
  };

  const handleClearHistory = () => {
      if (isClearingHistory) {
          const resetMessage: ChatMessage = {
              ...INITIAL_VALERA_MESSAGES[0],
              id: `reset_${Date.now()}`,
              timestamp: Date.now()
          };
          onUpdateMessages([resetMessage]);
          setAddedAssets({});
          setAddedTimelines({});
          setIsClearingHistory(false);
      } else {
          setIsClearingHistory(true);
          setTimeout(() => setIsClearingHistory(false), 3000);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = async (action: DirectorAction) => {
      if (onHandleAction) onHandleAction(action);
      
      if (action.action === 'SET_FORMAT') {
          const ratio = action.payload;
          const autoMsg = `Готово! Формат выставлен на ${ratio}. Валера, пиши сценарий!`;
          await handleSend(autoMsg);
      } else if (action.action === 'GENERATE_CINEMATIC_CHAR') {
          await handleSend("Валера, сгенерируй синематик персонажа по алгоритму! (Random)");
      } else if (action.action === 'GENERATE_COVERAGE') {
          await handleSend("🎬 Раскадровка (Coverage)...", [], "Валера, сделай полную раскадровку (Coverage) для этой сцены! (3x3 Grid Mode)");
      } else if (action.action === 'EXPAND_SCENE') {
          // Version 2 Logic: Check for first frame image
          const firstFrame = timelineFrames?.[0]; // Safe access
          if (!firstFrame) {
              await handleSend("Валера, я хочу собрать сцену, но таймлайн пуст. Предложи первый кадр!");
              return;
          }
          if (!firstFrame.image) {
              alert("Please render or upload an image to the first scene on the timeline before expanding.");
              return;
          }
          const tempAttachment: ChatAttachment = {
              type: 'image',
              name: 'First_Frame_Reference.png',
              data: firstFrame.image,
              mimeType: 'image/png'
          };
          const prompt = `Валера, погнали! Вот первый кадр. Сделай полный разбор и раскидай сцены по таймлинии (Version 2 Mode).\n\n${CINEMATIC_EXPANSION_PROMPT}`;
          await handleSend("🎞️ Собрать Сцену (V2)...", [tempAttachment], prompt);
      } else if (action.action === 'GENERATE_STORYBOARD_V3') {
          // Version 3 (Director's Vision)
          const hiddenPrompt = `Валера, сделай "Режиссерскую Раскадровку (V3)" для текущего сценария. Заполни все аудио-визуальные поля! \n\n${STORYBOARD_V3_META_PROMPT}`;
          await handleSend("🎥 Режиссерская Версия (V3)...", [], hiddenPrompt);
      }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-card)] overflow-hidden relative shadow-2xl animate-fade-in">
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-input)] relative">
            
            {/* Minimal Header */}
            <div className="h-10 border-b border-[var(--border-color)] bg-[var(--bg-header)] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-600 to-amber-700 flex items-center justify-center border border-white/10">
                        <Bot size={10} className="text-white" />
                    </div>
                    <div>
                        <div className="font-bold text-xs text-[var(--text-main)]">Valera <span className="text-[var(--text-muted)] font-normal">Director AI</span></div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-[9px] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--accent)] uppercase font-bold truncate max-w-[100px]">
                        {selectedStyle.name}
                    </div>
                </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar w-full">
                {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id}
                        msg={msg}
                        addedAssets={addedAssets}
                        addedTimelines={addedTimelines}
                        onActionClick={handleActionClick}
                        onAddAsset={onAddAsset}
                        onAddTimeline={onAddTimeline}
                        setAddedAssets={setAddedAssets}
                        setAddedTimelines={setAddedTimelines}
                        fontSize={chatFontSize}
                    />
                ))}
                
                {isTyping && (
                     <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-header)] border border-[var(--border-color)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Bot size={14} />
                        </div>
                        <div className="bg-[var(--bg-header)] border border-[var(--border-color)] px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1 w-fit">
                             <div className="w-1 h-1 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                             <div className="w-1 h-1 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                             <div className="w-1 h-1 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Bottom Bar (Canvas Style) */}
            <div className="bg-[var(--bg-header)] border-t border-[var(--border-color)] p-2 shrink-0 z-20 relative">
                {/* Styles Popover */}
                {isStyleMenuOpen && (
                    <div className="absolute bottom-full left-2 mb-2 w-64 bg-[#252525] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in-up max-h-80">
                        <div className="p-2 border-b border-[#333] flex justify-between items-center bg-[#1e1e1e]">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Director Personality</span>
                            <button onClick={() => setIsStyleMenuOpen(false)}><X size={14} className="text-gray-500 hover:text-white"/></button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-1">
                            {DIRECTOR_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => { onStyleChange(style.id); setIsStyleMenuOpen(false); }}
                                    className={`w-full text-left p-2 rounded-lg transition-all border border-transparent mb-1
                                    ${selectedStyle.id === style.id 
                                        ? 'bg-[var(--accent)] text-[var(--accent-text)]' 
                                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]'}`}
                                >
                                    <div className="text-[10px] font-bold">{style.name}</div>
                                    <div className="text-[8px] opacity-70 truncate">{style.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Attachment Preview Strip */}
                {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
                        {attachments.map((att, i) => (
                            <div key={`prev-${i}`} className="relative flex items-center gap-2 bg-[var(--bg-input)] px-2 py-1 rounded-lg border border-[var(--border-color)] text-[10px] text-[var(--text-main)] flex-shrink-0">
                                {att.type === 'image' ? <ImageIcon size={10} className="text-[var(--accent)]" /> : att.type === 'audio' ? <FileAudio size={10} className="text-orange-400"/> : <FileText size={10} />}
                                <span className="truncate max-w-[80px]">{att.name}</span>
                                <button onClick={() => removeAttachment(i)} className="hover:text-red-400 ml-1"><X size={10}/></button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className={`flex items-end gap-2 transition-all duration-300 ${isInputExpanded ? 'items-start' : 'items-end'}`}>
                     <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)} 
                            className={`p-2 rounded-lg transition-all shrink-0 ${isStyleMenuOpen ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)]'}`}
                            title="Director Style & Options"
                        >
                            <Settings2 size={18} />
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-input)] transition-all shrink-0">
                            <Paperclip size={18} />
                            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,audio/*,video/*,.pdf,text/*" onChange={handleFileUpload} />
                        </button>
                        
                        <button 
                            onClick={handleToggleRecord} 
                            className={`p-2 rounded-lg transition-all shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)]'}`}
                            title={isRecording ? "Stop Recording" : "Record Audio Prompt"}
                        >
                            {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
                        </button>
                     </div>
                     
                     <div className={`flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl flex items-start p-1 focus-within:border-[var(--accent)] transition-all relative group/input ${isInputExpanded ? 'h-48' : 'min-h-[40px]'}`}>
                        <textarea 
                            ref={textareaRef}
                            value={draftInput}
                            onChange={(e) => onDraftChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Valera..."
                            className="w-full h-full bg-transparent text-[var(--text-main)] placeholder-[var(--text-muted)] px-2 py-2 pr-12 focus:outline-none resize-none leading-relaxed custom-scrollbar"
                            style={{ fontSize: `${chatFontSize}px` }}
                        />
                        
                        {/* Prompt Tools inside input */}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 z-20">
                             {draftInput && (
                                <button 
                                    onClick={handleClearPrompt} 
                                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-card)] rounded transition-colors"
                                    title="Clear Text"
                                >
                                    <Eraser size={12}/>
                                </button>
                            )}
                            <button 
                                onClick={() => setIsInputExpanded(!isInputExpanded)} 
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card)] rounded transition-colors"
                                title={isInputExpanded ? "Collapse" : "Expand"}
                            >
                                {isInputExpanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
                            </button>
                        </div>
                     </div>

                     <div className="flex flex-col gap-2">
                        {/* Chat History Tools moved here */}
                        <button onClick={handleDownloadHistory} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] rounded-lg transition-all shrink-0" title="Save History">
                            <Download size={18}/>
                        </button>
                        <button 
                            onClick={handleClearHistory} 
                            className={`p-2 rounded-lg transition-all shrink-0 ${isClearingHistory ? 'bg-red-600 text-white animate-pulse shadow-lg' : 'text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-input)]'}`}
                            title={isClearingHistory ? "Click again to confirm reset" : "Clear History"}
                        >
                            {isClearingHistory ? <AlertTriangle size={18}/> : <Trash2 size={18}/>}
                        </button>
                        <button 
                            onClick={() => handleSend()} 
                            disabled={!draftInput.trim() && attachments.length === 0} 
                            className={`p-2 rounded-lg transition-all shadow-lg flex-shrink-0 
                            ${(!draftInput.trim() && attachments.length === 0) 
                                ? 'bg-[var(--bg-input)] text-[var(--text-muted)] cursor-not-allowed' 
                                : 'bg-[var(--accent)] text-[var(--accent-text)] hover:brightness-110 hover:scale-105'}`}
                        >
                            <CornerDownLeft size={18} />
                        </button>
                     </div>
                </div>
            </div>

        </div>
    </div>
  );
};
