import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { useGameStore } from '../store/gameStore';

/**
 * Post-processing pipeline — Bloom + Vignette.
 *
 * Bloom uses luminance thresholding so only truly emissive surfaces
 * (ability VFX point lights, emissive materials) glow — regular unit
 * surfaces stay sharp.
 *
 * multisampling=0: hardware MSAA from gl.antialias handles aliasing;
 * postprocess MSAA would double the sample cost for no benefit.
 */
export function PostProcessing() {
  const activeCasts = useGameStore(state => state.activeCasts);
  const hasAbility  = activeCasts.length > 0;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={hasAbility ? 2.0 : 0.55}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.25}
        kernelSize={KernelSize.MEDIUM}
        blendFunction={BlendFunction.SCREEN}
        mipmapBlur
      />
      <Vignette
        offset={0.32}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
