import {enableLogDepth,cameraNear,atmosphereRange,preserveFogVisibility} from './renderPrecision';
import {CityAtmosphere} from './CityAtmosphere';
import { useEffect,useMemo,useRef,useState } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { Html,OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as T from 'three';
import {cameraBlocked} from './cameraCollision';
import type {Obstacle} from './navigation';
import {wildlifeSubjects,radiantSubjects} from './subjects';
import {cityPlacements,placementById,toAtlas,toLocal,nearestCity,integratedGroundHeight,activeCityForCamera,cutCityFootprints,type CityPlacement} from './integration';
import { useAtlas,worldClock,advanceClock } from './store';
import { places } from './data';
import { atlasHeight } from './geographyModel';
import { countryLabels,frontiers } from '../world/cartography/frontiers';
import {Stormwall} from './Stormwall';
import {stormPosition} from './storm';
import { Ocean } from './Ocean';
import {BridgeRun,GreatshellHunt,ListenerVillage} from './Activities';
import {RadiantArts} from './RadiantArts';
import {Discoveries} from './Discoveries';
import {experienceById,discoveries,bridgeState,bridgeRunnerPose,huntState} from './experiences';
import { People } from './People';
import { Creatures } from './Creatures';
import {Rain,Rockbuds,Windrunners} from './LifeEffects';
import { useAtlasAssets, usePlaceAsset, type AtlasAssets } from './loading/useSceneAssets';
import type { PlaceId } from './data';
import type { PlaceModel } from './models/kit';

function ShaderPrecision(){
  const seen=useMemo(()=>new WeakSet<T.Material>(),[]);
  useFrame(({scene})=>scene.traverse(o=>{if(!('material' in o))return;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials)if(!seen.has(m)){if(m instanceof T.ShaderMaterial)enableLogDepth(m);preserveFogVisibility(m);seen.add(m);}}),-1);
  return null;
}
function Clock(){useFrame((_,delta)=>{const s=useAtlas.getState();advanceClock(delta,s.playing,s.speed,s.weather==='highstorm');},-2);return null;}
function Lighting(){
  const isLocal=useAtlas(s=>s.view==='place');const placeId=useAtlas(s=>s.placeId);const sceneId=useAtlas(s=>s.sceneId);const close=useAtlas(s=>s.closeView);const extent=(sceneId==='radiant-arts'?42:sceneId==='listener-village'?85:sceneId?140:close?85:placeId==='urithiru'?1400:900)*.002;
  const controls=useThree(s=>s.controls as OrbitControlsImpl|null);const camera=useThree(s=>s.camera);
  const haze=useMemo(()=>new T.Fog('#829da8',1.1,8),[]);
  const sun=useRef<T.DirectionalLight>(null);const ambient=useRef<T.HemisphereLight>(null);const scene=useThree(s=>s.scene);
  useFrame(()=>{const s=useAtlas.getState(),d=s.daylight;const exposure=s.placeId==='urithiru'&&s.view==='place'?0:s.placeId==='shinovar'&&s.view==='place'?.2:1;const storm=worldClock.storm*exposure;
    if(sun.current){sun.current.intensity=(.18+d*2.25)*(1-storm*.73);sun.current.color.set(d<.5?'#ffc98b':'#fffaf2');const p=placementById.get(s.placeId)!;const activity=s.sceneId?experienceById.get(s.sceneId):undefined;if(activity)toAtlas(p,activity.target,sun.current.target.position);else if(s.closeView&&controls?.target)sun.current.target.position.copy(controls.target);else sun.current.target.position.set(...p.origin);sun.current.target.updateMatrixWorld();
      const shadow=sun.current.shadow;shadow.bias=activity||s.closeView?-.00001:-.00005;shadow.normalBias=activity||s.closeView?.0001:.0015;shadow.camera.updateProjectionMatrix();sun.current.position.copy(sun.current.target.position).add(new T.Vector3(-4,10,4.5));}
    if(ambient.current)ambient.current.intensity=.4+d*.65;
    const viewingDistance=controls?camera.position.distanceTo(controls.target):100;const atmosphere=atmosphereRange(viewingDistance);haze.near=atmosphere.near;haze.far=atmosphere.far;
    scene.background=new T.Color('#152733').lerp(new T.Color('#829da8'),d*(1-storm*.6));haze.color.copy(scene.background);scene.fog=haze;
  });
  return <><hemisphereLight ref={ambient} args={['#c9e0e8','#535a48',1.2]}/><directionalLight ref={sun} position={[-400,1000,450]} intensity={2.4} castShadow={isLocal} shadow-mapSize={[2048,2048]} shadow-camera-left={-extent} shadow-camera-right={extent} shadow-camera-top={extent} shadow-camera-bottom={-extent} shadow-camera-near={.01} shadow-camera-far={25} shadow-bias={-.00005} shadow-normalBias={.0015}/></>;
}
function Borders(){
  const geometry=useMemo(()=>{const g=new T.BufferGeometry();const p:number[]=[];for(const f of frontiers)for(let i=1;i<f.points.length;i++){
    const a=f.points[i-1],b=f.points[i];const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);for(let j=0;j<steps;j++){if(j%3===2)continue;const t=j/steps,u=(j+1)/steps;const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,x2=a[0]+(b[0]-a[0])*u,z2=a[1]+(b[1]-a[1])*u;p.push(x,atlasHeight(x,z)+.08,z,x2,atlasHeight(x2,z2)+.08,z2);}}
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));return g;},[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);return <lineSegments geometry={geometry}><lineBasicMaterial color="#ddd0a3" transparent opacity={.5}/></lineSegments>;
}
function MapWorld({assets}:{assets:AtlasAssets}){
  const stormFollowing=useAtlas(s=>s.stormFollowing);const compact=useThree(s=>s.size.width<760);const local=useAtlas(s=>s.view==='place');const placeId=useAtlas(s=>s.placeId);
  const coastMaterial=useMemo(()=>{const m=new T.MeshStandardMaterial({color:'#b9b08e',roughness:1,side:T.DoubleSide});cutCityFootprints(m);return m;},[]);
  // Heightfields expose only their upper surface; backfaces flicker along grazing ridges.
  const landMaterial=useMemo(()=>{const m=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.FrontSide});return m;},[]);
  const {land,coast}=assets;const labels=useAtlas(s=>s.labels);const borders=useAtlas(s=>s.borders);const focus=useAtlas(s=>s.focusPoint);

  return <><mesh geometry={land} material={landMaterial}/><mesh geometry={coast} material={coastMaterial}/><Ocean atlas/>{borders&&<Borders/>}{labels&&!local&&!stormFollowing&&<>
    {places.filter(p=>!local||p.id!==placeId).map(p=><Html key={p.id} position={[p.anchor[0],atlasHeight(...p.anchor)+.15,p.anchor[1]]} zIndexRange={[20,0]}><button className="map-pin" aria-label={p.id==='akinah'?'Aimia region: open Akinah':p.name} onClick={()=>useAtlas.getState().travel(p.id)}><span className="map-pin-dot"/><span className={compact&&!['shinovar','urithiru','kholinar','thaylen-city','purelake'].includes(p.id)?'sr-only':undefined}>{p.id==='akinah'?'Aimia · Akinah ↗':p.name}</span></button></Html>)}
    {countryLabels.filter(c=>!local&&c.emphasis==='major'&&!['shinovar','thaylenah'].includes(c.id)).map(c=><Html key={c.id} position={[c.position[0],atlasHeight(...c.position)+.2,c.position[1]]} zIndexRange={[10,0]}><span className={`map-country map-country-${c.id}`}>{c.name}</span></Html>)}
    <Html position={[57,0,-25]} zIndexRange={[5,0]}><span className="ocean-label">Ocean of Origins</span></Html><Html position={[-51,0,22]} zIndexRange={[5,0]}><span className="ocean-label">Endless Ocean</span></Html><Html position={[9,0,34]} zIndexRange={[5,0]}><span className="ocean-label">Southern Depths</span></Html>
  </>}{focus&&<mesh position={[focus[0],atlasHeight(...focus)+.4,focus[1]]}><sphereGeometry args={[.5,12,8]}/><meshBasicMaterial color="#b2efe2"/></mesh>}<Stormwall/></>;
}
function CityGround({placement,geometry}:{placement:CityPlacement;geometry:T.BufferGeometry}){
  const material=useMemo(()=>{
    const m=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.FrontSide});
    if(placement.id==='rall-elorim'){
      m.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec2 vReservoir;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvReservoir=position.xz;');
        shader.fragmentShader='varying vec2 vReservoir;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(distance(vReservoir,vec2(0.,158.))<181.)discard;');
      };
      m.customProgramCacheKey=()=> 'rall-reservoir-bank';
    }
    return m;
  },[placement.id]);
  useEffect(()=>()=>material.dispose(),[material]);
  return <mesh position={placement.origin} scale={placement.scale} geometry={geometry} material={material} receiveShadow/>;
}
function PlaceWorld({model,placement,active}:{model:PlaceModel;placement:CityPlacement;active:boolean}){
  const sceneId=useAtlas(s=>s.sceneId);const people=useAtlas(s=>s.people),creatures=useAtlas(s=>s.creatures),radiants=useAtlas(s=>s.radiants);
  useFrame(()=>{const night=1-useAtlas.getState().daylight;model.group.children.forEach(child=>{const mesh=child as T.Mesh;const m=mesh.material as T.MeshStandardMaterial;if(child.name.endsWith('_window'))m.emissiveIntensity=night*.8;});});
  return <group position={placement.origin} scale={placement.scale} name={`Integrated_${model.id}`}><primitive object={model.group}/>{active&&<>{people&&<People model={model}/>} {creatures&&!(model.id==='shattered-plains'&&sceneId==='greatshell-hunt')&&<Creatures model={model}/>}<CityAtmosphere model={model}/><Rain model={model}/><Rockbuds model={model}/>{radiants&&model.id==='urithiru'&&<><Windrunners/><RadiantArts/></>}<Discoveries place={model.id}/>{model.id==='shattered-plains'&&<>{people&&<><BridgeRun/><ListenerVillage/></>}{sceneId==='greatshell-hunt'&&creatures&&people&&<GreatshellHunt/>}</>}</>}{model.water&&<Ocean {...model.water} size={placement.radius*3.3} clipRadius={placement.radius*1.64}/>}</group>;
}
function Camera({models}:{models:Map<string,PlaceModel>}){
  const ref=useRef<OrbitControlsImpl>(null),camera=useThree(s=>s.camera),size=useThree(s=>s.size),s=useAtlas();
  const eye=useRef(new T.Vector3()),target=useRef(new T.Vector3()),moving=useRef(true),initialized=useRef(false),following=useRef(false),followSide=useRef(1),lastCommand=useRef(-1),lastSize=useRef(''),sceneTracking=useRef(false);
  const followOffset=useMemo(()=>new T.Vector3(),[]),localEye=useMemo(()=>new T.Vector3(),[]),localTarget=useMemo(()=>new T.Vector3(),[]);
  const model=s.view==='place'?models.get(s.placeId):undefined,placement=model?placementById.get(model.id):undefined;
  const cameraBoxes=useMemo(()=>{const boxes:Obstacle[]=[];model?.group.traverse(o=>{if(o.userData.cameraObstacles)boxes.push(...o.userData.cameraObstacles);});return boxes;},[model]);
  useEffect(()=>{
    const control=ref.current;if(!control||(s.view==='place'&&!model))return;
    // Crossing a zoom threshold updates the HUD without issuing a camera jump.
    const dimensions=`${size.width}:${size.height}`;if(lastCommand.current===s.cameraCommand.id&&lastSize.current===dimensions&&initialized.current)return;lastSize.current=dimensions;
    lastCommand.current=s.cameraCommand.id;
    const command=s.cameraCommand.type,aspect=size.width/size.height,fitDistance=140/(2*Math.tan(42*Math.PI/360)*aspect);
    following.current=command==='wildlife'||command==='radiants';sceneTracking.current=command==='scene'&&['bridge-run','greatshell-hunt'].includes(s.sceneId??'');
    if(following.current){const subject=model&&(command==='radiants'?radiantSubjects:wildlifeSubjects).get(model.id);if(subject){followSide.current=subject.name.startsWith('Chasmfiend')?1:-1;useAtlas.getState().set({selectedActor:subject.name});}}
    else if(command==='storm'){const front=stormPosition(worldClock.stormTime);target.current.set(front.x,7,0);eye.current.set(front.x-48,29,58);}
    else if(command==='in'||command==='out'){
      target.current.copy(control.target);eye.current.copy(camera.position).sub(control.target).multiplyScalar(command==='in'?.65:1.6).add(control.target);
    }else if(command==='north'){
      target.current.copy(model&&placement?toAtlas(placement,model.overview.target):new T.Vector3(-6,0,0));
      const height=model&&placement?Math.max(model.radius*1.65,model.radius*1.2/(2*Math.tan(42*Math.PI/360)*aspect))*placement.scale:Math.max(140,fitDistance);eye.current.copy(target.current).add(new T.Vector3(0,height,.00001));
    }else if(command==='scene'&&s.sceneId&&placement){
      const activity=experienceById.get(s.sceneId)!,aerial=s.sceneId==='radiant-arts'&&['windrunner','skybreaker'].includes(s.orderId);
      toAtlas(placement,activity.eye,eye.current);toAtlas(placement,activity.target,target.current);
      eye.current.sub(target.current).multiplyScalar((s.sceneId==='radiant-arts'&&s.sceneClose?(aerial?.6:.5):1)*Math.max(1,.95/aspect)).add(target.current);
      if(aerial&&s.sceneClose){eye.current.y+=3*placement.scale;target.current.y+=3*placement.scale;}
    }else if(command==='discovery'&&s.discoveryId&&placement){const d=discoveries.find(d=>d.id===s.discoveryId)!;toAtlas(placement,d.position,target.current);eye.current.copy(target.current).add(new T.Vector3(4,3.3,6).multiplyScalar(placement.scale*Math.max(1,.9/aspect)));
    }else if(model&&placement){const pose=s.closeView?model.close:model.overview;toAtlas(placement,pose.eye,eye.current);toAtlas(placement,pose.target,target.current);if(!s.closeView)eye.current.sub(target.current).multiplyScalar(Math.max(1,(size.width<760?1.05:1.5)/aspect)).add(target.current);}
    else if(s.focusPoint){target.current.set(s.focusPoint[0],atlasHeight(...s.focusPoint),s.focusPoint[1]);eye.current.copy(target.current).add(new T.Vector3(0,36,28));}
    else{eye.current.set(size.width<760?-4:-10,Math.max(113,fitDistance*.94),Math.max(60,fitDistance*.43));target.current.set(size.width<760?-4:-12,0,0);}
    moving.current=true;if(!initialized.current){camera.position.copy(eye.current);control.target.copy(target.current);control.update();initialized.current=true;}
  },[camera,model,placement,s.view,s.cameraCommand,s.closeView,s.focusPoint,s.sceneId,s.sceneClose,s.orderId,s.discoveryId,size.width,size.height]);
  useFrame((_,dt)=>{const control=ref.current;if(!control)return;
    const state=useAtlas.getState();const subject=model&&following.current?(state.cameraCommand.type==='radiants'?radiantSubjects:wildlifeSubjects).get(model.id):undefined;
    if(state.stormFollowing){const front=stormPosition(worldClock.stormTime),fit=Math.max(1,.78/(size.width/size.height));target.current.set(front.x,7,0);eye.current.copy(target.current).add(new T.Vector3(-48,23,58).multiplyScalar(fit));moving.current=true;}
    if(sceneTracking.current&&placement&&state.sceneId){
      const time=worldClock.time-state.sceneStartedAt;
      if(state.sceneId==='bridge-run'){const bridge=bridgeState(time),crew=bridgeRunnerPose(time,20);localTarget.set((bridge.x+crew.position[0])*.5,1.2,298);localEye.copy(localTarget).add(new T.Vector3(-22,16,28).multiplyScalar(Math.max(1,.95/(size.width/size.height))));}
      else{const hunt=huntState(time),distance=60+(-216-hunt.x)*.7;localTarget.set((hunt.x-216)*.5,3,510);localEye.copy(localTarget).add(new T.Vector3(0,distance*.43,distance).multiplyScalar(Math.max(1,.95/(size.width/size.height))));}
      toAtlas(placement,localTarget,target.current);toAtlas(placement,localEye,eye.current);moving.current=true;
    }
    if(subject&&placement){
      localTarget.copy(subject.object.position);localTarget.y+=subject.height*.5;
      const radiant=state.cameraCommand.type==='radiants';
      const distance=(radiant?14:Math.max(3,subject.length*1.65,subject.height*3))*Math.max(1,.8/(size.width/size.height));
      const candidate=(side:number,lift=0)=>{followOffset.set(0,(radiant?5:Math.max(1.8,subject.length*.35))+lift,distance*side).applyAxisAngle(T.Object3D.DEFAULT_UP,subject.object.rotation.y);localEye.copy(localTarget).add(followOffset);};
      candidate(followSide.current);
      if(cameraBlocked(localTarget,localEye,cameraBoxes)){candidate(-followSide.current);if(!cameraBlocked(localTarget,localEye,cameraBoxes))followSide.current*=-1;else candidate(followSide.current,9);}
      toAtlas(placement,localTarget,target.current);toAtlas(placement,localEye,eye.current);moving.current=true;
      if(!state.selectedActor)state.set({selectedActor:subject.name});
    }
    if(moving.current&&!following.current&&!['scene','discovery','storm'].includes(state.cameraCommand.type))eye.current.y=Math.max(eye.current.y,integratedGroundHeight(eye.current.x,eye.current.z)+Math.max(.004,eye.current.distanceTo(target.current)*.07));
    if(moving.current){const rate=1-Math.exp(-dt*3.8);camera.position.lerp(eye.current,rate);control.target.lerp(target.current,rate);if(camera.position.distanceTo(eye.current)<.000015)moving.current=false;control.update();}
    const distance=camera.position.distanceTo(control.target);
    if(!following.current&&distance>.15&&!['scene','discovery','storm'].includes(state.cameraCommand.type))camera.position.y=Math.max(camera.position.y,integratedGroundHeight(camera.position.x,camera.position.z)+Math.max(.004,distance*.025));
    if(camera instanceof T.PerspectiveCamera){const near=cameraNear(distance);if(Math.abs(camera.near-near)>near*.05){camera.near=near;camera.updateProjectionMatrix();}}
    if(!moving.current&&!following.current&&lastCommand.current===state.cameraCommand.id){
      const nearby=nearestCity(control.target,3.5);
      if(nearby&&distance<14&&(state.view!=='place'||state.placeId!==nearby.id))state.set({view:'place',placeId:nearby.id,closeView:false,exploreOpen:false});
      else if(distance>32&&state.view==='place')state.set({view:'atlas',closeView:false,selectedActor:null});
    }
    // Wheel zoom has no artificial continent/local barrier. Close approach uses
    // the same metric ground clearance as the street presets.
    if(placement&&distance<.2&&!following.current&&!['scene','discovery','storm'].includes(state.cameraCommand.type)){const local=toLocal(placement,camera.position);if(local.y<1){camera.position.y=placement.origin[1]+placement.scale;}}
  });
  return <OrbitControls ref={ref} makeDefault enableDamping dampingFactor={.08} minDistance={.003} maxDistance={Math.max(300,200*size.height/size.width)} maxPolarAngle={Math.PI*.48} zoomSpeed={2.2} zoomToCursor onStart={()=>{moving.current=false;following.current=false;sceneTracking.current=false;if(useAtlas.getState().stormFollowing)useAtlas.getState().set({stormFollowing:false});}}/>;
}
function Contents({assets}:{assets:AtlasAssets}){
  const [near,setNear]=useState<PlaceId|null>(null);const lastCheck=useRef(0);
  const selected=useAtlas(s=>s.view==='place'?s.placeId:null);
  const model=usePlaceAsset(selected??near);
  const models=useMemo(()=>new Map(model?[[model.id,model]]:[]),[model]);
  useFrame(({camera,clock})=>{if(clock.elapsedTime-lastCheck.current<.25)return;lastCheck.current=clock.elapsedTime;
    const state=useAtlas.getState();const best=activeCityForCamera(camera.position,state.view==='place'?state.placeId:undefined);
    if(best!==near)setNear(best);
  });
  return <><Clock/><ShaderPrecision/><Lighting/><MapWorld assets={assets}/>{cityPlacements.map(p=><CityGround key={p.id} placement={p} geometry={assets.collars.get(p.id)!}/>)}{model&&<PlaceWorld key={model.id} model={model} placement={placementById.get(model.id)!} active={near===model.id}/>}<Camera models={models}/></>;
}
export function Scene(){
  const assets=useAtlasAssets();
  return <Canvas shadows="percentage" camera={{position:[-10,113,60],fov:42,near:.1,far:2000}} dpr={[1,1.5]} gl={{logarithmicDepthBuffer:true,antialias:true,powerPreference:'high-performance',toneMapping:T.ACESFilmicToneMapping,toneMappingExposure:1}}>{assets&&<Contents assets={assets}/>}</Canvas>;
}
