import React, { useState } from 'react';
import { Card } from '../types';
import { FACTIONS, getBaseStats } from '../constants';
import { X, Shield, Swords, Heart, Clock, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';

interface CardInspectorModalProps {
  card: Card | null;
  ownerTag?: 'P1' | 'P2';
  onClose: () => void;
}

const KEYWORD_DESCRIPTIONS: Record<string, string> = {
  "Surprise Attack": "Deals triple damage on the card's very first attack phase, then reverts to base attack power.",
  "Taunt": "Forces enemy physical attacks to target this unit first before targeting other active cards.",
  "Toxic": "Applies Poison 1 to the attacked defender. Poison deals 1 damage to the target at the end of its turn segment.",
  "Toxic 1": "Applies Poison 1 to the attacked defender. Poison deals 1 damage to the target at the end of its turn segment.",
  "Thorn": "Deals 1 reflective damage back to any attacker that strikes this unit with a physical attack.",
  "Thorn 1": "Deals 1 reflective damage back to any attacker that strikes this unit with a physical attack.",
  "Block": "Reduces incoming physical attack damage taken by the specified amount.",
  "Block 1": "Reduces incoming physical attack damage taken by 1.",
  "Block 2": "Reduces incoming physical attack damage taken by 2.",
  "Cleave": "Sweeps physical attacks to also strike adjacent enemy active slots for full attack damage.",
  "Double Strike": "Strikes twice in succession during a single combat phase.",
  "Fireball": "Casts a fireball at a random active enemy, dealing damage and applying Burning.",
  "Fireball 1": "Casts a fireball at a random active enemy, dealing 1 damage and applying Burning.",
  "Frostbolt": "Shoots an ice bolt at a random active enemy, dealing damage with a 20% chance to Freeze.",
  "Frostbolt 2": "Shoots an ice bolt at a random active enemy, dealing 2 damage with a 20% chance to Freeze.",
  "Heal": "Channels healing magic to restore HP to the most damaged friendly active unit.",
  "Heal 1": "Channels healing magic to restore 1 HP to the most damaged friendly active unit.",
  "Lifesteal": "Restores HP to this unit when taking action during combat.",
  "Lifesteal 1": "Restores 1 HP to this unit when taking action during combat.",
  "Paladin": "Combines Block 1 and Heal 1 abilities, blocking incoming damage and healing wounded allies.",
  "Rally": "Beats war drums to grant permanent Attack Power to a random friendly active ally.",
  "Rally 1": "Beats war drums to grant +1 permanent Attack Power to a random friendly active ally.",
  "Haste": "Accelerates a random friendly benched unit, reducing its deployment delay timer by ticks.",
  "Haste 1": "Accelerates a random friendly benched unit, reducing its deployment delay timer by 1 tick.",
  "Slow": "Curses a random opponent benched unit, increasing its deployment delay timer by ticks.",
  "Slow 1": "Curses a random opponent benched unit, increasing its deployment delay timer by 1 tick.",
  "Regenerate": "Heals HP at the end of every turn segment if damaged.",
  "Regenerate 1": "Heals +1 HP at the end of every turn segment if damaged.",
  "Regen 1": "Heals +1 HP at the end of every turn segment if damaged.",
  "Dodge": "Has a chance to completely dodge incoming physical strikes.",
  "Dodge 2": "Has a 20% chance to completely dodge incoming physical strikes.",
  "Berserk": "Gains Attack Power permanently whenever this unit takes damage.",
  "Berserk 1": "Gains +1 Attack Power permanently whenever this unit takes damage.",
  "Union": "Increases Attack Power and max HP equal to the total number of friendly Peasants on the active field.",
  "Union 1": "Increases Attack Power and max HP equal to the total number of friendly Peasants on the active field.",
  "Weaken": "Permanently reduces the target's Attack Power upon landing a physical strike.",
  "Weaken 1": "Permanently reduces the target's Attack Power by 1 upon landing a physical strike.",
  "Explode": "Death Rattle: Upon perishing, explodes to deal damage to all enemy active units and the enemy player.",
  "Explode 1": "Death Rattle: Upon perishing, explodes to deal 1 damage to all enemy active units and the enemy player.",
  "Poison": "Suffer 1 damage at the end of the post-attack combat segment.",
  "Burning": "Suffer 1 fire damage at the end of every turn segment.",
  "Frozen": "Skips its next attack sequence due to ice entrapment."
};

export default function CardInspectorModal({ card, ownerTag, onClose }: CardInspectorModalProps) {
  const [activeTooltip, setActiveTooltip] = useState<{ title: string; text: string } | null>(null);

  if (!card) return null;

  const uppercaseFaction = card.faction.toUpperCase();
  const factionInfo = FACTIONS[uppercaseFaction] || FACTIONS.NEUTRAL;
  const baseStats = getBaseStats(card.name);
  const baseAtk = card.baseAttack ?? baseStats.baseAttack;
  const baseMaxHp = card.baseMaxHp ?? baseStats.baseMaxHealth;

  // ATK color logic
  let atkColorHex = "#ffffff";
  let atkBadge = null;
  if (card.attack > baseAtk) {
    atkColorHex = "#4ADE80"; // Bright Green
    atkBadge = (
      <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/40">
        +{card.attack - baseAtk} BUFFED
      </span>
    );
  } else if (card.attack < baseAtk) {
    atkColorHex = "#F87171"; // Soft Red
    atkBadge = (
      <span className="text-[10px] font-mono bg-rose-950/80 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/40">
        -{baseAtk - card.attack} DEBUFFED
      </span>
    );
  }

  // HP color logic
  let hpColorHex = "#ffffff";
  let hpBadge = null;
  if (card.hp < card.maxHp) {
    hpColorHex = "#F87171"; // Soft Red
    hpBadge = (
      <span className="text-[10px] font-mono bg-rose-950/80 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/40">
        DAMAGED
      </span>
    );
  } else if (card.hp > baseMaxHp || card.maxHp > baseMaxHp) {
    hpColorHex = "#4ADE80"; // Bright Green
    hpBadge = (
      <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/40">
        BUFFED
      </span>
    );
  }

  // Generate Ability Chips
  const chips: { label: string; key: string; description: string }[] = [];

  if (card.abilities && card.abilities.length > 0) {
    card.abilities.forEach(a => {
      const desc = KEYWORD_DESCRIPTIONS[a] || `Ability: ${a}`;
      chips.push({ label: a, key: a, description: desc });
    });
  } else if (card.ability) {
    if (card.ability.type === 'Paladin') {
      const v1 = card.ability.value ?? 1;
      const v2 = (card.ability as any).value2 ?? 1;
      chips.push({
        label: `Block ${v1}`,
        key: `Block ${v1}`,
        description: KEYWORD_DESCRIPTIONS[`Block ${v1}`] || KEYWORD_DESCRIPTIONS['Block']
      });
      chips.push({
        label: `Heal ${v2}`,
        key: `Heal ${v2}`,
        description: KEYWORD_DESCRIPTIONS[`Heal ${v2}`] || KEYWORD_DESCRIPTIONS['Heal']
      });
    } else {
      const type = card.ability.type;
      const val = card.ability.value;
      const label = val !== undefined ? `${type} ${val}` : type;
      const desc = KEYWORD_DESCRIPTIONS[label] || KEYWORD_DESCRIPTIONS[type] || `${type} ability mechanic.`;
      chips.push({ label, key: label, description: desc });
    }
  }

  // Statuses
  if (card.statuses) {
    card.statuses.forEach(s => {
      if (s === 'poison') {
        chips.push({
          label: 'Poison',
          key: 'Poison',
          description: KEYWORD_DESCRIPTIONS['Poison']
        });
      } else if (s === 'burning') {
        chips.push({
          label: 'Burning',
          key: 'Burning',
          description: KEYWORD_DESCRIPTIONS['Burning']
        });
      } else if (s === 'frozen') {
        chips.push({
          label: 'Frozen',
          key: 'Frozen',
          description: KEYWORD_DESCRIPTIONS['Frozen']
        });
      }
    });
  }

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none cursor-pointer"
      onClick={onClose}
    >
      {/* Main Inspector Modal */}
      <div 
        className="bg-slate-950 border-2 rounded-2xl shadow-2xl overflow-y-auto relative flex flex-col scrollbar-thin cursor-default"
        style={{ 
          maxHeight: '85vh',
          width: '90%',
          maxWidth: '480px',
          overflowY: 'auto',
          padding: '1rem',
          boxSizing: 'border-box',
          margin: 'auto',
          borderColor: factionInfo.color
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div 
          className="p-2.5 sm:p-3 rounded-xl flex items-center justify-between border-b border-slate-800 mb-2"
          style={{ background: `linear-gradient(to right, ${factionInfo.base}, #0f172a)` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">{factionInfo.emoji}</span>
            <div>
              <div className="card-header h-[24px] min-h-[24px] flex items-center gap-1.5">
                <h2 className="card-title text-base sm:text-lg font-black tracking-wide text-white font-serif flex items-center justify-center text-center">{card.name}</h2>
                {ownerTag && (
                  <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                    ownerTag === 'P1' ? 'bg-indigo-900/80 text-indigo-300 border border-indigo-500/30' : 'bg-rose-900/80 text-rose-300 border border-rose-500/30'
                  }`}>
                    {ownerTag}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs font-mono" style={{ color: factionInfo.color }}>
                {card.faction} Faction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-900/90 border border-amber-500/40 rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] sm:text-xs font-bold font-mono text-amber-300">
                Delay: {card.currentDelay}/{card.costDelay}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
              title="Close Inspector"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Card Portrait & Art Box */}
        <div className="p-2 sm:p-3 flex flex-col items-center justify-center bg-slate-900/50 relative border border-slate-800 rounded-xl mb-2">
          <div 
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl relative shadow-xl border border-amber-500/20 my-1 overflow-hidden"
            style={{ 
              background: `radial-gradient(circle, ${factionInfo.color}33 0%, #090d16 100%)`,
              boxShadow: `0 0 16px ${factionInfo.glow}22`
            }}
          >
            {card.cardArtUrl ? (
              <img 
                src={card.cardArtUrl} 
                alt={card.name} 
                className="w-full h-full object-cover rounded-xl block"
              />
            ) : (
              <span>{factionInfo.emoji}</span>
            )}

            {/* Status Pills */}
            {card.statuses && card.statuses.length > 0 && (
              <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                {card.statuses.includes('poison') && (
                  <span className="text-[8px] font-black font-mono bg-emerald-600 text-white px-1 py-0.2 rounded">POIS</span>
                )}
                {card.statuses.includes('burning') && (
                  <span className="text-[8px] font-black font-mono bg-orange-600 text-white px-1 py-0.2 rounded">BURN</span>
                )}
                {card.statuses.includes('frozen') && (
                  <span className="text-[8px] font-black font-mono bg-cyan-600 text-white px-1 py-0.2 rounded">FROZ</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Stat Color Engine Cards */}
        <div className="p-2 sm:p-2.5 grid grid-cols-2 gap-2 bg-slate-950/80 border border-slate-800 rounded-xl mb-2">
          {/* Attack Power */}
          <div className="bg-slate-900/90 rounded-xl p-2 sm:p-2.5 border border-slate-800 flex flex-col items-center justify-center relative">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 font-bold mb-0.5">
              <Swords className="w-3.5 h-3.5 text-rose-400" />
              <span>ATTACK POWER</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono" style={{ color: atkColorHex }}>
              {card.attack}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
              Base: {baseAtk}
            </div>
            {atkBadge && <div className="mt-0.5">{atkBadge}</div>}
          </div>

          {/* Health Points */}
          <div className="bg-slate-900/90 rounded-xl p-2 sm:p-2.5 border border-slate-800 flex flex-col items-center justify-center relative">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 font-bold mb-0.5">
              <Heart className="w-3.5 h-3.5 text-emerald-400" />
              <span>HEALTH</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono" style={{ color: hpColorHex }}>
              {card.hp} / {card.maxHp}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
              Base Max: {baseMaxHp}
            </div>
            {hpBadge && <div className="mt-0.5">{hpBadge}</div>}
          </div>
        </div>

        {/* Abilities & Interactive Keyword Tooltip Badges */}
        <div className="p-2.5 sm:p-3 flex-1 bg-slate-950 flex flex-col gap-1.5 border border-slate-800 rounded-xl mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-extrabold text-purple-300 tracking-wider uppercase font-mono">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Abilities & Keywords</span>
            </div>
            <span className="text-[9px] text-slate-500 italic">Tap chip for tooltip</span>
          </div>

          <div className="p-2 sm:p-2.5 bg-slate-900/80 rounded-xl border border-purple-500/20 min-h-[50px] flex flex-wrap items-center gap-1.5">
            {chips.length > 0 ? (
              chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTooltip({ title: chip.label, text: chip.description })}
                  className="bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white px-2.5 py-1 rounded-lg border border-purple-500/40 hover:border-purple-400 transition-all text-[11px] font-bold font-mono flex items-center gap-1 cursor-pointer shadow-md active:scale-95"
                >
                  <span>[{chip.label}]</span>
                  <HelpCircle className="w-3 h-3 text-purple-400" />
                </button>
              ))
            ) : (
              <p className="text-[11px] text-slate-500 italic">No special abilities (Vanilla Unit)</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-2.5 sm:p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2.5 px-4 rounded-xl transition-all text-xs tracking-wider cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <span>RESUME BATTLE</span>
          </button>
        </div>
      </div>

      {/* Floating Keyword Tooltip Modal Overlay */}
      {activeTooltip && (
        <div 
          className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setActiveTooltip(null)}
        >
          <div 
            className="max-w-xs w-full bg-slate-900 border border-purple-500/50 rounded-2xl p-5 shadow-2xl space-y-3 relative text-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-purple-900/60 border border-purple-400 flex items-center justify-center mx-auto text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-black text-purple-300 font-mono tracking-wider">
              [{activeTooltip.title}]
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {activeTooltip.text}
            </p>

            <button
              onClick={() => setActiveTooltip(null)}
              className="mt-2 w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
