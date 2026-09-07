import {useMemo,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {worldClock} from './store';
import type {V3} from './models/kit';
export function Campfire({position}:{position:V3}){
  const uniforms=useMemo(()=>({uTime:{value:0},uStorm:{value:0}}),[]);
  const points=useMemo(()=>{const g=new T.BufferGeometry();const p:number[]=[];for(let i=0;i<90;i++)p.push(i*2.399,(i%30)/30,Math.floor(i/30));g.setAttribute('position',new T.Float32BufferAttribute(p,3));return g;},[]);
  useEffect(()=>()=>points.dispose(),[points]);
  useFrame(()=>{uniforms.uTime.value=worldClock.time;uniforms.uStorm.value=worldClock.storm;});
  return <group position={position}><points geometry={points} frustumCulled={false}><shaderMaterial uniforms={uniforms} transparent depthWrite={false} blending={T.AdditiveBlending} vertexShader="uniform float uTime,uStorm;varying float vAge;void main(){float age=fract(position.y+uTime*.65);vAge=age;float r=(1.-age)*.55;vec3 p=vec3(sin(position.x+age*3.)*r,.2+age*1.4,cos(position.x+age*3.)*r);p.y*=1.-uStorm*.8;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(.19/max(.0001,-view.z),1.,16.)*(1.-age*.6);}" fragmentShader="varying float vAge;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(mix(vec3(1.,.72,.19),vec3(.96,.22,.04),vAge),pow(1.-d,2.)*(1.-vAge)*.85);}"/></points><pointLight position={[0,.8,0]} color="#ffb357" intensity={.00012} distance={.027} decay={2}/></group>;
}
