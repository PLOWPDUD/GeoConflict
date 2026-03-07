import React, { useEffect, useRef } from 'react';
import { WorldEvent } from '../types';
import { Scroll, Skull, Swords, Flag, AlertTriangle } from 'lucide-react';

interface Props {
  events: WorldEvent[];
}

export const EventLog: React.FC<Props> = ({ events }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when events change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getIcon = (type: WorldEvent['type']) => {
      switch(type) {
          case 'war': return <Swords className="w-3 h-3 text-red-500" />;
          case 'annex': return <Skull className="w-3 h-3 text-slate-400" />;
          case 'revolt': return <AlertTriangle className="w-3 h-3 text-orange-500" />;
          case 'spawn': return <Flag className="w-3 h-3 text-green-500" />;
          default: return <Scroll className="w-3 h-3 text-blue-500" />;
      }
  };

  return (
    <div className="absolute bottom-6 left-4 z-10 w-64 max-h-48 overflow-y-auto bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl pointer-events-auto scrollbar-thin scrollbar-thumb-slate-600">
        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2 sticky top-0 bg-slate-900/90 pb-1">World Events</h4>
        <div className="flex flex-col gap-1.5">
            {events.length === 0 && <span className="text-xs text-slate-600 italic">No events yet...</span>}
            {events.map(e => (
                <div key={e.id} className="flex gap-2 items-start text-xs animate-in slide-in-from-left-2 fade-in duration-300">
                    <span className="mt-0.5 shrink-0">{getIcon(e.type)}</span>
                    <span className="text-slate-300 leading-tight">{e.message}</span>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    </div>
  );
};