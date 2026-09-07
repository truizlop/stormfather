import { registerAnatomicalPerson } from './anatomicalPeople';
import { personAppearance, type PeopleCulture } from './peopleProfiles';
import * as T from 'three';
import { OrganicBuilder as Builder } from './organic';
export type PersonKind='resident'|'bridger'|'hunter'|'radiant'|'workform'|'warform';
export interface PersonRig {group:T.Group;arms:T.Group[];forearms:T.Group[];legs:T.Group[];knees:T.Group[];head:T.Group;coat:T.Group;weapon?:T.Group;kind:PersonKind;}

export function buildPerson(index=0,kind:PersonKind='resident',cloth?:string,culture:PeopleCulture='alethi'):PersonRig {
  const look=personAppearance(kind==='workform'||kind==='warform'?'singer':culture,index,cloth);
  if(kind==='bridger')look.sex='male';
  cloth=look.cloth;
  const listener=kind==='workform'||kind==='warform', armored=kind==='hunter'||kind==='warform', bare=kind==='bridger';
  const skin=look.skin;
  const hair=look.hair;
  const shell='#674643', edge='#c6a284', leather='#3d3028', trim='#b69a64', steel='#6d8189';
  const b=new Builder();
  // The torso narrows at the waist, widens through the ribcage and finishes in
  // sloped shoulders. No exposed ellipsoid seam between the chest and abdomen.
  b.form([[.79,.17,.105],[.9,.175,.115],[1.04,.165,.11],[1.18,.205,.125],[1.34,.232,.128,-.015],[1.41,.18,.106,-.025],[1.46,.075,.069]],bare?skin:cloth,bare?'skin':'cloth',bare?0:.022);
  b.form([[1.405,.073,.065],[1.48,.06,.058],[1.57,.062,.059]],skin,'skin');
  if(bare) {
    for(const side of [-1,1]) {
      b.ellipsoid([side*.095,1.265,.092],[.108,.078,.037],skin,'skin',[0,0,side*.12]);
      b.curve([[side*.026,1.403,.055],[side*.1,1.395,.079],[side*.18,1.368,.08]],[.013,.014,.003],skin);
    }
    b.form([[.72,.195,.124],[.84,.19,.121],[.89,.173,.116]],'#716451','cloth',.055);
  } else {
    // Standing collar, lapel piping, fitted waist, and individually raised buttons.
    b.form([[1.408,.081,.072],[1.483,.067,.063]],cloth,'cloth');
    for(const side of [-1,1]) b.curve([[side*.052,1.475,.057],[side*.112,1.343,.115],[side*.035,1.19,.135]],[.008,.009,.004],trim,'cloth');
    b.curve([[.016,.89,.12],[.021,1.17,.137],[.037,1.37,.105]],[.006,.006,.004],trim,'cloth');
    for(let i=0;i<6;i++) b.ellipsoid([.048,.93+i*.071,.128],[.012,.012,.005],trim,'metal');
    b.curve([[-.182,1.363,.095],[-.076,1.19,.147],[.119,.91,.115]],[.025,.024,.022],leather,'leather');
  }
  b.form([[.827,.191,.13],[.869,.184,.129]],leather,'leather');
  b.box([.023,.849,.132],[.074,.052,.016],trim,[0,0,0],'metal');
  b.box([.023,.849,.143],[.044,.03,.012],leather,[0,0,0],'leather');
  if(armored) {
    b.plate([0,1.08,.086],[.225,.065,.32],listener?shell:steel,[Math.PI/2,0,0],listener?'carapace':'metal');
    for(let i=0;i<3;i++) b.plate([0,.935+i*.071,.1],[.186+i*.009,.036,.092],listener?shell:steel,[Math.PI/2,0,0],listener?'carapace':'metal');
  }
  if(listener) {
    for(const side of [-1,1]) {
      b.curve([[side*.04,1.425,.044],[side*.15,1.37,.11],[side*.212,1.25,.093]],[.016,.035,.006],shell,'carapace');
      for(let i=0;i<3;i++) b.plate([side*.15,1.04+i*.077,-.08],[.079,.038,.12],shell,[.3,side*.5,0]);
    }
  }
  const group=b.finish(`${kind}_${index}`);
  const face=new Builder();
  // Adult cranial proportions: shaped chin, jaw, cheekbones, forehead and scalp.
  face.form([[-.12,.032,.04,.048],[-.102,.06,.059,.02],[-.056,.085,.078,.005],[.005,.103,.089],[.066,.098,.085,-.009],[.12,.088,.081,-.016],[.16,.055,.054,-.02],[.175,.008,.012,-.02]],skin,'skin');
  for(const side of [-1,1]) {
    face.ellipsoid([side*.098,-.008,-.003],[.021,.037,.016],skin);
    face.ellipsoid([side*.104,-.006,.011],[.011,.024,.005],listener?'#492e31':'#94644e');
    face.ellipsoid([side*.047,.015,.087],[.018,.006,.004],'#c5bda5','eye');
    face.ellipsoid([side*.047,.014,.091],[.006,.005,.002],listener?'#ab5140':'#3e4743','eye');
    face.ellipsoid([side*.047,.015,.093],[.0028,.004,.001],'#15191a','eye');
    face.curve([[side*.022,.03,.089],[side*.048,.038,.089],[side*.074,.032,.077]],[.004,.005,.002],hair,'hair');
    face.curve([[side*.025,.001,.091],[side*.048,-.002,.092],[side*.069,.001,.083]],[.003,.003,.002],skin);
  }
  face.form([[-.038,.016,.014,.099],[-.025,.019,.018,.106],[.006,.011,.016,.102],[.048,.01,.008,.086]],skin,'skin');
  for(const side of [-1,1]) face.ellipsoid([side*.018,-.032,.103],[.011,.008,.01],skin);
  face.curve([[-.032,-.064,.081],[0,-.068,.093],[.032,-.064,.081]],[.003,.004,.002],listener?'#3a262b':'#70493f');
  face.curve([[-.027,-.071,.081],[0,-.076,.09],[.027,-.071,.081]],[.003,.004,.002],skin);
  if(listener) {
    // Growth plates follow the brow and jaw rather than being scattered dots.
    for(const side of [-1,1]) {
      face.curve([[side*.01,.122,.056],[side*.065,.104,.069],[side*.105,.054,.032],[side*.107,-.024,.006]],[.015,.031,.026,.004],shell,'carapace');
      face.curve([[side*.095,-.031,.035],[side*.074,-.081,.055],[side*.031,-.105,.061]],[.024,.019,.002],edge,'carapace');
      for(let i=0;i<5;i++) face.curve([[side*(.092-i*.011),.099+i*.004,-.047],[side*(.145-i*.018),.025,-.092-i*.01],[side*(.112-i*.013),-.17-i*.023,-.096-i*.007]],[.012,.016,.003],hair,'hair');
    }
  } else {
    face.form([[.055,.102,.082,-.013],[.105,.096,.086,-.016],[.16,.063,.067,-.025],[.184,.005,.008,-.027]],hair,'hair',.02);
    for(let i=0;i<12;i++) {
      const x=(i-5.5)*.014;
      face.curve([[x,.082,.055],[x-.02,.168,.019],[x-.035,.125,-.095]],[.004,.006,.002],i%3===0?'#655446':hair,'hair',6,12);
    }
    if(index%3===1) for(let i=0;i<9;i++) face.curve([[(i-4)*.019,-.049,.064],[(i-4)*.014,-.112,.065],[0,-.139,.045]],[.014,.016,.004],hair,'hair',6,8);
    if(index%3===2) for(let i=0;i<4;i++) face.ellipsoid([.083,0-i*.043,-.095],[.027,.042,.025],hair,'hair');
  }
  if(!listener)for(const side of [-1,1])face.ellipsoid([side*.091,.054,-.018],[.018,.069,.066],hair,'hair');
  const head=face.finish('anatomical_head');head.position.y=1.598;group.add(head);
  const arms:T.Group[]=[],forearms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[];
  for(const side of [-1,1]) {
    const armB=new Builder();
    armB.form([[-.315,.051,.052],[-.24,.058,.059],[-.12,.079,.079],[0,.083,.085],[.036,.04,.057]],bare?skin:cloth,bare?'skin':'cloth',bare?0:.04);
    if(armored||kind==='radiant') {
      armB.plate([side*.01,-.063,0],[.102,.059,.18],listener?shell:steel,[0,0,side*.37],listener?'carapace':'metal');
      armB.curve([[side*.09,-.053,-.065],[side*.109,-.074,0],[side*.085,-.055,.071]],[.006,.007,.006],trim,'metal');
    }
    const arm=armB.finish('fitted_upper_arm');arm.position.set(side*.225,1.379,-.018);group.add(arm);arms.push(arm);
    const f=new Builder();
    f.form([[-.258,.034,.035],[-.22,.04,.042],[-.13,.057,.057],[-.045,.055,.054],[.012,.045,.049]],bare?skin:cloth,bare?'skin':'cloth',bare?0:.05);
    if(!bare) f.form([[-.257,.044,.042],[-.224,.046,.044]],leather,'leather');
    if(armored) f.plate([0,-.17,.035],[.055,.026,.195],listener?shell:steel,[Math.PI/2,0,0],listener?'carapace':'metal');
    f.form([[-.343,.028,.018,.006],[-.3,.041,.024],[ -.261,.032,.028]],skin,'skin');
    for(let finger=0;finger<4;finger++) {
      const x=(finger-1.5)*.018, length=[.05,.065,.063,.045][finger];
      f.curve([[x,-.33,.006],[x,-.353,.014],[x,-.34-length,.028]],[.009,.008,.0045],skin,'skin',6,8);
    }
    f.curve([[side*.033,-.292,.008],[side*.054,-.322,.028],[side*.045,-.352,.039]],[.013,.011,.006],skin,'skin',8,8);
    const forearm=f.finish('forearm_hand');forearm.position.y=-.315;arm.add(forearm);forearms.push(forearm);
    const thighB=new Builder();
    thighB.form([[-.405,.059,.065],[-.3,.079,.084],[-.13,.101,.108],[0,.097,.104]],bare?'#6a5a46':cloth,'cloth',.04);
    const leg=thighB.finish('tailored_trouser');leg.position.set(side*.105,.84,0);group.add(leg);legs.push(leg);
    const shin=new Builder();
    shin.form([[-.346,.049,.052],[-.27,.055,.059],[-.14,.071,.074],[0,.06,.065]],bare?skin:leather,bare?'skin':'leather',bare?0:.017);
    if(!bare) {shin.form([[-.11,.075,.078],[-.077,.073,.077]],leather,'leather');for(let i=0;i<4;i++) shin.curve([[-.034,-.13-i*.036,.063],[.034,-.146-i*.036,.063]],[.004,.004],trim,'leather',6,3);}
    shin.ellipsoid([0,-.378,.044],[.062,.052,.133],bare||listener?skin:leather,bare||listener?'skin':'leather');
    if(!bare&&!listener) shin.form([[-.423,.065,.136,.045],[-.401,.066,.137,.045]],'#292623','leather');
    if(armored) shin.plate([0,-.017,.054],[.076,.026,.115],listener?shell:steel,[Math.PI/2,0,0],listener?'carapace':'metal');
    const knee=shin.finish('calf_boot');knee.position.y=-.405;leg.add(knee);knees.push(knee);
  }
  const tails=new Builder();
  if(!bare) {
    for(const side of [-1,1]) tails.form([[-.36,.132,.06,-.05,side*.104],[-.22,.109,.07,-.035,side*.097],[0,.098,.081,0,side*.088]],cloth,'cloth',.075);
    if(kind==='radiant') tails.form([[-.65,.25,.026,-.11],[-.44,.227,.029,-.16],[-.05,.181,.027,-.175],[.48,.182,.026,-.16],[.57,.11,.025,-.14]],cloth,'cloth',.06);
  }
  const coat=tails.finish('weighted_cloth');coat.position.y=.83;group.add(coat);
  let weapon:T.Group|undefined;
  if(armored) {
    const w=new Builder();w.curve([[0,-1,0],[0,.2,0],[0,1.13,0]],[.014,.015,.012],leather,'leather');
    w.form([[1.1,.022,.018],[1.2,.058,.012],[1.4,.002,.003]],'#b4bdba','metal');
    for(let i=0;i<9;i++) w.ellipsoid([0,-.15+i*.024,0],[.019,.008,.019],trim,'leather');
    weapon=w.finish('forged_spear');forearms[1].add(weapon);weapon.position.set(.014,-.316,.06);
  }
  group.userData={kind,anatomy:'Two arms, two legs, shaped adult head, articulated hands and fitted clothing',skin:listener?'Red, black and pale marbling with grown carapace':'Natural skin tones'};
  if(kind==='warform')group.scale.set(1.15,1.1,1.15);
  const rig={group,arms,forearms,legs,knees,head,coat,weapon,kind};
  registerAnatomicalPerson(rig,look);
  return rig;
}
export function animatePerson(rig:PersonRig,time:number,pace=1,carry=false,gesture=0){
  const cycle=time*7, stride=Math.sin(cycle)*.44*pace;
  rig.legs.forEach((leg,i)=>{const phase=cycle+(i?Math.PI:0);leg.rotation.x=stride*(i?1:-1);rig.knees[i].rotation.x=Math.max(0,Math.sin(phase-.55))*.73*pace;});
  rig.arms.forEach((arm,i)=>{arm.rotation.x=carry?-2.8:-(i?stride:-stride)*.63-gesture*.8;arm.rotation.z=(i?1:-1)*(rig.group.userData.anatomical?-.29:.065);rig.forearms[i].rotation.x=carry?-.3:-.17-Math.max(0,Math.sin(cycle+(i?Math.PI:0)))*.18*pace-gesture*.65;});
  rig.coat.rotation.x=Math.sin(cycle-.7)*.04*pace;rig.coat.rotation.z=Math.sin(cycle*.5)*.015*pace;rig.head.rotation.y=Math.sin(time*.56)*.045;
}
