import { CardTemplate, FactionInfo } from "./types";

export const FACTIONS: Record<string, FactionInfo> = {
  // Color Identities
  RED: { name: 'Red', color: '#ef4444', text: '#ffffff', glow: '#f97316', emoji: '🔴', base: '#991b1b' },
  BLUE: { name: 'Blue', color: '#3b82f6', text: '#ffffff', glow: '#06b6d4', emoji: '🔵', base: '#1e40af' },
  YELLOW: { name: 'Yellow', color: '#eab308', text: '#1e293b', glow: '#fef08a', emoji: '🟡', base: '#854d0e' },
  GREEN: { name: 'Green', color: '#22c55e', text: '#ffffff', glow: '#4ade80', emoji: '🟢', base: '#166534' },
  WHITE: { name: 'White', color: '#f8fafc', text: '#0f172a', glow: '#fbbf24', emoji: '⚪', base: '#94a3b8' },
  BLACK: { name: 'Black', color: '#111827', text: '#f3f4f6', glow: '#c084fc', emoji: '⚫', base: '#312e81' },
  GREY: { name: 'Grey', color: '#64748b', text: '#ffffff', glow: '#cbd5e1', emoji: '🔘', base: '#334155' },

  // Backwards compatibility for old names
  FIRE: { name: 'Red', color: '#ef4444', text: '#ffffff', glow: '#f97316', emoji: '🔴', base: '#991b1b' },
  WATER: { name: 'Blue', color: '#3b82f6', text: '#ffffff', glow: '#06b6d4', emoji: '🔵', base: '#1e40af' },
  AIR: { name: 'Yellow', color: '#eab308', text: '#1e293b', glow: '#fef08a', emoji: '🟡', base: '#854d0e' },
  EARTH: { name: 'Green', color: '#22c55e', text: '#ffffff', glow: '#4ade80', emoji: '🟢', base: '#166534' },
  LIGHT: { name: 'White', color: '#f8fafc', text: '#0f172a', glow: '#fbbf24', emoji: '⚪', base: '#94a3b8' },
  DARK: { name: 'Black', color: '#111827', text: '#f3f4f6', glow: '#c084fc', emoji: '⚫', base: '#312e81' },
  NEUTRAL: { name: 'Grey', color: '#64748b', text: '#ffffff', glow: '#cbd5e1', emoji: '🔘', base: '#334155' }
};

