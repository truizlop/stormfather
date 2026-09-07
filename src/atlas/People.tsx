import { setPersonAppearance } from './models/anatomicalPeople';
import { peopleCultureForPlace } from './models/peopleProfiles';
import { buildPerson,animatePerson } from './models/person';
import { disposePlace } from './models/dispose';
import { nearestResidents, assignResidentSlots } from './residentDetail';
import * as T from 'three';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { createResidents,sampleRoute,stepResident } from './simulation';
import { useAtlas,worldClock } from './store';
import type { PlaceModel } from './models/kit';

const boxGeometry=new T.BoxGeometry(1,1,1);const headGeometry=new T.SphereGeometry(1,8,6);
const limbGeometry=new T.CapsuleGeometry(.5,.4,3,8);limbGeometry.scale(1,1/1.4,1);
const humanMaterial=new T.MeshStandardMaterial({roughness:.9});
export function People({model}:{model:PlaceModel}){
  const root=useRef<T.Group>(null);
  const pool=useMemo(()=>Array.from({length:8},(_,i)=>{const rig=buildPerson(i,'resident',undefined,peopleCultureForPlace(model.id));const cargo=new T.Mesh(new T.BoxGeometry(.4,.34,.32),new T.MeshStandardMaterial({color:'#947554',roughness:.9}));cargo.position.set(0,1.08,.36);cargo.castShadow=true;rig.group.add(cargo);return Object.assign(rig,{cargo});}),[model.id]);
  const poolRef=useRef(pool);
  useEffect(()=>{poolRef.current=pool;},[pool]);
  const detail=useRef(new Map<number,number>()),lastDetail=useRef(-1);
  const localCamera=useMemo(()=>new T.Vector3(),[]);
  useEffect(()=>()=>pool.forEach(r=>disposePlace({group:r.group} as PlaceModel)),[pool]);

  const people=useMemo(()=>createResidents(model),[model]);const boxes=useRef<T.InstancedMesh>(null),heads=useRef<T.InstancedMesh>(null),limbs=useRef<T.InstancedMesh>(null);const owners=useRef(new WeakMap<T.InstancedMesh,number[]>());
  const temp=useMemo(()=>({matrix:new T.Matrix4(),position:new T.Vector3(),scale:new T.Vector3(),rotation:new T.Quaternion(),euler:new T.Euler(),color:new T.Color()}),[]);
  useFrame(({camera,clock})=>{
    if(!boxes.current||!heads.current||!limbs.current)return;let bi=0,hi=0,li=0;const storm=model.id==='urithiru'?0:model.id==='shinovar'?worldClock.storm*.2:worldClock.storm;
    const dt=worldClock.delta,time=worldClock.time;
    if(root.current&&clock.elapsedTime-lastDetail.current>.3){
      lastDetail.current=clock.elapsedTime;localCamera.copy(camera.position);root.current.worldToLocal(localCamera);
      const nearest=nearestResidents(people.map(p=>sampleRoute(p.route,p.distance).position),localCamera.toArray() as [number,number,number]);
      detail.current=assignResidentSlots(detail.current,nearest);
    }
    pool.forEach(r=>{r.group.visible=false;});
    for(const [personIndex,p] of people.entries()){
      const prior=p.distance;
      const ahead=people.find(other=>other!==p&&other.route===p.route&&other.direction===p.direction&&(other.distance-p.distance)*p.direction>0&&(other.distance-p.distance)*p.direction<1.25);
      stepResident(p,ahead&&storm<.5?0:dt,storm);const sampled=sampleRoute(p.route,p.distance);const [x,y,z]=sampled.position;const yaw=sampled.yaw+(p.direction===-1?Math.PI:0);const sin=Math.sin(yaw),cos=Math.cos(yaw),h=p.height/1.75;
      const speed=p.mode==='resting'||(p.mode==='sheltering'&&(p.distance<2.3||p.distance>p.route.length-2.3))?0:dt===0?1:p.distance===prior?0:1;
      const gait=Math.sin(time*p.speed*7+p.phase)*.6*speed;const bob=Math.abs(Math.sin(time*p.speed*7+p.phase))*.025*speed;
      const slot=detail.current.get(personIndex),visible=slot===undefined?1:0,iriali=model.id==='kasitor'||model.id==='rall-elorim',skin=p.appearance.skin,hair=p.appearance.hair;
      if(slot!==undefined){
        const rig=poolRef.current[slot];setPersonAppearance(rig,p.appearance);rig.group.visible=true;rig.group.position.set(x+Math.cos(sampled.yaw)*p.lane*h,y+bob*h,z-Math.sin(sampled.yaw)*p.lane*h);rig.group.rotation.y=yaw;rig.group.scale.setScalar(h);rig.group.userData.residentIndex=personIndex;
        rig.cargo.visible=p.occupation==='porter';animatePerson(rig,time*p.speed+p.phase/7,speed*.7,false,p.occupation==='porter'?.8:0);
      }
      const part=(mesh:T.InstancedMesh,index:number,px:number,py:number,pz:number,sx:number,sy:number,sz:number,color:string,rx=0)=>{
        temp.position.set(x+(px*cos+pz*sin+Math.cos(sampled.yaw)*p.lane)*h,y+(py+bob)*h,z+(-px*sin+pz*cos-Math.sin(sampled.yaw)*p.lane)*h);
        temp.scale.set(sx*h*visible,sy*h*visible,sz*h*visible);temp.rotation.setFromEuler(temp.euler.set(rx,yaw,0,'YXZ'));temp.matrix.compose(temp.position,temp.rotation,temp.scale);mesh.setMatrixAt(index,temp.matrix);mesh.setColorAt(index,temp.color.set(color));let ids=owners.current.get(mesh);if(!ids){ids=[];owners.current.set(mesh,ids);}ids[index]=personIndex;
      };
      part(limbs.current,li++,0,1.12,0,.46,.62,.28,p.cloth);
      if(['azish','iriali','aimian'].includes(p.appearance.culture))part(limbs.current,li++,0,.57,0,.44,.73,.29,p.cloth);
      part(boxes.current,bi++,0,1.21,.143,.028,.36,.024,'#c9b68d');
      part(boxes.current,bi++,0,.81,.147,.08,.075,.03,'#af8c52');
      for(let button=0;button<3;button++)part(heads.current,hi++,.056,1.06+button*.085,.146,.015,.015,.008,'#c8ad73');
      part(boxes.current,bi++,0,.81,0,.39,.14,.27,'#4b4740');
      for(const side of [-1,1]){
        const angle=gait*side,kneeZ=-Math.sin(angle)*.37,kneeY=.81-Math.cos(angle)*.37,shinAngle=-angle*.5;
        part(limbs.current,li++,side*.115,.81-Math.cos(angle)*.185,kneeZ*.5,.16,.4,.175,'#484c4a',angle);
        part(limbs.current,li++,side*.115,kneeY-Math.cos(shinAngle)*.17,kneeZ-Math.sin(shinAngle)*.17,.145,.38,.16,'#4b4e49',shinAngle);
        part(boxes.current,bi++,side*.115,Math.max(.065,kneeY-Math.cos(shinAngle)*.34-.035),kneeZ-Math.sin(shinAngle)*.34+.035,.15,.12,.27,'#3e3830');
        part(heads.current,hi++,side*.115,kneeY,kneeZ,.08,.085,.083,'#484c4a');
        const arm=p.occupation==='porter'?-1.05:-angle*.7;
        part(heads.current,hi++,side*.225,1.33,0,.105,.105,.12,p.cloth);
        const elbowY=1.37-Math.cos(arm)*.29,elbowZ=-Math.sin(arm)*.29,forearm=arm-.2;
        part(limbs.current,li++,side*.28,1.37-Math.cos(arm)*.145,-Math.sin(arm)*.145,.12,.33,.14,p.cloth,arm);
        part(heads.current,hi++,side*.28,elbowY,elbowZ,.063,.065,.064,p.cloth);
        part(limbs.current,li++,side*.28,elbowY-Math.cos(forearm)*.125,elbowZ-Math.sin(forearm)*.125,.105,.29,.12,p.cloth,forearm);
        part(heads.current,hi++,side*.28,elbowY-Math.cos(forearm)*.27,elbowZ-Math.sin(forearm)*.27,.065,.08,.065,skin);
      }
      part(heads.current,hi++,0,1.59,0,.14,.19,.14,skin);
      part(heads.current,hi++,0,1.72,-.035,.146,.094,.14,hair);
      if(personIndex%3===0||iriali){part(heads.current,hi++,0,1.53,-.105,.135,.2,.085,hair);for(let braid=0;braid<3;braid++)part(heads.current,hi++,.11,1.39-braid*.09,-.11,.04,.07,.046,hair);}
      part(heads.current,hi++,0,1.58,.137,.029,.047,.031,skin);
      for(const side of [-1,1]){
        part(heads.current,hi++,side*.054,1.63,.125,.028,.014,.012,'#dcd7c8');
        part(heads.current,hi++,side*.054,1.63,.136,.012,.012,.006,'#252d2b');
        part(heads.current,hi++,side*.14,1.6,0,.024,.043,.027,skin);
      }
      part(boxes.current,bi++,0,1.07,.34,p.occupation==='porter'?.37:.001,p.occupation==='porter'?.36:.001,p.occupation==='porter'?.32:.001,'#98734f');
      part(boxes.current,bi++,.38,1.07,.08,(p.occupation==='guard'||p.occupation==='fisher')?.04:.001,(p.occupation==='guard'||p.occupation==='fisher')?1.9:.001,(p.occupation==='guard'||p.occupation==='fisher')?.04:.001,'#777366');
    }
    boxes.current.count=bi;heads.current.count=hi;limbs.current.count=li;limbs.current.instanceMatrix.needsUpdate=true;if(limbs.current.instanceColor)limbs.current.instanceColor.needsUpdate=true;boxes.current.instanceMatrix.needsUpdate=true;heads.current.instanceMatrix.needsUpdate=true;if(boxes.current.instanceColor)boxes.current.instanceColor.needsUpdate=true;if(heads.current.instanceColor)heads.current.instanceColor.needsUpdate=true;
  });
  const select=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();const index=owners.current.get(e.object as T.InstancedMesh)?.[e.instanceId??0]??-1;const p=people[index];if(p)useAtlas.getState().set({selectedActor:`${p.occupation[0].toUpperCase()+p.occupation.slice(1)} · ${p.mode==='sheltering'?'Seeking shelter':p.route.activity.toLowerCase()}`});};
  return <group ref={root} name="Residents">{pool.map((rig,i)=><primitive key={i} object={rig.group} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();const p=people[rig.group.userData.residentIndex];if(p)useAtlas.getState().set({selectedActor:`${p.occupation} · ${p.route.activity}`});}}/>)}<instancedMesh ref={boxes} args={[boxGeometry,humanMaterial,Math.max(1,people.length*8)]} castShadow receiveShadow frustumCulled={false} onClick={select}/><instancedMesh ref={heads} args={[headGeometry,humanMaterial,Math.max(1,people.length*28)]} castShadow receiveShadow frustumCulled={false} onClick={select}/><instancedMesh ref={limbs} args={[limbGeometry,humanMaterial,Math.max(1,people.length*10)]} castShadow receiveShadow frustumCulled={false} onClick={select}/></group>;
}
