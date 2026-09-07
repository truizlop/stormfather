import * as T from 'three';
/** Merged model coordinates keep weathering and relief at a fixed local scale. */
export function enrichMaterial(material:T.MeshStandardMaterial,kind:string){
  material.userData.surface=kind;
  if(kind==='window')return;
  if(kind==='contact'){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying float vContact;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvContact=uv.y;');
      shader.fragmentShader='varying float vContact;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=pow(1.-vContact,2.)*.42;');
    };material.customProgramCacheKey=()=> 'contact-ground-v1';return;
  }
  const skin=kind==='skin',fabric=kind==='cloth',shell=kind==='carapace'||kind==='horn';
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vSurfacePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfacePosition=position;');
    shader.fragmentShader=`varying vec3 vSurfacePosition;
      float surfaceHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,41.161)))*43758.5453);}
      float surfaceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float pixelFootprint=length(fwidth(vSurfacePosition));
      float grain=mix(surfaceNoise(vSurfacePosition*${skin?'130.':fabric?'75.':shell?'18.':'5.7'}),.5,smoothstep(.05,.4,pixelFootprint));
      float weathering=mix(surfaceNoise(vSurfacePosition*.36),.5,smoothstep(.7,5.,pixelFootprint));
      float strata=sin(vSurfacePosition.y*2.8+surfaceNoise(vSurfacePosition*.2)*3.)*(1.-smoothstep(.2,1.5,pixelFootprint));
      diffuseColor.rgb*=${skin?'.94+grain*.06+weathering*.03':fabric?'.7+grain*.2+weathering*.2':shell?'.77+grain*.08+weathering*.25':'.87+grain*.13+weathering*.15+strata*.017'};
      ${fabric?'float weave=(sin(vSurfacePosition.x*820.)*sin(vSurfacePosition.y*820.))*(1.-smoothstep(.001,.012,pixelFootprint));diffuseColor.rgb*=.96+weave*.04;':''}
      ${shell?'float fissure=pow(abs(sin(vSurfacePosition.y*22.+surfaceNoise(vSurfacePosition*2.7)*8.)),24.);diffuseColor.rgb*=1.-fissure*.19;':''}
      ${kind==='strata'?"float layer=sin(vSurfacePosition.y*.14+surfaceNoise(vSurfacePosition*.018)*2.);diffuseColor.rgb*=mix(vec3(.93,.98,.96),vec3(1.,.91,.85),layer*.32+.5);":''}
      ${kind==='windstone'?`float mineral=surfaceNoise(vSurfacePosition*vec3(.04,.36,.04));float erosion=surfaceNoise(vSurfacePosition*vec3(.48,.028,.48));diffuseColor.rgb*=mix(vec3(.68,.76,.77),vec3(1.12,1.08,.97),mineral*.55+erosion*.45);`:''}
      ${kind==='roof'?`vec2 tile=vSurfacePosition.xz*vec2(3.8,3.2);tile.x+=mod(floor(tile.y),2.)*.5;float joint=max(1.-smoothstep(.025,.07,fract(tile.x)),1.-smoothstep(.04,.12,fract(tile.y)));diffuseColor.rgb*=.82+surfaceNoise(floor(vec3(tile,0.)))*.3-joint*.17;`:''}
      ${kind==='ashlar'?`vec2 block=vec2(vSurfacePosition.x+vSurfacePosition.z,vSurfacePosition.y)*vec2(.85,1.7);block.x+=mod(floor(block.y),2.)*.5;float mortar=max(1.-smoothstep(.012,.025,fract(block.x)),1.-smoothstep(.018,.03,fract(block.y)));diffuseColor.rgb*=1.-mortar*.15;`:''}
      ${kind==='foliage'?`diffuseColor.rgb*=mix(vec3(.65,.77,.52),vec3(1.15,1.09,.73),weathering);`:''}
      ${kind==='timber'?`float woodgrain=sin(vSurfacePosition.x*39.+vSurfacePosition.z*43.+surfaceNoise(vSurfacePosition*vec3(4.,.17,4.))*9.);diffuseColor.rgb*=.87+woodgrain*.09;`:''}
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+(weathering-.5)*.18+(grain-.5)*.1,.28,1.);
    `);
    // Surface gradients need no UVs (the merged city kit deliberately strips
    // them). Normalize by local pixel size so city scale does not amplify bumps.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float relief=grain*${skin?'.0004':fabric?'.001':shell?'.006':kind==='metal'?'.008':'.018'}+weathering*${skin||fabric||shell?'.0004':'.012'}+strata*${skin||fabric||shell?'.0001':'.003'};
      ${kind==='windstone'?`relief=surfaceNoise(vSurfacePosition*vec3(.3,.035,.3))*.65+surfaceNoise(vSurfacePosition*1.2)*.055;`:''}
      ${kind==='cutstone'?`relief=grain*.005+weathering*.008;`:''}
      ${kind==='canvas'||kind==='foliage'?`relief=grain*.0002;`:''}
      vec3 surfaceDx=dFdx(vSurfacePosition),surfaceDy=dFdy(vSurfacePosition);
      vec3 viewDx=normalize(dFdx(-vViewPosition)),viewDy=normalize(dFdy(-vViewPosition));
      vec3 tangentX=cross(viewDy,normal),tangentY=cross(normal,viewDx);
      float determinant=dot(viewDx,tangentX)*faceDirection;
      vec2 heightGradient=vec2(dFdx(relief)/max(length(surfaceDx),.0001),dFdy(relief)/max(length(surfaceDy),.0001));
      vec3 surfaceGradient=sign(determinant)*(heightGradient.x*tangentX+heightGradient.y*tangentY);
      normal=normalize(max(abs(determinant),.0001)*normal-surfaceGradient);
    `);
  };
  material.customProgramCacheKey=()=>`field-surface-${kind}-3`;
}
