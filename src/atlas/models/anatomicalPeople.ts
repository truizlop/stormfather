import * as T from 'three';
import { OrganicBuilder, loft } from './organic';
import { createInhabitantHair, createScalpMaterial } from './inhabitantHair';
import { addTailoredLayers, addGrownCarapace, addFacialCarapace } from './inhabitantTailoring';
import { peopleProfiles, type PersonAppearance } from './peopleProfiles';
import type { PersonRig } from './person';

type BodySources = Record<'male'|'female',T.BufferGeometry>;
let sources:BodySources|undefined;
let skinAtlas:T.Texture|undefined,clothAtlas:T.Texture|undefined;
let shellTextures:{color:T.Texture;height:T.Texture}|undefined;
const waiting=new Set<WeakRef<PersonRig>>();
const appearance=new WeakMap<PersonRig,PersonAppearance>();
const owned=new WeakMap<PersonRig,T.Object3D[]>();
const smooth=(a:number,b:number,x:number)=>T.MathUtils.smoothstep(x,a,b);

export function installAnatomicalPeople(next:BodySources,skinTexture?:T.Texture,clothTexture?:T.Texture,chitin?:{color:T.Texture;height:T.Texture}) {
  if(sources?.male===next.male&&sources?.female===next.female)return;
  sources=next;skinAtlas=skinTexture;clothAtlas=clothTexture;shellTextures=chitin;
  for(const ref of waiting){const rig=ref.deref();if(rig)rebuild(rig);}waiting.clear();
}
export function registerAnatomicalPerson(rig:PersonRig,look:PersonAppearance) {
  appearance.set(rig,look);owned.set(rig,[...rig.group.children]);
  if(sources)rebuild(rig);else waiting.add(new WeakRef(rig));
}
/** Pool reassignment updates identity as well as color, once per resident change. */
export function setPersonAppearance(rig:PersonRig,look:PersonAppearance) {
  const previous=appearance.get(rig);
  if(previous&&JSON.stringify(previous)===JSON.stringify(look))return;
  appearance.set(rig,look);
  if(sources)rebuild(rig);
}
function disposeMeshes(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());if(o instanceof T.SkinnedMesh)o.skeleton.dispose();}});}

