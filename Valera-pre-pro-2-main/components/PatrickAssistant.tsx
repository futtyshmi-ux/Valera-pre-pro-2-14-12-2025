
import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownLeft, Coffee, Lightbulb, ExternalLink, ArrowUp, ArrowRight, ArrowLeft } from 'lucide-react';
import { VEL_DEFAULTS } from '../constants';

interface Props {
    onClose: () => void;
    walkGif?: string;
    idleGif?: string;
    sittingGif?: string;
    size?: number;
}

// Default Fallbacks
const DEFAULT_IDLE = VEL_DEFAULTS.IDLE;
const DEFAULT_WALK = VEL_DEFAULTS.WALK;
const DEFAULT_SIT = VEL_DEFAULTS.SIT; 

type BehaviorMode = 
    | 'intro' 
    | 'tour_valera'     // 1. Left Sidebar
    | 'tour_assets'     // 2. Right Sidebar (Tools)
    | 'tour_timeline'   // 3. Bottom (Master Sequence)
    | 'tour_stage'      // 4. Center (Preview/Edit)
    | 'tour_hub'        // 5. Tabs (Video/Audio)
    | 'tour_settings'   // 6. Tabs (Settings)
    | 'tour_header'     // 7. Top Right (Export)
    // --- CANVAS MODES ---
    | 'canvas_intro'
    | 'canvas_tools'
    | 'canvas_layers'
    | 'canvas_prompt'
    // --------------------
    | 'moving_to_rest' 
    | 'resting';

// Map modes to DOM Element IDs
const TOUR_TARGET_IDS: Partial<Record<BehaviorMode, string>> = {
    'tour_valera': 'ui-director-panel',
    'tour_assets': 'ui-assets-panel',
    'tour_timeline': 'ui-timeline-strip',
    'tour_stage': 'ui-main-stage',
    'tour_hub': 'ui-tab-tools',
    'tour_settings': 'ui-tab-settings',
    'tour_header': 'ui-header-export',
    'canvas_tools': 'ui-canvas-tools',
    'canvas_layers': 'ui-canvas-layers',
    'canvas_prompt': 'ui-canvas-prompt'
};

const TIPS = [
    "🔥 Лайфхак: Нажми 'Edit Image', чтобы закрасить лишнее (Inpaint) или расширить кадр (Outpaint).",
    "💡 Если Валера тупит, нажми кнопку с мусоркой 'Clear Context' над чатом.",
    "🎹 Во вкладке Tools есть Suno AI — там можно сгенерить саундтрек для сцены.",
    "🎥 Экспорт в DaVinci (XML) сохраняет разбивку по кадрам. Удобно для монтажа.",
    "✨ Используй 'Trigger Word' в карточке персонажа, чтобы нейронка не забывала, как он выглядит.",
    "🚀 Вступай в банду разработчиков: t.me/derni108 (там обновы и фишки).",
    "👀 Двойной клик по тексту в редакторе картинок позволяет его менять.",
    "⌨️ Ctrl+Z работает в редакторе картинок. Не бойся косячить."
];

