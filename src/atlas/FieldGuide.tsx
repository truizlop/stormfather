import { HeadAssets } from './HeadAssets';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial, OrbitControls, useTexture } from '@react-three/drei';
import { X, Pause, Play, ArrowUpRight } from 'lucide-react';
import * as T from 'three';
import { buildPerson, animatePerson, type PersonKind } from './models/person';
import { buildCreature, animateCreature, type Species } from './models/creatures';
import { OrganicBuilder } from './models/organic';
import { disposePlace } from './models/dispose';
import type { PlaceModel } from './models/kit';
import { useAtlas } from './store';
import type { PlaceId } from './data';
import type { ExperienceId } from './experiences';
import { type PeopleCulture } from './models/peopleProfiles';
import './fieldGuide.css';

const specimens: {id:string;name:string;family:string;subtitle:string;description:string;person?:PersonKind;species?:Species;place:PlaceId;scene?:ExperienceId;cloth?:string;culture?:PeopleCulture}[]=[
  {id:'windrunner',name:'Windrunner',family:'The Radiant orders',subtitle:'Oaths written in light',description:'A fitted Alethi coat, a weathered traveling cloak and articulated steel shoulder plates. An anonymous representative of the Windrunners.',person:'radiant',place:'urithiru',scene:'radiant-arts',cloth:'#254661'},
  {id:'warform',name:'Warform',family:'The listeners',subtitle:'Armor that grows',description:'Interlocking carapace follows the brow, jaw and shoulders. Red and charcoal marbling distinguishes the living skin from its protective shell.',person:'warform',place:'shattered-plains',scene:'listener-village',cloth:'#776554'},
  {id:'workform',name:'Workform',family:'The listeners',subtitle:'Shaped for the everyday',description:'A lighter listener form, with smaller growth plates, swept-back hair and practical layered clothing.',person:'workform',place:'shattered-plains',scene:'listener-village',cloth:'#7a5b46'},
  {id:'resident',name:'Alethi traveler',family:'People of Roshar',subtitle:'Between one city and the next',description:'A traveling coat, worn leather boots and a brass fastening. Traders and travelers follow the sheltered streets beneath Kholinar’s windblades.',person:'resident',place:'kholinar',cloth:'#344c66'},
  {id:'azish',name:'Azish scholar',family:'People of Roshar',subtitle:'The language of law',description:'Dark skin, gathered hair and a long embroidered robe. Layered hems and warm metal fastenings distinguish this Azish representative.',person:'resident',culture:'azish',place:'azimir'},
  {id:'thaylen',name:'Thaylen merchant',family:'People of Roshar',subtitle:'Across the trading sea',description:'Long white eyebrows frame the face above a fitted teal coat, weathered leather and a trader’s shoulder strap.',person:'resident',culture:'thaylen',place:'thaylen-city'},
  {id:'veden',name:'Veden traveler',family:'People of Roshar',subtitle:'The roads of Jah Keved',description:'A burgundy traveling coat and long auburn hair, with individually shaped features and fitted, moving cloth.',person:'resident',culture:'veden',place:'vedenar'},
  {id:'shin',name:'Shin villager',family:'People of Roshar',subtitle:'On familiar earth',description:'Pale skin, short hair and a practical earth-colored tunic. Open eyes and softer tailoring distinguish this representative from the eastern peoples.',person:'resident',culture:'shin',place:'shinovar'},
  {id:'iriali',name:'Iriali traveler',family:'People of Roshar',subtitle:'A glimmer of the Long Trail',description:'Golden skin and hair, yellow eyes and long woven robes. These colors persist from the distant crowd to the closest view.',person:'resident',culture:'iriali',place:'kasitor'},
  {id:'purelaker',name:'Purelaker fisher',family:'People of Roshar',subtitle:'Where the water is warm',description:'Bare feet, a short layered wrap and dark hair. Practical clothing leaves the lower legs free for the shallow waters.',person:'resident',culture:'purelaker',place:'purelake'},
  {id:'reshi',name:'Reshi islander',family:'People of Roshar',subtitle:'Life upon the living islands',description:'Braided hair, dark skin and a light green wrap with warm shell-colored trim. A representative of the Reshi peoples, shown here in the field guide.',person:'resident',culture:'reshi',place:'urithiru'},
  {id:'aimian',name:'Siah Aimian',family:'The peoples of Aimia',subtitle:'An unfamiliar kind of human',description:'Blue skin, dark swept hair and a slender build distinguish this illustrative Siah Aimian. The figure represents one stable appearance of a people able to alter their bodies.',person:'resident',culture:'aimian',place:'akinah'},
  {id:'bridger',name:'Bridge runner',family:'People of Roshar',subtitle:'Across the broken plains',description:'Unarmored and burdened by the bridge, the runners race between exposed plateaus on the Shattered Plains.',person:'bridger',place:'shattered-plains',scene:'bridge-run'},
  {id:'hunter',name:'Greatshell hunter',family:'People of Roshar',subtitle:'Steel against carapace',description:'Overlapping forged plates, reinforced cuffs and a long spear offer uncertain protection against a charging greatshell.',person:'hunter',place:'shattered-plains',scene:'greatshell-hunt',cloth:'#5d6771'},
  {id:'chull',name:'Chull',family:'Native wildlife',subtitle:'A patient mountain of shell',description:'Six jointed limbs support a heavy, layered carapace. Pale growth rims, stalked eyes and leather freight harnesses bring the domestic carrier into focus.',species:'chull',place:'kholinar'},
  {id:'chasmfiend',name:'Chasmfiend',family:'The greatshells',subtitle:'The weight of the wild',description:'Eighteen jointed limbs, four foreclaws and a long armored body. Swept spines and hooked mandibles form a silhouette built for the chasms.',species:'chasmfiend',place:'shattered-plains',scene:'greatshell-hunt'},
  {id:'axehound',name:'Axehound',family:'Native wildlife',subtitle:'An unfamiliar companion',description:'A low, six-legged animal with overlapping back plates, fine antennae and curved mouthparts.',species:'axehound',place:'hearthstone'},
  {id:'skyeel',name:'Skyeel',family:'Native wildlife',subtitle:'Carried on the coastal air',description:'A long, tapering body and broad, ribbed fins carry this coastal hunter through the air above Kharbranth.',species:'skyeel',place:'kharbranth'},
  {id:'goat',name:'Shin goat',family:'Life in Shinovar',subtitle:'Beyond the mountains',description:'Split hooves, backward-curving horns, horizontal pupils and a small beard distinguish the familiar animal from Roshar’s native shell-bearing fauna.',species:'goat',place:'shinovar'},
  {id:'cremling',name:'Cremling',family:'Native wildlife',subtitle:'A small world underfoot',description:'Eight fine, jointed legs, sensitive antennae and overlapping plates. Enlarged here for inspection.',species:'cremling',place:'hearthstone'},
];
function Specimen({entry,playing,variant}:{entry:typeof specimens[number];playing:boolean;variant:number}) {
  const compact=useThree(s=>s.size.width<800);
  const actor=useMemo(()=>entry.person?buildPerson(variant,entry.person,entry.cloth,entry.culture):buildCreature(entry.species!),[entry,variant]);
  const time=useRef(0);
  const scale=useMemo(()=>{const size=new T.Box3().setFromObject(actor.group).getSize(new T.Vector3());return entry.person?1.42:3.5/Math.max(size.x,size.z,size.y);},[actor,entry]);
  useEffect(()=>()=>disposePlace({group:actor.group} as PlaceModel),[actor]);
  useFrame((_,dt)=>{if(playing)time.current+=Math.min(dt,.05);if('kind' in actor)animatePerson(actor,time.current,.25);else animateCreature(actor,entry.species!,time.current,.45);});
  return <group scale={scale*(compact&&entry.species? .64:1)} position={[0,entry.species==='skyeel'?1.35:.055,0]} rotation={[0,entry.person?-.22:2.8,0]}><primitive object={actor.group}/></group>;
}
function Court() {
  const source=useTexture(['cobble-color','cobble-normal','cobble-arm','brick-color','brick-normal'].map(n=>`${import.meta.env.BASE_URL}textures/realism/${n}.jpg`));
  const maps=useMemo(()=>source.map((t,i)=>{const m=t.clone();m.wrapS=m.wrapT=T.RepeatWrapping;m.repeat.set(i<3?14:12,i<3?14:3.5);m.colorSpace=i===0||i===3?T.SRGBColorSpace:T.NoColorSpace;m.anisotropy=8;m.needsUpdate=true;return m;}),[source]);
  const stoneMaps=useMemo(()=>[source[3],source[4]].map((t,i)=>{const m=t.clone();m.wrapS=m.wrapT=T.RepeatWrapping;m.colorSpace=i===0?T.SRGBColorSpace:T.NoColorSpace;m.anisotropy=8;m.needsUpdate=true;return m;}),[source]);
  const architecture=useMemo(()=>{
    const b=new OrganicBuilder();
    for(const side of [-1,1]) {
      for(let j=0;j<4;j++) {const x=side*(3.2+j*1.8);b.box([x,2.9,-4.5],[.3,5.8,.6],'#77776d');b.box([x,.19,-4.2],[.8,.38,1],'#5e6158');b.box([x,4.1,-4.15],[.64,.13,.9],'#9b9a87');}
      b.curve([[side*2.7,0,-4.15],[side*2.7,3.6,-4.15],[side*1.7,4.8,-4.15],[0,5.7,-4.15]],[.15,.15,.15,.15],'#aaa18a','stone',12,32);
    }
    const g=b.finish('court_architecture');g.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal'),uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.7?p.getZ(i):p.getX(i))/2;uv[i*2+1]=(Math.abs(n.getY(i))>.7?p.getZ(i):p.getY(i))/2;}o.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));o.material.map=stoneMaps[0];o.material.normalMap=stoneMaps[1];o.material.normalScale.set(.6,.6);o.material.roughness=.85;}});return g;
  },[stoneMaps]);
  useEffect(()=>()=>{stoneMaps.forEach(t=>t.dispose());maps.forEach(t=>t.dispose());disposePlace({group:architecture} as PlaceModel);},[maps,stoneMaps,architecture]);
  return <>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[28,28]}/>
      <MeshReflectorMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new T.Vector2(.55,.55)} color="#77817f" roughness={.72} metalness={.08} resolution={512} blur={[140,50]} mixBlur={.7} mixStrength={.8} mirror={.38} depthScale={.6} minDepthThreshold={.4} maxDepthThreshold={1.4}/>
    </mesh>
    <mesh position={[0,3.5,-10.7]} receiveShadow><boxGeometry args={[24,7,.5]}/><meshStandardMaterial map={maps[3]} normalMap={maps[4]} normalScale={new T.Vector2(.7,.7)} color="#75817e" roughness={.92}/></mesh>
    <primitive object={architecture} position={[0,0,-6]}/>
    {[-3.1,3.1].map((x,i)=><group key={x} position={[x,0,-1.6]}>
      <mesh position={[0,1.2,0]} castShadow><cylinderGeometry args={[.038,.065,2.4,12]}/><meshStandardMaterial color="#3b3931" metalness={.8} roughness={.3}/></mesh>
      <mesh position={[0,.09,0]} castShadow><cylinderGeometry args={[.18,.23,.18,8]}/><meshStandardMaterial color="#626456" roughness={.8}/></mesh>
      <mesh position={[0,2.45,0]}><cylinderGeometry args={[.12,.1,.33,8]}/><meshStandardMaterial color="#ffe1a2" emissive="#ffba63" emissiveIntensity={3} toneMapped={false}/></mesh>
      <mesh position={[0,2.66,0]} castShadow><coneGeometry args={[.22,.2,4]}/><meshStandardMaterial color="#82704e" metalness={.7} roughness={.35}/></mesh>
      <pointLight position={[0,2.45,.12]} color={i?'#ffcf8b':'#ffbe71'} intensity={20} distance={12} decay={2}/>
    </group>)}
  </>;
}
function GuideCamera({portrait}:{portrait:boolean}) {
 const {camera,controls}=useThree();
 useEffect(()=>{
   const orbit=controls as unknown as {target:T.Vector3;update:()=>void}|null;
   if(!orbit)return;
   camera.position.set(...(portrait?[.62,2.35,1.43]:[2.45,2.1,5.65]) as [number,number,number]);
   orbit.target.set(0,portrait?2.30:1.30,portrait?.11:0);orbit.update();
 },[camera,controls,portrait]);
 return null;
}
export function FieldGuide({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),[id,setId]=useState('resident'),[playing,setPlaying]=useState(true),[variant,setVariant]=useState(0),[portrait,setPortrait]=useState(false);
  const entry=specimens.find(s=>s.id===id)!;
  useEffect(()=>{const d=dialog.current;d?.showModal();return()=>d?.close();},[]);
  const visit=()=>{if(entry.scene)useAtlas.getState().startScene(entry.scene);else {useAtlas.getState().travel(entry.place);if(entry.species)useAtlas.getState().command('wildlife');else useAtlas.getState().setClose(true);}onClose();};
  return <dialog ref={dialog} className="field-guide" aria-label="Field guide to living Roshar" onCancel={onClose}>
    <div className="guide-scene"><Canvas shadows camera={{position:[3.6,2.35,5.8],fov:36,near:.05,far:80}} dpr={[1,1.5]} gl={{antialias:true,toneMapping:T.ACESFilmicToneMapping,toneMappingExposure:1.12}}>
      <color attach="background" args={['#101b22']}/><fog attach="fog" args={['#101b22',11,32]}/>
      <ambientLight intensity={.2}/><hemisphereLight args={['#b9cbd4','#817361',.7]}/><directionalLight position={[1,3,5]} color="#eee1cd" intensity={1.25}/>
      <directionalLight position={[-3,7,4]} color="#e4e9e5" intensity={1.9} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={7} shadow-camera-bottom={-5} shadow-bias={-.00015} shadow-normalBias={.02}/>
      <directionalLight position={[4,3,-2]} color="#8cbbd9" intensity={1.5}/>
      <Suspense fallback={null}><Environment resolution={64} environmentIntensity={.5}><Lightformer position={[-5,4,3]} scale={[5,6,1]} intensity={2} color="#d0e6f3"/><Lightformer position={[4,3,-3]} scale={[4,5,1]} intensity={3} color="#d3b586"/></Environment><HeadAssets/><Court/><Specimen key={`${id}-${variant}`} entry={entry} playing={playing} variant={variant}/></Suspense>
      <GuideCamera portrait={portrait&&Boolean(entry.person)}/>
      <OrbitControls makeDefault target={[0,1.3,0]} minDistance={.8} maxDistance={10} minPolarAngle={.35} maxPolarAngle={Math.PI*.49} enablePan={false}/>
    </Canvas></div>
    <header className="guide-header"><div><span className="guide-overline">STORMFATHER / FIELD GUIDE</span><p>The living world</p></div><button className="guide-close" aria-label="Close field guide" onClick={onClose}><X size={22}/></button></header>
    <section className="guide-copy"><span className="guide-overline">{entry.family}</span><h1>{entry.name}</h1><p className="guide-subtitle">{entry.subtitle}</p><p className="guide-description">{entry.description}</p>{entry.person&&<div className="guide-inspect"><div><button aria-pressed={!portrait} onClick={()=>setPortrait(false)}>Full figure</button><button aria-pressed={portrait} onClick={()=>setPortrait(true)}>Portrait</button></div><div><button aria-pressed={variant===0||entry.person==='bridger'} onClick={()=>setVariant(0)}>Male</button>{entry.person!=='bridger'&&<button aria-pressed={variant===1} onClick={()=>setVariant(1)}>Female</button>}</div></div>}{entry.id!=='aimian'&&<button className="guide-visit" onClick={visit}>Find in the world <ArrowUpRight size={17}/></button>}</section>
    <nav className="guide-specimens" aria-label="Inhabitants"><span className="guide-overline">SELECT A SUBJECT</span><div>{specimens.map(s=><button key={s.id} aria-pressed={id===s.id} onClick={()=>setId(s.id)}>{s.name}</button>)}</div></nav>
    <footer className="guide-footer"><span>Drag to orbit · scroll to inspect</span><button onClick={()=>setPlaying(p=>!p)} aria-label={playing?'Pause specimen':'Animate specimen'}>{playing?<Pause size={14}/>:<Play size={14}/>}<span>{playing?'In motion':'Paused'}</span></button><a className="guide-credit" href={`${import.meta.env.BASE_URL}models/inhabitants/ATTRIBUTION.md`} target="_blank" rel="noreferrer">Anatomy · Blender Studio / CC0</a><span className="guide-count">{String(specimens.findIndex(s=>s.id===id)+1).padStart(2,'0')} / {specimens.length}</span></footer>
  </dialog>;
}
