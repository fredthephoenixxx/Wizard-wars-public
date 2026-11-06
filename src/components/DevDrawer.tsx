import React, { useState, useEffect, useRef } from 'react';
import { Sliders, X, PlusSquare, Terminal, Trash2, RotateCcw, Play, Pause, FastForward, ShieldAlert } from 'lucide-react';
import { CARD_TEMPLATES } from '../constants';

interface LogItem {
  text: string;
  colorClass: string;
  id: number;
}

interface DevDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stepDelay: number;
  onStepDelayChange: (val: number) => void;
  onSpawnCard: (player: 'P1' | 'P2', zone: 'bench' | 'active', templateIdx: number) => void;
  logs: LogItem[];
  onClearLogs: () => void;
  onResetMatch: () => void;
  currentTurn: number;
  activePlayer: 'P1' | 'P2';
  phase: string;
  onStep: () => void;
  onToggleAutoplay: () => void;
  isAutoplayRunning: boolean;
  gameEnded: boolean;
}

export default function DevDrawer({
  isOpen,
  onClose,
  stepDelay,
  onStepDelayChange,
  onSpawnCard,
  logs,
  onClearLogs,
  onResetMatch,
  currentTurn,
  activePlayer,
  phase,
  onStep,
  onToggleAutoplay,
  isAutoplayRunning,
  gameEnded
}: DevDrawerProps) {
  const [spawnPlayer, setSpawnPlayer] = useState<'P1' | 'P2'>('P1');
  const [spawnZone, setSpawnZone] = useState<'bench' | 'active'>('bench');
  const [spawnTemplateIdx, setSpawnTemplateIdx] = useState<number>(0);
  const logBoxRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs to bottom when updated
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const handleSpawnClick = () => {
    onSpawnCard(spawnPlayer, spawnZone, spawnTemplateIdx);
  };

  return (
    <div
      id="dev-drawer"
      className="fixed top-0 right-0 h-full w-[360px] bg-slate-900/95 border-l border-indigo-950/60 shadow-2xl z-50 flex flex-col justify-between p-4 backdrop-blur-md transition-all"
    >
      {/* Drawer Header */}
      <div className="flex justify-between items-center border-b border-indigo-950/60 pb-3 mb-3 shrink-0">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-serif">
          <Sliders className="w-4 h-4 text-indigo-400" />
          Sandbox Inspector
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm transition-all p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable configuration components */}
      <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
        {/* Turn & Status tracker (Hiding from default screen as requested) */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-950 p-3.5 rounded-xl border border-indigo-900/40 flex flex-col gap-2.5">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">
            Active Turn State Tracker
          </div>
          <div className="flex justify-between items-center bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/80">
            <span className="text-xs font-bold text-slate-200 font-mono">
              Player {activePlayer} Turn {currentTurn}
            </span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-bold uppercase tracking-wider">
              {phase}
            </span>
          </div>

          {/* Inline Sandbox Simulation Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={onToggleAutoplay}
              disabled={gameEnded}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isAutoplayRunning
                  ? 'bg-amber-600/80 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAutoplayRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Autoplay
                </>
              )}
            </button>

            <button
              onClick={onStep}
              disabled={isAutoplayRunning || gameEnded}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/80 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FastForward className="w-3.5 h-3.5" /> Step Phase
            </button>
          </div>
        </div>

        {/* Speed Config Widget */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-950/40 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
            <span>Simulation Cycle Delay</span>
            <span className="text-indigo-400 font-mono">{(stepDelay / 1000).toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="300"
            max="1500"
            step="150"
            value={stepDelay}
            onChange={(e) => onStepDelayChange(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded"
          />
        </div>

        {/* Spawner Instrument */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-950/40 flex flex-col gap-2">
          <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <PlusSquare className="w-3.5 h-3.5 text-indigo-500" /> Spawner Tool
          </h4>
          <div className="flex flex-col gap-1.5 text-xs">
            <div>
              <label className="block text-[9px] text-slate-500 uppercase font-bold mb-0.5">
                Player Selection
              </label>
              <select
                value={spawnPlayer}
                onChange={(e) => setSpawnPlayer(e.target.value as 'P1' | 'P2')}
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-slate-200 outline-none"
              >
                <option value="P1">Player 1 (Wizard Bottom)</option>
                <option value="P2">Player 2 (Enemy Top)</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 uppercase font-bold mb-0.5">
                Target Lane Placement
              </label>
              <select
                value={spawnZone}
                onChange={(e) => setSpawnZone(e.target.value as 'bench' | 'active')}
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-slate-200 outline-none"
              >
                <option value="bench">Bench Hand Lane</option>
                <option value="active">Active Battle Lane</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 uppercase font-bold mb-0.5">
                Card Template Selection
              </label>
              <select
                value={spawnTemplateIdx}
                onChange={(e) => setSpawnTemplateIdx(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-slate-200 outline-none text-ellipsis overflow-hidden"
              >
                {CARD_TEMPLATES.map((c, idx) => {
                  const abilityDesc = c.ability
                    ? `${c.ability.type}${c.ability.value ? ' ' + c.ability.value : ''}`
                    : 'Vanilla';
                  return (
                    <option key={c.id} value={idx}>
                      {c.name} ({c.faction}) [Atk: {c.attack}, HP: {c.health}, Cost: {c.cost}, {abilityDesc}]
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <button
            onClick={handleSpawnClick}
            className="bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all mt-1 active:scale-95 cursor-pointer"
          >
            Inject Card into Available Space
          </button>
        </div>

        {/* Log Monitor Console */}
        <div className="flex-grow min-h-[180px] bg-slate-950/80 p-3 rounded-xl border border-indigo-950/40 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center border-b border-indigo-950/40 pb-1.5 mb-1.5 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Terminal className="w-3 h-3 text-indigo-500" /> Core State Math Logs
            </span>
            <button
              onClick={onClearLogs}
              className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>

          <div
            ref={logBoxRef}
            className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1.5 text-[10px] font-mono pr-1 select-text"
          >
            {logs.map((log) => (
              <p
                key={log.id}
                className={`leading-tight py-1 border-b border-indigo-950/25 ${log.colorClass}`}
              >
                {log.text}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Drawer Footer Controls */}
      <div className="mt-3 pt-3 border-t border-indigo-950/40 shrink-0 text-center flex flex-col gap-2">
        <button
          onClick={onResetMatch}
          className="bg-rose-950/40 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-rose-900/30 w-full py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset Match State
        </button>
        <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
          Wizard Wars Engine
        </span>
      </div>
    </div>
  );
}
