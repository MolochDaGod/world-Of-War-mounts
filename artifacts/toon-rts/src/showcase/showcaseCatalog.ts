import type { CommanderDef } from '@/game/data/CommanderDefs';
import { COMMANDER_DEFS } from '@/game/data/CommanderDefs';
import type { Faction, FactionUnit } from '@/game/data/FactionData';
import { FACTION_DISPLAY, FACTION_TO_RACE, FACTION_UNITS } from '@/game/data/FactionData';
import type { Race, UnitType } from '@/game/store/gameStore';

export type ShowcaseShotId =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack1'
  | 'attack2'
  | 'charge'
  | 'slam'
  | 'combo'
  | 'shoot'
  | 'throw'
  | 'death'
  | 'slash'
  | 'counter'
  | 'block'
  | 'hook';

export interface ShowcaseShot {
  id: ShowcaseShotId;
  label: string;
  state: 'idle' | 'move' | 'attack' | 'dead';
}

export interface ShowcaseProfile {
  cameraDistance: number;
  cameraHeight: number;
  targetHeight: number;
  plinthRadius: number;
}

export interface ShowcaseSubject {
  id: string;
  name: string;
  faction: string;
  alliance: string;
  race: Race;
  kind: 'unit' | 'hero';
  icon?: string;
  unitType: UnitType;
  unit?: FactionUnit;
  commander?: CommanderDef;
  shots: ShowcaseShot[];
  profile: ShowcaseProfile;
}

export const SHOWCASE_RACE_COLORS: Record<Race, string> = {
  WesternKingdoms: '#5ca8ff',
  Barbarians: '#f16b45',
  Elves: '#77d68e',
  Dwarves: '#e0a557',
  Orcs: '#83c95a',
  Undead: '#ca68d8',
};

const STANDARD_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Idle · 2 sec', state: 'idle' },
  { id: 'run', label: 'Run · 2 sec', state: 'move' },
  { id: 'attack1', label: 'Attack I · 2 sec', state: 'attack' },
  { id: 'attack2', label: 'Attack II · 2 sec', state: 'attack' },
  { id: 'death', label: 'Death · 2 sec', state: 'dead' },
];

const MAGE_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Channel · loop', state: 'idle' },
  { id: 'run', label: 'Advance · loop', state: 'move' },
  { id: 'attack1', label: 'Cast · 2 sec', state: 'attack' },
  { id: 'death', label: 'Fall · 2 sec', state: 'dead' },
];

const MOUNTED_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Combat idle · loop', state: 'idle' },
  { id: 'run', label: 'Charge · loop', state: 'move' },
  { id: 'attack1', label: 'Strike · 2 sec', state: 'attack' },
  { id: 'death', label: 'Fall · 2 sec', state: 'dead' },
];

const SIEGE_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Ready · loop', state: 'idle' },
  { id: 'attack1', label: 'Fire · 2 sec', state: 'attack' },
  { id: 'death', label: 'Destroyed · 2 sec', state: 'dead' },
];

const SPECIAL_GLB_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Idle · loop', state: 'idle' },
  { id: 'run', label: 'Run · loop', state: 'move' },
  { id: 'attack1', label: 'Attack · 2 sec', state: 'attack' },
  { id: 'death', label: 'Fall · 2 sec', state: 'dead' },
];

const MESHY_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Idle · loop', state: 'idle' },
  { id: 'walk', label: 'Walk · loop', state: 'move' },
  { id: 'run', label: 'Run · loop', state: 'move' },
  { id: 'slash', label: 'Slash · 2 sec', state: 'attack' },
  { id: 'counter', label: 'Counter · 2 sec', state: 'attack' },
  { id: 'block', label: 'Block · 2 sec', state: 'attack' },
  { id: 'hook', label: 'Hook · 2 sec', state: 'attack' },
];

const CAPTAIN_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Idle · 2 sec', state: 'idle' },
  { id: 'run', label: 'Run · 2 sec', state: 'move' },
  { id: 'attack1', label: 'Attack · 2 sec', state: 'attack' },
  { id: 'charge', label: 'Charge · 2 sec', state: 'attack' },
  { id: 'death', label: 'Death · 2 sec', state: 'dead' },
];

const PIRATE_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Idle · 2 sec', state: 'idle' },
  { id: 'walk', label: 'Walk · 2 sec', state: 'move' },
  { id: 'run', label: 'Run · 2 sec', state: 'move' },
  { id: 'combo', label: 'Combo · 2 sec', state: 'attack' },
  { id: 'charge', label: 'Charge · 2 sec', state: 'attack' },
  { id: 'shoot', label: 'Shoot · 2 sec', state: 'attack' },
  { id: 'throw', label: 'Throw · 2 sec', state: 'attack' },
];

