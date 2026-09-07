import * as T from 'three';
import { OrganicBuilder, loft } from './organic';
import { peopleProfiles, type PersonAppearance } from './peopleProfiles';
import type { PersonRig } from './person';

type BodySources = Record<'male'|'female',T.BufferGeometry>;
let sources:BodySources|undefined;
let skinAtlas:T.Texture|undefined,clothAtlas:T.Texture|undefined;
const waiting=new Set<WeakRef<PersonRig>>();
const appearance=new WeakMap<PersonRig,PersonAppearance>();
const owned=new WeakMap<PersonRig,T.Object3D[]>();
const smooth=(a:number,b:number,x:number)=>T.MathUtils.smoothstep(x,a,b);

export function installAnatomicalPeople(next:BodySources,skinTexture?:T.Texture,clothTexture?:T.Texture) {
  if(sources?.male===next.male&&sources?.female===next.female)return;
  sources=next;skinAtlas=skinTexture;clothAtlas=clothTexture;
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
  const m=new T.MeshPhysicalMaterial({color,roughness:surface==='skin'?.58:surface==='hair'?.57:surface==='cloth'?.9:surface==='leather'?.62:surface==='carapace'?.66:.36,metalness:surface==='metal'?.82:0});
  m.userData.surface=surface;
  if(surface==='cloth'){m.sheen=.65;m.sheenColor.set(color).lerp(new T.Color('#d1c6b0'),.3);m.sheenRoughness=.8;}
  if(surface==='skin'){m.specularIntensity=.42;m.clearcoat=.06;m.clearcoatRoughness=.7;if(look.culture==='iriali'){m.metalness=.12;m.sheen=.25;m.sheenColor.set('#d4ad67');}}
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
float personNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);vec3 d=vec3(17.13,113.7,53.9);float n=dot(i,d);return mix(mix(mix(fract(sin(n)*43758.5),fract(sin(n+17.13)*43758.5),f.x),mix(fract(sin(n+113.7)*43758.5),fract(sin(n+130.83)*43758.5),f.x),f.y),mix(mix(fract(sin(n+53.9)*43758.5),fract(sin(n+71.03)*43758.5),f.x),mix(fract(sin(n+167.6)*43758.5),fract(sin(n+184.73)*43758.5),f.x),f.y),f.z);}
`+shader.fragmentShader;
      const marble=look.culture==='singer'&&surface==='skin'?`
