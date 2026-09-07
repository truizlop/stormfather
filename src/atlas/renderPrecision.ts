import * as T from 'three';

/** Custom water, weather and particle shaders must use the same depth encoding
 * as standard materials when moving from continental to human scale. */
export function enableLogDepth(material:T.ShaderMaterial){
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);
    if(!shader.vertexShader.includes('logdepthbuf_pars_vertex')){
      shader.vertexShader='#include <common>\n#include <logdepthbuf_pars_vertex>\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace(/}\s*$/, '\n#include <logdepthbuf_vertex>\n}');
      shader.fragmentShader='#include <logdepthbuf_pars_fragment>\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace(/void main\s*\(\s*\)\s*{/, 'void main(){\n#include <logdepthbuf_fragment>\n');
    }
  };
  material.customProgramCacheKey=()=> 'atlas-log-depth-v1';
  material.needsUpdate=true;
}

/** Near clipping is a physical clearance, not a percentage of orbit distance:
 * looking across a city must not slice the buildings beside the camera. */
export function cameraNear(distance:number){return T.MathUtils.clamp(distance*.001,.00001,.01);}

/** Atmosphere follows viewing distance continuously, independent of HUD mode.
 * Fog starts beyond the orbit focus, so zooming cannot erase the destination. */
export function atmosphereRange(distance:number){
  return {near:Math.max(2,distance*1.5),far:Math.max(25,distance*8)};
}

/** Haze is an atlas depth cue, never an opaque replacement for the landscape.
 * Cursor zoom can put the orbit focus much nearer than the visible terrain. */
export const hazeLimit={value:.32};
const fogMaterials=new WeakSet<T.Material>();
export function preserveFogVisibility(material:T.Material){
  if(fogMaterials.has(material))return;fogMaterials.add(material);
  const previous=material.onBeforeCompile;
  const cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);
    shader.uniforms.uHazeLimit=hazeLimit;
    shader.fragmentShader='uniform float uHazeLimit;\n'+shader.fragmentShader.replace('#include <fog_fragment>',
      T.ShaderChunk.fog_fragment.replace('fogColor, fogFactor','fogColor, min(fogFactor, uHazeLimit)'));
  };
  material.customProgramCacheKey=()=>cacheKey+'-readable-haze-v2';
  material.needsUpdate=true;
}
