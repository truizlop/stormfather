import * as T from 'three';
import { OrganicBuilder as Builder } from './organic';
import type { V3 } from './kit';
import { speciesAnatomy } from '../simulation';
export type Species=keyof typeof speciesAnatomy;
export interface CreatureRig {group:T.Group;legs:T.Group[];fins:T.Group[];shell?:T.Object3D;body:T.Group;joints?:T.Group[];tail?:T.Group}
export function buildCreature(species:Species):CreatureRig {
  const group=new T.Group();group.name=species;const body=new T.Group();group.add(body);
  const legs:T.Group[]=[],joints:T.Group[]=[],fins:T.Group[]=[];const b=new Builder();
  const giant=species==='chasmfiend',chull=species==='chull',goat=species==='goat',eel=species==='skyeel',small=species==='cremling';
  const length=giant?24:chull?3.2:goat?1.5:small?.45:eel?1.65:1.8;
  const width=giant?2.75:chull?1.36:goat?.28:small?.15:eel?.11:.34;
  const height=giant?4.7:chull?.83:goat?.79:small?.11:eel?0:.67;
  const shell=giant?'#3d4e59':chull?'#736b56':small?'#355754':'#3e4848';
  const rim=giant?'#9baca6':chull?'#b1a085':'#8c9984';
  if(eel) {
    b.curve([[0,0,-.83],[0,.015,-.47],[.01,0,0],[.045,-.018,.52],[.1,.018,.9]],[.07,.109,.083,.039,.001],'#47626a','carapace',20,44);
    b.ellipsoid([0,.015,-.735],[.095,.082,.15],'#536f70','carapace');
    for(const side of [-1,1]) {
      b.ellipsoid([side*.078,.038,-.784],[.012,.014,.019],'#d7a74e','eye');
      b.ellipsoid([side*.083,.04,-.792],[.008,.01,.009],'#152124','eye');
      b.curve([[side*.056,-.046,-.8],[side*.062,-.055,-.7],[side*.048,-.033,-.58]],[.003,.003,.001],'#233c43','skin');
      const f=new Builder(), shape=new T.Shape();shape.moveTo(0,-.49);shape.bezierCurveTo(side*.29,-.51,side*.63,-.1,side*.58,.06);shape.bezierCurveTo(side*.48,.18,side*.24,.44,0,.64);shape.closePath();
      const geo=new T.ShapeGeometry(shape,28);geo.rotateX(-Math.PI/2);f.add(geo,'#879890',[0,0,0],[1,1,1],[0,0,0],'skin');geo.dispose();
      for(let i=0;i<10;i++) f.curve([[0,0,-.4+i*.086],[side*(.22+Math.sin(i/10*Math.PI)*.27),-.012,-.25+i*.063],[side*(.16+Math.sin(i/10*Math.PI)*.35),0,-.23+i*.058]],[.004,.003,.001],'#3d6269','carapace',5,10);
      const fin=f.finish('ribbed_membrane');body.add(fin);fins.push(fin);
    }
  } else if(goat) {
    b.ellipsoid([0,height,.06],[.28,.3,.6],'#a39d88','hair');
    b.curve([[0,.73,-.44],[0,1.04,-.57],[0,1.14,-.68]],[.2,.15,.12],'#a7a18e','hair',20,20);
    b.ellipsoid([0,1.14,-.76],[.127,.155,.205],'#b4ac97','hair',[.22,0,0]);
    b.ellipsoid([0,1.062,-.912],[.09,.066,.072],'#827768','skin');
    for(const side of [-1,1]) {
      b.ellipsoid([side*.118,1.187,-.801],[.009,.019,.03],'#c0a06b','eye');b.ellipsoid([side*.126,1.187,-.805],[.004,.006,.018],'#1e2424','eye');
      b.ellipsoid([side*.167,1.226,-.68],[.097,.026,.052],'#a49880','hair',[0,0,side*.22]);
      b.curve([[side*.075,1.255,-.725],[side*.09,1.43,-.638],[side*.094,1.46,-.49]],[.041,.027,.002],'#514b3f','horn',12,20);
      b.ellipsoid([side*.044,1.075,-.969],[.016,.009,.007],'#37352d','skin');
    }
    b.curve([[0,.99,-.803],[0,.85,-.79],[0,.808,-.76]],[.034,.022,.002],'#c2b89c','hair');
    b.curve([[0,.93,.6],[0,1.06,.74],[0,1.08,.83]],[.045,.045,.007],'#b8ac90','hair');
  } else {
    b.ellipsoid([0,height,0],[width*.84,giant?1.05:chull?.47:.19,length*.43],shell,'skin');
    if(chull) {
      // A continuous heavy shell underlaps separate scutes with pale growth rims.
      b.plate([0,height+.13,0],[1.43,1.12,3.02],shell);
      for(let row=0;row<5;row++) {
        const z=-1.15+row*.54, profile=Math.sqrt(Math.max(.1,1-(z/1.65)**2));
        b.plate([0,height+.52+profile*.69,z],[.73,.31,.72],row%2?'#81745b':'#746b53',[.04,0,0]);
        for(const side of [-1,1]) {
          b.plate([side*.78,height+.43+profile*.5,z],[.58,.31,.67],row%2?'#8c7d60':'#736c58',[0,0,-side*.65]);
          b.curve([[side*1.16,height+.45,z-.26],[side*.89,height+1.04,z-.28],[side*.44,height+1.5,z-.28]],[.027,.021,.008],rim,'horn',8,14);
        }
      }
      b.ellipsoid([0,.74,-1.34],[.43,.24,.37],'#514e40','skin');
      b.curve([[-.28,.59,-1.59],[0,.55,-1.7],[.28,.59,-1.59]],[.038,.049,.025],'#272e2b','carapace');
      // Leather harness and tied freight sit on the shell rather than in it.
      for(const z of [-.7,.65]) b.curve([[-1.28,1.02,z],[-.93,1.96,z],[0,2.49,z],[.93,1.96,z],[1.28,1.02,z]],[.046,.047,.05,.047,.046],'#40332a','leather',8,28);
      for(const side of [-1,1]) {
        b.form([[1.6,.25,.41],[1.73,.29,.44],[2.11,.26,.4],[2.17,.23,.37]],'#6e5140','leather',.018,[side*1.06,0,.15]);
        b.curve([[side*1.07,1.68,-.29],[side*1.08,2.14,-.28],[side*1.08,2.15,.56],[side*1.07,1.68,.56]],[.014,.014,.014,.014],'#c0a681','cloth');
      }
    } else if(giant) {
      for(let i=0;i<12;i++) {
        const z=-9.8+i*1.8, taper=1-Math.abs(i-4)*.047;
        b.plate([0,height+.18,z],[width*taper,1.55,2.65],i%2?'#425a65':'#374b57');
        b.curve([[-width*taper,height+.28,z-1.19],[-width*taper*.7,height+1.25,z-1.16],[0,height+1.93,z-1.12],[width*taper*.7,height+1.25,z-1.16],[width*taper,height+.28,z-1.19]],[.047,.05,.066,.05,.047],rim,'horn',8,28);
        for(const side of [-1,1]) b.curve([[side*width*taper*.82,height+1.05,z],[side*width*taper*1.1,height+2.15,z+.18],[side*width*taper*1.02,height+2.9,z-.65]],[.29,.19,.001],shell,'carapace',12,18);
      }
      b.plate([0,height-.43,-11.2],[1.8,1.28,3.6],'#2d4049');
      b.ellipsoid([0,height-.91,-12.51],[1.12,.52,.18],'#20242a','skin');
      for(const side of [-1,1]) {
        b.curve([[side*1.28,height-.44,-12],[side*1.75,height-1.15,-13.04],[side*.61,height-1.3,-13.65]],[.43,.34,.018],'#a9a38b','horn',16,24);
        b.curve([[side*1.4,height+.12,-11.8],[side*1.77,height+.26,-12.1],[side*1.81,height+.35,-12.51]],[.19,.12,.09],shell,'carapace');
        for(let j=0;j<3;j++) {b.ellipsoid([side*(.63+j*.25),height+.21,-12.41+j*.14],[.09,.095,.095],'#cda75b','eye');}
        for(let j=0;j<5;j++) b.curve([[side*(.21+j*.18),height-.58,-12.65],[side*(.16+j*.17),height-.96,-12.83]],[.083,.001],'#b8b39b','horn',8,7);
      }
    } else {
      for(let i=0;i<7;i++) {
        const z=-length*.35+i*length*.115;
        b.plate([0,height+.075,z],[width*(.86+Math.sin(i/7*Math.PI)*.16),small?.085:.2,length*.23],i%2?shell:'#53605a');
        b.curve([[-width*.83,height+.1,z-length*.09],[0,height+(small?.14:.29),z-length*.09],[width*.83,height+.1,z-length*.09]],[small?.006:.015,small?.008:.02,small?.006:.015],rim,'horn',6,12);
      }
      b.plate([0,height-.06,-length*.43],[width*.7,small?.08:.2,length*.32],shell,[.15,0,0]);
      if(!small) {
        b.ellipsoid([0,height-.145,-length*.61],[.15,.079,.16],'#303c3c','skin');
        for(const side of [-1,1]) b.curve([[side*.13,height-.11,-length*.62],[side*.16,height-.19,-length*.72],[side*.062,height-.19,-length*.79]],[.035,.028,.001],'#b1a78d','horn',10,14);
        b.curve([[0,height+.06,length*.41],[0,height+.16,length*.7],[.15,height+.3,length*.88]],[.12,.062,.001],shell,'carapace',12,22);
      }
    }
    if(!giant) for(const side of [-1,1]) {
      const eyeZ=-length*.47, eyeY=height+(chull?.15:.09);
      b.curve([[side*width*.27,eyeY-.04,eyeZ],[side*width*.48,eyeY+.1,eyeZ-.16]],[small?.012:.046,small?.008:.025],shell,'carapace');
      b.ellipsoid([side*width*.48,eyeY+.1,eyeZ-.16],[small?.012:.044,small?.015:.049,small?.017:.049],'#c6a05b','eye');
      b.ellipsoid([side*width*.49,eyeY+.101,eyeZ-.19],[small?.007:.027,small?.012:.035,small?.009:.025],'#1d272a','eye');
      b.curve([[side*width*.31,eyeY-.08,eyeZ-.1],[side*width*.51,eyeY+.08,eyeZ-.4],[side*width*.56,eyeY+.01,eyeZ-.65]],[small?.005:.012,small?.004:.009,.001],rim,'horn');
    }
  }
  if(!eel) {
    const pairs=speciesAnatomy[species].legs/2;
    for(let i=0;i<pairs;i++)for(const side of [-1,1]) {
      const z=(i/Math.max(1,pairs-1)-.5)*length*.66;
      const upper=new Builder(), lower=new Builder(), pivot=new T.Group();pivot.position.set(side*width*.7,height*.83,z);
      let joint:V3;
      if(goat) {
        joint=[side*.024,-height*.4,i===0?.06:-.12];
        upper.curve([[0,0,0],[side*.028,-height*.19,0],joint],[.073,.058,.038],'#a49a82','hair',12,12);
        lower.curve([[0,0,0],[-side*.006,-height*.23,-.012],[-side*.02,-height*.39,.027]],[.039,.03,.026],'#a39982','hair',12,12);
        for(const split of [-1,1]) lower.ellipsoid([split*.025,-height*.405,.048],[.023,.052,.06],'#383b33','horn');
      } else {
        const fore=giant&&i<2, spread=giant?2.7:chull?.78:small?.13:.28, drop=height*.83;
        joint=[side*spread,-drop*.19,fore?-.85:.09];
        upper.curve([[0,0,0],[side*spread*.42,.1,joint[2]*.4],joint],[giant?.32:chull?.115:small?.018:.062,giant?.39:chull?.13:small?.02:.078,giant?.22:chull?.081:small?.012:.04],shell,'carapace',12,16);
        upper.ellipsoid(joint,[giant?.3:chull?.105:small?.018:.062,giant?.27:chull?.105:small?.018:.064,giant?.3:chull?.105:small?.018:.063],rim,'horn');
        const foot:V3=[side*spread*.17,-drop*.8,-.12];
        lower.curve([[0,0,0],[side*spread*.2,-drop*.48,-.1],foot],[giant?.22:chull?.075:small?.012:.043,giant?.14:chull?.061:small?.008:.03,giant?.013:chull?.018:small?.002:.006],shell,'carapace',12,18);
        if(fore||(chull&&i===0)) {
          const r=giant?.61:.18;
          lower.ellipsoid([foot[0],foot[1]+r*.4,foot[2]-.13],[r,r*.55,r*1.4],shell,'carapace');
          for(const split of [-1,1]) lower.curve([[foot[0]+split*r*.55,foot[1]+r*.4,foot[2]-r],[foot[0]+split*r*.67,foot[1]+r*.37,foot[2]-r*2.1],[foot[0]+split*r*.06,foot[1]+r*.35,foot[2]-r*2.7]],[r*.25,r*.14,.001],rim,'horn',10,14);
        }
      }
      pivot.add(upper.finish('upper_leg'));const knee=lower.finish('jointed_lower_leg');knee.position.set(...joint);pivot.add(knee);body.add(pivot);legs.push(pivot);joints.push(knee);
    }
  }
  const shellObject=b.finish('sculpted_body');body.add(shellObject);
  group.userData={species,legs:speciesAnatomy[species].legs,foreclaws:speciesAnatomy[species].foreclaws};
  return {group,legs,joints,fins,shell:shellObject,body};
}
export function animateCreature(rig:CreatureRig,species:Species,time:number,moving=1,retract=0) {
  const cadence=species==='chasmfiend'?1.7:species==='chull'?2.2:species==='goat'?4.5:3.7;
  rig.legs.forEach((leg,i)=>{
    const phase=time*cadence+Math.floor(i/2)*1.32+(i%2?Math.PI:0), stride=Math.sin(phase)*moving;
    leg.rotation.y=stride*.15;leg.rotation.x=stride*.19;
    leg.rotation.z=(i%2?1:-1)*(Math.max(0,Math.cos(phase))*.07*moving+retract*.95);
    if(rig.joints?.[i])rig.joints[i].rotation.x=Math.max(0,Math.cos(phase))*.24*moving;
  });
  rig.body.position.y=-retract*(species==='chull'?.45:0)+Math.sin(time*cadence*2)*.012*moving;
  rig.fins.forEach((fin,i)=>{fin.rotation.z=Math.sin(time*2.1)*(i?1:-1)*.18;});
}
