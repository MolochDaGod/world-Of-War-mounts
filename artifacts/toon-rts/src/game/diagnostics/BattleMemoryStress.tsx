import { useEffect, useState } from 'react';
import { useGameStore, AbilityType } from '../store/gameStore';
import {
  ABILITY_VFX_DURATIONS_MS,
  BATTLE_MEMORY_STRESS_CONFIG,
  formatBytes,
  getTransientResourceCount,
  readClientHeapSample,
  type MemorySample,
} from './battleMemoryDiagnostics';

import {
  getAbilityVfxDiagnostics,
  getGameRuntimeDiagnostics as readRuntimeDiagnostics,
} from './runtimeLifecycleDiagnostics';

const CAST_TYPES = Object.keys(ABILITY_VFX_DURATIONS_MS) as AbilityType[];
const LONGEST_VFX_DURATION_MS = Math.max(...Object.values(ABILITY_VFX_DURATIONS_MS));
const TARGET = {
  origin: [0, 0, 0] as [number, number, number],
  direction: [0, 0, 0] as [number, number, number],
  distance: 0,
};

export type BattleMemoryStressResult = {
  passed: boolean;
  completedBattles: number;
  checks: string[];
  failures: string[];
  samples: MemorySample[];
};

type Progress = {
  label: string;
  completedBattles: number;
  samples: MemorySample[];
};

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function waitForRuntimeInstances(
  expectedInstances: number,
  timeoutMs: number,
  pollMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    if (readRuntimeDiagnostics().activeInstances === expectedInstances) return true;
    await wait(pollMs);
  } while (Date.now() < deadline);
  return readRuntimeDiagnostics().activeInstances === expectedInstances;
}

async function waitForAbilityVfxInstances(
  predicate: (instances: number) => boolean,
  timeoutMs: number,
  pollMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    if (predicate(getAbilityVfxDiagnostics().activeInstances)) return true;
    await wait(pollMs);
  } while (Date.now() < deadline);
  return predicate(getAbilityVfxDiagnostics().activeInstances);
}

function failIf(condition: boolean, failures: string[], message: string): void {
  if (condition) failures.push(message);
}

/**
 * Runs the long-session scenario against the real Zustand store and mounted
 * battle runtime. It uses synthetic timestamps only for the expiration probe,
 * so the check stays quick and repeatable while still exercising every VFX
 * duration contract.
 */
