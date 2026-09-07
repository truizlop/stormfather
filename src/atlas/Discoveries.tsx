import {useMemo,useEffect,useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {discoveries,type Discovery} from './experiences';
import {ModelBuilder,type PlaceModel} from './models/kit';
import {disposePlace} from './models';
import {useAtlas,worldClock} from './store';
import {placementById,toAtlas} from './integration';
import type {PlaceId} from './data';
function buildProp(d:Discovery){
  const b=new ModelBuilder();
  if(d.kind==='stew'){
    b.cylinder([0,.5,0],.65,.7,'#343b3a','metal');b.cylinder([0,.86,0],.58,.035,'#b38c59');
    for(let i=0;i<9;i++){const a=i*2.399;b.sphere([Math.sin(a)*.37,.88,Math.cos(a)*.37],[.1,.04,.12],i%2?'#859153':'#c79866');}
    for(const side of [-1,1])b.box([side*.71,.65,0],[.27,.12,.12],'#454b42');b.beam([-.7,.1,0],[.7,.1,0],.12,'#684637');b.beam([0,.1,-.7],[0,.1,.7],.12,'#684637');
  }else if(d.kind==='pancakes'){
    b.box([0,.5,0],[2,1,1.3],'#76593c');b.cylinder([0,1.025,0],.55,.04,'#d8c6a6');
    for(let i=0;i<7;i++)b.cylinder([0,1.07+i*.055,0],.38-i*.008,.048,i%2?'#c99856':'#deb770');b.sphere([.12,1.45,.05],[.1,.045,.08],'#efcd73');
  }else if(d.kind==='stick'){
    b.beam([-.7,.09,-.15],[.8,.09,.1],.08,'#805b35');b.beam([-.1,.09,0],[.1,.12,-.35],.044,'#86613a');
  }else if(d.kind==='flute'){
    b.box([0,.7,0],[2.2,.22,.7],'#8f826a');for(const side of [-1,1])b.box([side*.8,.3,0],[.22,.6,.5],'#938874');
    b.beam([-.45,.86,0],[.45,.86,0],.08,'#a07848');for(let i=0;i<6;i++)b.sphere([-.27+i*.1,.906,0],[.02,.009,.02],'#382f29');
  }
  if(['stones','boots','clock','shoe','chouta','spanreed'].includes(d.kind)){
    b.box([0,.8,0],[1.8,.15,1.1],'#977652');for(const x of [-.7,.7])b.box([x,.4,0],[.13,.8,.8],'#6c5742');
    if(d.kind==='stones'){b.box([0,.91,0],[1.25,.07,.8],'#bea37a');for(let i=0;i<9;i++)b.sphere([-.4+(i%3)*.38,.99,Math.floor(i/3)*.24-.25],[.12,.065,.085],['#717f79','#be8d65','#d0bba1','#635f75'][i%4]);}
    if(d.kind==='boots'||d.kind==='shoe')for(const x of d.kind==='boots'?[-.24,.24]:[0]){
      b.sphere([x,1.04,.03],[.17,.13,.32],'#664c37');b.cylinder([x,1.25,-.11],.145,.5,'#78573e');b.cylinder([x,1.5,-.11],.123,.01,'#302d28');
      for(let i=0;i<5;i++)b.beam([x-.1,1.14+i*.06,.03],[x+.1,1.17+i*.06,.03],.018,'#c0a16d');b.box([x,.93,.04],[.35,.04,.59],'#483d2e');
    }
    if(d.kind==='clock'){
      b.box([0,1.75,0],[.95,1.7,.45],'#6d5440');const disk=new T.CylinderGeometry(.38,.38,.06,48);b.add(disk,'#dbc99f',[0,2.04,.26],[1,1,1],[Math.PI/2,0,0],'metal');disk.dispose();
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;b.sphere([Math.sin(a)*.315,2.04+Math.cos(a)*.315,.3],[.018,.018,.014],'#504535');}
      b.beam([0,2.04,.31],[-.19,1.89,.31],.025,'#57432d');b.beam([0,2.04,.32],[-.29,2.07,.32],.018,'#57432d');b.sphere([0,2.04,.33],[.04,.04,.02],'#a38746');
    }
    if(d.kind==='chouta'){b.cylinder([0,.91,0],.43,.05,'#bba988');b.sphere([0,1.02,0],[.26,.1,.36],'#cfab70');for(let i=0;i<6;i++)b.sphere([Math.sin(i*2.4)*.16,1.12,Math.cos(i*2.4)*.22],[.09,.07,.09],i%2?'#8f643d':'#6f804d');b.beam([-.16,1.15,-.12],[.18,1.15,.19],.025,'#c29661');}
    if(d.kind==='spanreed'){
      b.box([0,.897,0],[1.5,.02,.85],'#d8cdb1');for(let i=0;i<7;i++)b.box([0,.911,-.31+i*.095],[1.28,.003,.003],'#ab9b7c');
    }
  }
  const group=b.finish(`Discovery_${d.id}`);
  if(d.kind==='spanreed')for(const x of [-.38,.38]){const pen=new ModelBuilder();pen.beam([0,.94,.25],[.12,1.39,-.1],.035,'#ae7453');pen.sphere([.12,1.39,-.1],[.045,.075,.045],'#dd7878','lamp');const reed=pen.finish('Paired_spanreed');reed.position.x=x;group.add(reed);}
  return group;
}
function Find({d}:{d:Discovery}){
  const prop=useMemo(()=>buildProp(d),[d]),[near,setNear]=useState(false);const found=useAtlas(s=>s.discovered.includes(d.id));
  const global=useMemo(()=>toAtlas(placementById.get(d.place)!,d.position),[d]);
  const steam=useMemo(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(60*3),3));return g;},[]);
  useEffect(()=>()=>{disposePlace({group:prop} as PlaceModel);steam.dispose();},[prop,steam]);
  useFrame(({camera})=>{const close=camera.position.distanceTo(global)<.12;if(close!==near)setNear(close);
    if(d.kind==='spanreed'){for(const pen of prop.children)if(pen.name==='Paired_spanreed'){pen.position.z=Math.sin(worldClock.time*1.3)*.055;pen.rotation.y=Math.sin(worldClock.time*2.1)*.07;}}
    if(d.kind==='stew'){const points=steam.getAttribute('position');for(let i=0;i<60;i++){const age=(worldClock.time*.3+i/60)%1;points.setXYZ(i,Math.sin(i*2.399+age)*age*.45,.95+age*1.8,Math.cos(i*2.399+age)*age*.45);}points.needsUpdate=true;}
  });
  const inspect=()=>useAtlas.getState().discover(d.id);
  return <group position={d.position}><primitive object={prop} onClick={(e:{stopPropagation:()=>void})=>{e.stopPropagation();inspect();}}/>{d.kind==='stew'&&<points geometry={steam}><shaderMaterial transparent depthWrite={false} vertexShader="void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(.1/max(.0001,-p.z),1.,11.);}" fragmentShader="void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.84,.86,.8,pow(1.-d,2.)*.15);}"/></points>}{near&&<Html position={[0,2.1,0]} center zIndexRange={[24,0]}><button className={`discovery-pin ${found?'found':''}`} onClick={inspect} aria-label={found?d.name:'Inspect curious object'}><span>{found?'✓':'✧'}</span>{found?'Rediscover':'Inspect'}</button></Html>}</group>;
}
export function Discoveries({place}:{place:PlaceId}){return <>{discoveries.filter(d=>d.place===place).map(d=><Find key={d.id} d={d}/>)}</>;}
