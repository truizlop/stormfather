import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {PlaceModel} from './models/kit';
import {disposePlace} from './models';
import {random} from './models/kit';
import {worldClock} from './store';
import {createWindrunner,windrunnerPose,WINDRUNNER_COUNT} from './radiants';
import {radiantSubjects} from './subjects';
import {pointBlocked,type Obstacle} from './navigation';

export function Rain({model}:{model:PlaceModel}){
  const rainMaterial=useRef<T.ShaderMaterial>(null);
  const count=1800;const uniforms=useMemo(()=>({uTime:{value:0},uOpacity:{value:0},uSize:{value:model.radius*1.6}}),[model.radius]);
  const geometry=useMemo(()=>{const rng=random(162);const positions:number[]=[],bases:number[]=[];for(let i=0;i<count;i++){const x=(rng()-.5)*model.radius*1.6,z=(rng()-.5)*model.radius*1.6,y=rng()*100;positions.push(x,y,z,x+.8,y+3,z);bases.push(x,y,z,x,y,z);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('aBase',new T.Float32BufferAttribute(bases,3));return g;},[model.radius]);
  useFrame(()=>{const u=rainMaterial.current?.uniforms;if(u){u.uTime.value=worldClock.time;u.uOpacity.value=worldClock.storm*(model.id==='urithiru'?0:model.id==='shinovar'?.12:.48);}});
  return <lineSegments geometry={geometry}><shaderMaterial ref={rainMaterial} uniforms={uniforms} transparent depthWrite={false} vertexShader={`attribute vec3 aBase;uniform float uTime,uSize;void main(){vec3 p=aBase;p.y=mod(aBase.y-uTime*36.,100.);p.x=mod(aBase.x-uTime*8.+uSize*.5,uSize)-uSize*.5;p+=position-aBase;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`} fragmentShader="uniform float uOpacity;void main(){gl_FragColor=vec4(.69,.78,.8,uOpacity);}"/></lineSegments>;
}
export function Rockbuds({model}:{model:PlaceModel}){
  const mesh=useRef<T.InstancedMesh>(null);const foliage=useRef<T.InstancedMesh>(null);
  const seeds=useMemo(()=>{
    if(['urithiru','purelake','shinovar'].includes(model.id))return [];
    const rng=random(175);const points:T.Vector3[]=[];const obstacles=(model.group.userData.obstacles??[]) as Obstacle[];
    for(const route of model.routes.slice(0,25))for(let i=4;i<route.points.length-4;i+=8){const p=route.points[i];const x=p[0]+6+(rng()-.5)*2,z=p[2]+6;if(pointBlocked([x,p[1],z],obstacles,.5))continue;points.push(new T.Vector3(x,p[1],z));}
    return points.slice(0,140);
  },[model]);
  const dummy=useMemo(()=>new T.Object3D(),[]);
  useFrame(()=>{if(!mesh.current||!foliage.current)return;seeds.forEach((p,i)=>{
    dummy.position.copy(p);dummy.position.y+=.25;dummy.scale.set(.45,.28,.45);dummy.rotation.set(0,i,0);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);
    dummy.position.y=p.y+.6*(1-worldClock.storm*.88);dummy.scale.set(.55*(1-worldClock.storm*.9),.65*(1-worldClock.storm*.9),.55*(1-worldClock.storm*.9));dummy.updateMatrix();foliage.current!.setMatrixAt(i,dummy.matrix);
  });mesh.current.instanceMatrix.needsUpdate=true;foliage.current.instanceMatrix.needsUpdate=true;});
  return <group><instancedMesh ref={mesh} args={[undefined,undefined,Math.max(1,seeds.length)]} count={seeds.length}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial color="#858b6b" roughness={1}/></instancedMesh><instancedMesh ref={foliage} args={[undefined,undefined,Math.max(1,seeds.length)]} count={seeds.length}><coneGeometry args={[1,1,5]}/><meshStandardMaterial color="#597d58" roughness={1}/></instancedMesh></group>;
}
export function Windrunners(){
  const rigs=useMemo(()=>Array.from({length:WINDRUNNER_COUNT},(_,i)=>({...createWindrunner(i),i})),[]);
  const trail=useMemo(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(WINDRUNNER_COUNT*32*3),3));g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(WINDRUNNER_COUNT*32*3),3));return g;},[]);
  const lights=useMemo(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(WINDRUNNER_COUNT*3),3));return g;},[]);
  useEffect(()=>{radiantSubjects.set('urithiru',{object:rigs[0].body,length:2,height:1.9,name:'Windrunner · Urithiru patrol'});return ()=>{radiantSubjects.delete('urithiru');rigs.forEach(r=>disposePlace({group:r.body} as PlaceModel));trail.dispose();lights.dispose();};},[rigs,trail,lights]);
  useFrame(()=>{
    const time=worldClock.time,positions=trail.getAttribute('position'),colors=trail.getAttribute('color');
    rigs.forEach(({body,limbs,i})=>{
      const pose=windrunnerPose(time,i);body.position.copy(pose.position);body.rotation.set(.12,pose.yaw,pose.bank);
      limbs.forEach((limb,j)=>{limb.rotation.x=Math.sin(time*2+i+j)*.07+(j%3===2?-.25:0);});
      lights.getAttribute('position').setXYZ(i,pose.position.x,pose.position.y+1.2,pose.position.z);
      for(let j=0;j<32;j++){const previous=windrunnerPose(time-j*.018,i);const k=i*32+j,fade=(1-j/32)*.65;positions.setXYZ(k,previous.position.x+Math.sin(j*.8+time)*j*.007,previous.position.y+1+j*.009,previous.position.z);colors.setXYZ(k,fade*.55,fade*.85,fade);}
    });positions.needsUpdate=true;colors.needsUpdate=true;lights.getAttribute('position').needsUpdate=true;
  });
  return <group name="Urithiru_Windrunner_patrol">{rigs.map(({body,i})=><primitive key={i} object={body}/>)}<points geometry={trail} frustumCulled={false}><shaderMaterial vertexColors transparent depthWrite={false} blending={T.AdditiveBlending} vertexShader="varying vec3 vTint;void main(){vTint=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(.06/max(.001,-p.z),.7,3.5);}" fragmentShader="varying vec3 vTint;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vTint,(1.-d)*.28);}"/></points><points geometry={lights} frustumCulled={false}><shaderMaterial transparent depthWrite={false} blending={T.AdditiveBlending} vertexShader="void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(8./max(.01,-p.z),2.,12.);}" fragmentShader="void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.55,.82,1.,pow(1.-d,2.)*.65);}"/></points></group>;
}
