import {useMemo,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {buildCreature,type Species} from './models/creatures';
import {prepareRoute,sampleRoute} from './simulation';
import type {PlaceModel,Route} from './models/kit';
import {disposePlace} from './models';
import {wildlifeSubjects} from './subjects';
import {useAtlas,worldClock} from './store';

export function Creatures({model}:{model:PlaceModel}){
  const actors=useMemo(()=>{
    const routes:Route[]=model.routes.filter(r=>r.species&&r.species!=='human');
    if(!['akinah','urithiru','kharbranth','purelake','shinovar','shattered-plains'].includes(model.id)){
      const route=model.routes.find(r=>r.species==='human');if(route)routes.push({...route,id:'axehound-walk',species:'axehound'});
    }
    return routes.flatMap((route,index)=>{
      const species=route.species as Species;const n=species==='chasmfiend'?1:species==='goat'?8:species==='cremling'?2:3;
      return Array.from({length:n},(_,j)=>({rig:buildCreature(species),species,route:prepareRoute(route),phase:j/n,seed:index*3+j,distance:j/n*prepareRoute(route).length,direction:1}));
    });
  },[model]);
  useEffect(()=>()=>actors.forEach(a=>disposePlace({group:a.rig.group} as PlaceModel)),[actors]);
  useEffect(()=>{
    const priority:Species[]=['chasmfiend','chull','axehound','goat','cremling'];
    const actor=priority.map(species=>actors.find(a=>a.species===species)).find(Boolean);if(!actor)return;
    const size={chasmfiend:[24,7],chull:[3.2,2.8],axehound:[1.8,.9],goat:[1.5,1],cremling:[.45,.2],skyeel:[1.65,.2]}[actor.species];
    const subject={object:actor.rig.group,length:size[0],height:size[1],name:actor.species==='chull'?'Chull · domestic cargo carrier':`${actor.species[0].toUpperCase()+actor.species.slice(1)} · ${actor.route.activity.toLowerCase()}`};wildlifeSubjects.set(model.id,subject);
    return ()=>{if(wildlifeSubjects.get(model.id)===subject)wildlifeSubjects.delete(model.id);};
  },[actors,model.id]);
  useFrame(()=>{for(const actor of actors){const {rig,route,species,seed}=actor;const t=worldClock.time;const fast=species==='goat'?.3:species==='chasmfiend'?.8:species==='cremling'?.16:.55;
    const retracting=species==='chull'&&worldClock.storm>.45;
    if(!retracting){actor.distance+=worldClock.delta*fast*actor.direction;if(actor.distance>route.length){actor.distance=route.length;actor.direction=-1;}if(actor.distance<0){actor.distance=0;actor.direction=1;}}
    const backward=actor.direction<0;const point=sampleRoute(route,actor.distance);
    const storm=model.id==='shinovar'?worldClock.storm*.2:worldClock.storm;
    const retract=species==='chull'&&storm>.45;const gait=retract?0:Math.sin(t*fast*5+seed);
    rig.group.position.set(...point.position);rig.group.rotation.y=point.yaw+(backward?0:Math.PI);
    rig.legs.forEach((leg,i)=>{leg.rotation.x=gait*.28*(i%2?1:-1);leg.scale.y=retract?.05:1;});
    rig.body.position.y=retract?-.7:Math.abs(gait)*.025;
  }});
  return <group name="Native_creatures">{actors.map((a,i)=><primitive key={i} object={a.rig.group} onClick={(e:{stopPropagation:()=>void})=>{e.stopPropagation();useAtlas.getState().set({selectedActor:`${a.species} · ${a.route.activity.toLowerCase()}`});}}/>)}{['kharbranth','thaylen-city','akinah'].includes(model.id)&&<Skyeels place={model.id}/>}{model.id==='purelake'&&<Fish/>}</group>;
}
function Skyeels({place}:{place:string}){
  const actors=useMemo(()=>Array.from({length:12},(_,i)=>({rig:buildCreature('skyeel'),i})),[]);
  useEffect(()=>()=>actors.forEach(a=>disposePlace({group:a.rig.group} as PlaceModel)),[actors]);
  useEffect(()=>{const subject={object:actors[0].rig.group,length:1.65,height:.2,name:'Skyeel · gliding above the coast'};wildlifeSubjects.set(place,subject);return ()=>{if(wildlifeSubjects.get(place)===subject)wildlifeSubjects.delete(place);};},[actors,place]);
  useFrame(()=>actors.forEach(({rig,i})=>{
    const t=worldClock.time*.12+i*.72,r=28+i*6;rig.group.position.set((place==='thaylen-city'?-470:0)+Math.sin(t)*r,8+Math.sin(t*1.2)*3+i*.3,(place==='thaylen-city'?0:place==='akinah'?270:150)+Math.cos(t)*r*.5);rig.group.rotation.set(Math.sin(t)*.05,-t-Math.PI/2,Math.sin(t)*.15);
    rig.fins.forEach((fin,j)=>{fin.rotation.z=Math.sin(worldClock.time*2.5+i)*(j?1:-1)*.24;});
  }));return <group>{actors.map(({rig,i})=><primitive key={i} object={rig.group}/>)}</group>;
}
function Fish(){
  const focus=useMemo(()=>new T.Object3D(),[]);
  useEffect(()=>{const subject={object:focus,length:8,height:.1,name:'Fish · a Purelake shoal'};wildlifeSubjects.set('purelake',subject);return ()=>{if(wildlifeSubjects.get('purelake')===subject)wildlifeSubjects.delete('purelake');};},[focus]);
  const mesh=useMemo(()=>{const m=new T.InstancedMesh(new T.SphereGeometry(1,7,5),new T.MeshStandardMaterial({color:'#526d66',roughness:.5}),120);m.frustumCulled=false;return m;},[]);
  useEffect(()=>()=>{mesh.geometry.dispose();(mesh.material as T.Material).dispose();},[mesh]);
  const dummy=useMemo(()=>new T.Object3D(),[]);
  useFrame(()=>{for(let i=0;i<120;i++){
    const school=Math.floor(i/30),t=worldClock.time*.13+school*1.9;
    if(i===60)focus.position.set(Math.sin(t)*8+6,-.32,Math.cos(t*.8)*5+8);
    const spread=Math.sqrt(i%30)*.85,phase=i*2.39996;
    dummy.position.set(Math.sin(t)*8+school*18-30+Math.cos(phase)*spread+Math.sin(t*3+phase)*.25,-.32-.05*worldClock.storm,Math.cos(t*.8)*5+school*15-22+Math.sin(phase)*spread);
    dummy.rotation.y=Math.atan2(Math.cos(t)*8,-Math.sin(t*.8)*4);dummy.scale.set(.07,.075,.25);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }mesh.instanceMatrix.needsUpdate=true;});
  return <primitive object={mesh}/>;
}
