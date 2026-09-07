import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {MeshReflectorMaterial} from '@react-three/drei';
import type {MeshReflectorMaterial as Reflector} from '@react-three/drei/materials/MeshReflectorMaterial';
import * as T from 'three';
import {worldClock} from './store';

/** A single nearby reflection plane with an irregular puddle mask. The broad
 * continental scene never pays for this extra render. */
export function WetMarket({center}:{center:readonly[number,number]}){
 const compact=useThree(s=>s.size.width<760),material=useRef<Reflector>(null);
 const mask=useMemo(()=>{const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n,v=y/n;const field=Math.sin(u*29+Math.sin(v*21)*1.7)*Math.sin(v*25+Math.cos(u*16)*1.9)*.5+.5;const border=T.MathUtils.smoothstep(Math.min(u,v,1-u,1-v),.015,.1);const alpha=T.MathUtils.smoothstep(field,.64,.79)*border;const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(alpha*255);data[i+3]=255;}const texture=new T.DataTexture(data,n,n);texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;return texture;},[]);
 useEffect(()=>()=>mask.dispose(),[mask]);
 useFrame(()=>{if(material.current){material.current.opacity=.33+worldClock.storm*.5;}});
 return <mesh position={[center[0],.225,center[1]]} rotation={[-Math.PI/2,0,0]}>
  <planeGeometry args={[66,66]}/>
  <MeshReflectorMaterial ref={material} transparent alphaMap={mask} depthWrite={false} color="#879eaa" roughness={.18} metalness={.15} resolution={compact?256:512} blur={[40,20]} mixBlur={.4} mirror={.85} mixStrength={1.1} opacity={.33} depthScale={0}/>
 </mesh>;
}