float field=sin(vRestSurface.y*39.+sin(vRestSurface.x*48.)*1.6+personNoise(vRestSurface*12.)*8.+vRestSurface.z*28.+${look.variant.toFixed(1)});
vec3 pigment=mix(vec3(.058,.043,.037),vec3(.32,.09,.052),smoothstep(-.25,.35,field));
pigment=mix(pigment,vec3(.53,.38,.27),(1.-smoothstep(.025,.13,abs(field)))*.9);
diffuseColor.rgb=pigment;`:'';
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float grain=personNoise(vRestSurface*${surface==='skin'?'800.':surface==='hair'?'1600.':'480.'});
float wear=personNoise(vRestSurface*${surface==='skin'?'45.':'85.'});
diffuseColor.rgb*= ${surface==='cloth'?'(.86+.18*wear)*(.93+.09*grain)':surface==='skin'?'(.94+.09*wear)':surface==='hair'?'(.7+.5*grain)':'(.78+.28*wear)'};
${marble}
${surface==='skin'&&skinAtlas?`vec3 faceColor=texture2D(skinAtlas,vFaceUv).rgb;float faceBlend=smoothstep(1.505,1.55,vRestSurface.y)*smoothstep(.01,.08,vRestSurface.z)*(1.-smoothstep(.080,.102,abs(vRestSurface.x)));vec3 faceVariation=clamp(faceColor/vec3(.30,.145,.078),vec3(.32),vec3(1.7));diffuseColor.rgb*=mix(vec3(1.),faceVariation,faceBlend*.9);`:''}
${surface==='cloth'&&clothAtlas?`float fiber=texture2D(clothAtlas,vRestSurface.xy*3.2+vRestSurface.zz*.8).r;diffuseColor.rgb*=clamp(.50+fiber*2.,.7,1.4);`:''}
${surface==='skin'&&look.sex==='male'&&look.culture!=='singer'&&peopleProfiles[look.culture].hairStyle!=='short'?`float beard=smoothstep(1.525,1.55,vRestSurface.y)*(1.-smoothstep(1.59,1.625,vRestSurface.y))*smoothstep(.08,.12,vRestSurface.z);float mouth=(1.-smoothstep(.016,.03,abs(vRestSurface.x)))*smoothstep(1.58,1.59,vRestSurface.y)*(1.-smoothstep(1.598,1.61,vRestSurface.y));diffuseColor.rgb*=1.-beard*(1.-mouth)*(.20+grain*.24);`:''}
`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(grain-.5)*.12,.12,1.);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\nnormal=normalize(normal+vec3((grain-.5)*${surface==='skin'?'.045':'.10'},(wear-.5)*.08,0.));`);
    };
    m.customProgramCacheKey=()=>`inhabitant-v3-${surface}-${look.culture}-${look.variant%2}-${look.sex}-${skinAtlas?'textured':'plain'}`;
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
    const folds=(Math.sin(v.y*70+v.x*25)*Math.sin(v.z*44+v.x*12)*.0026+Math.sin(v.y*29-v.x*40)*.0018);
    const fullness=look.sex==='female'&&torso(v.x,v.y)?.009:0;
    v.addScaledVector(n,(v.y>1.48?.008:.019)+fullness+folds+waist*.008);v.y=Math.min(v.y,1.531);
    if(torso(v.x,v.y))v.y=Math.max(.96,v.y);
    else if(profile.garment!=='wrap'){const side=Math.sign(v.x),cut=(v.x-side*.397)*side*.34-(v.y-.99)*.94;if(cut>0){v.x-=side*.34*cut;v.y+=.94*cut;}}
  };
  if(!bare&&!war){
    const top=subset(source,(x,y)=>y>.95&&y<1.534&&(torso(x,y)||y>(profile.garment==='wrap'?1.19:.965)),clothMove);
    top.computeVertexNormals();made.push(bind(top,material('cloth',look.cloth,look),skeleton,rig,'fitted_jacket_and_sleeves',true));
  }
  const trousers=subset(source,(x,y)=>y>(profile.barefoot?.58:bare?.40:.365)&&y<.91&&Math.abs(x)<.29,(v,n)=>{v.addScaledVector(n,.014+Math.sin(v.y*54+v.x*29)*.003);if(v.y>.7&&Math.abs(v.x)<.09)v.z=Math.min(v.z,.105);});
  made.push(bind(trousers,material('cloth',bare?'#6a6255':new T.Color(look.cloth).multiplyScalar(.56).getStyle(),look),skeleton,rig,'folded_trousers',true));
  if(!profile.barefoot&&!bare){
    const boots=subset(source,(_,y)=>y<.39,(v,n)=>{v.addScaledVector(n,.012+Math.sin(v.y*85)*.0025);v.y=Math.min(.385,Math.max(.018,v.y));});
    made.push(bind(boots,material('leather','#3b2b21',look),skeleton,rig,'fitted_leather_boots'));
  }
  if(!bare){
    const length=profile.garment==='robe'?.80:profile.garment==='coat'?.49:profile.garment==='tunic'?.37:.30;
    const skirt=loft([[.98-length,.235,.146],[.92-length*.6,.223,.143],[.93,.194,.143],[.985,.177,.135]],48,.036);
    const open=profile.garment==='coat';const hem=subset(skirt,(x,y,z)=>!(open&&z>.08&&Math.abs(x)<(.019+(.8-y)*.028)));skirt.dispose();
    made.push(bind(hem,material('cloth',look.cloth,look),skeleton,rig,'weighted_split_garment',true));
  }
  if(war){
    const shell=subset(source,(x,y,z)=>
      (Math.abs(x)<.21&&y>.95&&y<1.45&&z>.025&&y>.955+(.15-Math.abs(x))*.12)||
      (Math.abs(x)>.17&&Math.abs(x)<.30&&y>1.30&&y<1.47)||
      (Math.abs(x)>.32&&y>1.01&&y<1.16&&z>.005)||
      (y>.14&&y<.38&&z>-.014),
      (v,n)=>{const ridge=Math.pow(.5+.5*Math.sin(v.y*72+Math.abs(v.x)*17),5)*.006;v.addScaledVector(n,.018+ridge);if(v.y>1.16&&v.y<1.41&&Math.abs(v.x)<.17&&v.z>.08)v.z=Math.max(v.z,.175+ridge);});shell.computeVertexNormals();
    made.push(bind(shell,material('carapace','#754d3a',look),skeleton,rig,'anatomically_grown_carapace'));
  }
  addClothingDetails(rig,look,bare,armor,war,made,skeleton);
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
function addClothingDetails(rig:PersonRig,look:PersonAppearance,bare:boolean,armored:boolean,war:boolean,made:T.Object3D[],skeleton:T.Skeleton){
  const p=peopleProfiles[look.culture],b=new OrganicBuilder(),trim=p.trim,leather='#443025',singer=look.culture==='singer';
  if(!bare&&!war){
    b.curve([[-.048,1.515,.11],[-.094,1.39,.183],[.034,1.18,.174]],[.0018,.0022,.0018],new T.Color(look.cloth).multiplyScalar(.65).getStyle(),'cloth',5,20);
    if(p.garment==='robe')for(const side of [-1,1])for(let row=0;row<12;row++){
      const y=.96+row*.032,x=side*(.068+(y-.96)*.13);b.curve([[x-.006,y,.185],[x,y+.013,.186],[x+.006,y,.185]],[.0014,.0014,.0014],trim,'metal',4,2);
    }

    for(const side of [-1,1]){
      for(let i=0;i<6;i++)b.ellipsoid([side*.055,1.035+i*.057,.163+Math.sin(i/5*Math.PI)*.021],[.007,.007,.0035],trim,'metal');
    }
    b.curve([[-.153,1.449,.127],[-.09,1.36,.203],[-.03,1.17,.186],[.128,.988,.164]],[.020,.019,.018,.016],leather,'leather');
    if(p.garment==='robe')for(let row=0;row<2;row++)for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2,x=Math.cos(a)*(.237-row*.008),z=Math.sin(a)*(.148-row*.007),y=.205+row*.037;
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
  if(armored){
    const shell=singer?'#694234':'#718088';
    for(const side of [-1,1]){
      for(let layer=0;layer<(war?3:2);layer++)b.plate([side*(.138+layer*.025),1.38-layer*.032,.075],[.10,.035,.17],shell,[0,0,side*.26],singer?'carapace':'metal');

    }
  }
  const details=b.finish('tailoring_and_fasteners');
  for(const child of [...details.children])if(child instanceof T.Mesh){child.removeFromParent();const m=material((child.material as T.Material).userData.surface,'#ffffff',look);m.vertexColors=child.geometry.hasAttribute('color');made.push(bind(child.geometry,m,skeleton,rig,details.name,true));(child.material as T.Material).dispose();}
  if(rig.kind==='radiant'){
    const c=new OrganicBuilder();c.form([[.39,.228,.025,-.103],[.7,.25,.029,-.14],[1.09,.205,.027,-.13],[1.44,.181,.025,-.08]],look.cloth,'cloth',.05);
    const cloak=c.finish('traveling_cloak');for(const child of [...cloak.children])if(child instanceof T.Mesh){child.removeFromParent();made.push(bind(child.geometry,material('cloth',look.cloth,look),skeleton,rig,'traveling_cloak',true));(child.material as T.Material).dispose();}
  }
}
function addPortrait(rig:PersonRig,source:T.BufferGeometry,look:PersonAppearance,war:boolean){
  const profile=peopleProfiles[look.culture],singer=look.culture==='singer';
  const b=new OrganicBuilder(),skin=look.skin;
  // Eye surfaces sit behind the source mesh's eyelid opening, with irises on
  // the corneal surface; their size is measured in millimetres, not head radii.
  for(const side of [-1,1]){
    const x=side*(look.sex==='female'?.0364:.0345),y=.163,z=.121;
    b.ellipsoid([x,y,z],[.016,.012,.012],'#bcb7a5','eye');
    b.ellipsoid([x,y,z+.0111],[.0055,.0055,.0011],look.culture==='iriali'?'#a68433':singer?'#5c2820':'#443729','eye');
    b.ellipsoid([x,y,z+.0122],[.0025,.0028,.0006],'#151310','eye');
    if(look.culture==='thaylen'){
      for(let k=0;k<5;k++)b.curve([[side*.014,.181+k*.001,.139],[side*.05,.194+k*.002,.138],[side*.083,.169-k*.003,.119],[side*(.087+k*.003),.09-k*.012,.102]],[.002,.003,.002,.0003],'#d3d0be','hair',5,16);
    }
    // Warm lip edge and tiny nostril cavities accent the base's connected forms.
    b.ellipsoid([side*.012,.120,.165],[.0045,.0022,.002],new T.Color(skin).multiplyScalar(.40).getStyle(),'skin');
  }
  b.curve([[-.022,.089,.139],[0,.087,.145],[.022,.089,.139]],[.0009,.0013,.0009],new T.Color(skin).multiplyScalar(.54).getStyle(),'skin',5,10);
  const scalp=subset(source,(x,y,z)=>y>(z>.055?1.715:z>.005?1.655:1.605),(v,n)=>v.addScaledVector(n,.004));scalp.translate(0,-1.5,0);
  const cap=new T.Mesh(scalp,material('hair',look.hair,look));cap.name='fitted_scalp';cap.castShadow=true;rig.head.add(cap);
  const long=profile.hairStyle==='long'||look.sex==='female',braid=profile.hairStyle==='braids';
  // Overlapping tapered locks grow from the scalp; real rear volume remains
  // present when orbiting. Small radius variation breaks repeated tube forms.
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,s=Math.sin(a),c=Math.cos(a),front=s>.35;
    const root:[number,number,number]=[c*.055+.018,.248,s*.046+.012];
    const crown:[number,number,number]=[c*.070-.012,.279+Math.sin(i*1.7)*.006,s*.066+.01];
    const mid:[number,number,number]=[c*.090-.018,.219,s*.082+.01];
    const tip:[number,number,number]=[c*.096-.007,front?.187:long?-.035+Math.sin(i)*.025:.112+Math.sin(i)*.018,s*.073-.002];
    b.curve([root,crown,mid,tip],[.009,.011,.007,.0008],look.hair,'hair',8,24);
    if(!front&&long&&!braid)for(let strand=0;strand<3;strand++)b.curve([mid,[c*.098+Math.sin(i)*.008,.083,s*.081-.006],[c*.082+strand*.005,-.041+Math.sin(i)*.03,s*.063-.016]],[.0035,.006,.0004],look.hair,'hair',6,18);
  }
  if(braid)for(let i=0;i<9;i++){
    const x=(i-4)*.018;
    b.curve([[x,.205,-.058],[x*.8,.085,-.085],[x*.8,-.04,-.096]],[.009,.009,.002],look.hair,'hair',7,18);
    for(let k=0;k<6;k++)b.curve([[x-.006,.085-k*.018,-.09],[x,.076-k*.018,-.098],[x+.006,.083-k*.018,-.09]],[.003,.004,.002],look.hair,'hair',5,5);
  }
  if(singer)for(const side of [-1,1]){
    b.curve([[side*.009,.242,.088],[side*.059,.213,.111],[side*.096,.167,.05],[side*.095,.105,.008]],[.010,war?.027:.015,.020,.002],'#714437','carapace',10,22);
    b.curve([[side*.094,.095,.058],[side*.065,.047,.107],[side*.025,.034,.107]],[.016,.014,.002],'#b79b7b','carapace',8,14);
  }
  const details=b.finish('portrait_hair_and_features');details.userData.anatomicalDetail=true;
  details.traverse(o=>{if(o instanceof T.Mesh){const old=o.material as T.MeshStandardMaterial;if(old.userData.surface==='hair'){const m=material('hair','#ffffff',look);m.vertexColors=true;m.sheenColor.set(look.hair).lerp(new T.Color('#a89576'),.15);o.material=m;old.dispose();}else if(old.userData.surface==='eye'){o.material=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.23,specularIntensity:.3});old.dispose();}}});rig.head.add(details);
}
