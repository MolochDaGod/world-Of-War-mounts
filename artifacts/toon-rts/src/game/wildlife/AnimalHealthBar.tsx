import { Html } from '@react-three/drei';

interface AnimalHealthBarProps {
  health: number;
  maxHealth: number;
  yOffset?: number;
}

/**
 * AnimalHealthBar — small health bar rendered in world-space via Html.
 * Only visible when the animal has taken damage.
 */
export function AnimalHealthBar({ health, maxHealth, yOffset = 2.2 }: AnimalHealthBarProps) {
  if (health >= maxHealth) return null;

  const pct = Math.max(0, health / maxHealth);
  const barColor =
    pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#eab308' : '#ef4444';

  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={18}
      occlude={false}
    >
      <div className="w-12 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/20 pointer-events-none">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct * 100}%`, background: barColor }}
        />
      </div>
    </Html>
  );
}
