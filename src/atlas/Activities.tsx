import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {Campfire} from './Campfire';
import {buildPerson,animatePerson} from './models/person';
import {buildCreature,animateCreature} from './models/creatures';
import {buildBridge,VILLAGE_CENTER,listenerHomes} from './models/activitySets';
import {bridgeState,bridgeRunnerPose,huntState,phaseAt,smooth} from './experiences';
import {disposePlace} from './models';
import type {PlaceModel} from './models/kit';
import {useAtlas,worldClock} from './store';
const clean=(group:T.Group)=>disposePlace({group} as PlaceModel);
export function BridgeRun(){
  const bridge=useMemo(()=>buildBridge(),[]),crew=useMemo(()=>Array.from({length:40},(_,i)=>buildPerson(i,'bridger',['#665b4a','#8c785c','#625347'][i%3])),[]);
  useEffect(()=>()=>{clean(bridge);crew.forEach(r=>clean(r.group));},[bridge,crew]);
  useFrame(()=>{const s=useAtlas.getState(),t=worldClock.time-(s.sceneId==='bridge-run'?s.sceneStartedAt:0),state=bridgeState(t);
    bridge.position.set(state.x,state.height,298);bridge.rotation.z=state.phase==='Carry'?Math.sin(t*7)*.003:0;
    crew.forEach((r,i)=>{const pose=bridgeRunnerPose(t,i);r.group.position.set(...pose.position);r.group.rotation.y=pose.yaw;animatePerson(r,t+i*.015,pose.run?1.45:0,pose.carry);});
  });
  return <group name="Coordinated_bridge_crew"><primitive object={bridge}/>{crew.map((r,i)=><primitive key={i} object={r.group} onClick={(e:{stopPropagation:()=>void})=>{e.stopPropagation();useAtlas.getState().set({selectedActor:'Bridge runner · working with the crew'});}}/>)}</group>;
}
export function GreatshellHunt(){
  const creature=useMemo(()=>buildCreature('chasmfiend'),[]),hunters=useMemo(()=>Array.from({length:8},(_,i)=>buildPerson(i,'hunter',['#5b7796','#a18b69'][i%2])),[]);
  const lure=useMemo(()=>{const g=new T.Group();const m=new T.Mesh(new T.SphereGeometry(.7,12,8),new T.MeshStandardMaterial({color:'#7a6653'}));g.add(m);g.position.set(-229,.5,510);return g;},[]);
  useEffect(()=>()=>{clean(creature.group);hunters.forEach(r=>clean(r.group));clean(lure);},[creature,hunters,lure]);
  useFrame(()=>{const t=worldClock.time-useAtlas.getState().sceneStartedAt,s=huntState(t);
    creature.group.position.set(s.x,.1,510);creature.group.rotation.y=s.retreat?Math.PI/2:-Math.PI/2;creature.body.rotation.x=s.rear;
    lure.visible=s.t>=5;
    animateCreature(creature,'chasmfiend',t,s.phase==='Approach'||s.retreat?1:.2);creature.legs.slice(0,4).forEach(leg=>{leg.rotation.x+=s.rear*3;});
    hunters.forEach((r,i)=>{const z=(i%2?1:-1)*(7+Math.floor(i/2)*.6),withdraw=smooth((s.t-43)/10)*8;
      let x=-216+Math.floor(i/2)*2.4+withdraw;const challenge=smooth((s.t-25)/5)*(1-smooth((s.t-41)/3));if(i<2)x-=challenge*8;
      if(i===0&&s.t<10)x-=Math.sin(s.t/10*Math.PI)*12;
      r.group.position.set(x,.1,510+(i===0&&s.t<10?3:z));r.group.rotation.y=-Math.PI/2;
      const brace=s.phase==='Brace'||s.phase==='Deflect';animatePerson(r,t+i,s.retreat?.65:i===0&&s.t<10?1.1:i<2&&s.t>=25&&s.t<30?.5:0,false,brace?.82:0);if(brace)r.forearms[1].rotation.x=-1.1;
    });
  });
  return <group name="Anonymous_greatshell_hunt"><primitive object={creature.group}/><primitive object={lure}/>{hunters.map((r,i)=><primitive key={i} object={r.group}/>)}</group>;
}
export function ListenerVillage(){
  const people=useMemo(()=>Array.from({length:24},(_,i)=>buildPerson(i,i<4?'warform':'workform',['#82614f','#89715b','#966f59'][i%3])),[]);
  useEffect(()=>()=>people.forEach(r=>clean(r.group)),[people]);
  useFrame(()=>{const s=useAtlas.getState(),t=worldClock.time-(s.sceneId==='listener-village'?s.sceneStartedAt:0),cycle=phaseAt(t,60);
    people.forEach((r,i)=>{const patrol=i<4,a=i/20*Math.PI*2,home=listenerHomes[(i-4+12)%12];
      let x:number,z:number,yaw:number,pace:number;
      if(patrol){const angle=t*.055+Math.floor(i/2)*Math.PI;x=Math.sin(angle)*45+Math.cos(angle)*(i%2?1:-1)*.65;z=Math.cos(angle)*45-Math.sin(angle)*(i%2?1:-1)*.65;yaw=angle+Math.PI/2;pace=.65;}
      else{const activity=(Math.sin(t*.24+i)*.5+.5),gather=smooth((cycle-24)/14);x=home[0]*.63+(i%2?1:-1)*activity*3;z=home[2]*.63;yaw=i%2?Math.PI/2:-Math.PI/2;pace=cycle<24?.5:cycle<38?.35:0;x=x*(1-gather)+Math.sin(a)*9*gather;z=z*(1-gather)+Math.cos(a)*9*gather;if(gather>.95)yaw=a+Math.PI;}
      const shelter=smooth(worldClock.storm);if(shelter>0){x=x*(1-shelter)+(home[0]-3.6)*shelter;z=z*(1-shelter)+home[2]*shelter;pace*=1-shelter;}
      r.group.position.set(VILLAGE_CENTER[0]+x,.1,VILLAGE_CENTER[2]+z);r.group.rotation.y=yaw;
      animatePerson(r,t+i*.13,pace,false,!patrol&&cycle>=38&&shelter<.5?.2+Math.sin(t*3)*.12:0);
      if(!patrol&&cycle<24)r.group.rotation.x=Math.max(0,Math.sin(t*.5+i))*.13;
      else r.group.rotation.x=0;
    });
  });
  return <group name="Parshendi_village_life"><Campfire position={VILLAGE_CENTER}/>{people.map((r,i)=><primitive key={i} object={r.group} onClick={(e:{stopPropagation:()=>void})=>{e.stopPropagation();useAtlas.getState().set({selectedActor:i<4?'Listener · warform · paired watch':'Listener · workform · tending the village and sharing rhythms'});}}/>)}</group>;
}
