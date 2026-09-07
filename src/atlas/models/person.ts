import * as T from 'three';
import {ModelBuilder,type V3} from './kit';
export type PersonKind='resident'|'bridger'|'hunter'|'radiant'|'workform'|'warform';
export interface PersonRig {group:T.Group;arms:T.Group[];forearms:T.Group[];legs:T.Group[];knees:T.Group[];head:T.Group;coat:T.Group;weapon?:T.Group;kind:PersonKind;}
export function buildPerson(index=0,kind:PersonKind='resident',cloth='#536f87'):PersonRig{
  const listener=kind==='workform'||kind==='warform',armor=kind==='warform'||kind==='hunter';
  const skin=listener?['#4b373b','#332f35','#70473f'][index%3]:['#ac7854','#825338','#c0936c','#64432f'][index%4];
  const shell=['#b67742','#bd864c','#a7673d'][index%3],hair=listener?'#713f37':['#29292b','#47352d','#665141'][index%3];
  const b=new ModelBuilder();
  b.sphere([0,1.18,0],[.245,.34,.145],kind==='bridger'?skin:cloth);
  b.box([0,.94,0],[.36,.25,.245],kind==='bridger'?skin:cloth);
  b.box([0,.83,0],[.41,.085,.275],'#4a3830');b.box([0,.83,.145],[.075,.068,.024],'#bc9d62',[0,0,0],'metal');
  if(kind!=='bridger'){
    for(const s of [-1,1])b.beam([s*.12,1.42,.1],[s*.05,1.22,.15],.024,'#ccbe95');
    for(let j=0;j<4;j++)b.sphere([.035,1.01+j*.07,.151],[.014,.015,.009],'#b7a173','metal');
    b.beam([-.2,1.37,.1],[.17,.9,.15],.045,'#705740');
  }
  if(armor)for(let j=0;j<4;j++){
    b.sphere([0,1.07+j*.09,.025],[.255-j*.006,.092,.16],listener?shell:'#8b9b9e',listener?'stone':'metal');
    b.sphere([0,1.12+j*.08,.17],[.013,.015,.01],'#dbc594','metal');
  }
  if(listener){
    for(let j=0;j<14;j++){const a=j*2.399;b.sphere([Math.cos(a)*.17,1.05+j%5*.055,Math.sin(a)*.135],[.045,.026,.018],j%3?'#9c4a42':'#bfa18d');}
    if(!armor)b.sphere([0,1.35,-.12],[.21,.2,.075],shell);
  }
  if(kind==='warform')for(const side of [-1,1])b.sphere([side*.24,1.4,0],[.14,.12,.18],shell);
  const group=b.finish(`${kind}_${index}`),headB=new ModelBuilder();
  headB.sphere([0,.02,0],[.142,.188,.136],skin);
  headB.sphere([0,-.03,.13],[.035,.055,.033],skin);
  for(const side of [-1,1]){
    headB.sphere([side*.141,.01,0],[.025,.047,.026],skin);
    headB.sphere([side*.052,.045,.122],[.031,.015,.015],'#ded8c8');
    headB.sphere([side*.052,.045,.135],[.013,.012,.005],listener?'#292225':'#242f32');
    headB.box([side*.054,.07,.132],[.069,.013,.012],hair,[0,0,-side*.12]);
  }
  headB.box([0,-.084,.121],[.062,.012,.015],'#714c40');
  if(listener){
    for(let j=0;j<15;j++){const a=j*.73;headB.sphere([Math.sin(a)*.127,Math.cos(j*1.6)*.14,Math.cos(a)*.12],[.024,.043,.018],j%4?'#a35c52':'#cbb09a');}
    if(armor){headB.sphere([0,.15,-.02],[.16,.096,.14],shell);for(const side of [-1,1])headB.sphere([side*.13,.03,-.015],[.045,.145,.125],shell);}
  }
  headB.sphere([0,.14,-.03],[.142,.093,.137],hair);
  for(let j=0;j<(index%3===0?8:3);j++){const a=j/8*Math.PI*2;headB.sphere([Math.sin(a)*.1,.142,Math.cos(a)*.095-.025],[.052,.041,.061],hair);if(listener&&j<5)headB.beam([Math.sin(a)*.12,.08,-.07],[Math.sin(a)*.13,-.18,-.14],.022,hair);}
  const head=headB.finish('face_and_hair');head.position.y=1.62;group.add(head);
  let weapon:T.Group|undefined;const arms:T.Group[]=[],forearms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[];
  const limb=(name:string,at:V3,radii:V3,color:string)=>{const part=new ModelBuilder();part.sphere(at,radii,color,armor&&!listener?'metal':'stone');return part.finish(name);};
  for(const side of [-1,1]){
    const arm=limb('upper_arm',[0,-.15,0],[.079,.2,.087],kind==='bridger'?skin:armor?listener?shell:'#8b9b9e':cloth);arm.position.set(side*.26,1.38,0);group.add(arm);arms.push(arm);
    const fb=new ModelBuilder();fb.sphere([0,-.12,.015],[.068,.15,.072],kind==='bridger'?skin:armor?listener?shell:'#788a8c':cloth);
    fb.sphere([0,-.275,.025],[.058,.08,.038],skin);for(let finger=0;finger<4;finger++)fb.beam([-.036+finger*.023,-.3,.027],[-.036+finger*.023,-.353,.04],.014,skin);fb.sphere([side*.055,-.265,.045],[.027,.041,.024],skin);
    if(listener)for(let k=0;k<3;k++)fb.sphere([side*.053,-.03-k*.07,.012],[.025,.026,.058],shell);
    if(kind==='hunter'&&side===-1){fb.sphere([0,-.16,.1],[.29,.38,.055],'#9caaa8','metal');fb.sphere([0,-.16,.17],[.07,.07,.07],'#c7bd9e','metal');}
    const forearm=fb.finish('forearm_and_fingers');forearm.position.y=-.32;arm.add(forearm);forearms.push(forearm);
    const leg=limb('thigh',[0,-.17,0],[.094,.225,.1],kind==='bridger'?'#62594c':cloth);leg.position.set(side*.115,.81,0);group.add(leg);legs.push(leg);
    const kb=new ModelBuilder();kb.sphere([0,-.15,-.005],[.078,.2,.079],kind==='bridger'?skin:armor?listener?shell:'#788a8c':'#514b43');
    if(armor)kb.sphere([0,.008,.078],[.096,.086,.054],listener?shell:'#acb8b5');
    kb.sphere([0,-.34,.045],[.09,.075,.155],kind==='bridger'||listener?skin:'#382f2c');
    if(listener)for(let j=0;j<3;j++)kb.sphere([-.055+j*.05,-.365,.15],[.025,.025,.054],skin);
    const knee=kb.finish('shin_and_foot');knee.position.y=-.4;leg.add(knee);knees.push(knee);
  }
  const cb=new ModelBuilder();
  if(kind==='radiant'){
    const ornament=new ModelBuilder();
    if([0,1,2,8].includes(index%10)){for(const side of [-1,1])ornament.sphere([side*.255,1.39,0],[.103,.072,.11],'#a7b3b0','metal');ornament.box([0,1.23,.151],[.28,.25,.035],'#91a1a1',[0,0,0],'metal');}
    if([4,6].includes(index%10)){ornament.box([-.16,.96,.22],[.24,.29,.07],'#634b38');ornament.box([-.16,.96,.26],[.2,.25,.02],'#d7c8a4');}
    if(index%10===5){ornament.cylinder([.33,.93,.1],.011,.4,'#aa8155');ornament.sphere([-.3,.8,.12],[.15,.024,.1],'#bc9b70');}
    if(index%10===7){ornament.beam([.34,.6,.1],[.34,1.04,.1],.028,'#7c6042');ornament.box([.34,1.07,.1],[.19,.1,.09],'#8c9a9c',[0,0,0],'metal');}
    group.add(ornament.finish('order_equipment'));
  }if(kind==='radiant'||listener){for(const side of [-1,1])cb.box([side*.1,-.19,-.08],[.19,.4,.055],cloth,[-.16,0,side*.05]);}const coat=cb.finish('split_cloth');coat.position.y=.81;group.add(coat);
  if(kind==='workform'&&index%3===0){const basket=new ModelBuilder();basket.sphere([0,.9,.3],[.24,.16,.19],'#968361');for(let rib=-2;rib<=2;rib++)basket.box([rib*.08,.91,.46],[.023,.2,.03],'#c0a278');group.add(basket.finish('crem_work_basket'));}
  if(kind==='warform'||kind==='hunter'){
    const builder=new ModelBuilder();builder.cylinder([0,0,0],.021,2.45,'#5d4835');builder.cone([0,1.36,0],.08,.3,'#cfcdc1');weapon=builder.finish('spear');weapon.position.set(.34,1,.08);group.add(weapon);
  }
  group.userData={kind,anatomy:'Two arms, two legs, articulated elbows and knees; face, hands and fingers',skin:listener?'Individual red, black and pale marbling':'Varied natural skin tones'};
  if(kind==='warform')group.scale.set(1.1,1.12,1.1);
  return {group,arms,forearms,legs,knees,head,coat,weapon,kind};
}
export function animatePerson(rig:PersonRig,time:number,pace=1,carry=false,gesture=0){
  const stride=Math.sin(time*7)*.52*pace;
  rig.legs.forEach((leg,i)=>{const angle=stride*(i?1:-1);leg.rotation.x=angle;rig.knees[i].rotation.x=Math.max(0,-angle)*.9;});
  rig.arms.forEach((arm,i)=>{arm.rotation.x=carry?-Math.PI:-(i?stride:-stride)*.7-gesture*.8;arm.rotation.z=(i?1:-1)*(carry?.08:.05);rig.forearms[i].rotation.x=carry?-.25:-.12-gesture*.6;});
  if(rig.weapon){rig.weapon.rotation.x=gesture*1.65;rig.weapon.position.set(.34,1+gesture*.08,.08+gesture*.4);}
  rig.coat.rotation.x=Math.sin(time*7+.8)*.08*pace;rig.head.rotation.y=Math.sin(time*.6)*.08;
}