/** Compact subsets keep hidden skin out of the render and out of bounds checks. */
function subset(source:T.BufferGeometry,keep:(x:number,y:number,z:number)=>boolean,move?:(v:T.Vector3,n:T.Vector3)=>void) {
  const p=source.getAttribute('position'),n=source.getAttribute('normal'),idx=source.index!;
  const positions:number[]=[],normals:number[]=[],indices:number[]=[],uv:number[]=[],faceUV:number[]=[],map=new Map<number,number>();
  const v=new T.Vector3(),normal=new T.Vector3();
  for(let i=0;i<idx.count;i+=3){
    const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
    if(!keep((p.getX(a)+p.getX(b)+p.getX(c))/3,(p.getY(a)+p.getY(b)+p.getY(c))/3,(p.getZ(a)+p.getZ(b)+p.getZ(c))/3))continue;
    for(const k of [a,b,c]){let j=map.get(k);if(j===undefined){j=positions.length/3;map.set(k,j);v.fromBufferAttribute(p,k);normal.fromBufferAttribute(n,k);move?.(v,normal);positions.push(...v.toArray());normals.push(...normal.toArray());uv.push(.5+Math.atan2(v.x,v.z)/(2*Math.PI),v.y/1.78);const f=source.getAttribute('faceUv');faceUV.push(f?f.getX(k):0,f?f.getY(k):0);}indices.push(j);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('faceUv',new T.Float32BufferAttribute(faceUV,2));g.setIndex(indices);g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.computeBoundingSphere();return g;
}
function material(surface:string,color:string,look:PersonAppearance){
  if(surface==='grown-shell'){
    const shell=new T.MeshPhysicalMaterial({color:shellTextures?'#dcc6b2':'#754333',map:shellTextures?.color??null,bumpMap:shellTextures?.height??null,bumpScale:.002,roughness:.66,specularIntensity:.32,clearcoat:.12,clearcoatRoughness:.6});
    shell.userData.surface=surface;return shell;
  }
  const m=new T.MeshPhysicalMaterial({color,roughness:surface==='skin'?.58:surface==='hair'?.57:surface==='cloth'?.9:surface==='leather'?.62:surface==='carapace'?.48:.36,metalness:surface==='metal'?.82:0});
  m.userData.surface=surface;
  if(surface==='cloth'){m.sheen=.25;m.sheenColor.set(color).lerp(new T.Color('#d1c6b0'),.3);m.sheenRoughness=.8;}
  if(surface==='skin'){m.specularIntensity=.42;m.clearcoat=.06;m.clearcoatRoughness=.7;if(look.culture==='iriali'){m.metalness=.12;m.sheen=.25;m.sheenColor.set('#d4ad67');}}
  if(surface==='carapace'){m.clearcoat=.22;m.clearcoatRoughness=.55;m.specularIntensity=.42;}
  if(surface==='hair'){m.anisotropy=0;m.specularIntensity=.3;m.sheen=.35;m.sheenColor.set(color).lerp(new T.Color('#af9271'),.22);}
  // Rest-position detail follows the deforming mesh, with distinct physical
  // responses for pores, woven fibers and rubbed leather. No baked highlights.
  if(['skin','cloth','leather','hair','carapace'].includes(surface)){
    m.onBeforeCompile=shader=>{
      shader.vertexShader=(surface==='skin'?'attribute vec2 faceUv; varying vec2 vFaceUv;\n':'')+'varying vec3 vRestSurface;\n'+shader.vertexShader;
      if(surface==='skin'){shader.uniforms.skinAtlas={value:skinAtlas??null};shader.fragmentShader='uniform sampler2D skinAtlas; varying vec2 vFaceUv;\n'+shader.fragmentShader;}
      if(surface==='cloth'){shader.uniforms.clothAtlas={value:clothAtlas??null};shader.fragmentShader='uniform sampler2D clothAtlas;\n'+shader.fragmentShader;}
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRestSurface=position;'+(surface==='skin'?'vFaceUv=faceUv;':''));
      shader.fragmentShader=`varying vec3 vRestSurface;
// Hash absolute lattice corners: scalar sine offsets magnified floating-point
// differences into visible discontinuities at adjacent cell boundaries.
float personHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float personNoise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(personHash(i),personHash(i+vec3(1,0,0)),f.x),mix(personHash(i+vec3(0,1,0)),personHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(personHash(i+vec3(0,0,1)),personHash(i+vec3(1,0,1)),f.x),mix(personHash(i+vec3(0,1,1)),personHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
`+shader.fragmentShader;
      const marble=look.culture==='singer'&&surface==='skin'?`
vec3 flow=vRestSurface*vec3(25.,16.,25.);
flow+=vec3(personNoise(vRestSurface*21.),personNoise(vRestSurface*19.+4.),personNoise(vRestSurface*23.+8.))*2.5;
float field=personNoise(flow)+personNoise(flow*2.7)*.32+personNoise(flow*7.1)*.14;
vec3 pigment=mix(vec3(.075,.036,.027),vec3(.27,.105,.063),smoothstep(.50,.78,field));
float veins=(1.-smoothstep(.009,.04,abs(field-.76)))*.40;
pigment=mix(pigment,vec3(.46,.34,.25),veins);
diffuseColor.rgb=pigment;`:'';
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float grain=personNoise(vRestSurface*${surface==='skin'?'800.':surface==='hair'?'1600.':'480.'});
float wear=personNoise(vRestSurface*${surface==='skin'?'45.':'85.'});
diffuseColor.rgb*= ${surface==='cloth'?'(.86+.18*wear)*(.93+.09*grain)':surface==='skin'?'(.94+.09*wear)':surface==='hair'?'(.7+.5*grain)':'(.78+.28*wear)'};
${marble}
${surface==='skin'&&skinAtlas?`vec3 faceColor=texture2D(skinAtlas,vFaceUv).rgb;float faceBlend=smoothstep(1.505,1.55,vRestSurface.y)*smoothstep(.01,.08,vRestSurface.z)*(1.-smoothstep(.080,.102,abs(vRestSurface.x)));vec3 faceVariation=clamp(faceColor/vec3(.30,.145,.078),vec3(.32),vec3(1.7));diffuseColor.rgb*=mix(vec3(1.),faceVariation,faceBlend*.9);`:''}
${surface==='cloth'&&clothAtlas?`float fiber=texture2D(clothAtlas,vRestSurface.xy*8.+vRestSurface.zz*2.).r;diffuseColor.rgb*=clamp(.80+fiber*.7,.88,1.13);`:''}
${surface==='skin'&&look.sex==='male'&&look.culture!=='singer'&&peopleProfiles[look.culture].hairStyle!=='short'?`float beard=smoothstep(1.525,1.55,vRestSurface.y)*(1.-smoothstep(1.59,1.625,vRestSurface.y))*smoothstep(.08,.12,vRestSurface.z);float mouth=(1.-smoothstep(.016,.03,abs(vRestSurface.x)))*smoothstep(1.58,1.59,vRestSurface.y)*(1.-smoothstep(1.598,1.61,vRestSurface.y));diffuseColor.rgb*=1.-beard*(1.-mouth)*(.20+grain*.24);`:''}
`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(grain-.5)*.12,.12,1.);`);
    };
    m.customProgramCacheKey=()=>`inhabitant-v5-${surface}-${look.culture}-${look.variant%2}-${look.sex}-${skinAtlas?'textured':'plain'}`;
  }
  return m;
}
function rigSkeleton(rig:PersonRig){
  const joints=[rig.group,rig.head,...rig.arms,...rig.forearms,...rig.legs,...rig.knees];
  // Existing semantic groups remain stable for flying/carrying activity callers.
  const bones=joints.map((joint,i)=>{const bone=new T.Bone();bone.name=['spine','head','upper_arm_L','upper_arm_R','forearm_L','forearm_R','thigh_L','thigh_R','calf_L','calf_R'][i];joint.add(bone);return bone;});
  rig.group.updateMatrixWorld(true);return new T.Skeleton(bones);
}
function weights(x:number,y:number,z:number,cloth=false):[number,number,number]{
  const side=x>0?1:0,ax=Math.abs(x);
  if(y>1.47&&ax<.15)return [0,1,smooth(1.46,1.54,y)];
  const armBoundary=.185+Math.max(0,1.35-y)*.23;
  if(y>.74&&ax>armBoundary){
    const elbow=smooth(1.11,1.25,y);
    if(y>1.35)return [0,2+side,smooth(.16,.225,ax)];
    return [4+side,2+side,elbow];
  }
  if(y<.94){
    if(y>.79)return [6+side,0,smooth(.79,.94,y)];
    if(cloth&&ax<.09)return [6,7,smooth(-.1,.1,x)];
    return [8+side,6+side,smooth(.39,.55,y)];
  }
  return [0,0,0];
}
function bind(g:T.BufferGeometry,m:T.Material,skeleton:T.Skeleton,rig:PersonRig,name:string,cloth=false){
  const p=g.getAttribute('position'),indices:number[]=[],values:number[]=[];
  for(let i=0;i<p.count;i++){const [a,b,t]=weights(p.getX(i),p.getY(i),p.getZ(i),cloth);indices.push(a,b,0,0);values.push(1-t,t,0,0);}
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(values,4));
  const mesh=new T.SkinnedMesh(g,m);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;rig.group.add(mesh);mesh.bind(skeleton,new T.Matrix4());return mesh;
}
function rebuild(rig:PersonRig){
  if(!sources)return;
  const look=appearance.get(rig)!;const profile=peopleProfiles[look.culture];
  const singer=look.culture==='singer',bare=rig.kind==='bridger',war=rig.kind==='warform',armor=war||rig.kind==='hunter'||rig.kind==='radiant';
  let effect:T.MeshStandardMaterial|undefined;rig.group.traverse(o=>{if(!effect&&o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.transparent&&o.material.opacity<.8)effect=o.material;});
  const parent=rig.group.parent;rig.group.removeFromParent();
  const pose={position:rig.group.position.clone(),quaternion:rig.group.quaternion.clone(),scale:rig.group.scale.clone()};
  rig.group.position.set(0,0,0);rig.group.quaternion.identity();rig.group.scale.setScalar(1);
  // Preserve externally attached cargo, weapons and effects. Dispose only the
  // model-owned roots, while retaining the semantic animation group objects.
  const joints=[rig.head,...rig.arms,...rig.forearms,...rig.legs,...rig.knees,rig.coat];
  const transforms=joints.map(j=>j.quaternion.clone());
  for(const j of joints){for(const c of [...j.children])if(c instanceof T.Mesh||c instanceof T.Bone||c.userData.anatomicalDetail){j.remove(c);disposeMeshes(c);}j.quaternion.identity();}
  for(const child of owned.get(rig)??[]){if(!joints.includes(child as T.Group)&&child!==rig.weapon){rig.group.remove(child);disposeMeshes(child);}}
  rig.head.position.set(0,1.5,0);
  for(const [i,side] of [-1,1].entries()){
    rig.arms[i].position.set(side*.208,1.435,.004);rig.forearms[i].position.set(side*.112,-.263,.02);
    rig.legs[i].position.set(side*.103,.88,-.02);rig.knees[i].position.set(side*.05,-.412,-.015);
  }
  rig.coat.position.set(0,0,0);
  const skeleton=rigSkeleton(rig),made:T.Object3D[]=[];
  const source=sources[look.sex].clone(),p=source.getAttribute('position');
  const faceUV=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){faceUV[i*2]=p.getX(i)/.62+(look.sex==='male'?.25:.75);faceUV[i*2+1]=(p.getY(i)-1.58)/(.62/1.5)+.5;}source.setAttribute('faceUv',new T.BufferAttribute(faceUV,2));
  // Small regional/individual shape changes deform the anatomical surface,
  // keeping lips, nose, eyelids and ears connected. They are representatives.
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),z=p.getZ(i);const y=p.getY(i);
    const head=smooth(1.48,1.56,y),face=head*smooth(.045,.1,z);
    const cheek=Math.exp(-Math.pow((y-1.635)/.055,2));
    x*=1+head*((singer?.13:look.culture==='azish'?.045:look.culture==='aimian'?-.07:0)+((look.variant%3)-1)*.025);
    x+=Math.sign(x)*cheek*face*(look.culture==='shin'?-.0015:.0035);
    if(look.culture!=='shin')z-=face*Math.exp(-Math.pow(x/.02,2)-Math.pow((y-1.663)/.032,2))*.005;
    if(singer){x*=1+.1*(1-head);z*=1+.09*(1-head);}
    if(look.culture==='aimian'){x*=.95;}
    p.setXYZ(i,x,y,z);
  }
  // Preserve the smooth source normals across UV seams and cropped boundaries.
  const torso=(x:number,y:number)=>Math.abs(x)<.185+Math.max(0,1.35-y)*.23;
  const skin=subset(source,(x,y)=>y>1.48||(Math.abs(x)>(profile.garment==='wrap'?.29:.35)&&y<(profile.garment==='wrap'?1.20:.995))||(profile.barefoot&&y<.60)||((bare||war)&&(y>.91||y<.44)));
  made.push(bind(skin,material('skin',look.skin,look),skeleton,rig,'continuous_anatomy'));
  const clothMove=(v:T.Vector3,n:T.Vector3)=>{
    const waist=smooth(.79,.98,v.y)*(1-smooth(1.22,1.45,v.y));
    const tension=Math.exp(-Math.pow((v.y-1.06)/.075,2))+Math.exp(-Math.pow((v.y-1.175)/.065,2))*(torso(v.x,v.y)?.12:1);
    const folds=Math.sin(v.y*83+Math.abs(v.x)*30)*.006*tension+Math.sin(v.x*72+v.y*9)*.002*waist;
    const fullness=look.sex==='female'&&torso(v.x,v.y)?.009:0;
    v.addScaledVector(n,(v.y>1.48?.008:.019)+fullness+folds+waist*.008);v.y=Math.min(v.y,1.531);
    if(v.y>1.487&&Math.abs(v.x)<.15){
      const t=smooth(1.487,1.520,v.y),center=.022+t*.015;
      const angle=Math.atan2((v.z-center)/.075,v.x/.11),rx=.123-t*.035,rz=.089-t*.021;
      v.x=T.MathUtils.lerp(v.x,Math.cos(angle)*rx,t);
      const fittedZ=T.MathUtils.lerp(v.z,center+Math.sin(angle)*rz,t);
      v.z=v.z<center?Math.min(v.z,fittedZ):Math.max(v.z,fittedZ);
    }
    if(torso(v.x,v.y)&&v.y<1.42){
      const chest=Math.exp(-Math.pow((v.y-1.29)/.17,2)),rx=.20+chest*.01;
      const envelope=Math.sqrt(Math.max(0,1-Math.pow(v.x/rx,2)))*(.153+chest*(look.sex==='female'?.045:.016));
      const blend=smooth(.97,1.06,v.y)*(1-smooth(1.35,1.42,v.y));
      if(v.z>0)v.z=T.MathUtils.lerp(v.z,Math.max(v.z,envelope+folds),blend);
    }
    if(torso(v.x,v.y))v.y=Math.max(.96,v.y);
    else if(profile.garment!=='wrap'){const side=Math.sign(v.x),cut=(v.x-side*.397)*side*.34-(v.y-.99)*.94;if(cut>0){v.x-=side*.34*cut;v.y+=.94*cut;}}
  };
  if(!bare&&!war){
    const top=subset(source,(x,y)=>y>.95&&y<1.520&&(torso(x,y)||y>(profile.garment==='wrap'?1.19:.965)),clothMove);
    top.computeVertexNormals();made.push(bind(top,material('cloth',look.cloth,look),skeleton,rig,'fitted_jacket_and_sleeves',true));
  }
  const garmentLength=profile.garment==='robe'?.80:profile.garment==='coat'?.49:profile.garment==='tunic'?.37:.30;
  const trousers=subset(source,(x,y,z)=>y>(profile.barefoot?.58:bare?.40:.365)&&y<.91&&Math.abs(x)<.29&&(bare||y<1.025-garmentLength||(profile.garment==='coat'&&Math.abs(x)<.035&&z>.11)),(v,n)=>{v.addScaledVector(n,.014+Math.sin(v.y*54+v.x*29)*.003);if(v.y>.7&&Math.abs(v.x)<.09)v.z=Math.min(v.z,.105);});
  made.push(bind(trousers,material('cloth',bare?'#6a6255':new T.Color(look.cloth).multiplyScalar(.56).getStyle(),look),skeleton,rig,'folded_trousers',true));
  if(!profile.barefoot&&!bare){
    const boots=subset(source,(_,y)=>y<.39,(v,n)=>{v.addScaledVector(n,.012+Math.sin(v.y*85)*.0025);v.y=Math.min(.385,Math.max(.018,v.y));});
    made.push(bind(boots,material('leather','#3b2b21',look),skeleton,rig,'fitted_leather_boots'));
  }
  if(!bare){
    const length=garmentLength;
    const skirt=loft([[.98-length,.245,.182],[.92-length*.6,.233,.175],[.93,.204,.168],[.985,.194,.156]],48,.055,10);
    const open=profile.garment==='coat';const hem=subset(skirt,(x,y,z)=>!(open&&z>.08&&Math.abs(x)<(.019+(.8-y)*.028)));skirt.dispose();
    made.push(bind(hem,material('cloth',look.cloth,look),skeleton,rig,'weighted_split_garment',true));
  }
  addClothingDetails(rig,look,bare,armor,war,made,skeleton,source);
  addPortrait(rig,source,look,war);
  source.dispose();
  if(effect){const style=effect;for(const root of [...made,rig.head])root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){o.material.transparent=true;o.material.opacity=style.opacity;o.material.depthWrite=style.depthWrite;if('emissive' in o.material){(o.material as T.MeshStandardMaterial).emissive.copy(style.emissive);(o.material as T.MeshStandardMaterial).emissiveIntensity=style.emissiveIntensity;}}});}
  owned.set(rig,[...made,skeleton.bones[0]]);
  rig.group.userData.appearance={...look};rig.group.userData.anatomical=true;
  rig.group.userData.anatomy='Continuous Blender Studio anatomy, fitted deforming clothes, two articulated arms and legs, individual fingers';
  parent?.add(rig.group);
  rig.group.position.copy(pose.position);rig.group.quaternion.copy(pose.quaternion);rig.group.scale.copy(pose.scale);
  joints.forEach((j,i)=>j.quaternion.copy(transforms[i]));
  rig.group.updateMatrixWorld(true);
}
function addClothingDetails(rig:PersonRig,look:PersonAppearance,bare:boolean,armored:boolean,war:boolean,made:T.Object3D[],skeleton:T.Skeleton,source:T.BufferGeometry){
  const p=peopleProfiles[look.culture],b=new OrganicBuilder(),trim=p.trim,leather='#443025',singer=look.culture==='singer';
  if(!bare&&!war){
    const jacket=made.find(m=>m.name==='fitted_jacket_and_sleeves') as T.SkinnedMesh;
    addTailoredLayers(b,look,jacket.geometry);
    if(p.garment==='robe')for(const side of [-1,1])for(let row=0;row<12;row++){
      const y=.96+row*.032,x=side*(.068+(y-.96)*.13);b.curve([[x-.006,y,.185],[x,y+.013,.186],[x+.006,y,.185]],[.0014,.0014,.0014],trim,'metal',4,2);
    }

    for(const side of [-1,1]){
      for(let i=0;i<6;i++)b.ellipsoid([side*.055,1.035+i*.057,.163+Math.sin(i/5*Math.PI)*.021],[.007,.007,.0035],trim,'metal');
    }

    if(p.garment==='robe')for(let row=0;row<2;row++)for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2,y=.205+row*.037,ripple=1+.055*(Math.sin(a*9+y*3)*.65+Math.sin(a*13-y*8)*.35),x=Math.cos(a)*(.247-row*.002)*ripple,z=Math.sin(a)*(.184-row*.001)*ripple;
      b.curve([[x-.006,y,z],[x,y+.01,z+.001],[x+.006,y,z]],[.002,.002,.002],trim,'metal',4,2);
    }
  }
  b.form([[.964,.203,.166],[.998,.198,.162]],leather,'leather');
  b.box([.015,.981,.175],[.049,.038,.009],trim,[0,0,0],'metal');b.box([.015,.981,.182],[.031,.022,.006],leather,[0,0,0],'leather');
  if(!bare){
    for(const side of [-1,1]){
      b.form([[-.027,.048,.042],[.019,.053,.046]],leather,'leather',.012,[side*.397,.988,.043],[0,0,side*.32]);
      if(!p.barefoot){
        b.form([[.305,.071,.067],[.367,.073,.07]],leather,'leather',.022,[side*.181,0,-.026]);
        b.ellipsoid([side*.186,.043,.025],[.064,.021,.135],'#241e19','leather');
        b.curve([[side*.139,.15,.035],[side*.174,.13,.071],[side*.223,.14,.035]],[.003,.004,.003],trim,'leather');
      }
    }
    b.ellipsoid([.197,.911,.054],[.048,.065,.055],leather,'leather');b.curve([[.16,.957,.09],[.197,.943,.113],[.23,.957,.09]],[.005,.005,.005],trim,'leather');}
  if(war)addGrownCarapace(b,source);
  if(armored&&!war){
    const shell=singer?'#694234':'#718088';
    for(const side of [-1,1]){
      for(let layer=0;layer<2;layer++)b.plate([side*(.138+layer*.025),1.38-layer*.032,.075],[.10,.035,.17],shell,[0,0,side*.26],singer?'carapace':'metal');

    }
  }
  const details=b.finish('tailoring_and_fasteners');
  for(const child of [...details.children])if(child instanceof T.Mesh){child.removeFromParent();const m=material((child.material as T.Material).userData.surface,'#ffffff',look);m.vertexColors=m.userData.surface!=='grown-shell'&&child.geometry.hasAttribute('color');m.side=T.DoubleSide;if(m.userData.surface==='cloth')m.sheenColor.set(look.cloth);made.push(bind(child.geometry,m,skeleton,rig,`${details.name}_${m.userData.surface}`,true));(child.material as T.Material).dispose();}
  if(rig.kind==='radiant'){
    const c=new OrganicBuilder();c.form([[.39,.228,.025,-.103],[.7,.25,.029,-.14],[1.09,.205,.027,-.13],[1.44,.181,.025,-.08]],look.cloth,'cloth',.05);
    const cloak=c.finish('traveling_cloak');for(const child of [...cloak.children])if(child instanceof T.Mesh){child.removeFromParent();made.push(bind(child.geometry,material('cloth',look.cloth,look),skeleton,rig,'traveling_cloak',true));(child.material as T.Material).dispose();}
  }
}
function addPortrait(rig:PersonRig,source:T.BufferGeometry,look:PersonAppearance,war:boolean){
  const singer=look.culture==='singer';
  const b=new OrganicBuilder(),skin=look.skin;
  // Eye surfaces sit behind the source mesh's eyelid opening, with irises on
  // the corneal surface; their size is measured in millimetres, not head radii.
  for(const side of [-1,1]){
    const x=side*(look.sex==='female'?.0364:.0345)*(singer?1.13:look.culture==='aimian'?.9:1),y=.163,z=.118;
    b.ellipsoid([x,y,z],[.0145,.0092,.011],'#8c897b','eye');
    b.ellipsoid([x,y,z+.0102],[.0067,.0067,.0011],look.culture==='iriali'?'#a68433':singer?'#5c2820':'#443729','eye');
    b.ellipsoid([x,y,z+.0113],[.0025,.0028,.0006],'#151310','eye');
    if(look.culture==='thaylen'){
      for(let k=0;k<5;k++)b.curve([[side*.014,.181+k*.001,.139],[side*.05,.194+k*.002,.138],[side*.083,.169-k*.003,.119],[side*(.087+k*.003),.09-k*.012,.102]],[.002,.003,.002,.0003],'#d3d0be','hair',5,16);
    }
    // Warm lip edge and tiny nostril cavities accent the base's connected forms.
    b.ellipsoid([side*.012,.120,.165],[.0045,.0022,.002],new T.Color(skin).multiplyScalar(.40).getStyle(),'skin');
  }
  b.curve([[-.022,.089,.139],[0,.087,.145],[.022,.089,.139]],[.0009,.0013,.0009],new T.Color(skin).multiplyScalar(.54).getStyle(),'skin',5,10);
  // Keep a 6mm margin beneath the shader's feathered hairline, without copying
  // the dense face topology into a fully transparent scalp underlayer.
  const scalp=subset(source,(x,y,z)=>y>1.599+.125*smooth(-.2,.98,Math.cos(Math.atan2(x,z-.045))),(v,n)=>v.addScaledVector(n,.0015));scalp.translate(0,-1.5,0);
  const cap=new T.Mesh(scalp,createScalpMaterial(look.hair));cap.name='fitted_scalp';cap.castShadow=false;rig.head.add(cap);
  rig.head.add(createInhabitantHair(look));
  if(singer)addFacialCarapace(b,source,war);
  const details=b.finish('portrait_hair_and_features');details.userData.anatomicalDetail=true;
  details.traverse(o=>{if(o instanceof T.Mesh){const old=o.material as T.MeshStandardMaterial;if(old.userData.surface==='hair'){const m=material('hair','#ffffff',look);m.vertexColors=true;m.sheenColor.set(look.hair).lerp(new T.Color('#a89576'),.15);o.material=m;old.dispose();}else if(old.userData.surface==='eye'){o.material=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.23,specularIntensity:.3});old.dispose();}else if(old.userData.surface==='grown-shell'){o.material=material('grown-shell','#ffffff',look);o.material.side=T.DoubleSide;old.dispose();}}});rig.head.add(details);
}
