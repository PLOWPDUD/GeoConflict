import React, { useState } from 'react';
import { getRandomColor } from '../utils/random';
import { X, Check } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onConfirm: (name: string, color: string) => void;
  onCancel: () => void;
}

export const SpawnModal: React.FC<Props> = ({ x, y, onConfirm, onCancel }) => {
  const [name, setName] = useState(`Nation-${Math.floor(Math.random()*100)}`);
  const [color, setColor] = useState(getRandomColor());

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onConfirm(name, color);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">New Country</h3>
                <button onClick={onCancel} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                        <input 
                            type="color" 
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                        />
                        <button 
                            type="button" 
                            onClick={() => setColor(getRandomColor())}
                            className="text-xs bg-slate-800 px-3 py-2 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                            Randomize
                        </button>
                    </div>
                </div>

                <div className="pt-2 flex gap-2">
                    <button 
                        type="submit" 
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        <Check className="w-4 h-4" /> Spawn
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};