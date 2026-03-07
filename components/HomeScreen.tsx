import React, { useState } from 'react';
import { Play, Globe, Map as MapIcon, Compass, Users, Plus, LogIn } from 'lucide-react';
import { MapMode } from '../types';

interface RoomSettings {
  botCount: number;
  maxPeople: number;
  unitCount: number;
  botDifficulty: 'Easy' | 'Impossible';
  playerName: string;
  map: 'Procedural' | 'True Earth' | 'Europe';
}

interface Props {
  onStart: (mode: MapMode, roomName?: string, settings?: RoomSettings) => void;
}

export const HomeScreen: React.FC<Props> = ({ onStart }) => {
  const [view, setView] = useState<'main' | 'join' | 'create'>('main');
  const [roomName, setRoomName] = useState('');
  const [settings, setSettings] = useState<RoomSettings>({
    botCount: 10,
    maxPeople: 4,
    unitCount: 100,
    botDifficulty: 'Easy',
    playerName: '',
    map: 'Procedural'
  });

  if (view === 'join') {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300 w-full max-w-sm px-4">
          <h2 className="text-3xl font-bold text-white">Join Room</h2>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter Room Name or ID"
            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={settings.playerName}
            onChange={(e) => setSettings({...settings, playerName: e.target.value})}
            placeholder="Your Name"
            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-4 w-full">
            <button onClick={() => setView('main')} className="flex-1 p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Back</button>
            <button onClick={() => roomName && settings.playerName && onStart(MapMode.Custom, roomName, settings)} className="flex-1 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">Join</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300 w-full max-w-2xl px-4">
          <h2 className="text-3xl font-bold text-white">Create Room</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="space-y-4">
              <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Room Name" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white" />
              <input type="text" value={settings.playerName} onChange={(e) => setSettings({...settings, playerName: e.target.value})} placeholder="Your Name" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white" />
              
              <select value={settings.map} onChange={(e) => setSettings({...settings, map: e.target.value as any})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white">
                <option value="Procedural">Procedural World</option>
                <option value="True Earth">True Earth</option>
                <option value="Europe">Europe</option>
              </select>
              
              <select value={settings.botDifficulty} onChange={(e) => setSettings({...settings, botDifficulty: e.target.value as any})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white">
                <option value="Easy">Easy</option>
                <option value="Impossible">Impossible</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-slate-400 text-sm w-full">Bot Count: {settings.botCount}</label>
              <input type="range" min="0" max="50" value={settings.botCount} onChange={(e) => setSettings({...settings, botCount: parseInt(e.target.value)})} className="w-full" />
              
              <label className="text-slate-400 text-sm w-full">Max People: {settings.maxPeople}</label>
              <input type="range" min="1" max="10" value={settings.maxPeople} onChange={(e) => setSettings({...settings, maxPeople: parseInt(e.target.value)})} className="w-full" />
              
              <label className="text-slate-400 text-sm w-full">Unit Count: {settings.unitCount}</label>
              <input type="range" min="10" max="500" step="10" value={settings.unitCount} onChange={(e) => setSettings({...settings, unitCount: parseInt(e.target.value)})} className="w-full" />
            </div>
          </div>

          <div className="flex gap-4 w-full mt-4">
            <button onClick={() => setView('main')} className="flex-1 p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl">Back</button>
            <button onClick={() => roomName && settings.playerName && onStart(MapMode.Custom, roomName, settings)} className="flex-1 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">Create</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 z-0"></div>
      
      <div className="z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300 tracking-tight">Ages of Conflict</h1>
          <p className="text-slate-400 text-lg font-light tracking-wide">World Simulation & God Game</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl px-4">
          <button onClick={() => onStart(MapMode.World)} className="group flex items-center gap-4 p-6 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all">
            <Globe className="w-8 h-8 text-indigo-400" />
            <div className="text-left"><h3 className="text-xl font-semibold text-slate-200">Procedural World</h3></div>
          </button>
          <button onClick={() => onStart(MapMode.TrueEarth)} className="group flex items-center gap-4 p-6 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all">
            <MapIcon className="w-8 h-8 text-emerald-400" />
            <div className="text-left"><h3 className="text-xl font-semibold text-slate-200">True Earth</h3></div>
          </button>
          <button onClick={() => setView('create')} className="group flex items-center gap-4 p-6 bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-500/30 rounded-xl transition-all md:col-span-2">
            <Plus className="w-8 h-8 text-indigo-400" />
            <div className="text-left"><h3 className="text-xl font-semibold text-slate-200">Create Multiplayer Room</h3></div>
          </button>
          <button onClick={() => setView('join')} className="group flex items-center gap-4 p-6 bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-500/30 rounded-xl transition-all md:col-span-2">
            <LogIn className="w-8 h-8 text-indigo-400" />
            <div className="text-left"><h3 className="text-xl font-semibold text-slate-200">Join Multiplayer Room</h3></div>
          </button>
        </div>
      </div>
    </div>
  );
};
