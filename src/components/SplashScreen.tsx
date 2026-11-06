import React, { useState } from 'react';
import { Wand2, ChevronsRight } from 'lucide-react';
import { GAME_VERSION } from '../constants';
import { sfx } from '../audio';

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [fade, setFade] = useState(false);
  const [hidden, setHidden] = useState(false);

  const handleEnterClick = () => {
    sfx.handleUserInteraction();
    sfx.playTick();

    // Request fullscreen if possible (standard user gesture interaction)
    const docEl = document.documentElement;
    try {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else {
        // @ts-ignore
        if (docEl.webkitRequestFullscreen) {
          // @ts-ignore
          docEl.webkitRequestFullscreen();
          // @ts-ignore
        } else if (docEl.msRequestFullscreen) {
          // @ts-ignore
          docEl.msRequestFullscreen();
        }
      }
    } catch (err) {
      console.log("Fullscreen request was rejected or unsupported in context.");
    }

    setFade(true);
    setTimeout(() => {
      setHidden(true);
      onEnter();
    }, 500);
  };

  if (hidden) return null;

  return (
    <div
      id="splash-screen"
      className={`fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black transition-opacity duration-500 ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="mb-6 relative">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30 blur-lg animate-pulse"></div>
        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl relative">
          <Wand2 className="w-10 h-10 animate-pulse" />
        </div>
      </div>
      <h1 className="text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-400 to-pink-400 mb-2 font-serif">
        WIZARD WARS
      </h1>
      <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase mb-8">Master TCG Engine {GAME_VERSION}</p>

      <button
        onClick={handleEnterClick}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold px-10 py-4 rounded-2xl shadow-xl shadow-indigo-600/10 hover:shadow-indigo-500/20 active:scale-95 transition-all text-sm tracking-wider flex items-center gap-2 cursor-pointer"
      >
        <span>START</span>
        <ChevronsRight className="w-4 h-4" />
      </button>

      <div className="absolute bottom-4 right-4 text-xs font-mono text-indigo-400/50 select-none">
        {GAME_VERSION}
      </div>
    </div>
  );
}
