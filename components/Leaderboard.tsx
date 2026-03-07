import React, { useState } from 'react';
import { Country } from '../types';
import { Trophy, Skull, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  countries: Country[];
}

export const Leaderboard: React.FC<Props> = ({ countries }) => {
  const [isOpen, setIsOpen] = useState(true);
  const sorted = [...countries].sort((a, b) => b.score - a.score);

  return (
    <div className={`absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl transition-all duration-300 z-30 ${isOpen ? 'w-64 max-h-[50vh]' : 'w-auto'}`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer text-slate-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {isOpen && <h2 className="font-bold text-sm uppercase tracking-wider">Leaderboard</h2>}
        </div>
        <button className="text-slate-400 hover:text-white">
           {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="px-4 pb-4 overflow-y-auto max-h-[calc(50vh-50px)] scrollbar-thin scrollbar-thumb-slate-700">
          <div className="space-y-2 border-t border-slate-700 pt-2">
            {sorted.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No countries yet.</p>
            ) : (
              sorted.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between text-xs group">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shadow-sm ring-1 ring-white/10" style={{ backgroundColor: c.color }} />
                    <span className={`${c.score === 0 ? 'text-slate-500 line-through' : 'text-slate-300'} font-medium truncate max-w-[120px]`}>
                        {c.name}
                    </span>
                    {c.isRebel && <Skull className="w-3 h-3 text-red-500" />}
                  </div>
                  <span className="font-mono text-slate-400">{c.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};