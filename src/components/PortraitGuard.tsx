import React from 'react';
import { RotateCw } from 'lucide-react';

export default function PortraitGuard() {
  return (
    <div
      id="portrait-guard"
      className="portrait:flex hidden fixed inset-0 bg-slate-950 z-[10000] flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-20 h-20 bg-indigo-950/40 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-3xl mb-4 animate-bounce">
        <RotateCw className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-wider mb-2">
        LANDSCAPE MODE REQUIRED
      </h2>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
        🧙‍♂️ Please rotate your screen horizontally to experience Wizard Wars' fullscreen combat lanes!
      </p>
    </div>
  );
}
