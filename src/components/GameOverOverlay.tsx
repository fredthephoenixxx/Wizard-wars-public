import React from 'react';
import { Skull } from 'lucide-react';

interface GameOverOverlayProps {
  winner: 'P1' | 'P2' | null;
  onRematch: () => void;
  onReturnToDeckSelection: () => void;
}

export default function GameOverOverlay({ winner, onRematch, onReturnToDeckSelection }: GameOverOverlayProps) {
  if (!winner) return null;

  return (
    <div
      id="gameover-overlay"
      className="absolute inset-0 bg-slate-950/95 rounded-2xl flex flex-col items-center justify-center text-center p-6 transition-all backdrop-blur-md z-40"
    >
      <div className="w-16 h-16 bg-rose-950/40 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-500 text-3xl mb-3 animate-bounce">
        <Skull className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400 mb-1">
        BATTLE RESOLVED
      </h3>
      <p id="gameover-winner" className="text-sm text-slate-300 font-semibold mb-5">
        {winner === 'P1' ? 'Wizard P1' : 'Opponent P2'} emerges Victorious!
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRematch}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/10 text-xs transition-all active:scale-95 cursor-pointer border border-indigo-400/20"
        >
          Rematch
        </button>
        <button
          onClick={onReturnToDeckSelection}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold py-2.5 px-6 rounded-xl border border-slate-800 hover:border-slate-700 active:scale-95 transition-all text-xs tracking-wider cursor-pointer font-mono"
        >
          Return to Deck Selection
        </button>
      </div>
    </div>
  );
}
