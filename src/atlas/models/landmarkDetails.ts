import * as T from 'three';
import type {ModelBuilder,PlaceModel,V3} from './kit';
import {ModelBuilder as Builder} from './kit';
import {archway,barrel,pottery} from './architecture';
import {grassPatch,cropPlot,fieldFence} from './nature';
import {sailingBoat,dockDetails} from './maritime';

const stone='#b5b5a0',bronze='#9b824e',wood='#827053';
const fragment=new T.IcosahedronGeometry(1,1);
export function rubble(b:ModelBuilder,p:V3,radius:number,seed:number,count=14){
 for(let i=0;i<count;i++){
  const a=i*2.399+seed,r=Math.sqrt((i+.3)/count)*radius,s=.12+(Math.sin(i*72+seed)*.5+.5)*.4;
  b.add(fragment,i%3?'#989c88':'#b7b39b',[p[0]+Math.sin(a)*r,p[1]+s*.22,p[2]+Math.cos(a)*r],[s*1.6,s*.55,s],[i*.3,a,i*.19],'rock');
 }
}
export function ringInlay(b:ModelBuilder,p:V3,r:number){
 for(const rr of [r,r*.84,r*.38]){
  const ring=new T.TorusGeometry(rr,.035,4,96);b.add(ring,bronze,p,[1,1,1],[Math.PI/2,0,0],'metal');ring.dispose();
 }
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5;
  b.beam([p[0]+Math.sin(a)*r*.38,p[1],p[2]+Math.cos(a)*r*.38],[p[0]+Math.sin(a)*r*.84,p[1],p[2]+Math.cos(a)*r*.84],.055,bronze);
  const diamond=new T.CircleGeometry(r*.04,4);b.add(diamond,'#566c68',[p[0]+Math.sin(a)*r*.91,p[1]+.006,p[2]+Math.cos(a)*r*.91],[1,1,1],[-Math.PI/2,0,a],'metal');diamond.dispose();
 }
}
export function stoneColumn(b:ModelBuilder,p:V3,height:number,r=.42,broken=false){
 b.box([p[0],p[1]+.13,p[2]],[r*2.7,.26,r*2.7],stone,[0,0,0],'cutstone');
 const shaft=new T.CylinderGeometry(r*.8,r,height-.52,32,broken?8:1),pos=shaft.getAttribute('position');
 for(let i=0;i<pos.count;i++){
  const a=Math.atan2(pos.getZ(i),pos.getX(i)),flute=1-.035*(.5+.5*Math.cos(a*16));pos.setXYZ(i,pos.getX(i)*flute,pos.getY(i),pos.getZ(i)*flute);
  if(broken&&pos.getY(i)>(height-.52)*.49)pos.setY(i,pos.getY(i)+Math.sin(a*3+p[0])*.3);
 }
 shaft.computeVertexNormals();b.add(shaft,stone,[p[0],p[1]+height/2,p[2]],[1,1,1],[0,0,0],'cutstone');shaft.dispose();
 if(!broken){b.cylinder([p[0],p[1]+height-.23,p[2]],r*1.15,.16,stone,'cutstone');b.box([p[0],p[1]+height-.06,p[2]],[r*2.8,.12,r*2.8],stone,[0,0,0],'cutstone');}
}
function lantern(b:ModelBuilder,p:V3,sites:V3[]){
 b.cylinder([p[0],p[1]+1.85,p[2]],.06,3.7,'#4d5b53','metal');
 b.cylinder([p[0],p[1]+3.35,p[2]],.22,.54,'#ffe1a7','lamp');
 for(const dx of [-.2,.2])for(const dz of [-.2,.2])b.beam([p[0]+dx,p[1]+3.04,p[2]+dz],[p[0]+dx,p[1]+3.68,p[2]+dz],.025,'#45534d');
 b.cone([p[0],p[1]+3.81,p[2]],.35,.32,'#59645b');sites.push(p);
}
function urithiru(b:ModelBuilder){
 b.box([-697,.22,0],[98,.3,166],'#b3b8ae',[0,0,0],'ashlar');
 for(let i=-7;i<=7;i++){
  archway(b,[-669,0,i*10],9.7,5.8,2.4,.9,-Math.PI/2,stone);
  if(i%2===0){pottery(b,[-675,.38,i*10+3],1.65,'#9ca896');grassPatch(b,[-675,1.4,i*10+3],.4,i+9,false,55);}
 }
 b.box([-663,8.45,0],[13,.55,151],stone,[0,0,0],'cutstone');
 b.box([-663,8.81,0],[13.6,.18,151.6],'#d2cbb3',[0,0,0],'cutstone');
 for(let z=-79;z<=79;z+=4){stoneColumn(b,[-741,.38,z],1.5,.16);if(z<79)b.beam([-741,1.85,z],[-741,1.85,z+4],.12,'#aeb9ad');}
 for(const z of [-54,54]){b.box([-707,.6,z],[5,.7,2.5],stone,[0,0,0],'cutstone');b.box([-707,1,z],[5.2,.16,2.7],'#d0cab4',[0,0,0],'cutstone');}
 ringInlay(b,[-705,.385,0],14);
 for(let i=0;i<10;i++){const a=(i+.5)/10*Math.PI;ringInlay(b,[-Math.sin(a)*790,1.92,Math.cos(a)*790],43);}
}
function shinovar(b:ModelBuilder){
 for(const side of [-1,1]){
  for(let row=-3;row<=3;row++){
   const z=row*42;b.box([side*69,.06,z],[58,.08,34],'#8b8658',[0,0,0],'earth');
   cropPlot(b,[side*68,.14,z],26,30,row+20,side===1);
   fieldFence(b,[side*42,.15,z-17],[side*96,.15,z-17]);
  }
  for(const z of [-24,24,78]){b.tree(side*11,0,z,7+Math.abs(z%4),true);grassPatch(b,[side*10,.03,z],3.5,z+80,false,550);}
  for(let z=-150;z<=150;z+=11)grassPatch(b,[side*5.6,.02,z],2.5,z+160,false,130);
 }
 // A working village well, with a timber hoist and sheltered bucket.
 for(let i=0;i<24;i++){const a=i*Math.PI/12;b.box([9+Math.sin(a)*1.25,.4,7+Math.cos(a)*1.25],[.33,.8,.38],'#9c9d86',[0,a,0],'ashlar');}
 for(const x of [7.5,10.5])b.box([x,1.9,7],[.16,3.8,.16],wood,[0,0,0],'timber');
 b.beam([7.4,3.7,7],[10.6,3.7,7],.2,wood);b.beam([9,3.7,7],[9,.7,7],.025,'#b7a67a');pottery(b,[9,.65,7],.7);
}
function purelake(b:ModelBuilder,sites:V3[]){
 dockDetails(b,[0,1.11,-65],110,6,Math.PI/2);
 // A low fishing stage lies beside the wading routes and retains their shallow water.
 b.box([-17,.5,7],[6,.35,25],wood,[0,0,0],'timber');dockDetails(b,[-17,.7,7],25,6);
 for(const z of [-2,15]){sailingBoat(b,-24,.5,z,9,Math.PI*.13,true);lantern(b,[-15,.8,z],sites);}
 for(let i=0;i<5;i++){barrel(b,[-17+(i%2)*1.1,.81,-1+i*3],.65);pottery(b,[-18.4,.81,i*3],.75);}
 for(const z of [-6,6]){
  for(const x of [-19,-15])b.box([x,2.3,z],[.12,3,.12],wood,[0,0,0],'timber');
  b.beam([-19,3.7,z],[-15,3.7,z],.08,wood);
  for(let i=0;i<14;i++)b.beam([-18.8+i*.27,3.6,z],[-18.8+i*.27,1.4,z+.22*Math.sin(i)],.012,'#797969');
  for(let i=0;i<9;i++)b.beam([-18.8,1.4+i*.25,z],[-15.2,1.4+i*.25,z],.012,'#797969');
 }
 for(let i=0;i<30;i++){const a=i*2.4;b.add(fragment,'#9ca585',[Math.sin(a)*45,-.27,Math.cos(a)*35],[.7,.28,1],[0,a,0],'rock');}
}
function ruins(b:ModelBuilder){
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5,ca=Math.cos(a),sa=Math.sin(a);
  archway(b,[sa*137,3,ca*137],16,4.8,3.1,1.1,a,'#b3b69f');
  for(let j=0;j<9;j++){
   const r=60+j*17,x=sa*r,z=ca*r;stoneColumn(b,[x+ca*7,3,z-sa*7],3+j%3,.48,true);
   if(j%2===0){grassPatch(b,[x-ca*8,3.07,z+sa*8],3.8,j+i*11,false,150);rubble(b,[x,3.02,z],5,i+j,22);}
  }
 }
}
function civic(b:ModelBuilder,id:PlaceModel['id']){
 if(id==='azimir'){
  for(let i=0;i<32;i++){const a=i/32*Math.PI*2;stoneColumn(b,[Math.sin(a)*26,1,Math.cos(a)*26],6,.35);}
  for(const side of [-1,1])for(let z=88;z<=150;z+=12){b.box([side*8,.28,z],[2,.56,3],'#b6b296',[0,0,0],'cutstone');b.tree(side*8,.56,z,4.2,false,true);}
  ringInlay(b,[0,.23,79],6);
 }else if(id==='vedenar'){
  for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.sin(a)*183,z=Math.cos(a)*183-50;
   for(let j=0;j<48;j++){const t=j/48*Math.PI*2;stoneColumn(b,[x+Math.sin(t)*26,19.5,z+Math.cos(t)*26],1.1,.11);}
   for(let j=0;j<8;j++){const t=j*Math.PI/4;grassPatch(b,[x+Math.sin(t)*17,19.55,z+Math.cos(t)*17],4,i*8+j,false,180);}
  }
 }else if(id==='revolar'){
  for(let j=0;j<8;j++){const a=j*Math.PI/4,x=Math.sin(a)*190,z=Math.cos(a)*190;stoneColumn(b,[x,0,z],19,1.1);}
  for(const side of [-1,1])for(let z=-45;z<=90;z+=27){b.tree(side*11,.05,z,5.5);pottery(b,[side*8.5,.15,z+2],1.2);}
 }else if(id==='hearthstone'){
  for(let i=0;i<8;i++)cropPlot(b,[-275+i*11,.15,-229],9,26,i+70,false);
  for(const z of [24,57,90]){barrel(b,[-149,.1,z],.85);pottery(b,[-149,.1,z+1.2],.9);rubble(b,[-147,.08,z+6],1,Math.round(z),8);}
 }else if(id==='sesemalex-dar'){
  for(let cut=-3;cut<=3;cut++){const x=cut*105,length=580-Math.abs(cut)*65;
   for(const side of [-1,1])for(let z=-length/2;z<length/2;z+=22){b.box([x+side*49,32.8,z],[.9,1.4,21],stone,[0,0,0],'ashlar');if(cut===0)archway(b,[x+side*10,0,z],7.2,5.1,1.6,.5,side<0?Math.PI/2:-Math.PI/2,'#aeb29c');}
   for(let z=-length/2;z<length/2;z+=3.6)b.box([x,.16,z],[1.1,.025,.18],'#54665f',[0,0,0],'metal');
  }
 }else if(id==='yeddaw'){
  b.stall(391,.5,9,'#b0824f');b.stall(391,.5,-5,'#738879');
  for(let i=0;i<6;i++){b.cylinder([390+(i%3)*.34,1.72,8.7+Math.floor(i/3)*.43],.14,.04,'#c5a66c','produce');}
  for(let i=0;i<24;i++){const a=i*Math.PI/12;archway(b,[Math.sin(a)*53,21,Math.cos(a)*53],4.3,7,2.3,.6,a,stone);}
 }else if(id==='rall-elorim'){
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2;ringInlay(b,[Math.sin(a)*183,2.72,158+Math.cos(a)*183],1.1);}
  for(let j=0;j<24;j++){const x=-290+j*25;grassPatch(b,[x,48.04,-153],2,j+40,false,150);}
 }else if(id==='kholinar'){
  for(const x of [-46,46])for(let z=-139;z<-116;z+=6)stoneColumn(b,[x,24,z],11,.45);
 }
}
function waterfront(b:ModelBuilder,id:PlaceModel['id']){
 if(id==='kharbranth'){
  for(let i=-3;i<=3;i++)dockDetails(b,[i*28,2.03,156],58,7);
  for(let x=-105;x<=105;x+=15){barrel(b,[x,.12,127],1);pottery(b,[x+1.1,.12,127],1.05);}
 }else if(id==='thaylen-city'){
  for(let i=0;i<9;i++){const z=-12+i*15,shore=-471+(z+6)*.205;dockDetails(b,[shore-15,2.1,z],43,5,Math.PI/2);barrel(b,[shore+4,.12,z+3],.9);}
 }else if(id==='kasitor'){
  for(const x of [-278,-198,210,292])dockDetails(b,[x,1.62,-116],135,13);
  for(const x of [-115,115])for(const z of [-175,-287])for(const r of [8.8,9.7,10.4]){const ring=new T.TorusGeometry(r,.12,6,64);b.add(ring,'#c6a158',[x,3.8+(r-8.8)*.6,z],[1,1,1],[Math.PI/2,0,0],'metal');ring.dispose();}
 }
}
/** Every destination gets authored detail while the shared kit supplies ordinary buildings. */
export function dressLandmark(model:PlaceModel){
 const b=new Builder(model.close.target),sites:V3[]=[...(model.group.userData.lampSites??[])];
 civic(b,model.id);waterfront(b,model.id);
 if(model.id==='urithiru')urithiru(b);
 if(model.id==='shinovar')shinovar(b);
 if(model.id==='purelake')purelake(b,sites);
 if(model.id==='akinah')ruins(b);
 if(model.id==='shattered-plains'){
  for(let row=-5;row<=5;row++){barrel(b,[-456,.16,row*31+10],1);pottery(b,[-454.7,.16,row*31+10],.85);rubble(b,[-439,.13,row*31],3,row+9,25);}
  for(let x=-464;x<=-438;x+=13){b.box([x,2.1,70],[.12,4.2,.12],wood,[0,0,0],'timber');b.beam([x,4,70],[x+3,4,70],.08,wood);}
 }
 if(['urithiru','shinovar','purelake','akinah','shattered-plains'].includes(model.id)){
  const p=model.close.target;
  if(!['akinah','purelake'].includes(model.id))for(const side of [-1,1])lantern(b,[p[0]+side*9,model.id==='urithiru'?.38:model.id==='purelake'?.8:0,p[2]+12],sites);
 }
 const group=b.finish(`${model.id}_crafted_details`);model.group.add(group);model.group.userData.lampSites=sites;
 model.group.userData.detailPass='architecture-landscape-v3';
}

