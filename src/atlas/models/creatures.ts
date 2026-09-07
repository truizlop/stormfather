import * as T from 'three';
import { ModelBuilder,palette } from './kit';
import { speciesAnatomy } from '../simulation';
export type Species=keyof typeof speciesAnatomy;
export interface CreatureRig {group:T.Group;legs:T.Group[];fins:T.Group[];shell?:T.Object3D;body:T.Group}
export function buildCreature(species:Species):CreatureRig{
  const group=new T.Group();group.name=species;const body=new T.Group();group.add(body);const legs:T.Group[]=[],fins:T.Group[]=[];const b=new ModelBuilder();
  const giant=species==='chasmfiend',chull=species==='chull',goat=species==='goat',eel=species==='skyeel',small=species==='cremling';
  const length=giant?24:chull?3.2:goat?1.5:small?.45:eel?1.65:1.8;
  const width=giant?3:chull?1.65:goat?.45:small?.2:eel?.12:.42;
  const height=giant?5:chull?1.4:goat?.72:small?.1:eel?0:.6;
  const shellColor=giant?'#62516f':chull?'#a9967b':goat?'#d5cbbc':small?'#647974':eel?'#58848b':'#79665c';
  if(eel){
    for(let i=0;i<10;i++)b.sphere([Math.sin(i*.5)*.035,0,(i/9-.5)*length],[width*(1-i*.045),.095*(1-i*.045),.17],i%3?'#5e8388':'#769294');
    b.sphere([0,.015,-length*.48],[.12,.1,.17],'#617b7f');
    for(const side of [-1,1]){
      const f=new ModelBuilder();const shape=new T.Shape();shape.moveTo(0,-.45);shape.quadraticCurveTo(side*.6,-.12,side*.34,.35);shape.quadraticCurveTo(side*.14,.62,0,.5);shape.closePath();const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);f.add(g,'#91aaa2',[0,0,.05]);g.dispose();const pivot=new T.Group();pivot.add(f.finish('flowing_fin'));body.add(pivot);fins.push(pivot);
    }
  }else{
    b.sphere([0,height,0],[width*(giant?.85:1),height*(giant?.34:.5),length*.42],shellColor);
    if(chull){
      b.sphere([0,height*1.34,.1],[width*1.06,height*.78,length*.44],shellColor);
      for(let i=0;i<26;i++){const a=i*2.39996,r=.17*Math.sqrt(i);b.sphere([Math.cos(a)*r,height*1.97-r*.35,Math.sin(a)*r],[.28,.18,.28],i%3?'#ae9d7f':'#908970');}
      b.box([0,height*1.8,.1],[1.4,.14,1.6],palette.wood);
      b.box([0,height*2.03,.1],[1.1,.45,1.1],'#95754f');
      for(const side of [-1,1]){b.beam([side*.6,height*2.26,-.42],[side*.6,height*2.26,.65],.05,'#c0aa7b');b.beam([side*.68,height*1.7,-.6],[side*.85,height*.8,-.4],.08,'#4e3e2e');}
      for(let j=0;j<10;j++)b.sphere([Math.sin(j*2.4)*.9,height*2.05,Math.cos(j*2.4)*.75],[.055,.05,.055],'#c2b899');
    }
    if(giant){
      // Overlapping plates carry pale growth rims and smaller ridge scales.
      for(let j=0;j<42;j++){const z=(j/41-.5)*length*.9,a=j*2.399; b.sphere([Math.sin(a)*width*.72,height+1.65+Math.cos(a)*.2,z],[.22,.15,.38],j%3?'#958397':'#b1a19e');}
      for(let i=0;i<11;i++){
        const z=(i/10-.5)*length;const taper=1-Math.abs(i-4)*.055;
        b.sphere([0,height+.9,z],[width*taper,1.1,1.6],i%2?'#6e5b7b':'#74617e');
        for(const side of [-1,1]){
          const root:import('./kit').V3=[side*width*taper*.88,height+1.5,z];
          b.beam(root,[root[0]+side*.4,height+2.25,z-.13],.34,'#8d798e');b.beam([root[0]+side*.4,height+2.25,z-.13],[root[0]+side*.62,height+3,z-.48],.21,'#a490a1');
          b.beam([root[0]+side*.62,height+3,z-.48],[root[0]+side*.65,height+3.3,z-.7],.06,'#c2afae');
        }
        for(let j=1;j<=14;j++){const a=(j-1)/14*Math.PI,c=j/14*Math.PI;b.beam([Math.cos(a)*width*taper,height+.9+Math.sin(a)*1.11,z-.8],[Math.cos(c)*width*taper,height+.9+Math.sin(c)*1.11,z-.8],.07,'#a18d9e');}
      }
      b.sphere([0,height*.72,-length*.47],[width*.73,1.45,2.2],'#64516b');
      b.sphere([0,height*.6,-length*.54],[1.25,.62,.18],'#2f2934');
      for(let j=-4;j<=4;j++){b.cone([j*.23,height*.55,-length*.55],.1,.48,'#d5c4a4');b.sphere([j*.21,height*.9,-length*.535],[.035,.055,.06],'#29262a');}
      for(const side of [-1,1]){b.beam([side*.95,height*.63,-length*.54],[side*1.3,height*.43,-length*.57],.48,'#baaa95');b.beam([side*1.3,height*.43,-length*.57],[side*.85,height*.4,-length*.61],.27,'#dccbb2');b.sphere([side*.55,height*.8,-length*.54],[.16,.17,.13],'#a9c6ac');}
    }else{
      b.sphere([0,height*.75,-length*.48],[width*.6,height*.32,length*.17],goat?'#a58a72':shellColor);
      for(const side of [-1,1]){
        b.sphere([side*width*.48,height*.88,-length*.57],[.035,.04,.035],'#121b1b');
        if(!goat)b.beam([side*width*.35,height*.83,-length*.52],[side*width*.75,height*1.15,-length*.8],small?.01:.025,shellColor);
        else b.cone([side*.12,height*1.18,-length*.49],.045,.33,'#665b45');
      }
      if(species==='axehound'){b.sphere([0,height*.55,-length*.65],[.18,.09,.09],'#3f3532');for(const side of [-1,1])b.beam([side*.15,height*.45,-length*.62],[side*.1,height*.43,-length*.74],.036,'#baac86');}
      if(species==='axehound')for(let j=0;j<6;j++)b.box([0,height*1.32,(j/5-.5)*length*.8],[width*1.9,.17,.25],j%2?'#837063':'#a18b71');
    }
    const pairs=speciesAnatomy[species].legs/2;
    for(let i=0;i<pairs;i++)for(const side of [-1,1]){
      const z=(i/Math.max(1,pairs-1)-.5)*length*.72;const attack=giant&&i<2;const segment=height*(attack?1.25:.8);
      const pivot=new T.Group();pivot.position.set(side*width*.65,height*.75,z);
      const limb=new ModelBuilder();
      if(goat){limb.beam([0,0,0],[side*.04,-height*.5,.04],.11,'#ae9b80');limb.beam([side*.04,-height*.5,.04],[0,-height*.88,0],.07,'#665943');}
      else{
        limb.sphere([side*segment*.55,-segment*.18,.12],[giant?.42:small?.03:.13,giant?.35:small?.03:.12,giant?.43:small?.03:.14],giant?'#9f879c':'#a69a7d');
        limb.beam([0,0,0],[side*segment*.55,-segment*.18,.12],small?.025:giant?.32:.13,shellColor);
        limb.beam([side*segment*.55,-segment*.18,.12],[side*segment*.7,-height*.73,-.12],small?.015:giant?.2:.075,shellColor);
        if(attack||chull&&i===0){
          const r=giant?.7:.23;limb.sphere([side*segment*.7,-height*.62,-.25],[r,r*.6,r*1.1],shellColor);
          for(const split of [-1,1])limb.beam([side*segment*.7,-height*.62,-.4],[side*segment*.7+split*r*.6,-height*.65,-.9*(giant?2:1)],r*.25,'#bbaa8a');
        }
      }
      pivot.add(limb.finish(`leg_${i}_${side}`));body.add(pivot);legs.push(pivot);
    }
  }
  const shell=b.finish('carapace');body.add(shell);group.userData={species,legs:speciesAnatomy[species].legs,foreclaws:speciesAnatomy[species].foreclaws};
  return {group,legs,fins,shell,body};
}