export async function runBattleMemoryStressTest(
  onProgress?: (progress: Progress) => void,
): Promise<BattleMemoryStressResult> {
  const {
    warmupBattles,
    measuredBattles,
    castsPerBattle,
    maxActiveVfx,
    maxHeapGrowthBytes,
    runtimeMountTimeoutMs,
    runtimeUnmountTimeoutMs,
    runtimePollMs,
    vfxRenderWaitMs,
    vfxMountTimeoutMs,
    vfxCleanupTimeoutMs,
  } = BATTLE_MEMORY_STRESS_CONFIG;
  const failures: string[] = [];
  const checks: string[] = [];
  const samples: MemorySample[] = [];
  const totalBattles = warmupBattles + measuredBattles;
  let completedBattles = 0;
  let baselineHeap: number | null = null;

  for (let battleIndex = 0; battleIndex < totalBattles; battleIndex++) {
    const isWarmup = battleIndex < warmupBattles;
    const store = useGameStore.getState();

    store.resetGame();
    store.spawnInitialArmies();

    const mounted = await waitForRuntimeInstances(1, runtimeMountTimeoutMs, runtimePollMs);
    failIf(
      !mounted,
      failures,
      `Battle ${battleIndex + 1}: GameRuntime did not mount within ${runtimeMountTimeoutMs} ms.`,
    );

    // Cycle all effect types repeatedly. The peak resource bound catches
    // accidental append-only queues before expiration is checked.
    const vfxBeforeCast = getAbilityVfxDiagnostics();
    for (let castIndex = 0; castIndex < castsPerBattle; castIndex++) {
      const type = CAST_TYPES[castIndex % CAST_TYPES.length];
      store.castAbility(type, TARGET);
      const resourceCount = getTransientResourceCount(useGameStore.getState());
      failIf(
        resourceCount > maxActiveVfx,
        failures,
        `Battle ${battleIndex + 1}: active VFX count reached ${resourceCount}; bound is ${maxActiveVfx}.`,
      );
    }
    // Let the R3F tree commit a frame with the effect resources allocated
    // before their lifecycle is checked and the casts are released.
    await wait(vfxRenderWaitMs);
    const allVfxMounted = await waitForAbilityVfxInstances(
      instances => instances >= vfxBeforeCast.activeInstances + castsPerBattle,
      vfxMountTimeoutMs,
      runtimePollMs,
    );
    const vfxPeak = getAbilityVfxDiagnostics();
    failIf(
      !allVfxMounted,
      failures,
      `Battle ${battleIndex + 1}: only ${vfxPeak.activeInstances - vfxBeforeCast.activeInstances}/${castsPerBattle} VFX subtrees mounted within ${vfxMountTimeoutMs} ms.`,
    );
    failIf(
      vfxPeak.activeInstances > maxActiveVfx,
      failures,
      `Battle ${battleIndex + 1}: mounted VFX count reached ${vfxPeak.activeInstances}; bound is ${maxActiveVfx}.`,
    );
    failIf(
      useGameStore.getState().activeCasts.length !== castsPerBattle,
      failures,
      `Battle ${battleIndex + 1}: VFX expired before their duration elapsed.`,
    );

    // Allow the mounted frame loop to expire every cast at its real duration.
    // The extra window gives React time to commit subtree cleanup.
    await wait(LONGEST_VFX_DURATION_MS + vfxCleanupTimeoutMs);
    const allVfxUnmounted = await waitForAbilityVfxInstances(
      instances => instances === vfxBeforeCast.activeInstances,
      vfxCleanupTimeoutMs,
      runtimePollMs,
    );

    const afterVfx = useGameStore.getState();
    failIf(
      afterVfx.activeCasts.length !== 0,
      failures,
      `Battle ${battleIndex + 1}: ${afterVfx.activeCasts.length} active casts remained after expiration.`,
    );
    const vfxAfterCleanup = getAbilityVfxDiagnostics();
    failIf(
      !allVfxUnmounted,
      failures,
      `Battle ${battleIndex + 1}: ${vfxAfterCleanup.activeInstances - vfxBeforeCast.activeInstances} VFX subtree(s) remained mounted after ${LONGEST_VFX_DURATION_MS} ms.`,
    );
    failIf(
      vfxAfterCleanup.totalUnmounts - vfxBeforeCast.totalUnmounts < castsPerBattle,
      failures,
      `Battle ${battleIndex + 1}: only ${vfxAfterCleanup.totalUnmounts - vfxBeforeCast.totalUnmounts}/${castsPerBattle} VFX subtrees unmounted.`,
    );
    checks.push(`Battle ${battleIndex + 1}: all ${CAST_TYPES.length} VFX types mounted and cleared after real durations.`);

    store.resetGame();
    const unmounted = await waitForRuntimeInstances(0, runtimeUnmountTimeoutMs, runtimePollMs);
    const afterUnmount = readRuntimeDiagnostics();
    failIf(
      !unmounted,
      failures,
      `Battle ${battleIndex + 1}: ${afterUnmount.activeInstances} GameRuntime instance(s) remained mounted after ${runtimeUnmountTimeoutMs} ms.`,
    );
    failIf(
      getTransientResourceCount(useGameStore.getState()) !== 0,
      failures,
      `Battle ${battleIndex + 1}: transient resource state was not empty after reset.`,
    );

    const heapSample = readClientHeapSample(`battle-${battleIndex + 1}`);
    if (heapSample) samples.push(heapSample);
    if (!isWarmup && baselineHeap === null && heapSample) {
      baselineHeap = heapSample.usedJSHeapSize;
    }
    if (!isWarmup && baselineHeap !== null && heapSample) {
      const growth = heapSample.usedJSHeapSize - baselineHeap;
      failIf(
        growth > maxHeapGrowthBytes,
        failures,
        `Client heap grew by ${formatBytes(growth)} after battle ${battleIndex + 1}; bound is ${formatBytes(maxHeapGrowthBytes)}.`,
      );
    }

    completedBattles++;
    onProgress?.({ label: `Completed battle ${completedBattles}/${totalBattles}`, completedBattles, samples });
  }

  const runtime = readRuntimeDiagnostics();
  const vfx = getAbilityVfxDiagnostics();
  failIf(
    runtime.activeInstances !== 0,
    failures,
    `Final cleanup left ${runtime.activeInstances} GameRuntime instance(s) mounted.`,
  );
  failIf(
    vfx.activeInstances !== 0,
    failures,
    `Final cleanup left ${vfx.activeInstances} VFX subtree(s) mounted.`,
  );
  checks.push(`Runtime mounts: ${runtime.totalMounts}; unmounts: ${runtime.totalUnmounts}.`);
  checks.push(`VFX mounts: ${vfx.totalMounts}; unmounts: ${vfx.totalUnmounts}.`);
  checks.push(
    samples.length > 0
      ? `Client heap sampled after ${samples.length} battles; growth bound is ${formatBytes(maxHeapGrowthBytes)}.`
      : 'Client heap sampling unavailable in this browser; resource and lifecycle checks still ran.',
  );

  return { passed: failures.length === 0, completedBattles, checks, failures, samples };
}

