/**
 * BuildPanel — HUD panel for selecting and placing Kenney modular building pieces.
 *
 * Uses Kenney's RPG UI sprites for chrome and displays all BuildCatalog pieces
 * grouped by tab. Resource costs are checked against worldStore before enabling.
 *
 * Keyboard shortcuts:
 *   B      — toggle panel open/close
 *   R      — rotate ghost 90°
 *   Esc    — cancel build mode
 */
import { useState, useEffect } from 'react';
import { useBuildStore } from '@/game/store/buildStore';
import { useWorldStore } from '@/game/store/worldStore';
import { BUILD_CATALOG, BUILD_TABS, type BuildPiece, type BuildTab } from '@/game/building/BuildCatalog';
import { KenneyUI } from '@/game/building/KenneyManifest';

// ── Cost label ────────────────────────────────────────────────────────────────
function CostBadge({ piece }: { piece: BuildPiece }) {
  const resources = useWorldStore((s) => s.resources);
  const parts: string[] = [];
  const { cost } = piece;
  const canAfford = (
    (cost.wood    === undefined || resources.wood    >= cost.wood)    &&
    (cost.gold    === undefined || resources.gold    >= cost.gold)    &&
    (cost.crystal === undefined || resources.crystal >= cost.crystal) &&
    (cost.coal    === undefined || resources.coal    >= cost.coal)
  );

  if (cost.wood)    parts.push(`🪵${cost.wood}`);
  if (cost.gold)    parts.push(`🪙${cost.gold}`);
  if (cost.crystal) parts.push(`💎${cost.crystal}`);
  if (cost.coal)    parts.push(`⛏️${cost.coal}`);

  return (
    <span style={{
      fontSize: '9px',
      color: canAfford ? '#d4af37' : '#e57373',
      whiteSpace: 'nowrap',
      lineHeight: 1,
    }}>
      {parts.join(' ')}
    </span>
  );
}

// ── Single piece button ───────────────────────────────────────────────────────
function PieceButton({
  piece,
  selected,
  onSelect,
}: {
  piece: BuildPiece;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={piece.label}
      style={{
        width: '60px',
        height: '64px',
        backgroundImage: `url('${selected ? KenneyUI.btnBlue : KenneyUI.btnBeige}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        padding: '4px',
        transition: 'transform 0.08s',
        outline: selected ? '2px solid #66aaff' : 'none',
        borderRadius: '4px',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
      onMouseUp={(e)   => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>{piece.icon}</span>
      <span style={{
        fontSize: '8px',
        fontFamily: "'Cinzel', serif",
        color: selected ? '#fff' : '#3b2b1a',
        fontWeight: 700,
        lineHeight: 1.1,
        textAlign: 'center',
        maxWidth: '52px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {piece.label}
      </span>
      <CostBadge piece={piece} />
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function BuildPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { active, selectedId, rotation, activeTab, selectPiece, deactivate, rotateGhost, setTab } = useBuildStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && active) { e.preventDefault(); rotateGhost(); }
      if (e.key === 'Escape') { deactivate(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, rotateGhost, deactivate, onClose]);

  if (!open) return null;

  const tabPieces = BUILD_CATALOG.filter((p) => p.tab === activeTab);
  const displayPiece = BUILD_CATALOG.find((p) => p.id === (hoveredId ?? selectedId));

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: 'fixed',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        userSelect: 'none',
      }}
    >
      {/* ── Panel chrome ── */}
      <div
        style={{
          backgroundImage: `url('${KenneyUI.panelBrown}')`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          width: '220px',
          padding: '10px 8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '13px',
            fontWeight: 700,
            color: '#ffd700',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          }}>
            🏗 Build Mode
          </span>
          <button
            onClick={() => { deactivate(); onClose(); }}
            style={{
              width: '22px', height: '22px',
              backgroundImage: `url('${KenneyUI.btnBeige}')`,
              backgroundSize: '100% 100%',
              border: 'none', cursor: 'pointer',
              color: '#5b3a1c', fontWeight: 700, fontSize: '11px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {BUILD_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id as BuildTab)}
              style={{
                flex: '1 0 44px',
                height: '28px',
                backgroundImage: `url('${activeTab === tab.id ? KenneyUI.btnBlue : KenneyUI.btnBeige}')`,
                backgroundSize: '100% 100%',
                border: 'none', cursor: 'pointer',
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                fontWeight: 700,
                color: activeTab === tab.id ? '#fff' : '#3b2b1a',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Piece grid */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          maxHeight: '280px',
          overflowY: 'auto',
          padding: '2px',
        }}>
          {tabPieces.map((piece) => (
            <div
              key={piece.id}
              onMouseEnter={() => setHoveredId(piece.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <PieceButton
                piece={piece}
                selected={selectedId === piece.id}
                onSelect={() => selectPiece(piece.id)}
              />
            </div>
          ))}
        </div>

        {/* Selected/hovered piece info */}
        {displayPiece && (
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '6px',
            padding: '6px 8px',
            border: '1px solid rgba(255,215,0,0.2)',
          }}>
            <div style={{ color: '#ffd700', fontFamily: "'Cinzel', serif", fontSize: '11px', fontWeight: 700 }}>
              {displayPiece.icon} {displayPiece.label}
            </div>
            <div style={{ color: '#ccc', fontSize: '10px', marginTop: '2px' }}>
              HP: {displayPiece.health} · Grid: {displayPiece.snapSize}u
            </div>
            <CostBadge piece={displayPiece} />
          </div>
        )}

        {/* Controls footer */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={rotateGhost}
            disabled={!active}
            style={{
              flex: 1,
              height: '28px',
              backgroundImage: `url('${KenneyUI.btnBrown}')`,
              backgroundSize: '100% 100%',
              border: 'none', cursor: active ? 'pointer' : 'not-allowed',
              color: '#ffd700', fontSize: '11px',
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              opacity: active ? 1 : 0.5,
            }}
          >
            ↻ Rotate ({(rotation * 90)}°)
          </button>
          <button
            onClick={() => { deactivate(); onClose(); }}
            style={{
              width: '40px',
              height: '28px',
              backgroundImage: `url('${KenneyUI.btnBeige}')`,
              backgroundSize: '100% 100%',
              border: 'none', cursor: 'pointer',
              color: '#5b3a1c', fontSize: '10px',
            }}
          >
            [Esc]
          </button>
        </div>

        {/* Build mode status */}
        {active && selectedId && (
          <div style={{
            background: 'rgba(68,170,255,0.15)',
            border: '1px solid rgba(68,170,255,0.4)',
            borderRadius: '4px',
            padding: '4px 6px',
            color: '#88ccff',
            fontSize: '10px',
            fontFamily: "'Cinzel', serif",
            textAlign: 'center',
          }}>
            Click world to place · R = rotate · Esc = cancel
          </div>
        )}
      </div>
    </div>
  );
}
