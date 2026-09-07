import * as T from 'three';
import type {ModelBuilder,V3} from './kit';
import {archway,barrel,pottery,facadeWindow} from './architecture';

/** The civic market is original Alethi architecture: flat protected roofs,
 * deep shade beneath arcades, bronze screens and a clear walking axis. */
export function marketCourt(b:ModelBuilder,center:readonly[number,number]){
 const [cx,cz]=center,stone='#acae9e',pale='#c1c0ab',metal='#73684c',lamps:V3[]=[];
 b.box([cx,.15,cz],[66,.12,66],'#9d9f94',[0,0,0],'paving');
 for(const side of [-1,1]){
  b.building(cx+side*22,0,cz+11,11,32,12.8+(side===1?1.8:0),side===1?'#9aa69f':'#b4ada0');
  b.box([cx+side*14.4,5.14,cz+11],[5.2,.4,33],stone,[0,0,0],'cutstone');
  b.box([cx+side*14.4,5.41,cz+11],[5.5,.16,33.3],pale,[0,0,0],'cutstone');
  for(let bay=0;bay<4;bay++){
   const z=cz-1+bay*8;
   archway(b,[cx+side*12.3,.21,z],8,3.04,1.85,1.03,-side*Math.PI/2,stone);
   // A shaded vaulted porch has actual depth behind each open arch.
   for(const end of [-1,1]){
    const zz=z+end*3.7;
    b.box([cx+side*12.3,1.8,zz],[1.3,3.2,.75],stone,[0,0,0],'cutstone');
    b.box([cx+side*12.3,.44,zz],[1.58,.45,1.04],'#777f74',[0,0,0],'cutstone');
   }
   for(let i=0;i<5;i++)b.box([cx+side*12.16,5.92,z-3+i*1.5],[.06,.85,.035],metal,[0,0,0],'metal');
   b.beam([cx+side*12.16,6.37,z-3.8],[cx+side*12.16,6.37,z+3.8],.065,metal);
  }
  for(let j=0;j<2;j++){
   const x=cx+side*8.4,z=cz+2+j*10;
   b.stall(x,.21,z,j===1?'#4e7278':side===1?'#91654c':'#807849');
  }
  for(const zz of [-2,10,22]){
   const x=cx+side*5.9,z=cz+zz;
   lamps.push([x,.21,z]);
   b.cylinder([x,2.01,z],.07,3.6,'#414b45','metal');
   b.cylinder([x,.4,z],.26,.38,'#6e7669','cutstone');
   b.beam([x,4.04,z],[x+.55,4.04,z],.06,metal);
   b.cylinder([x+.55,3.71,z],.18,.51,'#ffdda1','lamp');
   b.cone([x+.55,4.04,z],.29,.23,metal);
   for(const dx of [-.14,.14])for(const dz of [-.14,.14])b.beam([x+.55+dx,3.46,z+dz],[x+.55+dx,3.95,z+dz],.025,'#455048');
   b.cylinder([x+.55,3.45,z],.24,.09,metal,'metal');
  }
  // Foreground freight and stepped stone benches give a useful sense of scale.
  for(let i=0;i<3;i++)barrel(b,[cx+side*(9.2+i*.67),.21,cz+23+i*.31],.75+(i%2)*.2);
  pottery(b,[cx+side*6.8,.21,cz+22],1.08,side<0?'#9e7051':'#718477');
  for(const z of [-5,8]){
   b.box([cx+side*14.7,.73,cz+z],[.9,.17,2.2],stone,[0,0,0],'cutstone');
   for(const dz of [-.7,.7])b.box([cx+side*14.7,.44,cz+z+dz],[.68,.56,.23],'#778275',[0,0,0],'cutstone');
  }
 }
 const gateZ=cz-8.5;
 // A civic portal embedded in the base of the windblade shelters the far end.
 for(const side of [-1,1]){
  b.building(cx+side*7.1,.21,gateZ,5.2,5.5,9.8,stone,'dome');
  b.box([cx+side*7.1,1.13,gateZ+3.3],[5.6,1.8,1.1],'#6d786e',[0,0,0],'cutstone');
  facadeWindow(b,[cx+side*7.1,4.4,gateZ+2.77],1.3,2.2,0,true,true);
 }
 b.box([cx,3.38,gateZ+.9],[7.6,6.34,1.1],'#283633',[0,0,0],'recess');
 for(let plank=0;plank<18;plank++){const x=(plank-8.5)*.38,h=5.3+Math.sqrt(Math.max(0,1-(x/3.56)**2))*2.98;b.box([cx+x,.21+h/2,gateZ+1.51],[.36,h,.13],plank%3?'#68583e':'#7b6549',[0,0,0],'timber');}
 for(const yy of [1.45,4.35])b.box([cx,yy,gateZ+1.62],[6.8,.13,.055],'#424b41',[0,0,0],'metal');
 archway(b,[cx,.21,gateZ+2],8.8,5.3,3.7,1.6,0,pale);
 b.box([cx,9.7,gateZ+.8],[10.1,.35,3.3],stone,[0,0,0],'cutstone');
 b.box([cx,10.02,gateZ+.8],[10.5,.24,3.6],pale,[0,0,0],'cutstone');
 const ring=new T.TorusGeometry(.7,.065,8,40);b.add(ring,metal,[cx,8.01,gateZ+2.86],[1,1,1],[0,0,0],'metal');ring.dispose();
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;b.beam([cx+Math.sin(a)*.18,8.01+Math.cos(a)*.18,gateZ+2.89],[cx+Math.sin(a)*.62,8.01+Math.cos(a)*.62,gateZ+2.89],.036,metal);}
 for(let i=0;i<3;i++)b.box([cx,.26+i*.17,gateZ+4-i*.55],[10.1-i*.38,.17,3.2-i*.7],pale,[0,0,0],'cutstone');
 b.routes.push({id:'market-civic-axis',species:'human',points:[[cx-14.5,.22,cz+22],[cx-3,.22,cz+19],[cx+3,.22,cz],[cx+14.5,.22,cz-1]],activity:'Visiting the market beneath the windblades'});
 // Drain channels and individual edging stones keep the pavement from reading
 // as a single texture sheet. All geometry remains batched with the city.
 for(const side of [-1,1])for(let i=0;i<36;i++){
  const z=cz-3+i*.91;
  b.box([cx+side*4.7,.24,z],[.13,.025,.67],'#4e5a53',[0,0,0],'recess');
  b.box([cx+side*11.35,.29,z],[.31,.15,.87],'#919c8c',[0,0,0],'cutstone');
 }
 return lamps;
}