export function BattleMemoryStress() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('Ready to run.');
  const [result, setResult] = useState<BattleMemoryStressResult | null>(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setProgress('Starting battle 1…');
    try {
      const nextResult = await runBattleMemoryStressTest(setProgressState => {
        const sample = setProgressState.samples.at(-1);
        setProgress(
          `${setProgressState.label}${sample ? ` · heap ${formatBytes(sample.usedJSHeapSize)}` : ''}`,
        );
      });
      setResult(nextResult);
      setProgress(nextResult.passed ? 'Passed.' : 'Failed.');
      const log = nextResult.passed ? console.info : console.error;
      log('[RaceWars][memory-stress]', nextResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failed: BattleMemoryStressResult = {
        passed: false,
        completedBattles: 0,
        checks: [],
        failures: [`Stress test crashed: ${message}`],
        samples: [],
      };
      setResult(failed);
      setProgress('Failed.');
      console.error('[RaceWars][memory-stress]', failed);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    void run();
    (window as Window & {
      __RACE_WARS_MEMORY_STRESS__?: () => Promise<BattleMemoryStressResult>;
    }).__RACE_WARS_MEMORY_STRESS__ = () => runBattleMemoryStressTest();
    return () => {
      delete (window as Window & {
        __RACE_WARS_MEMORY_STRESS__?: () => Promise<BattleMemoryStressResult>;
      }).__RACE_WARS_MEMORY_STRESS__;
    };
    // This panel is mounted once for the development query route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute left-4 top-4 z-[100] max-w-lg rounded border border-amber-400/50 bg-slate-950/95 p-4 text-xs text-slate-100 shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-6">
        <strong className="text-amber-300">Battle memory stress</strong>
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
          className="rounded bg-amber-500 px-2 py-1 font-semibold text-slate-950 disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run again'}
        </button>
      </div>
      <p className="mb-2 text-slate-300">{progress}</p>
      {result && (
        <div className={result.passed ? 'text-emerald-300' : 'text-red-300'}>
          <div className="mb-1 font-semibold">
            {result.passed ? 'PASS' : 'FAIL'} · {result.completedBattles} battles
          </div>
          {[...result.failures, ...result.checks].map((message, index) => (
            <div key={`${message}-${index}`}>{message}</div>
          ))}
        </div>
      )}
    </div>
  );
}