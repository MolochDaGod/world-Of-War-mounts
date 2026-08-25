/**
 * GameLoadingScreen
 *
 * This is an explicit readiness gate, not a best-effort LoadingManager display.
 * It remains up until the selected map's required files have been fetched, and
 * reports a blocking error if a required asset cannot be loaded.
 */
import { useGameStore } from '@/game/store/gameStore';

export function GameLoadingScreen() {
  const phase = useGameStore(s => s.phase);
  const pct = useGameStore(s => s.preparationAssetProgress);
  const label = useGameStore(s => s.preparationAssetMessage);
  const error = useGameStore(s => s.preparationAssetError);
  const ready = useGameStore(s => s.preparationAssetsReady);
  const retry = useGameStore(s => s.retryPreparationAssetLoad);

  if (phase !== 'preparation' || ready) return null;

  return (
    <div
      aria-label="Loading game assets"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
       className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080c14]"
    >
      {/* ── Logo / title ── */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="relative">
          <span
            className="font-serif text-5xl font-bold tracking-widest select-none"
            style={{
              color: '#c8a45a',
              textShadow: '0 0 40px rgba(200,164,90,0.6), 0 0 80px rgba(200,164,90,0.3)',
            }}
          >
            RACE WARS
          </span>
          {/* Animated underline */}
          <div
            className="absolute -bottom-2 left-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
            style={{ width: `${pct}%`, transition: 'width 0.3s ease-out' }}
          />
        </div>
        <span className="text-gray-500 text-sm tracking-widest uppercase font-mono">
          Toon RTS
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-80 flex flex-col gap-3">
        <div className="relative h-2 rounded-full overflow-hidden bg-white/5 border border-white/10">
          {/* Track fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${pct}%`,
              transition: 'width 0.25s ease-out',
              background: 'linear-gradient(90deg, #78350f, #d97706, #fbbf24)',
              boxShadow: '0 0 12px rgba(251,191,36,0.6)',
            }}
          />
          {/* Shimmer */}
          <div
            className="absolute inset-y-0 w-16 rounded-full"
            style={{
              left: `${pct - 5}%`,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transition: 'left 0.25s ease-out',
            }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs font-mono truncate max-w-[220px]">{label}</span>
          <span className="text-amber-500 text-xs font-mono tabular-nums">{pct}%</span>
        </div>
      </div>

      {error ? (
        <div className="mt-7 w-96 max-w-[85vw] text-center">
          <p className="text-red-300 text-xs font-mono leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded border border-amber-400/50 bg-amber-500/15 px-5 py-2 text-xs font-semibold tracking-wider text-amber-200 hover:bg-amber-500/25"
          >
            RETRY LOADING MAP
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5 mt-8" aria-label="Loading">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-amber-600/60"
              style={{
                animation: 'pulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Tip ── */}
      <p className="absolute bottom-8 text-gray-600 text-xs font-mono tracking-wider">
        Loading the complete selected battlefield before deployment begins
      </p>
    </div>
  );
}