export function ruinedHouse(b:ModelBuilder,x:number,y:number,z:number,w:number,d:number,h:number,angle:number){
 const at=(xx:number,yy:number,zz:number):V3=>[x+xx*Math.cos(angle)+zz*Math.sin(angle),y+yy,z-xx*Math.sin(angle)+zz*Math.cos(angle)];
 b.box(at(0,.12,0),[w+.6,.24,d+.6],'#8f9584',[0,angle,0],'ashlar');
 for(let side=0;side<4;side++){
  const span=side%2?d:w,rotation=angle+side*Math.PI/2;
  for(let segment=0;segment<5;segment++){
   if(side===0&&segment===2)continue;
   const offset=(segment-2)*span/5,height=h*(.3+.6*Math.abs(Math.sin(segment*12+side*31+x))),p=side===0?at(offset,height/2,d/2):side===1?at(w/2,height/2,-offset):side===2?at(-offset,height/2,-d/2):at(-w/2,height/2,offset);
   b.box(p,[span/5-.055,height,.6],'#a0a38d',[0,rotation,0],'ashlar');
   b.box([p[0],y+height+.065,p[2]],[span/5+.05,.13,.72],'#b5b69e',[0,rotation,0],'cutstone');
  }
 }
 if(h>6)archway(b,at(0,.2,d/2+.03),w*.31,2.2,.7,.7,angle,'#c1bea2');
 rubble(b,at(w*.3,.28,d*.15),w*.3,Math.round(x+z),10);
}

