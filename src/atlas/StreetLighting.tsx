import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {PlaceModel,V3} from './models/kit';
import {useAtlas,worldClock} from './store';

/** Only the eight nearest lamps illuminate the street. Intensities and ranges
 * account for the renderer's minimum attenuation distance at atlas scale. */
export function StreetLighting({model}:{model:PlaceModel}) {
 const root=useRef<T.Group>(null),last=useRef(-1),eye=useMemo(()=>new T.Vector3(),[]);
 const halo=useMemo(()=>{const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x+ .5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.exp(-r*r*7)*Math.max(0,1-r)*170);}const texture=new T.DataTexture(data,size,size);texture.needsUpdate=true;return texture;},[]);
 const lights=useMemo(()=>Array.from({length:8},()=>{const light=new T.PointLight('#ffcd8b',0,.034,2);const glow=new T.Sprite(new T.SpriteMaterial({map:halo,color:'#ffd397',transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.scale.set(1.8,1.8,1);light.add(glow);return light;}),[halo]);
 useEffect(()=>()=>{halo.dispose();lights.forEach(light=>(light.children[0] as T.Sprite).material.dispose());},[halo,lights]);
 const sites=(model.group.userData.lampSites??[]) as V3[];
 useFrame(({camera,clock})=>{
  if(!root.current)return;
  if(clock.elapsedTime-last.current>.4){
   last.current=clock.elapsedTime;eye.copy(camera.position);root.current.worldToLocal(eye);
   const nearby=sites.map(p=>({p,d:(p[0]-eye.x)**2+(p[1]+3.5-eye.y)**2+(p[2]-eye.z)**2})).filter(p=>p.d<45**2).sort((a,b)=>a.d-b.d).slice(0,8);
   lights.forEach((light,i)=>{light.visible=!!nearby[i];if(nearby[i])light.position.set(nearby[i].p[0]+.55,nearby[i].p[1]+3.5,nearby[i].p[2]);});
  }
  const strength=.12+(1-useAtlas.getState().daylight)*.88+worldClock.storm*.4;
  lights.forEach(l=>{l.intensity=.016*strength;(l.children[0] as T.Sprite).material.opacity=.15+strength*.5;});
 });
 return <group ref={root}>{lights.map((light,i)=><primitive key={i} object={light}/>)}</group>;
}
