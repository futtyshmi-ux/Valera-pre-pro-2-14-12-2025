
import React, { useRef, useState } from 'react';
import { AppSettings } from '../types';
import { THEME_PRESETS, APP_FONTS, MODEL_IMAGE_FLASH, MODEL_IMAGE_PRO } from '../constants';
import { Sliders, Download, Upload, Monitor, CheckCircle, Smartphone, Type, Palette, Cpu, Zap, Star, Check, ArrowRight, Key, Eye, EyeOff, Bot, RefreshCw, FileImage, AlertTriangle, MessageSquare, FileArchive, FileText, Presentation, FolderOpen, Save, Clapperboard, Cloud, Footprints, PauseCircle, Coffee, Link as LinkIcon, Trash2 } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
  // Project Management Actions passed from App
  onExportZip?: () => void;
  onExportPDF?: () => void;
  onExportPPTX?: () => void;
  onSaveDB?: () => void;
  onLoadDB?: () => void;
  onExportDaVinci?: () => void;
  onConnectDrive?: () => void;
  isDriveConnected?: boolean;
}

export const SettingsPanel: React.FC<Props> = ({ settings, onUpdate, onExportZip, onExportPDF, onExportPPTX, onSaveDB, onLoadDB, onExportDaVinci, onConnectDrive, isDriveConnected }) => {
  const configImportRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof AppSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  // --- VEL CONFIGURATION (JSON) ---
  const handleExportVelConfig = () => {
      const velData = {
          characterName: "Vel",
          idleGif: settings.assistantIdleImage,
          walkGif: settings.assistantWalkImage,
          sitGif: settings.assistantSitImage,
          exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(velData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Vel_Config_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleImportVelConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              if (json.idleGif || json.walkGif || json.sitGif) {
                  onUpdate({
                      ...settings,
                      assistantIdleImage: json.idleGif,
                      assistantWalkImage: json.walkGif,
                      assistantSitImage: json.sitGif
                  });
                  alert("Vel Config Loaded Successfully!");
              } else {
                  alert("Invalid Vel Config File");
              }
          } catch (err) {
              alert("Error reading file");
          }
      };
      reader.readAsText(file);
      event.target.value = '';
  };

  // Preload Fonts for Preview
  React.useEffect(() => {
      const families = APP_FONTS.map(f => {
          const match = f.value.match(/'([^']+)'/);
          return match ? match[1].replace(/\s+/g, '+') : null;
      }).filter(Boolean).join('&family=');

      if (families) {
          const link = document.createElement('link');
          link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
      }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-32 pt-8 px-4">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight">Settings</h2>
      </div>

      {/* 1. PROJECT MANAGEMENT */}
      <section>
          <div className="flex items-center gap-2 mb-6">
              <FolderOpen size={16} className="text-[var(--accent)]"/>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Project Management</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Database</label>
                  <div className="flex gap-2">
                      <button onClick={onLoadDB} className="flex-1 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all">
                          <Upload size={14}/> Load Project
                      </button>
                      <button onClick={onSaveDB} className="flex-1 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-muted)] rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all">
                          <Save size={14}/> Save Database
                      </button>
                  </div>
              </div>
              
              <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Export</label>
                  <div className="grid grid-cols-2 gap-2">
                      <button onClick={onExportZip} className="flex-1 px-3 py-3 bg-[var(--accent)] text-white hover:brightness-110 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all shadow-lg">
                          <FileArchive size={14}/> ZIP Archive
                      </button>
                      <button onClick={onExportDaVinci} className="px-3 py-3 bg-[#1a1a1a] text-white hover:bg-[#333] border border-[var(--border-color)] rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase transition-all" title="Export FCPXML for DaVinci Resolve">
                          <Clapperboard size={14}/> DaVinci (XML)
                      </button>
                      <button onClick={onExportPDF} className="px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-header)] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-all" title="Export PDF Report">
                          <FileText size={16}/> PDF
                      </button>
                      <button onClick={onExportPPTX} className="px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-header)] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-all" title="Export PowerPoint">
                          <Presentation size={16}/> PPTX
                      </button>
                  </div>
              </div>
          </div>
      </section>

      <div className="w-full h-px bg-[var(--border-color)]"></div>

      {/* 2. VEL ASSISTANT CONFIGURATION */}
      <section>
          <div className="flex items-center gap-2 mb-6">
              <Bot size={16} className="text-[var(--accent)]"/>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Vel Character Settings</h3>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500 flex items-center justify-center overflow-hidden">
                          {settings.assistantIdleImage ? <img src={settings.assistantIdleImage} className="w-full h-full object-cover"/> : <span className="font-bold text-pink-500">V</span>}
                      </div>
                      <div>
                          <div className="text-sm font-bold text-[var(--text-main)]">Vel (Animated Assistant)</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Controls the walking mascot overlay</div>
                      </div>
                  </div>
                  <button
                      onClick={() => update('showAssistant', !settings.showAssistant)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${settings.showAssistant ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                  >
                      {settings.showAssistant ? 'Active' : 'Disabled'}
                  </button>
              </div>

              {settings.showAssistant && (
                  <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 gap-4">
                          {/* Idle State */}
                          <div className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border-color)]">
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1"><PauseCircle size={10}/> Idle GIF URL</label>
                                  {settings.assistantIdleImage && (
                                      <button onClick={() => update('assistantIdleImage', undefined)} className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={10}/> Clear</button>
                                  )}
                              </div>
                              <div className="flex gap-2 items-center">
                                  <div className="w-12 h-12 bg-black/30 rounded border border-[var(--border-color)] flex items-center justify-center overflow-hidden shrink-0">
                                      {settings.assistantIdleImage ? <img src={settings.assistantIdleImage} className="w-full h-full object-contain"/> : <span className="text-[8px] text-gray-500">Default</span>}
                                  </div>
                                  <div className="flex-1 relative">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LinkIcon size={12}/></div>
                                      <input 
                                          type="text"
                                          placeholder="https://example.com/idle.gif"
                                          value={settings.assistantIdleImage || ''}
                                          onChange={(e) => update('assistantIdleImage', e.target.value)}
                                          className="w-full bg-[var(--bg-header)] border border-[var(--border-color)] rounded-lg py-2.5 pl-8 pr-3 text-[11px] text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none placeholder-gray-600 font-mono"
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Walking State */}
                          <div className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border-color)]">
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1"><Footprints size={10}/> Walk GIF URL</label>
                                  {settings.assistantWalkImage && (
                                      <button onClick={() => update('assistantWalkImage', undefined)} className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={10}/> Clear</button>
                                  )}
                              </div>
                              <div className="flex gap-2 items-center">
                                  <div className="w-12 h-12 bg-black/30 rounded border border-[var(--border-color)] flex items-center justify-center overflow-hidden shrink-0">
                                      {settings.assistantWalkImage ? <img src={settings.assistantWalkImage} className="w-full h-full object-contain"/> : <span className="text-[8px] text-gray-500">Default</span>}
                                  </div>
                                  <div className="flex-1 relative">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LinkIcon size={12}/></div>
                                      <input 
                                          type="text"
                                          placeholder="https://example.com/walk.gif"
                                          value={settings.assistantWalkImage || ''}
                                          onChange={(e) => update('assistantWalkImage', e.target.value)}
                                          className="w-full bg-[var(--bg-header)] border border-[var(--border-color)] rounded-lg py-2.5 pl-8 pr-3 text-[11px] text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none placeholder-gray-600 font-mono"
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Sitting State */}
                          <div className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border-color)]">
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1"><Coffee size={10}/> Sitting GIF URL</label>
                                  {settings.assistantSitImage && (
                                      <button onClick={() => update('assistantSitImage', undefined)} className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={10}/> Clear</button>
                                  )}
                              </div>
                              <div className="flex gap-2 items-center">
                                  <div className="w-12 h-12 bg-black/30 rounded border border-[var(--border-color)] flex items-center justify-center overflow-hidden shrink-0">
                                      {settings.assistantSitImage ? <img src={settings.assistantSitImage} className="w-full h-full object-contain"/> : <span className="text-[8px] text-gray-500">Default</span>}
                                  </div>
                                  <div className="flex-1 relative">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LinkIcon size={12}/></div>
                                      <input 
                                          type="text"
                                          placeholder="https://example.com/sit.gif"
                                          value={settings.assistantSitImage || ''}
                                          onChange={(e) => update('assistantSitImage', e.target.value)}
                                          className="w-full bg-[var(--bg-header)] border border-[var(--border-color)] rounded-lg py-2.5 pl-8 pr-3 text-[11px] text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none placeholder-gray-600 font-mono"
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                          <button onClick={handleExportVelConfig} className="flex-1 py-2 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-lg text-[10px] font-bold uppercase hover:bg-[var(--accent)]/20 transition-colors flex items-center justify-center gap-2">
                              <Download size={12}/> Save Vel Config (JSON)
                          </button>
                          <button onClick={() => configImportRef.current?.click()} className="flex-1 py-2 bg-[var(--bg-header)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold uppercase hover:text-[var(--text-main)] transition-colors flex items-center justify-center gap-2">
                              <Upload size={12}/> Load Vel Config
                          </button>
                          <input type="file" ref={configImportRef} className="hidden" accept=".json" onChange={handleImportVelConfig} />
                      </div>
                  </div>
              )}
          </div>
      </section>

      <div className="w-full h-px bg-[var(--border-color)]"></div>

      {/* 3. VISUAL IDENTITY (Themes) */}
      <section>
          <div className="flex items-center gap-2 mb-6">
              <Palette size={16} className="text-[var(--accent)]"/>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Visual Identity</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {THEME_PRESETS.map(theme => {
                  const isSelected = settings.themeId === theme.id;
                  return (
                      <button
                          key={theme.id}
                          onClick={() => update('themeId', theme.id)}
                          className={`relative group rounded-xl overflow-hidden aspect-square transition-all duration-300 border
                          ${isSelected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 scale-105 z-10' : 'border-[var(--border-color)] hover:border-[var(--text-muted)] opacity-80 hover:opacity-100'}`}
                      >
                          {/* Minimalist Preview */}
                          <div className="absolute inset-0 flex flex-col">
                              <div className="flex-1" style={{ backgroundColor: theme.colors.bgMain }}></div>
                              <div className="h-1/3" style={{ backgroundColor: theme.colors.bgCard }}></div>
                          </div>
                          <div className="absolute inset-0 p-3 flex flex-col justify-between">
                               <div className="w-6 h-6 rounded-full shadow-lg border border-white/10" style={{ backgroundColor: theme.colors.accent }}></div>
                               <span className={`text-[10px] font-bold truncate ${theme.colors.bgCard === '#ffffff' ? 'text-black' : 'text-white'}`}>{theme.name}</span>
                          </div>
                      </button>
                  );
              })}
          </div>
      </section>

      {/* 4. TYPOGRAPHY (Global Font) */}
      <section>
          <div className="flex items-center gap-2 mb-6">
              <Type size={16} className="text-[var(--accent)]"/>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Interface Typography</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {APP_FONTS.map(font => {
                  const isSelected = settings.fontFamily === font.value;
                  return (
                      <button
                          key={font.name}
                          onClick={() => update('fontFamily', font.value)}
                          className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all
                          ${isSelected 
                              ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]' 
                              : 'border-transparent bg-[var(--bg-card)] hover:bg-[var(--bg-header)] text-[var(--text-muted)]'}`}
                      >
                          <span className="text-sm" style={{ fontFamily: font.value }}>{font.name.split('(')[0]}</span>
                          {isSelected && <CheckCircle size={14}/>}
                      </button>
                  );
              })}
          </div>
      </section>

      {/* 5. SYSTEM & AI */}
      <section>
          <div className="flex items-center gap-2 mb-6">
              <Cpu size={16} className="text-[var(--accent)]"/>
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">System & AI</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Google Drive Connection */}
              <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Cloud Sync</label>
                  <button 
                      onClick={onConnectDrive}
                      disabled={isDriveConnected}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-left relative overflow-hidden w-full
                      ${isDriveConnected 
                          ? 'bg-green-500/10 border-green-500 text-green-400 cursor-default' 
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)] text-[var(--text-main)] hover:text-[var(--accent)]'}`}
                  >
                      {isDriveConnected ? <CheckCircle size={16} /> : <Cloud size={16} />}
                      <span className="text-xs font-bold">{isDriveConnected ? "Drive Connected" : "Connect Google Drive"}</span>
                  </button>
              </div>

              {/* Image Model */}
              <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Image Engine</label>
                  <div className="flex gap-2">
                       <button
                          onClick={() => update('imageModel', MODEL_IMAGE_FLASH)}
                          className={`flex-1 p-3 rounded-xl border transition-all text-left relative overflow-hidden
                          ${settings.imageModel === MODEL_IMAGE_FLASH 
                              ? 'bg-[var(--accent)]/10 border-[var(--accent)]' 
                              : 'bg-[var(--bg-card)] border-[var(--border-color)]'}`}
                      >
                          <div className="flex items-center gap-2 mb-1">
                              <Zap size={14} className={settings.imageModel === MODEL_IMAGE_FLASH ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                              <span className="text-xs font-bold text-[var(--text-main)]">Nano Banana</span>
                          </div>
                      </button>

                      <button
                          onClick={() => update('imageModel', MODEL_IMAGE_PRO)}
                          className={`flex-1 p-3 rounded-xl border transition-all text-left relative overflow-hidden
                          ${settings.imageModel === MODEL_IMAGE_PRO 
                              ? 'bg-[var(--accent)]/10 border-[var(--accent)]' 
                              : 'bg-[var(--bg-card)] border-[var(--border-color)]'}`}
                      >
                           <div className="flex items-center gap-2 mb-1">
                              <Star size={14} className={settings.imageModel === MODEL_IMAGE_PRO ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                              <span className="text-xs font-bold text-[var(--text-main)]">Banana Pro</span>
                          </div>
                      </button>
                  </div>
              </div>

              {/* Chat Font Size */}
              <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                      <MessageSquare size={12}/> Chat Font Size ({settings.chatFontSize || 12}px)
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                      <span className="text-xs text-[var(--text-muted)]">A</span>
                      <input 
                          type="range" 
                          min="10" 
                          max="24" 
                          step="1"
                          value={settings.chatFontSize || 12} 
                          onChange={(e) => update('chatFontSize', parseInt(e.target.value))}
                          className="flex-1 accent-[var(--accent)]"
                      />
                      <span className="text-lg text-[var(--text-main)] font-bold">A</span>
                  </div>
              </div>
          </div>
      </section>

    </div>
  );
};
