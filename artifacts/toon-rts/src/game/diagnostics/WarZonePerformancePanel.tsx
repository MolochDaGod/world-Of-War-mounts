import { useEffect, useState } from 'react';
import {
  getWarZonePerformanceDiagnostics,
  resetWarZonePerformanceDiagnostics,
  WAR_ZONE_PERFORMANCE_BUDGET,
  type WarZonePerformanceSnapshot,
} from './warZonePerformanceDiagnostics';

function formatMs(value: number): string {
  return `${value.toFixed(value < 10 ? 2 : 1)} ms`;
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded bg-slate-900/80 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={warning ? 'font-semibold text-amber-300' : 'font-semibold text-emerald-300'}>
        {value}
      </div>
    </div>
  );
}

function Metrics({ snapshot }: { snapshot: WarZonePerformanceSnapshot }) {
  const budget = WAR_ZONE_PERFORMANCE_BUDGET;
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Metric
        label="Frame p95"
        value={formatMs(snapshot.p95FrameTimeMs)}
        warning={snapshot.p95FrameTimeMs > budget.maxP95FrameTimeMs}
      />
      <Metric label="Frame max" value={formatMs(snapshot.maxFrameTimeMs)} />
      <Metric label="Draw calls" value={String(snapshot.drawCalls)} />
      <Metric label="Triangles" value={snapshot.triangles.toLocaleString()} />
      <Metric
        label="Geometry growth"
        value={`${snapshot.geometryGrowth >= 0 ? '+' : ''}${snapshot.geometryGrowth}`}
        warning={snapshot.geometryGrowth > budget.maxGeometryGrowth}
      />
      <Metric
        label="Texture growth"
        value={`${snapshot.textureGrowth >= 0 ? '+' : ''}${snapshot.textureGrowth}`}
        warning={snapshot.textureGrowth > budget.maxTextureGrowth}
      />
      <Metric label="Cover colliders" value={`${snapshot.activeColliders}/${snapshot.activeObstacles}`} />
      <Metric
        label="Cover query cost"
        value={`${formatMs(snapshot.collisionTimeMs)} / ${snapshot.collisionQueries}`}
        warning={snapshot.collisionTimeMs > budget.maxCollisionTimeMs}
      />
    </div>
  );
}

export function WarZonePerformancePanel() {
  const [snapshot, setSnapshot] = useState<WarZonePerformanceSnapshot | null>(null);

  useEffect(() => {
    const poll = () => setSnapshot(getWarZonePerformanceDiagnostics());
    poll();
    const interval = window.setInterval(poll, 250);
    return () => window.clearInterval(interval);
  }, []);

  const resetBaseline = () => {
    resetWarZonePerformanceDiagnostics();
    setSnapshot(null);
  };

  return (
    <div className="absolute right-4 top-4 z-[100] w-72 rounded border border-cyan-400/50 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong className="text-cyan-200">War Zone device profile</strong>
        <button
          type="button"
          onClick={resetBaseline}
          className="rounded bg-cyan-400 px-2 py-1 text-[10px] font-semibold text-slate-950"
        >
          Reset baseline
        </button>
      </div>
      <p className="mb-3 leading-relaxed text-slate-300">
        Run a full army battle, reset the baseline once the map is loaded, then destroy cover.
        Metrics update live from this browser’s WebGL renderer.
      </p>
      {snapshot ? (
        <Metrics snapshot={snapshot} />
      ) : (
        <div className="rounded bg-slate-900/80 p-2 text-slate-400">
          Waiting for the War Zone canvas to render.
        </div>
      )}
    </div>
  );
}