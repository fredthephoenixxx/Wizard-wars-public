import React, { useEffect, useState } from 'react';
import { Settings, Volume2, VolumeX, Music, Volume, X } from 'lucide-react';
import { sfx } from '../audio';
import { GAME_VERSION } from '../constants';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDevDrawer?: () => void;
}

export default function OptionsModal({ isOpen, onClose, onOpenDevDrawer }: OptionsModalProps) {
  const [musicVol, setMusicVol] = useState<number>(Math.round(sfx.musicVolume * 100));
  const [sfxVol, setSfxVol] = useState<number>(Math.round(sfx.sfxVolume * 100));
  const [musicMuted, setMusicMuted] = useState<boolean>(sfx.musicMuted);
  const [sfxMuted, setSfxMuted] = useState<boolean>(sfx.sfxMuted);

  useEffect(() => {
    if (isOpen) {
      sfx.handleUserInteraction();
    }
    const unsubscribe = sfx.subscribe(() => {
      setMusicVol(Math.round(sfx.musicVolume * 100));
      setSfxVol(Math.round(sfx.sfxVolume * 100));
      setMusicMuted(sfx.musicMuted);
      setSfxMuted(sfx.sfxMuted);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      sfx.playTick();
      onClose();
    }
  };

  const handleMusicSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setMusicVol(val);
    sfx.setMusicVolume(val / 100);
  };

  const handleSfxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSfxVol(val);
    sfx.setSfxVolume(val / 100);
    sfx.playTick();
  };

  const handleToggleMusicMute = () => {
    sfx.toggleMusicMute();
  };

  const handleToggleSfxMute = () => {
    sfx.toggleSfxMute();
    if (sfxMuted) {
      sfx.playTick();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        style={{
          maxHeight: '85vh',
          width: '90%',
          maxWidth: '500px',
          overflowY: 'auto',
          padding: '1.25rem',
          boxSizing: 'border-box',
          margin: 'auto',
        }}
        className="chiseled-stone rounded-2xl text-white shadow-2xl relative border-indigo-500/30 scrollbar-thin"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wider text-amber-300 font-serif uppercase">
                OPTIONS & AUDIO SETTINGS
              </h2>
              <p className="text-[11px] font-mono text-slate-400">Master Sound Controller {GAME_VERSION}</p>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playTick();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer flex-shrink-0"
            title="Close Options"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Sliders & Controls */}
        <div className="space-y-6">
          {/* MUSIC VOLUME BLOCK */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 text-sm font-extrabold font-mono">
                <Music className="w-4 h-4 text-purple-400" />
                <span>MUSIC VOLUME</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                  {musicMuted ? "MUTED" : `${musicVol}%`}
                </span>
                <button
                  onClick={handleToggleMusicMute}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    musicMuted
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-400 hover:bg-rose-900/80'
                      : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/80'
                  }`}
                  title={musicMuted ? "Unmute Music" : "Mute Music"}
                >
                  {musicMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={musicVol}
              onChange={handleMusicSliderChange}
              disabled={musicMuted}
              className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0%</span>
              <span>Track: {sfx.currentBgmTrack === 'battle' ? 'Iron Oath Clash' : 'Moon Sigil'}</span>
              <span>100%</span>
            </div>
          </div>

          {/* SFX VOLUME BLOCK */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-extrabold font-mono">
                <Volume className="w-4 h-4 text-emerald-400" />
                <span>SFX VOLUME</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                  {sfxMuted ? "MUTED" : `${sfxVol}%`}
                </span>
                <button
                  onClick={handleToggleSfxMute}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    sfxMuted
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-400 hover:bg-rose-900/80'
                      : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80'
                  }`}
                  title={sfxMuted ? "Unmute SFX" : "Mute SFX"}
                >
                  {sfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={sfxVol}
              onChange={handleSfxSliderChange}
              disabled={sfxMuted}
              className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0%</span>
              <span>Spell & Combat Effects</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {onOpenDevDrawer && (
            <button
              onClick={() => {
                onClose();
                onOpenDevDrawer();
              }}
              className="stone-dev-button text-xs font-mono px-3 py-2.5 rounded-xl flex items-center gap-1.5 text-indigo-300 border-indigo-500/30"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>SANDBOX DRAWER</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="btn-fantasy-violet px-6 py-2.5 rounded-xl text-xs tracking-wider text-white ml-auto cursor-pointer"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
