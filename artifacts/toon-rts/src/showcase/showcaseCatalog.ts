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
  | 'death';

export interface ShowcaseShot {
  id: ShowcaseShotId;
  label: string;
  state: 'idle' | 'move' | 'attack' | 'dead';
}

export interface ShowcaseSubject {
  id: string;
  name: string;
  faction: string;
  race: Race;
  kind: 'unit' | 'hero';
  icon?: string;
  unitType: UnitType;
  unit?: FactionUnit;
  commander?: CommanderDef;
  shots: ShowcaseShot[];
}

const STANDARD_SHOTS: ShowcaseShot[] = [
  { id: 'idle', label: 'Idle · 2 sec', state: 'idle' },
  { id: 'run', label: 'Run · 2 sec', state: 'move' },
  { id: 'attack1', label: 'Attack I · 2 sec', state: 'attack' },
  { id: 'attack2', label: 'Attack II · 2 sec', state: 'attack' },
  { id: 'death', label: 'Death · 2 sec', state: 'dead' },
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

function raceForUnit(faction: Faction, unit: FactionUnit): Race {
  return unit.race ?? FACTION_TO_RACE[faction];
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
    race: raceForUnit(faction, unit),
    kind: 'unit',
    icon: unit.icon,
    unitType: unit.type,
    unit,
    shots: STANDARD_SHOTS,
  })));

const heroSubjects = COMMANDER_DEFS.map((commander): ShowcaseSubject => ({
  id: `hero:${commander.id}`,
  name: commander.name,
  faction: commander.race,
  race: commander.race,
  kind: 'hero',
  icon: commander.avatarPath,
  unitType: commander.basedOnType,
  commander,
  shots: shotsForCommander(commander),
}));

export const SHOWCASE_SUBJECTS: ShowcaseSubject[] = [...unitSubjects, ...heroSubjects];

export function groupShowcaseSubjects(subjects = SHOWCASE_SUBJECTS) {
  return subjects.reduce<Record<string, ShowcaseSubject[]>>((groups, subject) => {
    (groups[subject.faction] ??= []).push(subject);
    return groups;
  }, {});
}