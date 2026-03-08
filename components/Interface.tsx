import React, { useState } from 'react';
import { MapMode, ToolType } from '../types';
import { 
  Globe, 
  Map as MapIcon, 
  Paintbrush, 
  PlusSquare, 
  Castle, 
  Trash2, 
  Play, 
  Pause,
  RefreshCw,
  Mountain,
  Settings,
  MousePointer2,
  Circle,
  Compass,
  LogOut
} from 'lucide-react';

interface Props {
  mapMode: MapMode;
  setMapMode: (m: MapMode) => void;
  tool: ToolType;
  setTool: (t: ToolType) => void;
  isRunning: boolean;
  isMultiplayer: boolean;
  toggleRun: () => void;
  onGenerate: () => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
  isConnected?: boolean;
  canEdit?: boolean;
  onLeave: () => void;
}

export const Interface: React.FC<Props> = ({
  mapMode,
  setMapMode,
  tool,
  setTool,
  isRunning,
  isMultiplayer,
  toggleRun,
  onGenerate,
  brushSize,
  setBrushSize,
  isConnected = true,
  canEdit = true,
  onLeave,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  
  let tools = [
    { id: ToolType.Select, icon: MousePointer2, label: 'Select' },
    { id: ToolType.SpawnCountry, icon: PlusSquare, label: 'Spawn' },
    { id: ToolType.PlaceCity, icon: Castle, label: 'City' },
    { id: ToolType.BrushLand, icon: Paintbrush, label: 'Land' },
    { id: ToolType.BrushMountain, icon: Mountain, label: 'Mntn' },
    { id: ToolType.BrushSea, icon: Trash2, label: 'Sea' },
  ];

  if (!canEdit) {
      tools = tools.filter(t => t.id === ToolType.Select);
  }

  const mapModes = [
    { id: MapMode.World, icon: Globe, label: 'Procedural World' },
    { id: MapMode.Continents, icon: MapIcon, label: 'Continents' },
    { id: MapMode.TrueEarth, icon: Globe, label: 'True Earth (Full)' },
    { id: MapMode.Europe, icon: Compass, label: 'Europe' },
    { id: MapMode.Asia, icon: Compass, label: 'Asia' },
    { id: MapMode.Africa, icon: Compass, label: 'Africa' },
    { id: MapMode.NorthAmerica, icon: Compass, label: 'North America' },
    { id: MapMode.SouthAmerica, icon: Compass, label: 'South America' },
    { id: MapMode.Oceania, icon: Compass, label: 'Oceania' },
    { id: MapMode.Custom, icon: Paintbrush, label: 'Empty Grid' },
  ];

  const cycleBrushSize = () => {
    // Cycle 1 -> 3 -> 5 -> 8 -> 1
    const next = brushSize === 1 ? 3 : brushSize === 3 ? 5 : brushSize === 5 ? 8 : 1;
    setBrushSize(next);
  };

  const getBrushIconSize = () => {
      switch(brushSize) {
          case 3: return 'w-3 h-3';
          case 5: return 'w-4 h-4';
          case 8: return 'w-6 h-6';
          default: return 'w-1.5 h-1.5';
      }
  };

  return (
    <>
      {/* Top Left: Controls & Menu */}
      <div className="fixed top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-2 z-20">
            <div className="flex flex-wrap gap-2">
                <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-1.5 shadow-xl flex items-center gap-1">
                <button 
                    onClick={toggleRun}
                    disabled={isMultiplayer}
                    className={`p-3 sm:p-4 rounded-lg transition-all active:scale-95 ${isMultiplayer ? 'opacity-50 cursor-not-allowed' : ''} ${isRunning ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                    aria-label={isRunning ? "Pause" : "Play"}
                    title={isMultiplayer ? "Cannot pause in multiplayer" : (isRunning ? "Pause Simulation" : "Start Simulation")}
                >
                    {isRunning ? <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />}
                </button>
                
                <div className="h-10 sm:h-12 w-px bg-slate-700 mx-1"></div>

                <button 
                    onClick={onGenerate}
                    disabled={isMultiplayer}
                    className={`p-3 sm:p-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95 ${isMultiplayer ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isMultiplayer ? "Cannot regenerate map in multiplayer" : "Regenerate Map"}
                >
                    <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                </div>

                {/* Brush Size Toggle */}
                {(tool === ToolType.BrushLand || tool === ToolType.BrushMountain || tool === ToolType.BrushWater || tool === ToolType.PaintTerritory) && (
                    <button
                    onClick={cycleBrushSize}
                    className="p-3 sm:p-4 rounded-lg border shadow-xl transition-all active:scale-95 bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white flex flex-col items-center justify-center gap-1 min-w-[50px] sm:min-w-[60px]"
                    title="Cycle Brush Size"
                >
                    <div className="h-5 sm:h-6 flex items-center justify-center">
                        <Circle className={`${getBrushIconSize()} fill-current`} />
                    </div>
                    <span className="text-[9px] font-mono leading-none">{brushSize}x</span>
                </button>
                )}

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 sm:p-4 rounded-lg border shadow-xl transition-colors backdrop-blur-sm active:scale-95 ${showSettings ? 'bg-slate-800 border-indigo-500 text-indigo-400' : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white'}`}
                    title="Map Settings & Modes"
                >
                    <Settings className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>

                <button
                    onClick={onLeave}
                    className="p-3 sm:p-4 rounded-lg border shadow-xl transition-colors backdrop-blur-sm active:scale-95 bg-red-900/80 border-red-700 text-red-200 hover:bg-red-800 hover:text-white"
                    title="Leave Game"
                >
                    <LogOut className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
            </div>

        {/* Expandable Map Generator Menu */}
        {showSettings && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-2 sm:p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 max-h-[60vh] sm:max-h-[80vh] overflow-y-auto w-48 sm:w-64">
            <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 px-1 tracking-wider">Map Mode</div>
            <div className="flex flex-col gap-1">
                {mapModes.map(mode => (
                <button
                    key={mode.id}
                    disabled={isMultiplayer}
                    onClick={() => {
                        if (isMultiplayer) return;
                        setMapMode(mode.id);
                        setShowSettings(false);
                    }}
                    className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium transition-all active:scale-95 ${isMultiplayer ? 'opacity-50 cursor-not-allowed' : ''} ${mapMode === mode.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                    <mode.icon className="w-4 h-4" />
                    {mode.label}
                </button>
                ))}
            </div>
            </div>
        )}
      </div>

      {/* Top Right: Connection Status */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-full px-3 py-1.5 shadow-xl flex items-center gap-2 pointer-events-auto">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
          <span className={`text-[10px] sm:text-xs font-mono font-medium ${isConnected ? 'text-emerald-500' : 'text-red-400'}`}>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Bottom Center: Toolbox */}
      <div className="fixed bottom-4 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-20 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl px-1 py-1 sm:px-2 sm:py-2 shadow-2xl flex items-center justify-center pointer-events-auto overflow-x-auto">
           {tools.map(t => (
             <button
               key={t.id}
               onClick={() => setTool(t.id)}
               className={`flex flex-col items-center justify-center min-w-[3rem] sm:min-w-[3.5rem] h-12 sm:h-14 rounded-xl transition-all relative mx-0.5 active:scale-95 ${tool === t.id ? 'bg-indigo-600 text-white shadow-lg ring-1 ring-indigo-400/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
               title={t.label}
             >
               <t.icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 ${tool === t.id ? 'stroke-2' : 'stroke-1.5'}`} />
               <span className="text-[8px] sm:text-[9px] font-medium tracking-tight">{t.label}</span>
             </button>
           ))}
        </div>
      </div>
    </>
  );
};