type GameRuntimeDiagnostics = {
  activeInstances: number;
  totalMounts: number;
  totalUnmounts: number;
};

type AbilityVfxDiagnostics = {
  activeInstances: number;
  totalMounts: number;
  totalUnmounts: number;
};

const runtimeDiagnostics: GameRuntimeDiagnostics = {
  activeInstances: 0,
  totalMounts: 0,
  totalUnmounts: 0,
};

const abilityVfxDiagnostics: AbilityVfxDiagnostics = {
  activeInstances: 0,
  totalMounts: 0,
  totalUnmounts: 0,
};

export function markGameRuntimeMounted(): void {
  runtimeDiagnostics.activeInstances++;
  runtimeDiagnostics.totalMounts++;
}

export function markGameRuntimeUnmounted(): void {
  runtimeDiagnostics.activeInstances--;
  runtimeDiagnostics.totalUnmounts++;
}

/** Development-only lifecycle counters used by the memory stress check. */
export function getGameRuntimeDiagnostics(): GameRuntimeDiagnostics {
  return { ...runtimeDiagnostics };
}

export function markAbilityVfxMounted(): void {
  abilityVfxDiagnostics.activeInstances++;
  abilityVfxDiagnostics.totalMounts++;
}

export function markAbilityVfxUnmounted(): void {
  abilityVfxDiagnostics.activeInstances--;
  abilityVfxDiagnostics.totalUnmounts++;
}

/** Tracks committed VFX subtrees, including effects still loading a GLB. */
export function getAbilityVfxDiagnostics(): AbilityVfxDiagnostics {
  return { ...abilityVfxDiagnostics };
}