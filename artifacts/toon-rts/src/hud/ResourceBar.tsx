import { useEffect, useRef, useState } from 'react';
import { useWorldStore } from '@/game/store/worldStore';
import { GameIcon, GameIconName } from './GameIcon';

function AnimatedValue({ value }: { value: number }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [value]);

  return (
    <span
      style={{
        color: flash ? '#ffd700' : '#f0e8d5',
        textShadow: flash ? '0 0 8px #ffd700' : '0 1px 3px rgba(0,0,0,0.8)',
        transition: 'color 0.3s, text-shadow 0.3s',
        fontVariantNumeric: 'tabular-nums',
        minWidth: '3ch',
        display: 'inline-block',
        textAlign: 'right',
      }}
    >
      {Math.floor(value)}
    </span>
  );
}

export function ResourceBar() {
  // Subscribe only to resources — timeOfDay/dayCount are displayed in
  // OpenWorldHUD's TimeOfDay component and must NOT be subscribed here to
  // avoid 60fps re-renders cascading through the HUD layer.
  const resources = useWorldStore(s => s.resources);

  const items: { icon: GameIconName; label: string; value: number }[] = [
    { icon: 'tree',    label: 'Wood',    value: resources.wood    },
    { icon: 'coins',   label: 'Gold',    value: resources.gold    },
    { icon: 'gem',     label: 'Crystal', value: resources.crystal },
    { icon: 'pickaxe', label: 'Coal',    value: resources.coal    },
    { icon: 'utensils',label: 'Food',    value: resources.food    },
  ];

  return (
    <div
      className="pointer-events-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(8,13,25,0.94), rgba(18,27,45,0.88))',
        border: '1px solid rgba(255,215,0,0.22)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        minHeight: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        padding: '6px 8px',
        position: 'relative',
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '0 8px',
            borderRight: i < items.length - 1 ? '1px solid rgba(255,215,0,0.2)' : 'none',
          }}
        >
          <GameIcon name={item.icon} size={15} strokeWidth={2} />
          <span style={{
            color: 'rgba(240,232,213,0.58)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {item.label}
          </span>
          <AnimatedValue value={item.value} />
        </div>
      ))}
    </div>
  );
}
