/**
 * FactionData — three playable factions mapping to Toon_RTS races.
 *
 * Faction → Race:
 *   Crusade → WesternKingdoms  (WK_Catapult siege, WK_Cavalry)
 *   Fabled  → Elves            (ELF_BoltThrower siege, ELF_Cavalry)
 *   Legion  → Undead           (WK_Catapult borrowed, ORC_Cavalry borrowed)
 */
import { Race, UnitType } from '@/game/store/gameStore';
import { ModelCategory, ProjectileKind } from '@/game/data/UnitRoster';

export type Faction = 'Crusade' | 'Fabled' | 'Legion' | 'Barbarians' | 'Dwarves' | 'Orcs';

/** Faction display name for UI */
export const FACTION_DISPLAY: Record<Faction, string> = {
  Crusade:    'The Crusade',
  Fabled:     'The Fabled',
  Legion:     'The Legion',
  Barbarians: 'The Horde',
  Dwarves:    'The Iron Hold',
  Orcs:       'The Warband',
};

/** Map faction choice → internal Race used by the game engine */
export const FACTION_TO_RACE: Record<Faction, Race> = {
  Crusade:    'WesternKingdoms',
  Fabled:     'Elves',
  Legion:     'Undead',
  Barbarians: 'Barbarians',
  Dwarves:    'Dwarves',
  Orcs:       'Orcs',
};

/** Map Race back to Faction (for UI display) */
export const RACE_TO_FACTION: Partial<Record<Race, Faction>> = {
  WesternKingdoms: 'Crusade',
  Elves:           'Fabled',
  Undead:          'Legion',
  Barbarians:      'Barbarians',
  Dwarves:         'Dwarves',
  Orcs:            'Orcs',
};

// ── Faction visual identity ───────────────────────────────────────────────────
export interface FactionMeta {
  emblem:      string;   // image path
  overview:    string;   // race portrait path
  primaryColor: string;
  glowColor:   string;
  bgGradient:  string;
  lore:        string;
  traits:      string[];
}

export const FACTION_META: Record<Faction, FactionMeta> = {
  Crusade: {
    emblem:       '/assets/unit-icons/crusade-emblem.png',
    overview:     '/assets/unit-icons/human.png',
    primaryColor: '#4a9eff',
    glowColor:    'rgba(74,158,255,0.4)',
    bgGradient:   'linear-gradient(135deg,rgba(10,30,80,0.95) 0%,rgba(15,40,100,0.9) 100%)',
    lore: 'Noble knights and disciplined soldiers, forged in holy war. The Crusade fights beneath the silver cross, defending civilisation with steel discipline and faith.',
    traits: ['Heavy Armour', 'Disciplined Morale', 'Siege Power'],
  },
  Fabled: {
    emblem:       '/assets/unit-icons/fabled-emblem.png',
    overview:     '/assets/unit-icons/elf.png',
    primaryColor: '#3dcc6e',
    glowColor:    'rgba(61,204,110,0.4)',
    bgGradient:   'linear-gradient(135deg,rgba(5,30,15,0.95) 0%,rgba(10,45,25,0.9) 100%)',
    lore: 'Ancient masters of magic and the longbow. The Fabled move with uncanny speed, their bolt throwers pin whole formations at range while cavalry flank with lethal grace.',
    traits: ['Unmatched Accuracy', 'Swift Cavalry', 'Arcane Mastery'],
  },
  Legion: {
    emblem:       '/assets/unit-icons/legion-emblem.png',
    overview:     '/assets/unit-icons/undead.png',
    primaryColor: '#cc44cc',
    glowColor:    'rgba(180,60,180,0.4)',
    bgGradient:   'linear-gradient(135deg,rgba(20,5,30,0.97) 0%,rgba(35,10,45,0.93) 100%)',
    lore: 'The restless dead given terrible purpose. The Legion marches without fear, without fatigue — skeleton warriors hold the line while Death Knights shatter living formations.',
    traits: ['Fearless (No Morale)', 'Death Knight Cavalry', 'Necromantic Siege'],
  },
  Barbarians: {
    emblem:       '/assets/unit-icons/brb-emblem.png',
    overview:     '/assets/unit-icons/barbarian.png',
    primaryColor: '#e05030',
    glowColor:    'rgba(224,80,48,0.4)',
    bgGradient:   'linear-gradient(135deg,rgba(40,10,5,0.97) 0%,rgba(60,20,10,0.93) 100%)',
    lore: 'Fury made flesh. Barbarian hordes crash into enemy lines like a breaking wave — berserkers at the front, shamans screaming war-blessings from the rear.',
    traits: ['Berserker Charge', 'Shaman Buffs', 'Overwhelming Numbers'],
  },
  Dwarves: {
    emblem:       '/assets/unit-icons/dwf-emblem.png',
    overview:     '/assets/unit-icons/dwarf.png',
    primaryColor: '#c88840',
    glowColor:    'rgba(200,136,64,0.4)',
    bgGradient:   'linear-gradient(135deg,rgba(20,12,5,0.97) 0%,rgba(35,22,10,0.93) 100%)',
    lore: 'Stubborn as the mountains they carve from. Dwarven battle lines never retreat — hammerers and ironbreakers grind enemies to dust while grudge throwers obliterate anything at range.',
    traits: ['Unbreakable Morale', 'Runic Arsenal', 'Superior Siege'],
  },
  Orcs: {
    emblem:       '/assets/unit-icons/orc-emblem.png',
    overview:     '/assets/unit-icons/orc.png',
    primaryColor: '#6abf4b',
    glowColor:    'rgba(106,191,75,0.4)',
    bgGradient:   'linear-gradient(135deg,rgba(5,20,5,0.97) 0%,rgba(10,35,10,0.93) 100%)',
    lore: 'The Warband lives for the fight. Wolf riders harass the flanks while armoured raiders smash through the centre. Warlocks and bone hurlers ensure nothing escapes.',
    traits: ['Wolf Rider Flankers', 'Warlock Sorcery', 'Brute Strength'],
  },
};