const SCOURGE_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Idle · 2 sec', state: 'idle' },
  { id: 'run', label: 'Run · 2 sec', state: 'move' },
  { id: 'attack1', label: 'Attack · 2 sec', state: 'attack' },
  { id: 'slam', label: 'Slam · 2 sec', state: 'attack' },
  { id: 'death', label: 'Death · 2 sec', state: 'dead' },
];

const STATIC_HERO_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Hero pose · 2 sec', state: 'idle' },
];

const ALLIANCE_FOR_FACTION: Record<Faction, string> = {
  Crusade: 'Human Alliance',
  Barbarians: 'Human Alliance',
  Fabled: 'Elf-Dwarf Alliance',
  Dwarves: 'Elf-Dwarf Alliance',
  Legion: 'Orc-Undead Warhost',
  Orcs: 'Orc-Undead Warhost',
};

function raceForUnit(faction: Faction, unit: FactionUnit): Race {
  return unit.race ?? FACTION_TO_RACE[faction];
}

function profileForUnit(unit: FactionUnit): ShowcaseProfile {
  if (unit.type === 'grieeGlee') {
    return { cameraDistance: 16, cameraHeight: 5.5, targetHeight: 2.5, plinthRadius: 4.8 };
  }
  if (unit.category === 'siege') {
    return { cameraDistance: 15, cameraHeight: 5.2, targetHeight: 1.35, plinthRadius: 4.5 };
  }
  if (unit.category === 'mounted') {
    return { cameraDistance: 13.5, cameraHeight: 4.8, targetHeight: 2.1, plinthRadius: 4.1 };
  }
  if (unit.type === 'meshyWarrior') {
    return { cameraDistance: 10.5, cameraHeight: 4.5, targetHeight: 1.8, plinthRadius: 3.1 };
  }
  return { cameraDistance: 10.5, cameraHeight: 4.4, targetHeight: 1.55, plinthRadius: 3.1 };
}

function shotsForUnit(unit: FactionUnit): ShowcaseShot[] {
  if (unit.type === 'meshyWarrior') return MESHY_SHOTS;
  if (unit.type === 'skeletonWarrior' || unit.type === 'grieeGlee') return SPECIAL_GLB_SHOTS;
  if (unit.category === 'siege') return SIEGE_SHOTS;
  if (unit.category === 'mounted') return MOUNTED_SHOTS;
  if (unit.type === 'mage') return MAGE_SHOTS;
  return STANDARD_SHOTS;
}

function shotsForCommander(commander: CommanderDef): ShowcaseShot[] {
  switch (commander.heroComponentId) {
    case 'captain_john_wayne':
      return CAPTAIN_SHOTS;
    case 'pirate_king':
      return PIRATE_SHOTS;
    case 'scourge_faith_bearer':
      return SCOURGE_SHOTS;
    default:
      // Imported standalone hero meshes do not have a common external clip
      // catalog. Show only their reliable authored pose rather than advertising
      // battle clips they cannot play.
      return commander.heroModelPath ? STATIC_HERO_SHOTS : STANDARD_SHOTS;
  }
}

const unitSubjects = (Object.entries(FACTION_UNITS) as [Faction, FactionUnit[]][])
  .flatMap(([faction, units]) => units.map((unit, index): ShowcaseSubject => ({
    id: `unit:${faction}:${unit.type}:${index}`,
    name: unit.name,
    faction: FACTION_DISPLAY[faction],
    alliance: ALLIANCE_FOR_FACTION[faction],
    race: raceForUnit(faction, unit),
    kind: 'unit',
    icon: unit.icon,
    unitType: unit.type,
    unit,
    shots: shotsForUnit(unit),
    profile: profileForUnit(unit),
  })));

const heroSubjects = COMMANDER_DEFS.map((commander): ShowcaseSubject => ({
  id: `hero:${commander.id}`,
  name: commander.name,
  faction: commander.race,
  alliance: commander.race === 'WesternKingdoms' || commander.race === 'Barbarians'
    ? 'Human Alliance'
    : commander.race === 'Elves' || commander.race === 'Dwarves'
      ? 'Elf-Dwarf Alliance'
      : 'Orc-Undead Warhost',
  race: commander.race,
  kind: 'hero',
  icon: commander.avatarPath,
  unitType: commander.basedOnType,
  commander,
  shots: shotsForCommander(commander),
  profile: commander.heroComponentId === 'scourge_faith_bearer'
    ? { cameraDistance: 12.5, cameraHeight: 5.1, targetHeight: 2.1, plinthRadius: 3.8 }
    : { cameraDistance: 11, cameraHeight: 4.8, targetHeight: 1.75, plinthRadius: 3.2 },
}));

export const SHOWCASE_SUBJECTS: ShowcaseSubject[] = [...unitSubjects, ...heroSubjects];

export function groupShowcaseSubjects(subjects = SHOWCASE_SUBJECTS) {
  return subjects.reduce<Record<string, ShowcaseSubject[]>>((groups, subject) => {
    (groups[subject.faction] ??= []).push(subject);
    return groups;
  }, {});
}