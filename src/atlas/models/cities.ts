import { ModelBuilder, palette, random, type PlaceModel, type V3 } from './kit';
import type { PlaceId } from '../data';

function finalize(b:ModelBuilder,id:PlaceId,eye:V3,target:V3,close:V3,closeTarget:V3,radius=380,water?:PlaceModel['water']):PlaceModel{
  return {id,group:b.finish(`${id}_v2`),routes:b.routes,overview:{eye,target},close:{eye:close,target:closeTarget},radius,water,features:[]};
}
function ship(b:ModelBuilder,x:number,z:number,y=0,scale=1){
  b.sphere([x,y+1.1,z],[3.3*scale,2*scale,10*scale],palette.wood);
  b.box([x,y+2*scale,z],[5*scale,.5,16*scale],'#96754f');
  b.cylinder([x,y+10*scale,z],.18*scale,18*scale,palette.wood);
  b.box([x,y+11*scale,z],[11*scale,10*scale,.15],'#d7d0b5',[0,.15,.1]);
  b.beam([x-5*scale,y+16*scale,z],[x+5*scale,y+16*scale,z],.2,palette.wood);
  b.beam([x,y+19*scale,z],[x,y+2*scale,z+8*scale],.07,palette.cream);
}
function docks(b:ModelBuilder,front=130){
  for(let i=-3;i<=3;i++){
    const x=i*28;b.box([x,1,front+26],[7,2,60],palette.wood);
    for(let k=0;k<6;k++){b.cylinder([x-3,.3,front+k*10],.38,6,palette.wood);b.cylinder([x+3,.3,front+k*10],.38,6,palette.wood);}
    for(let k=0;k<5;k++)b.box([x-1.5+(k%2)*2,2.7,front+5+k*6],[1.5,1.4,1.5],'#886641');
    b.path(`dock-${i}`,[[x,2.1,front-3],[x,2.1,front+47]],2,'Carrying cargo along the docks',palette.wood);
    if(i%2===0)ship(b,x+10,front+35,0,.85);
  }
}
export function buildKharbranth():PlaceModel{
  const b=new ModelBuilder(); const rng=random(17);
  b.box([0,-20,-5180],[12000,40,10000],'#858878');
  const colors=['#bb4934','#ce6636','#d48a48','#b7533e','#a96992','#568fac','#d45b37','#dfc065','#c75c45','#88a875'];
  // Terraces rise into a narrowing wedge and leave wide switchback streets free.
  for(let tier=0;tier<9;tier++){
    const z=105-tier*28,y=tier*10,half=137-tier*10;
    b.box([0,y-4,z-5],[half*2,8,29],'#9b8d75');
    b.box([0,y-.25,z+9],[half*2,1,2],'#d0b996');
    const xs=[];for(let x=-half+9;x<half-7;x+=17)xs.push(x);
    xs.forEach((x,i)=>{b.building(x,y,z-8,12+rng()*2,12,6+rng()*10,colors[(i+tier*3)%colors.length],i%9===0?'dome':'flat');if(i%4===0)b.stall(x,y,z+3,colors[(i+2)%colors.length]);});
    b.path(`ralinsa-${tier}`,[[-half+2,y+.2,z+6],[half-2,y+.2,z+6]],5,'Carrying goods up the Ralinsa');
    if(tier<8){const edge=tier%2?1:-1;const nextHalf=half-10;b.path(`switchback-${tier}`,[[edge*(half-2),y+.2,z+6],[edge*(nextHalf-2),y+10.2,z-22]],5,'Climbing a switchback');}
    // Bell towers, with a visible hanging bronze bell inside four piers.
    if(tier%2===0){const x=half-13;b.box([x,y+14,z-4],[7,1,7],palette.cream);for(const dx of [-2.8,2.8])for(const dz of [-2.8,2.8])b.box([x+dx,y+9,z-4+dz],[.65,10,.65],palette.cream);b.sphere([x,y+11,z-4],[1.7,2,1.7],palette.bronze,'metal');b.cone([x,y+16,z-4],5,4);}
  }
  b.box([0,-3,121],[280,6,15],'#aa9a7d');
  b.path('quayside',[[-120,.2,121],[120,.2,121]],8,'Unloading harbor cargo');
  docks(b,130);
  for(let s=-1;s<=1;s+=2)for(let i=0;i<9;i++)b.rock(s*(245-i*9),-8,100-i*36,42,70+i*16,55,'#7f8177',i+s);
  b.rock(0,35,-300,115,180,68,'#7b817a',8);
  b.building(0,80,-127,72,26,15,'#d0bf9e');
  b.cylinder([0,96,-127],10,2,palette.cream);b.sphere([0,98,-127],[10,7,10],'#c8baa0');
  b.path('conclave',[[-34,80.2,-108],[34,80.2,-108]],7,'Visiting the Conclave');
  return finalize(b,'kharbranth',[70,235,570],[0,60,5],[30,13,157],[0,8,110],500,{y:-1,size:2400,shallow:false});
}
