import {useMemo,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {buildPerson,animatePerson} from './models/person';
import {ModelBuilder,type PlaceModel} from './models/kit';
import {disposePlace} from './models';
import {orders,RADIANT_COURT,phaseAt,smooth} from './experiences';
import {worldClock,useAtlas} from './store';
const dispose=(group:T.Group)=>disposePlace({group} as PlaceModel);
export function RadiantArts(){
  const rigs=useMemo(()=>orders.map((o,i)=>buildPerson(i,'radiant',o.cloth)),[]);
  const scene=useMemo(()=>{
    const set=new ModelBuilder();set.cylinder([0,-.16,0],21,.3,'#a2a69d');
    for(let row=-6;row<=6;row++)for(let col=-6;col<=6;col++){const x=col*3,z=row*3;if(Math.hypot(x,z)<20)set.box([x,-.006,z],[2.94,.04,2.94],(row+col)%3?'#a9ac9f':'#bab9a7');}
    for(const side of [-1,1]){set.box([side*18,.55,0],[1.2,1.1,12],'#c0bfad');set.box([side*18,1.15,0],[1.6,.18,12.3],'#d0cbb7');}
    const line=new T.RingGeometry(6.8,6.84,96);line.rotateX(-Math.PI/2);set.add(line,'#c2b38c',[0,.005,0]);line.dispose();
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;set.cylinder([Math.sin(a)*13,.015,Math.cos(a)*13],1.3,.05,'#8d938b');set.box([Math.sin(a)*13,.055,Math.cos(a)*13],[.6,.04,.6],orders[i].color,[0,a,0]);}
    const platform=set.finish('Illustrative_Radiant_practice_court');
    const makeStone=(i:number)=>{const b=new ModelBuilder();const g=new T.DodecahedronGeometry(.5);b.add(g,i%2?'#998d77':'#b3a48c',[0,.38,0],[.85,.78,.8],[0,i*.7,0]);g.dispose();return b.finish('practice_stone');};
    const stones=Array.from({length:18},(_,i)=>makeStone(i));
    const archB=new ModelBuilder(),archShape=new T.Shape();archShape.moveTo(-2.8,0);
    for(let j=0;j<=48;j++){const a=Math.PI-j/48*Math.PI;archShape.lineTo(Math.cos(a)*2.8,Math.sin(a)*3.6);}
    archShape.lineTo(1.85,0);for(let j=0;j<=48;j++){const a=j/48*Math.PI;archShape.lineTo(Math.cos(a)*1.85,Math.sin(a)*2.65);}archShape.closePath();
    const archGeo=new T.ExtrudeGeometry(archShape,{depth:1.3,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:1,steps:1});
    archB.add(archGeo,'#ac9e84',[0,0,-.65]);archGeo.dispose();const arch=archB.finish('Cohesion_continuous_stone_arch');
    const stairs=Array.from({length:6},()=>{const b=new ModelBuilder();b.box([0,.5,0],[.82,1,1.9],'#b1a185');return b.finish('Cohesion_grounded_step');});
    const plantB=new ModelBuilder();plantB.cylinder([0,.7,0],.045,1.4,'#5e6942');
    for(let j=0;j<7;j++){const a=j*2.399;plantB.beam([0,.2+j*.16,0],[Math.sin(a)*.45,.4+j*.15,Math.cos(a)*.45],.026,'#748152');plantB.sphere([Math.sin(a)*.44,.42+j*.15,Math.cos(a)*.44],[.16,.06,.2],'#779461');}
    const plant=plantB.finish('Progression_plant');
    const illusions=[0,1,2].map(i=>{const r=buildPerson(i+1,'radiant','#a1c6d0');r.group.traverse(o=>{if(o instanceof T.Mesh){const m=o.material as T.MeshStandardMaterial;m.transparent=true;m.opacity=.34;m.depthWrite=false;m.emissive.set('#719cac');m.emissiveIntensity=.3;}});return r;});
    return {platform,stones,arch,stairs,plant,illusions};
  },[]);
  const motes=useMemo(()=>{
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(180*3),3));geo.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(180*3),3));return geo;
  },[]);
  useEffect(()=>()=>{rigs.forEach(r=>dispose(r.group));dispose(scene.platform);scene.stones.forEach(dispose);dispose(scene.arch);scene.stairs.forEach(dispose);dispose(scene.plant);scene.illusions.forEach(r=>dispose(r.group));motes.dispose();},[rigs,scene,motes]);
  useFrame(()=>{
    const state=useAtlas.getState(),selected=orders.findIndex(o=>o.id===state.orderId),o=orders[selected],t=worldClock.time-(state.sceneId==='radiant-arts'?state.sceneStartedAt:0),cycle=phaseAt(t,18);
    const progress=smooth((cycle-2)/7),power=progress*(1-smooth((cycle-14)/3));
    rigs.forEach((r,i)=>{const a=i/10*Math.PI*2;
      r.group.position.set(Math.sin(a)*13,.065,Math.cos(a)*13);r.group.rotation.set(0,a+Math.PI,0);animatePerson(r,t+i,0);
      if(i===selected){
        r.group.position.set(['division','growth','adhesion'].includes(o.effect)?.6:-1,0,0);r.group.rotation.y=Math.PI/2;animatePerson(r,t,0,false,power);
        if(o.effect==='flight'){const angle=t*.5;r.group.position.set(Math.sin(angle)*5*power,1+power*5,-Math.cos(angle)*5*power);r.group.rotation.set(.13,angle+Math.PI/2,Math.sin(angle)*.16);animatePerson(r,t,.18);}
        if(o.effect==='ascent'){r.group.position.set(-1,power*8,0);animatePerson(r,t,.08);}
        if(o.effect==='glide'){const angle=t*.75;r.group.position.set(Math.sin(angle)*5,0,Math.cos(angle)*5);r.group.rotation.set(.13,angle+Math.PI/2,-.15);animatePerson(r,t,.1);r.legs[0].rotation.x=-.2;r.legs[1].rotation.x=.12;}
      }
    });
    scene.stones.forEach((stone,i)=>{stone.visible=false;stone.scale.setScalar(1);stone.rotation.set(0,0,0);
      if(o.effect==='division'){stone.visible=true;const a=i*2.399,r=Math.sqrt(i)*.23;stone.position.set(2+Math.cos(a)*r*(1+power*2),.05+Math.max(0,.8-power*1.5),Math.sin(a)*r*(1+power*2));stone.scale.setScalar((.8-power*.35));stone.rotation.set(power*i,0,power*.7);}
      if(o.effect==='soulcast'&&i===0){stone.visible=true;stone.position.set(2,0,0);stone.scale.setScalar(1.7*(1-power)+.001);}
      if(o.effect==='adhesion'&&i<2){stone.visible=true;stone.position.set(2+(i?1:-1)*(.85-power*.48),0,0);}
    });
    scene.arch.visible=o.effect==='shape';scene.arch.position.set(2,0,0);scene.arch.scale.y=.03+power*.97;
    scene.stairs.forEach((step,i)=>{step.visible=o.effect==='stairs';step.position.set(i*.82,0,0);step.scale.y=.06+power*(i+1)*.28;});
    scene.plant.visible=o.effect==='growth';scene.plant.position.set(2,0,0);scene.plant.scale.setScalar(.12+power*2.1);
    scene.illusions.forEach((r,i)=>{r.group.visible=o.effect==='illusion'&&power>.01;r.group.position.set(2+Math.sin(i/3*Math.PI*2)*2.7,0,Math.cos(i/3*Math.PI*2)*2.7);r.group.scale.setScalar(.01+power);r.group.rotation.y=t*.25+i;animatePerson(r,t,0,false,.25);});
    const positions=motes.getAttribute('position'),colors=motes.getAttribute('color'),hero=rigs[selected].group;
    for(let i=0;i<180;i++){
      const a=i*2.399+t*.6,r=(i%17)/17,age=phaseAt(t*.5+i*.037,1);let x=hero.position.x+Math.cos(a)*r*.4,y=hero.position.y+.8+age*1.7,z=hero.position.z+Math.sin(a)*r*.4;
      if(o.effect==='soulcast'){x=2+Math.sin(a)*age*2;y=age*4;z=Math.cos(a)*age*2;}
      else if(['division','growth','shape','stairs','adhesion','illusion'].includes(o.effect)){x=2+Math.sin(a)*r*2;y=.3+age*2;z=Math.cos(a)*r*2;}
      else if(o.effect==='glide'){const previous=t-i*.008; x=Math.sin(previous*.75)*5;y=.1+(i%5)*.03;z=Math.cos(previous*.75)*5;}
      positions.setXYZ(i,x,y,z);const fade=(1-age)*power;colors.setXYZ(i,fade*.7,fade*.87,fade);
    }
    positions.needsUpdate=true;colors.needsUpdate=true;
  });
  return <group position={RADIANT_COURT} name="Ten_orders_of_Knights_Radiant"><primitive object={scene.platform}/>{rigs.map((r,i)=><primitive key={orders[i].id} object={r.group} onClick={(e:{stopPropagation:()=>void})=>{e.stopPropagation();const s=useAtlas.getState();if(s.sceneId!=='radiant-arts')s.startScene('radiant-arts');useAtlas.getState().selectOrder(orders[i].id);}}/>)}{scene.stones.map((g,i)=><primitive key={i} object={g}/>)}<primitive object={scene.arch}/>{scene.stairs.map((g,i)=><primitive key={i} object={g}/>)}<primitive object={scene.plant}/>{scene.illusions.map((r,i)=><primitive key={i} object={r.group}/>)}<points geometry={motes} frustumCulled={false}><shaderMaterial vertexColors transparent depthWrite={false} blending={T.AdditiveBlending} vertexShader="varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(.55/max(.0001,-p.z),1.,12.);}" fragmentShader="varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,pow(1.-d,2.)*.85);}"/></points></group>;
}