export const CARD_TEMPLATES: CardTemplate[] = [
  // Red (Fire)
  { id: "fire_salamander", name: "Salamander", faction: "Red", cost: 2, attack: 3, health: 5, maxHealth: 5, ability: null, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/f_auto,q_auto/2807_is3e4r" },
  { id: "fire_pyromancer", name: "Pyromancer", faction: "Red", cost: 3, attack: 2, health: 5, maxHealth: 5, ability: { type: "Fireball", value: 1 }, cardArtUrl: null },
  { id: "red_war_drummer", name: "War Drummer", faction: "Red", cost: 3, attack: 0, health: 8, maxHealth: 8, ability: { type: "Rally", value: 1 }, cardArtUrl: null },

  // Blue (Water)
  { id: "water_mermaid", name: "Mermaid", faction: "Blue", cost: 1, attack: 1, health: 6, maxHealth: 6, ability: null, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/f_auto,q_auto/2808_awmoax" },
  { id: "water_cryomancer", name: "Cryomancer", faction: "Blue", cost: 4, attack: 1, health: 6, maxHealth: 6, ability: { type: "Frostbolt", value: 2 }, cardArtUrl: null },
  { id: "blue_giant_crab", name: "Giant Crab", faction: "Blue", cost: 4, attack: 2, health: 6, maxHealth: 6, ability: { type: "Block", value: 2 }, cardArtUrl: null },

  // Yellow (Air)
  { id: "air_eagle", name: "Eagle", faction: "Yellow", cost: 0, attack: 1, health: 3, maxHealth: 3, ability: null, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/f_auto,q_auto/2809_m5mngf" },
  { id: "air_harpy", name: "Harpy", faction: "Yellow", cost: 3, attack: 3, health: 5, maxHealth: 5, ability: { type: "Dodge", value: 2 }, cardArtUrl: null },
  { id: "yellow_expediter", name: "Expediter", faction: "Yellow", cost: 3, attack: 1, health: 6, maxHealth: 6, ability: { type: "Haste", value: 1 }, cardArtUrl: null },

  // Green (Earth)
  { id: "earth_mud_golem", name: "Mud Golem", faction: "Green", cost: 3, attack: 2, health: 10, maxHealth: 10, ability: null, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/v1784692918/1784692333523_m4xjoy.png" },
  { id: "earth_cobra", name: "Cobra", faction: "Green", cost: 2, attack: 1, health: 3, maxHealth: 3, ability: { type: "Toxic", value: 1 }, cardArtUrl: null },
  { id: "earth_cactus", name: "Cactus", faction: "Green", cost: 1, attack: 0, health: 5, maxHealth: 5, ability: { type: "Thorn", value: 1 }, cardArtUrl: null },
  { id: "green_vine_wall", name: "Vine Wall", faction: "Green", cost: 1, attack: 0, health: 5, maxHealth: 5, ability: null, abilities: ["Regenerate 1", "Taunt"], cardArtUrl: null },

  // White (Light)
  { id: "light_sprite", name: "Sprite", faction: "White", cost: 1, attack: 3, health: 3, maxHealth: 3, ability: null, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/v1784692943/1784692371129_csdbvy.png" },
  { id: "light_priest", name: "Priest", faction: "White", cost: 1, attack: 1, health: 5, maxHealth: 5, ability: { type: "Heal", value: 1 }, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/v1784693025/1784692718153_ns6cqj.png" },
  { id: "light_angel", name: "Angel", faction: "White", cost: 5, attack: 3, health: 10, maxHealth: 10, ability: { type: "Regenerate", value: 1 }, cardArtUrl: null },
  { id: "light_paladin", name: "Paladin", faction: "White", cost: 5, attack: 2, health: 8, maxHealth: 8, ability: { type: "Paladin", value: 1, value2: 1 }, cardArtUrl: null },
  { id: "white_castle_wall", name: "Castle Wall", faction: "White", cost: 2, attack: 0, health: 10, maxHealth: 10, ability: { type: "Taunt" }, cardArtUrl: null },

  // Black (Dark)
  { id: "dark_imp", name: "Imp", faction: "Black", cost: 0, attack: 2, health: 2, maxHealth: 2, ability: null, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/v1784693026/1784692427761_pczfdj.png" },
  { id: "dark_vampire", name: "Vampire", faction: "Black", cost: 4, attack: 2, health: 7, maxHealth: 7, ability: { type: "Lifesteal", value: 1 }, cardArtUrl: null },
  { id: "black_witch", name: "Witch", faction: "Black", cost: 2, attack: 1, health: 5, maxHealth: 5, ability: { type: "Weaken", value: 1 }, cardArtUrl: null },
  { id: "black_dark_slime", name: "Dark Slime", faction: "Black", cost: 1, attack: 1, health: 4, maxHealth: 4, ability: { type: "Slow", value: 1 }, cardArtUrl: null },

  // Grey (Neutral)
  { id: "neutral_squire", name: "Squire", faction: "Grey", cost: 1, attack: 2, health: 5, maxHealth: 5, ability: null, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/v1784692988/1784692534379_o7burx.png" },
  { id: "neutral_knight", name: "Knight", faction: "Grey", cost: 3, attack: 2, health: 8, maxHealth: 8, ability: { type: "Block", value: 1 }, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/v1784693017/1784692617981_rdmkng.png" },
  { id: "neutral_barbarian", name: "Barbarian", faction: "Grey", cost: 2, attack: 2, health: 5, maxHealth: 5, ability: { type: "Cleave" }, cardArtUrl: "https://res.cloudinary.com/zk5g8xpx/image/upload/v1784693016/1784692669378_vkleri.png" },
  { id: "neutral_rogue", name: "Rogue", faction: "Grey", cost: 3, attack: 2, health: 4, maxHealth: 4, ability: { type: "Double Strike" }, cardArtUrl: null },
  { id: "neutral_berserker", name: "Berserker", faction: "Grey", cost: 4, attack: 2, health: 8, maxHealth: 8, ability: { type: "Berserk", value: 1 }, cardArtUrl: null },
  { id: "grey_peasant", name: "Peasant", faction: "Grey", cost: 0, attack: 1, health: 1, maxHealth: 1, ability: { type: "Union", value: 1 }, cardArtUrl: null },
  { id: "grey_assassin", name: "Assassin", faction: "Grey", cost: 3, attack: 3, health: 3, maxHealth: 3, ability: { type: "Surprise Attack" }, cardArtUrl: null },
  { id: "grey_bomb", name: "Bomb", faction: "Grey", cost: 2, attack: 0, health: 5, maxHealth: 5, ability: { type: "Explode", value: 1 }, cardArtUrl: null }
];

export function getBaseStats(cardName: string) {
  const template = CARD_TEMPLATES.find(t => t.name.toLowerCase() === cardName.toLowerCase());
  return {
    baseAttack: template ? template.attack : 0,
    baseHealth: template ? template.health : 0,
    baseMaxHealth: template ? template.maxHealth : 0,
  };
}

export const GAME_VERSION = "v0.1.3c";

export interface ChangelogEntry {
  version: string;
  title: string;
  isCurrent?: boolean;
  notes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v0.1.3c",
    title: "Main Menu Options & Master Mute Hotfix",
    isCurrent: true,
    notes: [
      "Fixed Main Menu top-right Options button handler to properly render Audio Settings modal on the main menu screen.",
      "Upgraded in-battle HUD mute button to act as a Master Mute (silencing both BGM and SFX).",
      "Global versioning updated to v0.1.3c."
    ]
  },
  {
    version: "v0.1.3b",
    title: "Main Menu Options Integration Hotfix",
    notes: [
      "Removed redundant main menu options row button.",
      "Wired top-right Main Menu gear button directly to the Options modal state.",
      "Global versioning updated to v0.1.3b."
    ]
  },
  {
    version: "v0.1.3a",
    title: "Audio Engine Lifecycle & Modal Hotfix",
    notes: [
      "Resolved audio engine lifecycle bug preventing phantom menu music playback.",
      "Scaled Options modal for landscape viewports with backdrop tap-to-dismiss.",
      "Global versioning updated to v0.1.3a."
    ]
  },
  {
    version: "v0.1.3",
    title: "Audio Engine & Options Modal Release",
    notes: [
      "Dynamic BGM Engine: Integrated dual-track background music looping with 'Moon Sigil' (Menu) and 'Iron Oath Clash' (Battle).",
      "Audio & Options Settings Modal: Added Gear Icon (⚙️) modal with Music Volume (0-100%), SFX Volume (0-100%), and independent mute toggles.",
      "Card Header CSS Alignment: Normalized .card-header height to 22px and centered title typography across all asset renderings.",
      "Version & System Polish: Synchronized global version constants and changelog to v0.1.3."
    ]
  },
  {
    version: "v0.1.2a",
    title: "Hotfix Deploy",
    notes: [
      "Card Title Alignment Fix: Fixed card header text shifting bug on cards rendering custom image assets.",
      "Ingested Custom Card Artwork: Ingested custom card artwork for Mud Golem, Sprite, Imp, Squire, Knight, Barbarian, and Priest.",
      "Deck Fatigue Damage Rule: Added Deck Fatigue rule: attempting to draw from an empty deck now deals 1 direct damage to the player's wizard.",
      "Version Tracker Synchronization: Updated global version trackers to v0.1.2a."
    ]
  },
  {
    version: "v0.1.2",
    title: "The Custom Card Art Asset Release",
    notes: [
      "Custom Card Art Pipeline: Integrated Custom Card Art Asset Pipeline with dynamic image rendering and fallback orb support across Battlefield, Inspector, and Library Codex.",
      "Ingested Official Artwork: Ingested high-resolution official card artwork for Salamander (Red), Mermaid (Blue), and Eagle (Yellow).",
      "Version Synchronization: Global versioning bumped to v0.1.2 across all overlays and views."
    ]
  },
  {
    version: "v0.1.1",
    title: "The Chiseled Stone Update",
    notes: [
      "Chiseled Slate Aesthetic: Complete visual redesign featuring embossed slate frameworks, runic badges, and fantasy bevels.",
      "Interactive Card Inspector: In-battle card inspection with detailed abilities, stat badges, and flavor text.",
      "Portrait Guard Overlay: Responsive rotation lock overlay for mobile/portrait screen orientations."
    ]
  },
  {
    version: "v0.1.0",
    title: "Master Engine Launch",
    notes: [
      "Core TCG Combat Loop: Full turn-based card combat with 6 elemental factions, abilities, and automatic combat sequencing.",
      "Library & Codex: Interactive card reference database."
    ]
  }
];

