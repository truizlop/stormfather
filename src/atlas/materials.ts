import * as T from 'three';
/** Fine surface variation uses world units, so stone never grows with the camera. */
export function enrichMaterial(material:T.MeshStandardMaterial,kind:string){
  if(kind==='window')return;
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vSurfacePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfacePosition=position;');
    shader.fragmentShader=`varying vec3 vSurfacePosition;
      float surfaceHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,41.161)))*43758.5453);}
      float surfaceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float pixelFootprint=length(fwidth(vSurfacePosition));
      float grain=mix(surfaceNoise(vSurfacePosition*5.7),.5,smoothstep(.05,.4,pixelFootprint));
      float weathering=mix(surfaceNoise(vSurfacePosition*.36),.5,smoothstep(.7,5.,pixelFootprint));
      float strata=sin(vSurfacePosition.y*2.8+surfaceNoise(vSurfacePosition*.2)*3.)*(1.-smoothstep(.2,1.5,pixelFootprint));
      diffuseColor.rgb*=.87+grain*.13+weathering*.15+strata*.017;
      ${kind==='strata'?"float layer=sin(vSurfacePosition.y*.14+surfaceNoise(vSurfacePosition*.018)*2.);diffuseColor.rgb*=mix(vec3(.93,.98,.96),vec3(1.,.91,.85),layer*.32+.5);":''}
    `);
  };
  material.customProgramCacheKey=()=>`field-surface-${kind}-1`;
}
