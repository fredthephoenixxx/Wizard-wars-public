export interface Ability {
  type: "Block" | "Cleave" | "Heal" | "Toxic" | "Fireball" | "Dodge" | "Frostbolt" | "Regenerate" | "Lifesteal" | "Double Strike" | "Thorn" | "Paladin" | "Berserk" | "Union" | "Weaken" | "Rally" | "Taunt" | "Haste" | "Surprise Attack" | "Slow" | "Explode";
  value?: number;
  value2?: number;
}

export interface Card {
  id: string;
  name: string;
  costDelay: number;
  currentDelay: number;
  faction: string;
  attack: number;
  baseAttack?: number;
  hp: number;
  maxHp: number;
  baseMaxHp?: number;
  ability: Ability | null;
  abilities?: string[];
  dead: boolean;
  statuses: ("poison" | "burning" | "frozen")[];
  hasSurpriseAttackTriggered?: boolean;
  cardArtUrl?: string | null;
}

export interface CardTemplate {
  id: string;
  name: string;
  faction: string;
  cost: number;
  attack: number;
  health: number;
  maxHealth: number;
  ability: Ability | null;
  abilities?: string[];
  cardArtUrl?: string | null;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  deck: Card[];
  bench: (Card | null)[];
  active: (Card | null)[];
  graveyard: Card[];
}

export type GamePhase = 'TICK' | 'DRAW' | 'DEPLOY' | 'COMBAT' | 'CLEANUP';

export interface LayoutMetrics {
  w: number;
  h: number;
  cardW: number;
  cardH: number;
  profileW: number;
  profileH: number;
  profileX: number;
  deckW: number;
  deckH: number;
  deckX: number;
  p2BenchY: number;
  p2ActiveY: number;
  p1ActiveY: number;
  p1BenchY: number;
  benchStartX: number;
  benchSpacing: number;
  activeStartX: number;
  activeSpacing: number;
}

export interface VisualCoordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FactionInfo {
  name: string;
  color: string;
  text: string;
  glow: string;
  emoji: string;
  base: string;
}

export interface LogItem {
  text: string;
  colorClass: string;
  id: number;
}

