import { useEffect, useRef, useState } from 'react';
import { useWorldStore } from '@/game/store/worldStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

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
  const resources = useWorldStore(s => s.resources);
  const timeOfDay = useWorldStore(s => s.timeOfDay);
  const dayCount = useWorldStore(s => s.dayCount);

  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay % 1) * 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const isNight = timeOfDay < 6 || timeOfDay >= 20;

  const items = [
    { icon: '🪵', label: 'Wood',    value: resources.wood    },
    { icon: '🪙', label: 'Gold',    value: resources.gold    },
    { icon: '💎', label: 'Crystal', value: resources.crystal },
    { icon: '⛏️', label: 'Coal',    value: resources.coal    },
    { icon: '🍖', label: 'Food',    value: resources.food    },
  ];

  return (
    <div
      className="pointer-events-auto"
      style={{
        backgroundImage: `url('${GameUI.table2}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        height: '52px',
        minWidth: '600px',
        maxWidth: '820px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0px',
        padding: '0 36px',
        position: 'relative',
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 10px',
            borderRight: i < items.length - 1 ? '1px solid rgba(255,215,0,0.2)' : 'none',
          }}
        >
          <span style={{ fontSize: '15px', lineHeight: 1 }}>{item.icon}</span>
          <AnimatedValue value={item.value} />
        </div>
      ))}

      {/* Day/time divider */}
      <div
        style={{
          marginLeft: '12px',
          paddingLeft: '12px',
          borderLeft: '1px solid rgba(255,215,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#ffd700',
          fontSize: '13px',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          fontFamily: "'Cinzel', serif",
          whiteSpace: 'nowrap',
        }}
      >
        <span>{isNight ? '🌙' : '☀️'}</span>
        <span>Day {dayCount}</span>
        <span style={{ opacity: 0.7 }}>{timeStr}</span>
      </div>
    </div>
  );
}
