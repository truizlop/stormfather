import { useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';
import {placementById} from './integration';
import type {PlaceId} from './data';
import { worldClock, useAtlas } from './store';
export function Ocean({size=2000,y=0,shallow=false,clipRadius=0,atlas=false,activeCity=null}:{size?:number;y?:number;shallow?:boolean;clipRadius?:number;atlas?:boolean;activeCity?:PlaceId|null}){
  const ref=useRef<T.Mesh>(null);
  const waterCut=useMemo(()=>{const p=activeCity&&placementById.get(activeCity);return p?new T.Vector3(p.origin[0],p.origin[2],p.radius*p.scale*1.64):new T.Vector3();},[activeCity]);
  const uniforms=useMemo(()=>({...T.UniformsUtils.clone(T.UniformsLib.fog),uCut:{value:waterCut},uRadius:{value:clipRadius},uTime:{value:0},uLight:{value:.8},uStorm:{value:0},uShallow:{value:shallow?1:0}}),[shallow,clipRadius,waterCut]);
  useFrame(()=>{const live=(ref.current?.material as T.ShaderMaterial|undefined)?.uniforms;if(live){live.uTime.value=worldClock.time;live.uLight.value=useAtlas.getState().daylight;live.uStorm.value=worldClock.storm;}if(ref.current&&shallow)ref.current.position.y=y-worldClock.storm*.75;});
  return <mesh ref={ref} rotation={[-Math.PI/2,0,0]} position={[0,y,0]}>
    <planeGeometry args={[size,size,1,1]}/>
    <shaderMaterial fog uniforms={uniforms} side={T.DoubleSide} transparent={shallow}
      vertexShader={`#include <fog_pars_vertex>
varying vec3 vWorld;varying vec2 vLocal; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vLocal=position.xy;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`}
      fragmentShader={`
        #include <fog_pars_fragment>
        varying vec3 vWorld;varying vec2 vLocal;uniform vec3 uCut;uniform float uRadius; uniform float uTime,uLight,uStorm,uShallow;
        float wave(vec2 p){return sin(p.x*.47+p.y*.23+sin(p.y*.15)*2.+uTime*.27)*.5+sin(p.x*.19-p.y*.38+uTime*.21)*.3;}
        void main(){
          if(uRadius>0.&&length(vLocal)>uRadius)discard;
          ${atlas?'if(uCut.z>0.&&distance(vWorld.xz,uCut.xy)<uCut.z)discard;':''}
          vec2 p=uRadius>0.?vLocal:vWorld.xz;float n=wave(p);float fine=wave(p*4.+n*.3);vec3 viewDir=normalize(cameraPosition-vWorld);
          vec3 rippleNormal=normalize(vec3(-(wave(p+vec2(.08,0.))-wave(p-vec2(.08,0.)))*(.7+uStorm),1.,-(wave(p+vec2(0.,.08))-wave(p-vec2(0.,.08)))*(.7+uStorm)));
          float fresnel=.025+.975*pow(1.-max(dot(viewDir,rippleNormal),0.),5.);
          vec3 deep=mix(vec3(.005,.014,.025),vec3(.012,.032,.052),uLight);
          vec3 color=deep+vec3(.002,.003,.004)*n+vec3(.001,.002,.003)*fine;
          vec3 reflected=reflect(-viewDir,rippleNormal);
          vec3 sky=mix(vec3(.16,.24,.3),vec3(.43,.51,.54),pow(1.-max(reflected.y,0.),2.));
          float sunset=exp(-pow((uLight-.38)/.18,2.));sky=mix(sky,vec3(.48,.35,.26),sunset*.26);
          sky*=.1+uLight*.9;sky=mix(sky,vec3(.14,.19,.21),uStorm*.65);
          color=mix(color,sky,fresnel*.8);
          vec3 halfLight=normalize(viewDir+normalize(vec3(-.6,.5+uLight*.5,.5)));
          float sunGlint=pow(max(dot(rippleNormal,halfLight),0.),180.);
          color+=mix(vec3(.5,.64,.78),vec3(1.1,.89,.58),smoothstep(.15,.4,uLight))*sunGlint*(1.-uStorm)*.65;
          float glint=pow(max(0.,n*.52+fine*.16),8.);color+=vec3(.2,.27,.27)*smoothstep(.64,.75,n+fine*.07)*uStorm*.16;
          color+=vec3(.3,.36,.34)*glint*.22;color*=1.-uStorm*.3;
          ${atlas?'if(vWorld.x>-18.2&&vWorld.x<-.9&&vWorld.z> -7.2&&vWorld.z<.2)color=vec3(.11,.26,.25)*(.15+uLight*.85)*(1.-uStorm*.3);':''}
          vec3 oceanColor=uShallow>.5?vec3(.11,.26,.25)*(.15+uLight*.85)*(1.-uStorm*.3):color;float shallowBlend=uRadius>0.?1.-smoothstep(uRadius*.32,uRadius*.94,length(vLocal)):1.;
          if(uShallow>.5){vec2 q=p+vec2(wave(p*.73)*2.8,wave(p*.91+7.)*2.4);float caustic=pow(1.-abs(sin(q.x*.95+sin(q.y*1.5)*1.3)*sin(q.y*.89+sin(q.x*1.7)*1.1)),18.);color=mix(vec3(.17,.38,.36),vec3(.39,.58,.48),caustic*.23)*(.15+uLight*.85)*(1.-uStorm*.3);}
          if(uShallow>.5){color=mix(oceanColor,color,shallowBlend);color=mix(color,sky,fresnel*.45)+sunGlint*vec3(.16,.14,.1)*(1.-uStorm);}
          gl_FragColor=vec4(color,uShallow>.5?mix(1.,.62,shallowBlend):1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`}/>
  </mesh>;
}
