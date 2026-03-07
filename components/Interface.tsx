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
  Compass
} from 'lucide-react';

interface Props {
  mapMode: MapMode;
  setMapMode: (m: MapMode) => void;
  tool: ToolType;
  setTool: (t: ToolType) => void;
  isRunning: boolean;
  toggleRun: () => void;
  onGenerate: () => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
}

export const Interface: React.FC<Props> = ({
  mapMode,
  setMapMode,
  tool,
  setTool,
  isRunning,
  toggleRun,
  onGenerate,
  brushSize,
  setBrushSize,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  
  const tools = [
    { id: ToolType.Select, icon: MousePointer2, label: 'Select' },
    { id: ToolType.SpawnCountry, icon: PlusSquare, label: 'Spawn' },
    { id: ToolType.PlaceCity, icon: Castle, label: 'City' },
    { id: ToolType.BrushLand, icon: Paintbrush, label: 'Land' },
    { id: ToolType.BrushMountain, icon: Mountain, label: 'Mntn' },
    { id: ToolType.BrushSea, icon: Trash2, label: 'Sea' },
  ];

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
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            <div className="flex gap-2">
                <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-1.5 shadow-xl flex items-center gap-1">
                <button 
                    onClick={toggleRun}
                    className={`p-3 rounded-md transition-all active:scale-95 ${isRunning ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                    aria-label={isRunning ? "Pause" : "Play"}
                    title={isRunning ? "Pause Simulation" : "Start Simulation"}
                >
                    {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                </button>
                
                <div className="h-8 w-px bg-slate-700 mx-1"></div>

                <button 
                    onClick={onGenerate}
                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors active:scale-95"
                    title="Regenerate Map"
                >
                    <RefreshCw className="w-6 h-6" />
                </button>
                </div>

                {/* Brush Size Toggle */}
                {(tool === ToolType.BrushLand || tool === ToolType.BrushMountain || tool === ToolType.BrushWater || tool === ToolType.PaintTerritory) && (
                    <button
                    onClick={cycleBrushSize}
                    className="p-3 rounded-lg border shadow-xl transition-all active:scale-95 bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white flex flex-col items-center justify-center gap-0.5 min-w-[50px]"
                    title="Cycle Brush Size"
                >
                    <div className="h-5 flex items-center justify-center">
                        <Circle className={`${getBrushIconSize()} fill-current`} />
                    </div>
                    <span className="text-[9px] font-mono leading-none">{brushSize}x</span>
                </button>
                )}

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 rounded-lg border shadow-xl transition-colors backdrop-blur-sm active:scale-95 ${showSettings ? 'bg-slate-800 border-indigo-500 text-indigo-400' : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white'}`}
                    title="Map Settings & Modes"
                >
                    <Settings className="w-6 h-6" />
                </button>
            </div>

        {/* Expandable Map Generator Menu */}
        {showSettings && (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 max-h-[80vh] overflow-y-auto">
            <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 px-1 tracking-wider">Map Mode</div>
            <div className="flex flex-col gap-1">
                {mapModes.map(mode => (
                <button
                    key={mode.id}
                    onClick={() => {
                        setMapMode(mode.id);
                        setShowSettings(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-all active:scale-95 ${mapMode === mode.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                    <mode.icon className="w-4 h-4" />
                    {mode.label}
                </button>
                ))}
            </div>
            </div>
        )}
      </div>

      {/* Bottom Center: Toolbox */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl px-2 py-2 shadow-2xl flex items-center justify-center pointer-events-auto overflow-x-auto">
           {tools.map(t => (
             <button
               key={t.id}
               onClick={() => setTool(t.id)}
               className={`flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded-xl transition-all relative mx-0.5 active:scale-95 ${tool === t.id ? 'bg-indigo-600 text-white shadow-lg ring-1 ring-indigo-400/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
               title={t.label}
             >
               <t.icon className={`w-6 h-6 mb-0.5 ${tool === t.id ? 'stroke-2' : 'stroke-1.5'}`} />
               <span className="text-[9px] font-medium tracking-tight">{t.label}</span>
             </button>
           ))}
        </div>
      </div>
    </>
  );
};