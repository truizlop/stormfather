import * as T from 'three';
import { ModelBuilder, palette, random, type PlaceModel, type V3 } from './kit';

export const URITHIRU_TIERS=10;
export const URITHIRU_FLOORS_PER_TIER=18;
export const URITHIRU_HEIGHT=823;
// Width ratios measured from the west elevation: the two broad basal levels
// support a much narrower upper stack. Uniform tapering would miss this form.
export const URITHIRU_RADII=[650,650,390,320,265,245,225,195,135,95] as const;
/** Semicircular prism with its straight face east (+X), in metric units. */
export function halfDisk(radius:number,height:number){
  const shape=new T.Shape();shape.moveTo(0,-radius);
  for(let i=0;i<=80;i++){const a=Math.PI*i/80;shape.lineTo(-Math.sin(a)*radius,-Math.cos(a)*radius);}
  shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1,curveSegments:80});g.rotateX(-Math.PI/2);return g;
}
export function buildUrithiru():PlaceModel {
  const b=new ModelBuilder();const rng=random(91);const h=URITHIRU_HEIGHT/URITHIRU_TIERS;
  // Base and natural peaks engulf the east face and the two ends of lower tiers.
  const forecourt=halfDisk(940,52);b.add(forecourt,'#858782',[0,-52,0]);forecourt.dispose();
  for(let i=0;i<32;i++){
    const z=(i-16)*72; const x=100+rng()*250; const peak=260+rng()*530;
    b.rock(x,-80,z,160+rng()*110,peak,115+rng()*120,i%3?'#747f82':'#8c9695',i);
  }
  for(let level=0;level<URITHIRU_TIERS;level++){
    const radius=URITHIRU_RADII[level]; const y=level*h;
    const g=halfDisk(radius,h-2);b.add(g,level%2?'#c8c4b4':'#b7b8ac',[0,y,0],[1,1,1],[0,0,0],'strata');g.dispose();
    const ledge=halfDisk(radius+4,2.6);b.add(ledge,palette.cream,[0,y+h-2,0]);ledge.dispose();
    const columns=Math.round(radius/5.6);
    for(let i=0;i<=columns;i++){
      const a=i/columns*Math.PI;const x=-Math.sin(a)*(radius+.6),z=Math.cos(a)*(radius+.6);
      // Vertical recessed bays run across eighteen explicitly modeled window floors.
      b.box([x,y+h*.49,z],[2.6,h*.83,.55],palette.dark,[0,-a,0]);
      b.box([x-Math.sin(a)*1.1,y+h*.48,z+Math.cos(a)*1.1],[.65,h*.89,.9],palette.cream,[0,-a,0]);
      for(let f=0;f<URITHIRU_FLOORS_PER_TIER;f++){
        const rr=radius+1.05;
        b.box([-Math.sin(a)*rr,y+2.4+f*4.25,Math.cos(a)*rr],[1.45,2.8,.2],palette.window,[0,-a,0],'window');
      }
    }
    // Tall arched bays and projecting piers follow the published west elevation.
    const bays=Math.max(7,Math.round(radius/27));
    for(let j=0;j<=bays;j++){
      const a=j/bays*Math.PI,rr=radius+2;
      b.box([-Math.sin(a)*rr,y+h*.48,Math.cos(a)*rr],[2.7,h*.94,3.5],palette.cream,[0,-a,0]);
      if(j<bays){
        const mid=(j+.5)/bays*Math.PI,span=radius*Math.PI/bays*.38;
        const points:V3[]=[];
        for(let k=0;k<=12;k++){const theta=k/12*Math.PI;const offset=Math.cos(theta)*span;
          points.push([-Math.sin(mid)*(rr+1)+Math.cos(mid)*offset,y+h*.73+Math.sin(theta)*h*.19,Math.cos(mid)*(rr+1)+Math.sin(mid)*offset]);}
        for(let k=1;k<points.length;k++)b.beam(points[k-1],points[k],1.5,palette.cream);
      }
    }
    // Terrace plots occupy only the exposed roof outside the next tier.
    if(level<9&&radius-URITHIRU_RADII[level+1]>30)for(let i=0;i<18;i++){
      const a=(i+.5)/18*Math.PI;const rr=radius-26;
      b.box([-Math.sin(a)*rr,y+h+1,Math.cos(a)*rr],[20,.8,34],i%3?'#8f916c':'#a4a17c',[0,-a,0]);
      for(let k=-2;k<=2;k++)b.box([-Math.sin(a)*rr+Math.cos(a)*k*3,y+h+1.6,Math.cos(a)*rr+Math.sin(a)*k*3],[.7,.45,31],'#666f51',[0,-a,0]);
    }
  }
  // The massive eastern window is a continuous plane, not a glass skyscraper.
  b.box([1,URITHIRU_HEIGHT*.49,0],[1.5,URITHIRU_HEIGHT*.96,76],'#51818c',[0,0,0],'window');
  for(let z=-36;z<=36;z+=9)b.box([2,URITHIRU_HEIGHT*.49,z],[2.8,URITHIRU_HEIGHT*.96,1.3],palette.cream);
  for(let f=1;f<180;f++)b.box([2.5,f*4.5,0],[1,1,76],palette.cream);
  // Broad farm plateaus and ten separate local teleportation platforms.
  for(let i=0;i<10;i++){
    const a=(i+.5)/10*Math.PI;const x=-Math.sin(a)*790,z=Math.cos(a)*790;
    b.cylinder([x,-3,z],57,7,'#aeb0a3');b.cylinder([x,1,z],52,1,palette.cream);
    b.cylinder([x,1.7,z],47,.4,'#8b938b');b.building(x,2,z,10,10,8,palette.stone,'dome');
    for(let j=0;j<10;j++){const theta=j/10*Math.PI*2;b.box([x+Math.sin(theta)*49,2.5,z+Math.cos(theta)*49],[1,2.2,1],palette.bronze);}
    const rr=695;
    b.path(`oathgate-${i}`,[[-Math.sin(a)*rr,1,Math.cos(a)*rr],[x,1,z+18]],9,'Walking toward the Oathgate',palette.stone,'human',true);
  }
  // A deliberately small populated forecourt retains human scale against the immense city.
  b.path('terrace-arc',Array.from({length:31},(_,i)=>{const a=.25+i/30*(Math.PI-.5);return [-Math.sin(a)*710,1,Math.cos(a)*710] as V3;}),10,'Crossing the lower forecourt',palette.stone,'human',true);
  for(let i=0;i<12;i++){
    const a=.4+i/11*2.3;const x=-Math.sin(a)*680,z=Math.cos(a)*680;
    b.building(x,0,z,12,10,7,'#a7a99b');
  }
  const group=b.finish('Urithiru_v2');group.userData={...group.userData,tiers:10,floorsPerTier:18,heightMeters:823,oathgates:10,reference:'Ben McSweeney — Urithiru / Oathbringer'};
  return {id:'urithiru',group,routes:b.routes,overview:{eye:[-1500,1050,1450],target:[-140,320,0]},close:{eye:[-751,16,42],target:[-687,5,0]},radius:1400,features:['Ten semicircular tiers','180 floors','Ten Oathgate platforms']};
}
