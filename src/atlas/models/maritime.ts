import * as T from 'three';
import type {ModelBuilder,V3} from './kit';
import {barrel} from './architecture';

const hullMaterial='#65513d',trim='#b29a6e';
function local(x:number,y:number,z:number,yaw:number){const c=Math.cos(yaw),s=Math.sin(yaw);return(p:V3):V3=>[x+p[0]*c+p[2]*s,y+p[1],z-p[0]*s+p[2]*c];}
/** Open curved hull, planked deck, billowing canvas and actual standing rigging. */
export function sailingBoat(b:ModelBuilder,x:number,y:number,z:number,length=22,yaw=0,fishing=false){
 const at=local(x,y,z,yaw),L=length,w=L*.19,depth=L*.11,points:number[]=[];
 const point=(i:number,j:number):V3=>{
  const t=i/20,q=j/12*Math.PI,beam=Math.pow(Math.sin(t*Math.PI),.65)*w;
  return at([Math.cos(q)*beam,depth*(1-Math.sin(q))+.07*L*Math.pow(Math.abs(t-.5)*2,4)-depth*.45,(t-.5)*L]);
 };
 for(let i=0;i<20;i++)for(let j=0;j<12;j++)for(const p of [point(i,j),point(i+1,j),point(i,j+1),point(i,j+1),point(i+1,j),point(i+1,j+1)])points.push(...p);
 const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(points,3));hull.computeVertexNormals();b.add(hull,hullMaterial,[0,0,0],[1,1,1],[0,0,0],'timber');hull.dispose();
 const deckY=depth*.5;
 for(let i=1;i<20;i++){
  const t=i/20,beam=Math.pow(Math.sin(t*Math.PI),.65)*w;
  b.box(at([0,deckY,(t-.5)*L]),[beam*1.84,.07,L/20*.93],i%3?'#8d7755':'#9b845f',[0,yaw,0],'timber');
 }
 for(const side of [-1,1]){
  for(let i=0;i<20;i++){
   const a=point(i,side===1?0:12),c=point(i+1,side===1?0:12);b.beam(a,c,.085,trim);
   if(i%2===0&&i>1&&i<19){b.beam(at([side*Math.pow(Math.sin(i/20*Math.PI),.65)*w,deckY,(i/20-.5)*L]),at([side*Math.pow(Math.sin(i/20*Math.PI),.65)*w,deckY+.62,(i/20-.5)*L]),.055,trim);}
  }
 }
 const mast=L*(fishing?.55:.85),mastZ=-L*.06;
 b.cylinder(at([0,deckY+mast/2,mastZ]),L*.008,mast,'#775d40','timber');
 b.beam(at([-w*1.32,deckY+mast*.89,mastZ]),at([w*1.32,deckY+mast*.89,mastZ]),L*.008,'#937c58');
 if(!fishing){
  const sail=new T.PlaneGeometry(w*2.65,mast*.63,16,16),p=sail.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const xx=p.getX(i),yy=p.getY(i),v=(yy+mast*.315)/(mast*.63),billow=Math.sin((xx/(w*2.65)+.5)*Math.PI)*Math.sin(v*Math.PI)*w*.43;
   p.setXYZ(i,xx*(.85+v*.15),yy+deckY+mast*.57,mastZ+billow+.08);
  }
  sail.computeVertexNormals();b.add(sail,'#c3b798',[x,y,z],[1,1,1],[0,yaw,0],'canvas');sail.dispose();
  for(const side of [-1,1])for(const end of [-.32,.32])b.beam(at([0,deckY+mast*.95,mastZ]),at([side*w*.83,deckY,end*L]),.024,'#b5a788');
  for(let seam=-3;seam<=3;seam++){
   const sx=seam*w*.32;
   b.beam(at([sx*.85,deckY+mast*.255,mastZ+.09]),at([sx,deckY+mast*.885,mastZ+.09]),.008,'#8f836a');
  }
 }else{
  b.beam(at([0,deckY+mast*.8,mastZ]),at([w*.6,deckY+.25,L*.3]),.022,'#ad9c7e');
  for(let row=0;row<8;row++)b.beam(at([-w*.6,deckY+.18,-L*.17+row*.14]),at([w*.6,deckY+.18,-L*.17+row*.14]),.018,'#7a7964');
  for(let col=-5;col<=5;col++)b.beam(at([col*w*.1,deckY+.18,-L*.17]),at([col*w*.1,deckY+.18,-L*.17+.98]),.018,'#7a7964');
 }
 for(const side of [-1,1])barrel(b,at([side*w*.55,deckY+.05,L*.16]),Math.min(1,L/23));
 b.box(at([0,deckY+.2,L*.27]),[w*.9,.4,L*.12],'#76674e',[0,yaw,0],'timber');
}
export function dockDetails(b:ModelBuilder,p:V3,length:number,width:number,yaw=0){
 const at=local(...p,yaw);
 for(let i=0;i<Math.ceil(length/.38);i++)b.box(at([0,.06,-length/2+i*.38]),[width,.09,.34],i%4?'#867454':'#9d8964',[0,yaw,0],'timber');
 for(const side of [-1,1])for(let i=0;i<=Math.floor(length/4);i++){
  const zz=-length/2+i*4;b.cylinder(at([side*(width/2+.06),-.7,zz]),.18,3,'#7b6d51','timber');b.cylinder(at([side*(width/2+.06),.8,zz]),.22,.12,'#555d52','metal');
 }
 for(let i=0;i<3;i++){const torus=new T.TorusGeometry(.29+i*.055,.016,4,24);b.add(torus,'#bca986',at([width*.25,.15+i*.014,length*.3]),[1,1,1],[Math.PI/2,0,0],'rope');torus.dispose();}
}