export const PatrickAssistant: React.FC<Props> = ({ 
    onClose, 
    walkGif, 
    idleGif, 
    sittingGif,
    size = 120 
}) => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isFlipped, setIsFlipped] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [behaviorMode, setBehaviorMode] = useState<BehaviorMode>('intro');
    const [transitionDuration, setTransitionDuration] = useState('0s');
    
    // Highlight Box State
    const [highlightBox, setHighlightBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
    
    // Resting State Logic
    const [tipContent, setTipContent] = useState<string | null>(null);
    const tipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 1. Initial Positioning & Event Listeners
    useEffect(() => {
        setPos({ 
            x: (window.innerWidth / 2) - (size / 2), 
            y: (window.innerHeight / 2) - (size / 2) 
        });

        const handleCanvasOpen = () => {
            if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
            setTipContent(null);
            moveTo(window.innerWidth / 2 - (size / 2), window.innerHeight / 2 - (size / 2), 'canvas_intro');
        };

        const handleCanvasClose = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            moveTo(w - size - 20, h - size - 20, 'resting');
        };

        window.addEventListener('VEL_CANVAS_OPEN', handleCanvasOpen);
        window.addEventListener('VEL_CANVAS_CLOSE', handleCanvasClose);

        return () => {
            window.removeEventListener('VEL_CANVAS_OPEN', handleCanvasOpen);
            window.removeEventListener('VEL_CANVAS_CLOSE', handleCanvasClose);
        };
    }, [size]);

    // 2. Highlighting Logic
    useEffect(() => {
        const updateHighlight = () => {
            const targetId = TOUR_TARGET_IDS[behaviorMode];
            if (targetId) {
                const el = document.getElementById(targetId);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // Add a small padding
                    const padding = 4;
                    setHighlightBox({
                        x: rect.left - padding,
                        y: rect.top - padding,
                        w: rect.width + (padding * 2),
                        h: rect.height + (padding * 2)
                    });
                    return;
                }
            }
            setHighlightBox(null);
        };

        // Update immediately
        updateHighlight();

        // Also update on resize or scroll to keep it sync
        window.addEventListener('resize', updateHighlight);
        window.addEventListener('scroll', updateHighlight, true);

        return () => {
            window.removeEventListener('resize', updateHighlight);
            window.removeEventListener('scroll', updateHighlight, true);
        };
    }, [behaviorMode]);

    // 3. Resting Logic (Random Tips)
    useEffect(() => {
        if (behaviorMode === 'resting') {
            tipIntervalRef.current = setInterval(() => {
                showRandomTip();
            }, 20000); 
        } else {
            if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
            if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
            setTipContent(null);
        }

        return () => {
            if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
            if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
        };
    }, [behaviorMode]);

    const showRandomTip = () => {
        const isPromo = Math.random() > 0.7;
        const text = isPromo 
            ? "👋 Эй, псс! Залетай в группу: t.me/derni108" 
            : TIPS[Math.floor(Math.random() * TIPS.length)];
        
        setTipContent(text);
        
        if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
        tipTimeoutRef.current = setTimeout(() => {
            setTipContent(null);
        }, 8000);
    };

    // 4. Movement Logic
    const moveTo = (x: number, y: number, nextMode?: BehaviorMode) => {
        setIsMoving(true);
        const dx = x - pos.x;
        const dy = y - pos.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const speed = 400; 
        const duration = Math.max(1.0, distance / speed);
        
        setTransitionDuration(`${duration}s`);

        if (x < pos.x) setIsFlipped(true); 
        else setIsFlipped(false);          

        setPos({ x, y });

        setTimeout(() => {
            setIsMoving(false);
            if (nextMode) {
                setBehaviorMode(nextMode);
                if (x < window.innerWidth / 2) setIsFlipped(false);
                else setIsFlipped(true);
            }
        }, duration * 1000);
    };

    const startTour = () => {
        // Step 1
        moveTo(20, window.innerHeight / 2 - 100, 'tour_valera');
    };

    const nextStep = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;

        switch (behaviorMode) {
            // --- MAIN TOUR ---
            case 'tour_valera': moveTo(w - 320, 150, 'tour_assets'); break;
            case 'tour_assets': moveTo(w / 2 - size/2, h - 250, 'tour_timeline'); break;
            case 'tour_timeline': moveTo(w / 2 - size/2, h / 2 - size/2, 'tour_stage'); break;
            case 'tour_stage': moveTo(180, 80, 'tour_hub'); break;
            case 'tour_hub': moveTo(280, 80, 'tour_settings'); break;
            case 'tour_settings': moveTo(w - 180, 20, 'tour_header'); break;
            case 'tour_header': moveTo(w - size - 20, h - size - 20, 'resting'); break;

            // --- CANVAS TOUR ---
            case 'canvas_intro': moveTo(120, h / 2 - 100, 'canvas_tools'); break;
            case 'canvas_tools': moveTo(w - 280, 80, 'canvas_layers'); break;
            case 'canvas_layers': moveTo(w / 2 - size/2, h - 180, 'canvas_prompt'); break;
            case 'canvas_prompt': moveTo(w - size - 20, h - size - 20, 'resting'); break;

            default: break;
        }
    };

    const skipTour = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        moveTo(w - size - 20, h - size - 20, 'resting');
    };

    const handleWakeUp = () => {
        setBehaviorMode('intro');
        moveTo(window.innerWidth / 2 - size/2, window.innerHeight / 2 - size/2, 'intro');
    };

    let activeSrc = idleGif || DEFAULT_IDLE;
    if (isMoving) {
        activeSrc = walkGif || DEFAULT_WALK;
    } else if (behaviorMode === 'resting') {
        activeSrc = sittingGif || DEFAULT_SIT;
    }

    const TourBubble = ({ title, text, arrowDir }: { title: string, text: string, arrowDir?: string }) => (
        <div className={`absolute ${arrowDir === 'down' ? 'bottom-full mb-4' : 'top-full mt-4'} left-1/2 -translate-x-1/2 w-64 bg-[#1a1a1a]/95 backdrop-blur text-white border border-[var(--accent)] p-4 rounded-xl shadow-2xl z-[9999] animate-fade-in-up`}>
            <h4 className="text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                {title}
            </h4>
            <p className="text-xs font-medium text-gray-300 mb-4 leading-relaxed">
                {text}
            </p>
            <div className="flex gap-2">
                <button onClick={nextStep} className="flex-1 py-2 bg-[var(--accent)] hover:brightness-110 text-black font-bold text-xs rounded uppercase transition-all shadow-lg">
                    Дальше <ArrowRight size={12} className="inline ml-1"/>
                </button>
                <button onClick={skipTour} className="px-3 py-2 bg-[#333] hover:bg-white/10 text-gray-400 font-bold text-[10px] rounded uppercase transition-all">
                    Skip
                </button>
            </div>
            {/* Arrow CSS Triangle */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 
                ${arrowDir === 'down' 
                    ? 'top-full border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[var(--accent)]' 
                    : 'bottom-full border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-[var(--accent)]'
                }`}>
            </div>
        </div>
    );

    const renderContent = () => {
        if (behaviorMode === 'resting') {
            if (isHovered) {
                return (
                    <div className="absolute bottom-full right-0 mb-2 w-40 bg-white text-black text-[10px] font-bold p-3 rounded-xl shadow-xl text-center animate-fade-in-up z-[9999]">
                        <div className="flex items-center justify-center gap-1 mb-2 text-gray-500">
                            <Coffee size={12} />
                            <span>На чиле</span>
                        </div>
                        "Я тут отдыхаю. Если нужен — зови."
                        <button onClick={handleWakeUp} className="mt-2 w-full bg-black text-white rounded py-1.5 text-[9px] uppercase hover:bg-gray-800 transition-colors">Позвать Вела</button>
                    </div>
                );
            }
            if (tipContent) {
                const isLink = tipContent.includes("t.me");
                return (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a1a1a] border border-[var(--accent)] text-white text-[11px] p-3 rounded-xl shadow-2xl animate-fade-in-up z-[9999]">
                        <div className="flex items-center gap-2 mb-1 text-[var(--accent)] font-bold uppercase text-[9px]">
                            <Lightbulb size={12} /> Совет
                        </div>
                        <div className="mb-2 leading-relaxed">
                            {isLink ? (
                                <>
                                    Вступай в нашу банду:<br/>
                                    <a href="https://t.me/derni108" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold flex items-center gap-1 mt-1">
                                        <ExternalLink size={10}/> t.me/derni108
                                    </a>
                                </>
                            ) : tipContent}
                        </div>
                    </div>
                );
            }
            return null;
        }

        switch (behaviorMode) {
            case 'intro':
                return (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-[#1a1a1a] text-white border border-gray-600 p-4 rounded-xl shadow-2xl text-center z-[9999] animate-fade-in-up">
                        <h4 className="text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-2">VEL (PRODUCER)</h4>
                        <p className="text-xs font-medium text-gray-300 mb-3">
                            "Ну че, режиссер? Давай я тебе быстро покажу, где тут у нас что лежит, чтобы ты не потерялся."
                        </p>
                        <div className="flex flex-col gap-2">
                            <button onClick={startTour} className="w-full py-2 bg-[var(--accent)] hover:brightness-110 text-black font-bold text-xs rounded uppercase transition-all">
                                Проведи экскурсию
                            </button>
                            <button onClick={skipTour} className="w-full py-2 bg-[#333] hover:bg-white/10 text-gray-400 font-bold text-[10px] rounded uppercase transition-all">
                                Сам разберусь
                            </button>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-600"></div>
                    </div>
                );
            
            case 'tour_valera': return <TourBubble title="ВАЛЕРА (AI)" text="Слева сидит Валера. Это твой ИИ-режиссер. Пиши ему идеи текстом, а он будет накидывать сценарий, предлагать кадры и генерить промпты." arrowDir="left_side" />;
            case 'tour_assets': return <TourBubble title="TOOLS & ASSETS" text="Справа — панель инструментов. Тут создаем Персонажей и Локации (Assets), чтобы лица актеров не менялись от сцены к сцене. Очень важно!" arrowDir="right_side" />;
            case 'tour_timeline': return <TourBubble title="MASTER SEQUENCE" text="Внизу — Таймлайн. Сюда падают готовые сцены. Можно менять порядок, удалять и смотреть общую длительность фильма." arrowDir="down" />;
            case 'tour_stage': return <TourBubble title="STAGE / CANVAS" text="В центре — главный экран. Когда картинка готова, нажми 'Edit Image', чтобы зайти в редактор (Canvas) и дорисовать детали или поправить косяки." arrowDir="down" />;
            case 'tour_hub': return <TourBubble title="VIDEO HUB" text="Вкладка 'Tools' (2-я сверху). Там ссылки на внешние нейронки (Runway, Pika, Suno) для анимации картинок и создания музыки." arrowDir="top" />;
            case 'tour_settings': return <TourBubble title="SETTINGS" text="Третья вкладка — Настройки. Тут можно сменить тему, модель (Flash/Pro) и подключить Google Drive для бекапов." arrowDir="top" />;
            case 'tour_header': return <TourBubble title="EXPORT & VIEW" text="Сверху справа кнопки Экспорта (ZIP, PDF, PPTX) и кнопка 'Full Screen' для полного погружения." arrowDir="top" />;
            
            case 'canvas_intro': return <TourBubble title="CANVAS / EDITOR" text="Опа! Режим Творца (Canvas). Тут мы делаем магию с картинкой. Можно рисовать, удалять лишнее и дорисовывать нейронкой." arrowDir="down" />;
            case 'canvas_tools': return <TourBubble title="TOOLS" text="Слева — инструменты. 'Brush' чтобы рисовать, 'Inpaint' (кисть с магией) чтобы выделить область для нейронки, и 'Frame' чтобы расширить границы кадра." arrowDir="left" />;
            case 'canvas_layers': return <TourBubble title="LAYERS" text="Справа сверху — Слои. Все объекты тут. Можно двигать, скрывать и блокировать. Работает как в Фотошопе, только проще." arrowDir="top" />;
            case 'canvas_prompt': return <TourBubble title="GENERATE BAR" text="Внизу — самое главное. Поле Промпта. Выдели что-то инструментом Inpaint и напиши тут, что хочешь увидеть (например 'add sunglasses')." arrowDir="down" />;

            default: return null;
        }
    };

    return (
        <>
            {/* --- HIGHLIGHT FRAME RENDERER --- */}
            {highlightBox && !isMoving && (
                <div 
                    className="fixed z-[9990] pointer-events-none rounded-xl border-4 border-[var(--accent)] shadow-[0_0_20px_var(--accent)] transition-all duration-300 ease-out animate-pulse"
                    style={{
                        left: highlightBox.x,
                        top: highlightBox.y,
                        width: highlightBox.w,
                        height: highlightBox.h,
                    }}
                />
            )}

            {/* --- VEL CHARACTER --- */}
            <div 
                className="fixed z-[9999]"
                style={{
                    left: 0,
                    top: 0,
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    transition: isMoving ? `transform ${transitionDuration} linear` : 'none', 
                    pointerEvents: 'auto', 
                }}
            >
                <div className="relative group cursor-pointer" onClick={() => behaviorMode === 'resting' && handleWakeUp()}>
                    {/* Close Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg transition-opacity duration-200 z-50 ${isHovered || behaviorMode === 'intro' ? 'opacity-100' : 'opacity-0'}`}
                        title="Hide Vel Completely"
                    >
                        <X size={12} />
                    </button>

                    {renderContent()}

                    {/* Character Image */}
                    <img 
                        src={activeSrc} 
                        width={size} 
                        style={{ 
                            transform: isFlipped ? 'scaleX(-1)' : 'scaleX(1)',
                            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
                        }}
                        alt="Vel Mascot"
                        draggable={false}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes('media.tenor.com')) return;
                            target.src = "https://media.tenor.com/9ex5o1k_kMAAAAAi/pikachu-sitting.gif"; 
                        }}
                    />
                </div>
            </div>
        </>
    );
};
