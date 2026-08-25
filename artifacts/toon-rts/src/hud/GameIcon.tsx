import {
  Axe,
  Bomb,
  Castle,
  Check,
  Circle,
  Coins,
  Cross,
  Crosshair,
  Crown,
  Gem,
  Ghost,
  Hammer,
  Landmark,
  Leaf,
  LucideIcon,
  Moon,
  Mountain,
  Move,
  Pause,
  Pickaxe,
  Play,
  Plus,
  Route,
  Shield,
  ShieldCheck,
  Skull,
  Snowflake,
  Sparkles,
  Store,
  Sun,
  Sword,
  Target,
  Tornado,
  TreePine,
  Utensils,
  WandSparkles,
  Wind,
  X,
  Zap,
} from 'lucide-react';

export type GameIconName =
  | 'axe' | 'bomb' | 'castle' | 'check' | 'circle' | 'coins' | 'cross'
  | 'crosshair' | 'crown' | 'gem' | 'ghost' | 'hammer' | 'landmark' | 'leaf'
  | 'moon' | 'mountain' | 'move' | 'pause' | 'pickaxe' | 'play' | 'plus'
  | 'route' | 'shield' | 'shieldCheck' | 'skull' | 'snowflake' | 'sparkles'
  | 'store' | 'sun' | 'sword' | 'target' | 'tornado' | 'tree' | 'utensils' | 'wand'
  | 'wind' | 'x' | 'zap';

const ICONS: Record<GameIconName, LucideIcon> = {
  axe: Axe,
  bomb: Bomb,
  castle: Castle,
  check: Check,
  circle: Circle,
  coins: Coins,
  cross: Cross,
  crosshair: Crosshair,
  crown: Crown,
  gem: Gem,
  ghost: Ghost,
  hammer: Hammer,
  landmark: Landmark,
  leaf: Leaf,
  moon: Moon,
  mountain: Mountain,
  move: Move,
  pause: Pause,
  pickaxe: Pickaxe,
  play: Play,
  plus: Plus,
  route: Route,
  shield: Shield,
  shieldCheck: ShieldCheck,
  skull: Skull,
  snowflake: Snowflake,
  sparkles: Sparkles,
  store: Store,
  sun: Sun,
  sword: Sword,
  target: Target,
  tornado: Tornado,
  tree: TreePine,
  utensils: Utensils,
  wand: WandSparkles,
  wind: Wind,
  x: X,
  zap: Zap,
};

export function GameIcon({
  name,
  size = 16,
  strokeWidth = 1.8,
  ...props
}: {
  name: GameIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = ICONS[name];
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
}

export const UNIT_TYPE_ICON: Record<string, GameIconName> = {
  infantry: 'sword',
  swordsmen: 'sword',
  spearmen: 'target',
  shieldwall: 'shield',
  archers: 'crosshair',
  skirmishers: 'wind',
  cavalry: 'move',
  heavyCavalry: 'zap',
  mage: 'wand',
  boltThrower: 'target',
  catapult: 'bomb',
  grieeGlee: 'mountain',
  skeletonWarrior: 'skull',
  meshyWarrior: 'sword',
};

export const ABILITY_ICON: Record<string, GameIconName> = {
  ice: 'snowflake',
  lightning: 'zap',
  meteor: 'mountain',
  fire: 'sparkles',
  wind: 'tornado',
  poison: 'skull',
  thunder: 'zap',
  flame_blast: 'sparkles',
  holy_totem: 'cross',
  shield_bash: 'shield',
  cavalry_charge: 'zap',
  natures_bounty: 'leaf',
  multi_shot: 'crosshair',
  wind_step: 'wind',
  life_drain: 'ghost',
  death_strike: 'skull',
  phase_shift: 'ghost',
  arcane_burst: 'wand',
  siege_barrage: 'bomb',
  shield_wall: 'shieldCheck',
  formation_lock: 'landmark',
  holy_flame: 'sparkles',
  arcane_barrier: 'wand',
};