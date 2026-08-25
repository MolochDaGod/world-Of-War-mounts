export type WarZoneCollisionMetrics = {
  queries: number;
  durationMs: number;
};

export type WarZonePerformanceSnapshot = {
  frameTimeMs: number;
  averageFrameTimeMs: number;
  p95FrameTimeMs: number;
  maxFrameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  geometryGrowth: number;
  textureGrowth: number;
  activeObstacles: number;
  activeColliders: number;
  collisionQueries: number;
  collisionTimeMs: number;
  capturedAt: number;
};

export const WAR_ZONE_PERFORMANCE_BUDGET = {
  maxP95FrameTimeMs: 33.4,
  maxCollisionTimeMs: 4,
  maxGeometryGrowth: 8,
  maxTextureGrowth: 2,
} as const;

type RendererSample = Pick<
  WarZonePerformanceSnapshot,
  'frameTimeMs' | 'drawCalls' | 'triangles' | 'geometries' | 'textures' | 'activeObstacles' | 'activeColliders'
>;

let profilingEnabled = false;
let collisionQueries = 0;
let collisionTimeMs = 0;
let snapshot: WarZonePerformanceSnapshot | null = null;
let rendererBaseline: { geometries: number; textures: number } | null = null;
const frameTimes: number[] = [];

export function setWarZonePerformanceProfiling(enabled: boolean): void {
  profilingEnabled = enabled;
  collisionQueries = 0;
  collisionTimeMs = 0;
}

export function isWarZonePerformanceProfilingEnabled(): boolean {
  return profilingEnabled;
}

/**
 * Measures the aggregate cost of one collision query only while the opt-in
 * browser probe is enabled. Normal battles keep the hot path allocation-free.
 */
export function profileWarZoneCollision<T>(query: () => T): T {
  if (!profilingEnabled || typeof performance === 'undefined') return query();
  const startedAt = performance.now();
  try {
    return query();
  } finally {
    collisionQueries += 1;
    collisionTimeMs += performance.now() - startedAt;
  }
}

export function consumeWarZoneCollisionMetrics(): WarZoneCollisionMetrics {
  const metrics = { queries: collisionQueries, durationMs: collisionTimeMs };
  collisionQueries = 0;
  collisionTimeMs = 0;
  return metrics;
}

export function resetWarZonePerformanceDiagnostics(): void {
  collisionQueries = 0;
  collisionTimeMs = 0;
  snapshot = null;
  rendererBaseline = null;
  frameTimes.length = 0;
}

export function recordWarZonePerformanceFrame(sample: RendererSample): WarZonePerformanceSnapshot {
  if (!rendererBaseline) {
    rendererBaseline = {
      geometries: sample.geometries,
      textures: sample.textures,
    };
  }

  frameTimes.push(sample.frameTimeMs);
  if (frameTimes.length > 120) frameTimes.shift();
  const orderedFrameTimes = [...frameTimes].sort((a, b) => a - b);
  const p95Index = Math.min(
    orderedFrameTimes.length - 1,
    Math.max(0, Math.ceil(orderedFrameTimes.length * 0.95) - 1),
  );

  snapshot = {
    ...sample,
    averageFrameTimeMs: frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length,
    p95FrameTimeMs: orderedFrameTimes[p95Index] ?? sample.frameTimeMs,
    maxFrameTimeMs: Math.max(...frameTimes),
    geometryGrowth: sample.geometries - rendererBaseline.geometries,
    textureGrowth: sample.textures - rendererBaseline.textures,
    collisionQueries: 0,
    collisionTimeMs: 0,
    capturedAt: Date.now(),
  };
  return snapshot;
}

export function getWarZonePerformanceDiagnostics(): WarZonePerformanceSnapshot | null {
  return snapshot;
}

export function updateWarZonePerformanceCollisionMetrics(metrics: WarZoneCollisionMetrics): void {
  if (!snapshot) return;
  snapshot = {
    ...snapshot,
    collisionQueries: metrics.queries,
    collisionTimeMs: metrics.durationMs,
  };
}