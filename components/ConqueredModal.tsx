import React from 'react';

interface Props {
  onLeave: () => void;
  onWatch: () => void;
}

export const ConqueredModal: React.FC<Props> = ({ onLeave, onWatch }) => {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <h2 className="text-3xl font-bold text-white mb-4">You have been conquered!</h2>
        <p className="text-slate-400 mb-8">Your empire has fallen. What would you like to do?</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={onWatch}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
          >
            Watch
          </button>
          <button 
            onClick={onLeave}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};
