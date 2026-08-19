import { useGameStore } from '../store/gameStore';
import { MeteorAbility }       from './MeteorAbility';
import { IceAbility }          from './IceAbility';
import { LightningAbility }    from './LightningAbility';
import { FireAbility }         from './FireAbility';
import { WindAbility }         from './WindAbility';
import { PoisonCloudAbility }  from './PoisonCloudAbility';
import { ThunderStrikeAbility } from './ThunderStrikeAbility';

export function AbilityManager() {
  const activeCasts = useGameStore(state => state.activeCasts);

  return (
    <group>
      {activeCasts.map(cast => {
        switch (cast.type) {
          case 'meteor':  return <MeteorAbility       key={cast.id} cast={cast} />;
          case 'ice':     return <IceAbility           key={cast.id} cast={cast} />;
          case 'lightning': return <LightningAbility   key={cast.id} cast={cast} />;
          case 'fire':    return <FireAbility          key={cast.id} cast={cast} />;
          case 'wind':    return <WindAbility          key={cast.id} cast={cast} />;
          case 'poison':  return <PoisonCloudAbility   key={cast.id} cast={cast} />;
          case 'thunder': return <ThunderStrikeAbility key={cast.id} cast={cast} />;
          default: return null;
        }
      })}
    </group>
  );
}
