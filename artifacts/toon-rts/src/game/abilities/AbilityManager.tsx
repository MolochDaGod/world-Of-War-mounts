import { Suspense, useEffect, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import {
  markAbilityVfxMounted,
  markAbilityVfxUnmounted,
} from '../diagnostics/runtimeLifecycleDiagnostics';
import { MeteorAbility }       from './MeteorAbility';
import { IceAbility }          from './IceAbility';
import { LightningAbility }    from './LightningAbility';
import { FireAbility }         from './FireAbility';
import { WindAbility }         from './WindAbility';
import { PoisonCloudAbility }  from './PoisonCloudAbility';
import { ThunderStrikeAbility } from './ThunderStrikeAbility';
import { FlameBlastAbility }    from './FlameBlastAbility';

function TrackedAbilityVfx({ children }: { children: ReactNode }) {
  useEffect(() => {
    markAbilityVfxMounted();
    return markAbilityVfxUnmounted;
  }, []);

  return <>{children}</>;
}

export function AbilityManager() {
  const activeCasts = useGameStore(state => state.activeCasts);
  const pruneExpiredCasts = useGameStore(state => state.pruneExpiredCasts);

  // Keep expiration in the manager rather than relying on each individual
  // effect to get a frame after its deadline. This also covers a cast that is
  // suspended while its lazy GLB is loading.
  useFrame(() => {
    pruneExpiredCasts(Date.now());
  });

  return (
    <group>
      {activeCasts.map(cast => {
        let effect: ReactNode;
        switch (cast.type) {
          case 'meteor': effect = <MeteorAbility cast={cast} />; break;
          case 'ice': effect = <IceAbility cast={cast} />; break;
          case 'lightning': effect = <LightningAbility cast={cast} />; break;
          case 'fire': effect = <FireAbility cast={cast} />; break;
          case 'wind': effect = <WindAbility cast={cast} />; break;
          case 'poison': effect = <PoisonCloudAbility cast={cast} />; break;
          case 'thunder': effect = <ThunderStrikeAbility cast={cast} />; break;
          case 'flame_blast': effect = (
            <Suspense fallback={null}>
              <FlameBlastAbility cast={cast} />
            </Suspense>
          ); break;
          default: return null;
        }
        return <TrackedAbilityVfx key={cast.id}>{effect}</TrackedAbilityVfx>;
      })}
    </group>
  );
}