// ── Faction unit definitions ──────────────────────────────────────────────────
export interface FactionUnit {
  type:         UnitType;
  name:         string;
  lore:         string;
  icon:         string;         // /assets/unit-icons/... path
  category:     'infantry' | 'mounted' | 'siege';
  modelCat:     ModelCategory;  // for ToonRTSManifest
  cost:         number;
  maxSoldiers:  number;
  isRanged:     boolean;
  projectile:   ProjectileKind;
  statAttack:   number;
  statDefense:  number;
  statSpeed:    number;
  statRange:    number;
}

export const FACTION_UNITS: Record<Faction, FactionUnit[]> = {
  // ── The Crusade ─────────────────────────────────────────────────────────────
  Crusade: [
    // Infantry
    { type: 'swordsmen',    name: 'Swordsmen',      category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/crusade_warrior.png',
      lore: 'Reliable backbone of any crusader army. Strong in melee at medium cost.',
      cost: 100, maxSoldiers: 16, isRanged: false, projectile: null,
      statAttack: 55, statDefense: 50, statSpeed: 50, statRange: 5 },
    { type: 'archers',      name: 'Crossbowmen',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/crusade_archer.png',
      lore: 'Steel-tipped bolts can pierce plate at close range. Decisive fire support.',
      cost: 150, maxSoldiers: 12, isRanged: true,  projectile: 'bolt',
      statAttack: 55, statDefense: 25, statSpeed: 40, statRange: 70 },
    { type: 'spearmen',     name: 'Pikemen',         category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/crusade_spear.png',
      lore: 'Long pikes punish cavalry charges and break enemy lines.',
      cost: 120, maxSoldiers: 16, isRanged: false, projectile: null,
      statAttack: 45, statDefense: 60, statSpeed: 45, statRange: 12 },
    { type: 'shieldwall',   name: 'Men-at-Arms',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/crusade_elite.png',
      lore: 'Heavily armoured wall. Slow but nearly unbreakable in defense.',
      cost: 200, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 35, statDefense: 90, statSpeed: 25, statRange: 5 },
    { type: 'mage',         name: 'Court Wizard',   category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/crusade_mage.png',
      lore: 'Arcane specialists casting devastating spells at range.',
      cost: 300, maxSoldiers: 6,  isRanged: true,  projectile: 'magic',
      statAttack: 85, statDefense: 20, statSpeed: 35, statRange: 55 },
    { type: 'skirmishers',  name: 'Mercenaries',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/crusade_warrior.png',
      lore: 'Hired blades — swift and unpredictable. Ideal for flanking.',
      cost: 100, maxSoldiers: 14, isRanged: false, projectile: null,
      statAttack: 50, statDefense: 30, statSpeed: 75, statRange: 5 },
    // Mounted
    { type: 'cavalry',      name: 'Mounted Knights', category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/crusade_cav.png',
      lore: 'Heavy cavalry that can shatter a flank with a single charge.',
      cost: 200, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 70, statDefense: 55, statSpeed: 85, statRange: 8 },
    { type: 'heavyCavalry', name: 'Royal Lancers',  category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/crusade_heavy_cav.png',
      lore: 'The finest lancers in the realm. Their charge breaks any formation.',
      cost: 350, maxSoldiers: 6,  isRanged: false, projectile: null,
      statAttack: 90, statDefense: 65, statSpeed: 75, statRange: 10 },
    { type: 'meshyWarrior',  name: 'Champion',       category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/crusade_warrior.png',
      lore: 'Veteran crusader champions — warriors of exceptional skill and unwavering faith. Elite in every measure.',
      cost: 250, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 72, statDefense: 58, statSpeed: 62, statRange: 6 },
    // Siege
    { type: 'catapult',     name: 'Trebuchet',      category: 'siege', modelCat: 'catapult',
      icon: '/assets/unit-icons/crusade_siege.png',
      lore: 'Massive stone-hurling engine. Obliterates enemy formations at extreme range.',
      cost: 400, maxSoldiers: 3,  isRanged: true,  projectile: 'stone',
      statAttack: 95, statDefense: 20, statSpeed: 10, statRange: 100 },
  ],

  // ── The Fabled ──────────────────────────────────────────────────────────────
  Fabled: [
    // Infantry
    { type: 'swordsmen',    name: 'Elven Guard',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/fabled_warrior.png',
      lore: 'Swift elven blades that strike twice before others react.',
      cost: 110, maxSoldiers: 16, isRanged: false, projectile: null,
      statAttack: 60, statDefense: 45, statSpeed: 60, statRange: 5 },
    { type: 'archers',      name: 'Forest Archers', category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/fabled_archer.png',
      lore: 'Volleys of arrows at unmatched range. Shred infantry before contact.',
      cost: 160, maxSoldiers: 12, isRanged: true,  projectile: 'arrow',
      statAttack: 60, statDefense: 25, statSpeed: 55, statRange: 80 },
    { type: 'spearmen',     name: 'Spear Elves',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/fabled_spear.png',
      lore: 'Long silver spears hold the line against cavalry and warbeasts.',
      cost: 120, maxSoldiers: 16, isRanged: false, projectile: null,
      statAttack: 50, statDefense: 60, statSpeed: 55, statRange: 12 },
    { type: 'shieldwall',   name: 'Shield Elves',   category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/fabled_elite.png',
      lore: 'Ornate shields deflect everything. The immovable anchor of elven battle lines.',
      cost: 200, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 30, statDefense: 85, statSpeed: 30, statRange: 5 },
    { type: 'mage',         name: 'High Mage',      category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/fabled_mage.png',
      lore: 'Masters of ancient arcane arts. Their spells devastate entire formations.',
      cost: 300, maxSoldiers: 6,  isRanged: true,  projectile: 'magic',
      statAttack: 90, statDefense: 15, statSpeed: 40, statRange: 65 },
    { type: 'skirmishers',  name: 'Windrunners',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/fabled_warrior.png',
      lore: 'Ghost-fast skirmishers. Strike and vanish before the enemy reacts.',
      cost: 100, maxSoldiers: 14, isRanged: false, projectile: null,
      statAttack: 50, statDefense: 25, statSpeed: 90, statRange: 5 },
    // Mounted
    { type: 'cavalry',      name: 'Forest Riders',  category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/fabled_cav.png',
      lore: 'Swift riders who outflank any foe before they can respond.',
      cost: 200, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 65, statDefense: 45, statSpeed: 95, statRange: 8 },
    { type: 'heavyCavalry', name: 'Elven Knights',  category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/fabled_heavy_cav.png',
      lore: 'Elite lancers in ornate barding. Graceful and utterly lethal in the charge.',
      cost: 350, maxSoldiers: 6,  isRanged: false, projectile: null,
      statAttack: 80, statDefense: 60, statSpeed: 85, statRange: 10 },
    { type: 'meshyWarrior',  name: 'Blade Dancer',   category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/fabled_elite.png',
      lore: 'Elven blade dancers — a whirlwind of silver steel. Fluid, unpredictable, and devastatingly swift.',
      cost: 250, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 72, statDefense: 58, statSpeed: 68, statRange: 6 },
    // Siege
    { type: 'boltThrower',  name: 'Bolt Thrower',   category: 'siege', modelCat: 'boltThrower',
      icon: '/assets/unit-icons/fabled_siege.png',
      lore: 'Precision siege weapon that pins formations at extreme range.',
      cost: 350, maxSoldiers: 2,  isRanged: true,  projectile: 'bolt',
      statAttack: 80, statDefense: 30, statSpeed: 15, statRange: 95 },
  ],

  // ── The Legion (Undead) ─────────────────────────────────────────────────────
  Legion: [
    // Infantry
    { type: 'swordsmen',    name: 'Skeleton Warriors', category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_warrior.png',
      lore: 'Reanimated blades with no fear of death. They simply rise again.',
      cost: 90,  maxSoldiers: 20, isRanged: false, projectile: null,
      statAttack: 60, statDefense: 45, statSpeed: 40, statRange: 5 },
    { type: 'archers',      name: 'Skeleton Archers',  category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_archer.png',
      lore: 'Never tire, never retreat. Their arrows darken the sky ceaselessly.',
      cost: 130, maxSoldiers: 14, isRanged: true,  projectile: 'arrow',
      statAttack: 55, statDefense: 20, statSpeed: 40, statRange: 70 },
    { type: 'spearmen',     name: 'Grave Guard',       category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_paladin.png',
      lore: 'Ancient warriors entombed with their spears. They hold lines forever.',
      cost: 120, maxSoldiers: 18, isRanged: false, projectile: null,
      statAttack: 50, statDefense: 60, statSpeed: 35, statRange: 12 },
    { type: 'shieldwall',   name: 'Tomb Guards',       category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_merc.png',
      lore: 'Armoured sentinels that have stood watch for centuries. Immovable.',
      cost: 200, maxSoldiers: 10, isRanged: false, projectile: null,
      statAttack: 35, statDefense: 90, statSpeed: 15, statRange: 5 },
    { type: 'mage',         name: 'Necromancers',      category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_mage.png',
      lore: 'Masters of dark sorcery. Their spells drain the life from the living.',
      cost: 300, maxSoldiers: 4,  isRanged: true,  projectile: 'magic',
      statAttack: 85, statDefense: 15, statSpeed: 30, statRange: 65 },
    { type: 'skirmishers',  name: 'Wraiths',           category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_warrior.png',
      lore: 'Spectral skirmishers that phase through terrain. Near-impossible to pin.',
      cost: 110, maxSoldiers: 12, isRanged: false, projectile: null,
      statAttack: 55, statDefense: 20, statSpeed: 85, statRange: 5 },
    // Mounted
    { type: 'cavalry',      name: 'Skeleton Cavalry',  category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/legion_cav.png',
      lore: 'Riders on undead steeds who strike terror into any living foe.',
      cost: 200, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 70, statDefense: 45, statSpeed: 75, statRange: 8 },
    { type: 'heavyCavalry', name: 'Death Knights',     category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/legion_heavy_cav.png',
      lore: 'The most feared warriors of the Legion. Their charge corrupts all it touches.',
      cost: 400, maxSoldiers: 5,  isRanged: false, projectile: null,
      statAttack: 95, statDefense: 65, statSpeed: 70, statRange: 10 },
    // Siege
    { type: 'catapult',     name: 'Bone Catapult',     category: 'siege', modelCat: 'catapult',
      icon: '/assets/unit-icons/legion_siege.png',
      lore: 'A siege engine built from bones and dark iron, hurling cursed projectiles.',
      cost: 400, maxSoldiers: 2,  isRanged: true,  projectile: 'stone',
      statAttack: 90, statDefense: 20, statSpeed: 10, statRange: 100 },
    { type: 'grieeGlee',    name: 'Griee & Glee',      category: 'siege', modelCat: 'catapult',
      icon: '/assets/unit-icons/legion_siege.png',
      lore: 'Massive stone-hurling orcs with invisible goblins lurking at their feet. Deadly in siege and in melee — costly, but they break lines.',
      cost: 500, maxSoldiers: 3,  isRanged: true,  projectile: 'stone',
      statAttack: 95, statDefense: 55, statSpeed: 30, statRange: 55 },
    { type: 'skeletonWarrior', name: 'Summoned Skeletons', category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_warrior.png',
      lore: 'Freshly summoned bone warriors — expendable and numerous. Not particularly skilled, but ten blades are ten blades.',
      cost: 60,  maxSoldiers: 10, isRanged: false, projectile: null,
      statAttack: 30, statDefense: 25, statSpeed: 55, statRange: 5 },
    { type: 'meshyWarrior',    name: 'Death Champion',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/undead_warrior.png',
      lore: 'Elite warriors bound to the Legion by dark pact. Fluid, unpredictable, devastating in close quarters.',
      cost: 250, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 72, statDefense: 58, statSpeed: 62, statRange: 6 },
  ],

  // ── The Horde (Barbarians) ───────────────────────────────────────────────────
  Barbarians: [
    // Infantry
    { type: 'swordsmen',   name: 'Berserkers',      category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/brb_warrior.png',
      lore: 'Wild-eyed fighters who ignore wounds and charge screaming into melee.',
      cost: 90,  maxSoldiers: 18, isRanged: false, projectile: null,
      statAttack: 70, statDefense: 30, statSpeed: 65, statRange: 5 },
    { type: 'archers',     name: 'Hunters',         category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/brb_archer.png',
      lore: 'Tribal hunters who learned marksmanship before they could walk.',
      cost: 130, maxSoldiers: 12, isRanged: true,  projectile: 'arrow',
      statAttack: 55, statDefense: 20, statSpeed: 60, statRange: 70 },
    { type: 'spearmen',    name: 'Spear Throwers',  category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/brb_spear.png',
      lore: 'Heavy throwing spears punch through shield and armour alike.',
      cost: 110, maxSoldiers: 16, isRanged: false, projectile: null,
      statAttack: 55, statDefense: 50, statSpeed: 55, statRange: 14 },
    { type: 'shieldwall',  name: 'Shield Bearers',  category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/brb_elite.png',
      lore: 'Hulking brutes who shrug off arrows and hold the line for their kin.',
      cost: 190, maxSoldiers: 10, isRanged: false, projectile: null,
      statAttack: 40, statDefense: 80, statSpeed: 30, statRange: 5 },
    { type: 'mage',        name: 'Shamans',         category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/brb_mage.png',
      lore: 'Spirit-speakers who call lightning from storm clouds and hurl cursed totems.',
      cost: 280, maxSoldiers: 5,  isRanged: true,  projectile: 'magic',
      statAttack: 80, statDefense: 18, statSpeed: 40, statRange: 60 },
    { type: 'skirmishers', name: 'Marauders',       category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/brb_warrior.png',
      lore: 'Fast raiders who strike out of nowhere and vanish before retaliation.',
      cost: 100, maxSoldiers: 14, isRanged: false, projectile: null,
      statAttack: 55, statDefense: 25, statSpeed: 80, statRange: 5 },
    // Mounted
    { type: 'cavalry',     name: 'Horse Warriors',  category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/brb_cav.png',
      lore: 'Plains riders who close the distance before the enemy can react.',
      cost: 190, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 68, statDefense: 40, statSpeed: 90, statRange: 8 },
    { type: 'heavyCavalry',name: 'Chaos Riders',    category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/brb_heavy_cav.png',
      lore: 'Massive warhorses ridden by the biggest, meanest fighters the tribe can produce.',
      cost: 340, maxSoldiers: 6,  isRanged: false, projectile: null,
      statAttack: 85, statDefense: 55, statSpeed: 78, statRange: 10 },
    // Siege
    { type: 'boltThrower', name: 'Bolt Casters',    category: 'siege', modelCat: 'boltThrower',
      icon: '/assets/unit-icons/brb_siege.png',
      lore: 'Crude but effective launchers that hurl oversized bolts at terrifying velocity.',
      cost: 320, maxSoldiers: 2,  isRanged: true,  projectile: 'bolt',
      statAttack: 75, statDefense: 25, statSpeed: 12, statRange: 88 },
    { type: 'catapult',    name: 'Battering Ram',   category: 'siege', modelCat: 'catapult',
      icon: '/assets/unit-icons/brb_siege.png',
      lore: 'Unstoppable ram crew who smash into enemy lines and keep pushing.',
      cost: 380, maxSoldiers: 3,  isRanged: true,  projectile: 'stone',
      statAttack: 90, statDefense: 30, statSpeed: 8, statRange: 80 },
  ],

  // ── The Iron Hold (Dwarves) ──────────────────────────────────────────────────
  Dwarves: [
    // Infantry
    { type: 'swordsmen',   name: 'Clan Warriors',   category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/dwf_warrior.png',
      lore: 'Veteran fighters who have drilled the same formation for fifty years.',
      cost: 110, maxSoldiers: 14, isRanged: false, projectile: null,
      statAttack: 58, statDefense: 60, statSpeed: 38, statRange: 5 },
    { type: 'archers',     name: 'Thunderers',      category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/dwf_archer.png',
      lore: 'Handgunners whose black-powder shot punches clean through plate.',
      cost: 160, maxSoldiers: 10, isRanged: true,  projectile: 'bolt',
      statAttack: 65, statDefense: 30, statSpeed: 35, statRange: 75 },
    { type: 'spearmen',    name: 'Miners',          category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/dwf_spear.png',
      lore: 'Pick-axes and mattocks make surprisingly effective weapons.',
      cost: 100, maxSoldiers: 16, isRanged: false, projectile: null,
      statAttack: 48, statDefense: 55, statSpeed: 40, statRange: 10 },
    { type: 'shieldwall',  name: 'Ironbreakers',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/dwf_elite.png',
      lore: 'The finest armour in the world, on the toughest people in the world.',
      cost: 220, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 38, statDefense: 95, statSpeed: 20, statRange: 5 },
    { type: 'mage',        name: 'Runemasters',     category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/dwf_mage.png',
      lore: 'Each rune they carve into the battlefield tears open elemental force.',
      cost: 290, maxSoldiers: 4,  isRanged: true,  projectile: 'magic',
      statAttack: 82, statDefense: 28, statSpeed: 28, statRange: 62 },
    { type: 'skirmishers', name: 'Hammerers',       category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/dwf_warrior.png',
      lore: 'Swift hammer-wielders who shatter enemy armour with precise strikes.',
      cost: 130, maxSoldiers: 12, isRanged: false, projectile: null,
      statAttack: 60, statDefense: 45, statSpeed: 52, statRange: 5 },
    // Mounted
    { type: 'cavalry',     name: 'Gyro Riders',     category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/dwf_cav.png',
      lore: 'Steam-powered gyrocopter mounts let dwarves keep pace with cavalry after all.',
      cost: 210, maxSoldiers: 6,  isRanged: false, projectile: null,
      statAttack: 62, statDefense: 52, statSpeed: 82, statRange: 8 },
    { type: 'heavyCavalry',name: 'Ironclad Cavalry', category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/dwf_heavy_cav.png',
      lore: 'War-ponies armoured like tanks. Slow but impossible to stop.',
      cost: 360, maxSoldiers: 5,  isRanged: false, projectile: null,
      statAttack: 88, statDefense: 75, statSpeed: 60, statRange: 10 },
    // Siege
    { type: 'catapult',    name: 'Grudge Thrower',  category: 'siege', modelCat: 'catapult',
      icon: '/assets/unit-icons/dwf_siege.png',
      lore: 'Every boulder hurled settles another ancient grudge. The book has many pages.',
      cost: 420, maxSoldiers: 3,  isRanged: true,  projectile: 'stone',
      statAttack: 92, statDefense: 25, statSpeed: 8, statRange: 100 },
    { type: 'boltThrower', name: 'Organ Gun',        category: 'siege', modelCat: 'boltThrower',
      icon: '/assets/unit-icons/dwf_siege.png',
      lore: 'Multiple barrels fire simultaneously, shredding infantry in a single salvo.',
      cost: 380, maxSoldiers: 2,  isRanged: true,  projectile: 'bolt',
      statAttack: 88, statDefense: 20, statSpeed: 10, statRange: 90 },
  ],

  // ── The Warband (Orcs) ───────────────────────────────────────────────────────
  Orcs: [
    // Infantry
    { type: 'swordsmen',   name: 'Orc Warriors',    category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/orc_warrior.png',
      lore: 'Big, angry, and happy about it. Orc warriors form the brutal backbone of the Warband.',
      cost: 95,  maxSoldiers: 18, isRanged: false, projectile: null,
      statAttack: 65, statDefense: 40, statSpeed: 55, statRange: 5 },
    { type: 'archers',     name: 'Troll Headhunters', category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/orc_archer.png',
      lore: 'Trolls lob severed heads with terrifying accuracy. The heads are not always empty.',
      cost: 140, maxSoldiers: 10, isRanged: true,  projectile: 'stone',
      statAttack: 58, statDefense: 30, statSpeed: 45, statRange: 65 },
    { type: 'spearmen',    name: 'Troll Peons',     category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/orc_spear.png',
      lore: 'Massive spear-carriers who can impale two men at once if they stand close enough.',
      cost: 120, maxSoldiers: 14, isRanged: false, projectile: null,
      statAttack: 52, statDefense: 58, statSpeed: 42, statRange: 14 },
    { type: 'shieldwall',  name: 'Shieldguard',     category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/orc_elite.png',
      lore: 'Towers of muscle hiding behind iron doors. They do not move.',
      cost: 200, maxSoldiers: 10, isRanged: false, projectile: null,
      statAttack: 38, statDefense: 88, statSpeed: 22, statRange: 5 },
    { type: 'mage',        name: 'Warlock Coven',   category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/orc_mage.png',
      lore: 'Dark shamans who weave curses and call vortexes of destructive energy.',
      cost: 310, maxSoldiers: 4,  isRanged: true,  projectile: 'magic',
      statAttack: 88, statDefense: 18, statSpeed: 38, statRange: 60 },
    { type: 'skirmishers', name: 'Orc Runners',     category: 'infantry', modelCat: 'infantry',
      icon: '/assets/unit-icons/orc_warrior.png',
      lore: 'Small but fast — scouting and flanking before the main mob arrives.',
      cost: 90,  maxSoldiers: 16, isRanged: false, projectile: null,
      statAttack: 48, statDefense: 22, statSpeed: 78, statRange: 5 },
    // Mounted
    { type: 'cavalry',     name: 'Wolf Riders',     category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/orc_cav.png',
      lore: 'Wargs bred for war — faster than horses, meaner than the riders on top.',
      cost: 200, maxSoldiers: 8,  isRanged: false, projectile: null,
      statAttack: 72, statDefense: 42, statSpeed: 92, statRange: 8 },
    { type: 'heavyCavalry',name: 'Armored Raiders', category: 'mounted', modelCat: 'cavalry',
      icon: '/assets/unit-icons/orc_heavy_cav.png',
      lore: 'Boar-riders in full war-plate. Their charge causes avalanches.',
      cost: 360, maxSoldiers: 6,  isRanged: false, projectile: null,
      statAttack: 92, statDefense: 60, statSpeed: 72, statRange: 10 },
    // Siege
    { type: 'grieeGlee',   name: 'Griee & Glee',    category: 'siege', modelCat: 'catapult',
      icon: '/assets/unit-icons/orc_siege.png',
      lore: 'Massive orc hurlers with invisible goblins lurking at their feet. Deadly at range and in melee.',
      cost: 500, maxSoldiers: 3,  isRanged: true,  projectile: 'stone',
      statAttack: 95, statDefense: 55, statSpeed: 30, statRange: 55 },
    { type: 'boltThrower', name: 'Bolt Hurlers',    category: 'siege', modelCat: 'boltThrower',
      icon: '/assets/unit-icons/orc_siege.png',
      lore: 'Giant repeating bolt launchers that can skewer whole files of infantry.',
      cost: 340, maxSoldiers: 2,  isRanged: true,  projectile: 'bolt',
      statAttack: 82, statDefense: 22, statSpeed: 12, statRange: 88 },
  ],
};
