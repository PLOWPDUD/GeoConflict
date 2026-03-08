import React from 'react';
import { Country } from '../types';
import { X, Trash2, Paintbrush, ShieldCheck, Edit3 } from 'lucide-react';

interface Props {
  country?: Country;
  allCountries: Country[];
  onClose: () => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<Country>) => void;
  onPaintTerritory: (id: number) => void;
  onDeclareWar: (id1: number, id2: number) => void;
  onFormAlliance: (id1: number, id2: number) => void;
  isPainting: boolean;
  canEdit?: boolean;
}

export const CountryInspector: React.FC<Props> = ({ 
  country, 
  allCountries,
  onClose, 
  onDelete, 
  onUpdate,
  onPaintTerritory,
  onDeclareWar,
  onFormAlliance,
  isPainting,
  canEdit = true
}) => {
  if (!country) return null;
  return (
    <div className="absolute top-20 left-4 z-40 w-64 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl p-4 animate-in slide-in-from-left-4 fade-in duration-200">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                <div className="relative w-8 h-5 shadow-sm border border-white/10 overflow-hidden rounded-sm">
                    <img src={country.flag} alt="Flag" className="w-full h-full object-cover" />
                </div>
                <input 
                    type="text" 
                    value={country.name}
                    disabled={!canEdit}
                    onChange={(e) => onUpdate(country.id, { name: e.target.value })}
                    className={`bg-transparent border-b border-transparent outline-none text-sm font-bold text-white w-32 ${canEdit ? 'hover:border-slate-500 focus:border-indigo-500' : 'cursor-default'}`}
                />
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
            </button>
        </div>

        <div className="space-y-3">
             <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div className="bg-slate-800 p-2 rounded">
                    <div className="uppercase text-[10px] mb-0.5">Size</div>
                    <div className="text-white font-mono text-sm">{country.score}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="uppercase text-[10px] mb-0.5">Coins</div>
                    <div className="text-white font-mono text-sm">{country.coins}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="uppercase text-[10px] mb-0.5">Manpower</div>
                    <div className="text-white font-mono text-sm">{country.manpower}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="uppercase text-[10px] mb-0.5">Last War</div>
                    <div className="text-white font-mono text-sm">{country.lastWarTick}</div>
                </div>
             </div>
             
             <div className="border-t border-slate-700 my-2 pt-2">
                 <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Diplomacy</div>
                 <div className="space-y-1 max-h-32 overflow-y-auto">
                    {allCountries.filter(c => c.id !== country.id).map(other => (
                        <div key={other.id} className="flex items-center justify-between text-xs bg-slate-800 p-1.5 rounded">
                            <span className="text-white truncate w-16">{other.name}</span>
                            <div className="flex gap-1">
                                <button onClick={() => onDeclareWar(country.id, other.id)} className="text-red-400 hover:text-red-300">War</button>
                                <button onClick={() => onFormAlliance(country.id, other.id)} className="text-emerald-400 hover:text-emerald-300">Ally</button>
                            </div>
                        </div>
                    ))}
                 </div>
             </div>

             {canEdit && (
             <div className="border-t border-slate-700 my-2 pt-2">
                 <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">God Mode</div>
                 
                 <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => onPaintTerritory(country.id)}
                        className={`flex items-center gap-2 text-xs p-2 rounded transition-colors ${isPainting ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        {isPainting ? 'Painting Territory...' : 'Add Territory'}
                    </button>
                    
                     <div className="flex gap-2">
                         <div className="relative flex-1">
                             <input 
                                type="color" 
                                value={country.color}
                                onChange={(e) => onUpdate(country.id, { color: e.target.value })}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                             />
                             <button className="w-full flex items-center justify-center gap-2 text-xs bg-slate-800 text-slate-300 p-2 rounded hover:bg-slate-700">
                                <Edit3 className="w-4 h-4" /> Recolor
                             </button>
                         </div>
                         
                        <button 
                            onClick={() => onDelete(country.id)}
                            className="flex-1 flex items-center justify-center gap-2 text-xs bg-red-900/30 text-red-400 border border-red-900/50 p-2 rounded hover:bg-red-900/50"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                     </div>
                 </div>
             </div>
             )}
        </div>
    </div>
  );
};