export function prayerStatue(b:ModelBuilder,x:number,y:number,z:number,s=1){
 b.box([x,y+.25*s,z],[1.4*s,.5*s,1.3*s],'#9ea590',[0,0,0],'ashlar');b.box([x,y+.57*s,z],[1.55*s,.14*s,1.45*s],stone,[0,0,0],'cutstone');
 const profile=[[.44,.65],[.49,.8],[.37,1.5],[.31,2],[.43,2.45],[.32,2.62],[.15,2.67]].map(v=>new T.Vector2(...v as [number,number]));
 const robe=new T.LatheGeometry(profile,32),p=robe.getAttribute('position');
 for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),f=1+.035*Math.sin(a*11+p.getY(i));p.setXYZ(i,p.getX(i)*f,p.getY(i),p.getZ(i)*.68*f);}
 robe.computeVertexNormals();b.add(robe,'#b4b8a1',[x,y,z],[s,s,s],[0,0,0],'cutstone');robe.dispose();
 b.sphere([x,y+2.92*s,z],[.235*s,.31*s,.23*s],stone,'cutstone');b.sphere([x,y+2.95*s,z+.23*s],[.055*s,.075*s,.055*s],'#b8bba8','cutstone');
 for(const side of [-1,1]){
  b.beam([x+side*.34*s,y+2.48*s,z],[x+side*.39*s,y+2.06*s,z+.2*s],.19*s,stone);
  b.beam([x+side*.39*s,y+2.06*s,z+.2*s],[x+side*.05*s,y+2.28*s,z+.35*s],.145*s,stone);
  b.sphere([x+side*.05*s,y+2.31*s,z+.35*s],[.07*s,.12*s,.05*s],stone,'cutstone');
 }
}
export function hangingBell(b:ModelBuilder,p:V3){
 const profile=[[.32,1.7],[.55,1.6],[.63,1.22],[.77,.56],[1.08,.13],[1.27,0],[1.3,-.11],[1.07,-.13],[.92,.13],[.64,.65],[.48,1.28]].map(v=>new T.Vector2(...v as [number,number]));
 const g=new T.LatheGeometry(profile,40);b.add(g,'#b19256',p,[1,1,1],[0,0,0],'metal');g.dispose();b.beam([p[0],p[1]+1.5,p[2]],[p[0],p[1]-.15,p[2]],.09,'#606758');b.sphere([p[0],p[1]-.13,p[2]],[.2,.25,.2],'#877049','metal');
}
