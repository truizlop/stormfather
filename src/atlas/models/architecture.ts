import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {ModelBuilder,V3} from './kit';

const limestone='#b8b6a4', shadow='#222c2c', iron='#343f3e', wood='#65503b';
const unitBox=new T.BoxGeometry(1,1,1);
const archShape=new T.Shape();
for(let i=0;i<=16;i++){const a=Math.PI-i/16*Math.PI,x=Math.cos(a)*.5,y=Math.sin(a);if(i===0)archShape.moveTo(x,y);else archShape.lineTo(x,y);}
for(let i=0;i<=16;i++){const a=i/16*Math.PI;archShape.lineTo(Math.cos(a)*.405,Math.sin(a)*.81);}
archShape.closePath();
const archGeometry=new T.ExtrudeGeometry(archShape,{depth:1,bevelEnabled:false,curveSegments:16});
const domeGeometry=new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);
const potGeometry=new T.LatheGeometry([[.15,0],[.24,.06],[.32,.35],[.3,.5],[.18,.63],[.16,.73],[.21,.76],[.21,.8],[.155,.8],[.12,.7],[.17,.58]].map(p=>new T.Vector2(...p as [number,number])),20);

/** Local facade coordinates: x runs along a wall; z points toward the street. */
function frame(p:V3,angle:number){
 const c=Math.cos(angle),s=Math.sin(angle);
 return (x:number,y:number,z:number):V3=>[p[0]+x*c+z*s,p[1]+y,p[2]-x*s+z*c];
}
function faceBox(b:ModelBuilder,p:V3,size:V3,color:string,angle=0,surface='cutstone'){
 b.add(unitBox,color,p,size,[0,angle,0],surface);
}
export function archway(b:ModelBuilder,p:V3,width:number,spring:number,rise:number,depth:number,angle=0,color=limestone){
 const at=frame(p,angle);
 b.add(archGeometry,color,at(0,spring,-depth/2),[width,rise,depth],[0,angle,0],'cutstone');
 for(const side of [-1,1]){
  faceBox(b,at(side*width*.453,spring/2,0),[width*.095,spring,depth],color,angle);
  faceBox(b,at(side*width*.453,.16,0),[width*.14,.32,depth+.2],color,angle);
  faceBox(b,at(side*width*.453,spring-.09,.025),[width*.14,.18,depth+.14],color,angle);
 }
 // A raised keystone and narrow joints break the otherwise perfect arch curve.
 faceBox(b,at(0,spring+rise*.91,.035),[width*.09,rise*.25,depth+.1],color,angle);
}
export function facadeWindow(b:ModelBuilder,p:V3,width:number,height:number,angle=0,lit=false,arched=false,detailed=true){
 const at=frame(p,angle),spring=height*.68,rise=height*.32;
 faceBox(b,at(0,height*.5,.035),[width+.26,height+.17,.07],shadow,angle,'recess');
 faceBox(b,at(0,height*.47,.085),[width*.83,height*.86,.035],lit?'#85765b':'#344849',angle,lit?'window':'glass');
 if(!detailed){faceBox(b,at(0,-.035,.23),[width+.4,.15,.48],limestone,angle);faceBox(b,at(0,height+.06,.15),[width+.3,.13,.25],limestone,angle);faceBox(b,at(0,height*.48,.17),[.035,height*.86,.04],iron,angle,'metal');return;}
 for(const side of [-1,1])faceBox(b,at(side*(width/2+.065),height*.5,.19),[.16,height+.28,.34],limestone,angle);
 faceBox(b,at(0,-.035,.25),[width+.5,.17,.58],limestone,angle);
 faceBox(b,at(0,height+.08,.17),[width+.45,.16,.32],limestone,angle);
 if(arched)archway(b,at(0,0,.25),width+ .24,spring,rise,.26,angle);
 for(const x of [-width*.19,width*.19])faceBox(b,at(x,height*.49,.22),[.035,height*.88,.045],iron,angle,'metal');
 for(const yy of [.32,.66])faceBox(b,at(0,height*yy,.22),[width*.9,.035,.045],iron,angle,'metal');
 if(arched){
  for(const side of [-1,1])faceBox(b,at(side*(width*.5+.22),height*.5,.02),[.19,height*.92,.11],wood,angle+side*.17,'timber');
 }
}

export function detailedBuilding(b:ModelBuilder,x:number,y:number,z:number,w:number,d:number,h:number,color:string,style:'flat'|'dome'|'pitched'){
 contactFootprint(b,x,y,z,w,d);
 const body=new RoundedBoxGeometry(w,h,d,1,.075);
 b.add(body,color,[x,y+h/2,z],[1,1,1],[0,0,0],b.wallSurface);body.dispose();
 const bounds={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,bottom:y,top:y+h};b.obstacles.push(bounds);b.cameraObstacles.push(bounds);
 b.box([x,y+.28,z],[w+.45,.56,d+.45],'#737b72',[0,0,0],'cutstone');
 for(const yy of [h-.2,h+.06])b.box([x,y+yy,z],[w+(yy>h?.62:.28),.18,d+(yy>h?.62:.28)],limestone,[0,0,0],'cutstone');
 const floors=Math.max(1,Math.floor((h-.65)/3.15));
 const hash=Math.abs(Math.round(x*13+z*31)),detail=Math.hypot(x-b.detailOrigin[0],z-b.detailOrigin[2])<85;
 for(let side=0;side<4;side++){
  const angle=side*Math.PI/2,length=side%2?d:w;
  const origin:V3=[x+Math.sin(angle)*w/2,y,z+Math.cos(angle)*d/2];
  const at=frame(origin,angle),columns=Math.max(1,Math.floor(length/2.7));
  if(detail||side%2===0)for(let f=0;f<floors;f++)for(let col=0;col<columns;col++){
   const cx=(col-(columns-1)/2)*Math.min(2.75,length*.65);
   if(f===0&&side===0&&Math.abs(cx)<1.15)continue;
   facadeWindow(b,at(cx,1.25+f*3.15,0),.9,1.52,angle,(hash+f*3+col+side)%5<2,f===floors-1,detail);
  }
  for(let f=1;f<floors;f++)faceBox(b,at(0,f*3.15+.47,.055),[length,.11,.14],limestone,angle);
  for(const sx of [-1,1])for(let level=0;level<(detail?Math.min(18,Math.floor((h-.7)/.69)):2);level++){
   faceBox(b,at(sx*(length/2-.19),.68+level*.69,.04),[level%2?.35:.56,.28,.13],'#a5a998',angle);
  }
  if(style==='flat'){
   faceBox(b,at(0,h+.48,-.12),[length,.78,.31],color,angle,b.wallSurface);
   faceBox(b,at(0,h+.9,-.12),[length+.18,.14,.49],limestone,angle);
  }
 }
 // Recessed double doors, iron straps, transom and a worn stone threshold.
 const door=frame([x,y,z+d/2],0);
 faceBox(b,door(0,1.43,.04),[1.62,2.86,.08],shadow,0,'recess');
 for(const side of [-1,1]){
  faceBox(b,door(side*.355,1.23,.1),[.69,2.45,.09],wood,0,'timber');
  for(let plank=0;plank<3;plank++)faceBox(b,door(side*.355+(plank-1)*.2,1.23,.154),[.014,2.39,.014],'#342f28',0,'recess');
  for(const yy of [.45,1.85])faceBox(b,door(side*.35,yy,.17),[.65,.07,.03],iron,0,'metal');
  if(detail)b.sphere(door(side*.14,1.22,.2),[.034,.06,.018],'#9c8657','metal');
 }
 archway(b,door(0,0,.21),2.02,2.29,.79,.38);
 b.box(door(0,.07,.53),[2.15,.14,1.15],limestone,[0,0,0],'cutstone');
 if(style==='dome'){
  b.cylinder([x,y+h+.2,z],Math.min(w,d)*.49,.4,limestone,'cutstone');
  b.add(domeGeometry,color,[x,y+h+.2,z],[w*.47,Math.min(w,d)*.34,d*.47],[0,0,0],'cutstone');
  b.cylinder([x,y+h+Math.min(w,d)*.34+.25,z],.09,.7,'#9e8553','metal');
 }else if(style==='pitched'){
  const corners:V3[]=[[-w*.56,0,-d*.56],[w*.56,0,-d*.56],[w*.56,0,d*.56],[-w*.56,0,d*.56],[-w*.3,2.6,0],[w*.3,2.6,0]],faces=[0,4,1,1,4,5,1,5,2,2,5,3,3,5,4,3,4,0];
  const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(faces.flatMap(i=>corners[i]),3));roof.computeVertexNormals();b.add(roof,'#83705a',[x,y+h,z],[1,1,1],[0,0,0],'roof');roof.dispose();
  b.beam([x-w*.31,y+h+2.67,z],[x+w*.31,y+h+2.67,z],.2,'#b39c77');
  if(detail)for(const side of [-1,1])for(let row=1;row<11;row++){
   const t=row/11,zz=side*d*.56*t,span=w*(.6+.52*t);
   b.box([x,y+h+2.6*(1-t)+.035,z+zz],[span,.045,.07],'#544d40',[Math.atan2(side*2.6,d*.56),0,0],'roof');
  }
  if(detail){b.box([x+w*.24,y+h+2.2,z-d*.19],[.8,2.4,.8],color,[0,0,0],b.wallSurface);b.box([x+w*.24,y+h+3.44,z-d*.19],[1.05,.14,1.05],limestone,[0,0,0],'cutstone');} 
 }else{
  b.box([x,y+h+.22,z],[w-.8,.15,d-.8],'#65695f',[0,0,0],'roof');
  if(w<20)b.box([x-w*.21,y+h+.75,z-d*.16],[w*.32,1.2,d*.28],color,[0,0,0],b.wallSurface);
 }
 // Rain channels and iron balconies add shadow-catching projections.
 b.cylinder([x+w/2+.12,y+h*.5,z+d*.32],.04,h,'#63736b','metal');
 if(detail&&h>9&&w<22){
  const span=w*.55,zz=z+d/2+1.02;
  b.box([x,y+3.94,zz-.38],[span+.24,.18,1.15],limestone,[0,0,0],'cutstone');
  b.beam([x-span/2,y+4.87,zz+.12],[x+span/2,y+4.87,zz+.12],.045,iron);
  for(let i=0;i<=Math.ceil(span/.23);i++)b.box([x-span/2+i*span/Math.ceil(span/.23),y+4.42,zz+.12],[.025,.9,.025],iron,[0,0,0],'metal');
 }
}

export function pottery(b:ModelBuilder,p:V3,scale=1,color='#9b7350'){
 b.add(potGeometry,color,p,[scale,scale,scale],[0,0,0],'ceramic');
 b.cylinder([p[0],p[1]+.727*scale,p[2]],.15*scale,.014*scale,shadow,'recess');
}
export function barrel(b:ModelBuilder,p:V3,scale=1){
 const geometry=new T.LatheGeometry([[.32,0],[.38,.1],[.43,.53],[.4,.96],[.33,1.04]].map(v=>new T.Vector2(...v as [number,number])),16);
 b.add(geometry,wood,p,[scale,scale,scale],[0,0,0],'timber');geometry.dispose();
 for(const yy of [.12,.3,.78,.96])b.cylinder([p[0],p[1]+yy*scale,p[2]],(yy===.3||yy===.78?.42:.385)*scale,.045*scale,iron,'metal');
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;b.beam([p[0]+Math.cos(a)*.37*scale,p[1]+.12*scale,p[2]+Math.sin(a)*.37*scale],[p[0]+Math.cos(a)*.4*scale,p[1]+.93*scale,p[2]+Math.sin(a)*.4*scale],.009*scale,'#3e382d');}
 b.cylinder([p[0],p[1]+1.025*scale,p[2]],.325*scale,.025*scale,'#7d654a','timber');
}
export function detailedStall(b:ModelBuilder,x:number,y:number,z:number,color:string){
 for(const dx of [-1.7,1.7])for(const dz of [-.85,.85]){
  b.box([x+dx,y+1.5,z+dz],[.1,3,.1],wood,[0,0,0],'timber');
  b.beam([x+dx,y+2.55,z+dz],[x+dx-Math.sign(dx)*.38,y+2.93,z+dz],.065,wood);
 }
 b.box([x,y+.99,z],[3.55,.15,1.65],'#816343',[0,0,0],'timber');
 for(let i=0;i<13;i++)b.box([x-1.62+i*.27,y+.51,z+.7],[.246,.91,.1],i%3?'#69523a':'#806348',[0,0,0],'timber');
 for(const yy of [.15,.8])b.box([x,y+yy,z+.78],[3.5,.07,.055],'#4b4436',[0,0,0],'timber');
 // Sagging cloth with narrow seams and a scalloped hanging edge.
 const cloth=new T.PlaneGeometry(4.3,2.8,24,16),p=cloth.getAttribute('position'),colors=new Float32Array(p.count*3);
 const dyed=new T.Color(color),faded=dyed.clone().lerp(new T.Color('#c7bca2'),.3);
 for(let i=0;i<p.count;i++){
  const xx=p.getX(i),zz=p.getY(i),height=2.92-.17*(1-(xx/2.15)**2)+.12*Math.cos(zz/1.4*Math.PI/2)+.022*Math.sin(xx*18);
  p.setXYZ(i,xx,height,zz);
  const tint=Math.floor((xx+2.15)/.43)%2?dyed:faded;colors.set([tint.r,tint.g,tint.b],i*3);
 }
 cloth.computeVertexNormals();cloth.deleteAttribute('uv');cloth.setAttribute('color',new T.BufferAttribute(colors,3));cloth.translate(x,y,z);const list=b.buckets.get('canvas')??[];list.push(cloth.toNonIndexed());cloth.dispose();b.buckets.set('canvas',list);
 for(let j=0;j<14;j++)b.box([x-2+j*.307,y+2.73-.05*Math.cos(j*Math.PI),z+1.4],[.32,.22,.018],j%2?color:'#a99e84',[0,0,0],'canvas');
 for(const side of [-1,1])b.beam([x-1.9,y+2.96,z+side*1.08],[x+1.9,y+2.96,z+side*1.08],.05,wood);
 for(let bin=0;bin<3;bin++){
  const xx=x+(bin-1)*1.08;
  b.box([xx,y+1.08,z],[.95,.16,1.35],'#4b4230',[0,0,0],'timber');
  for(const dz of [-.66,.66])b.box([xx,y+1.25,z+dz],[1,.23,.045],wood,[0,0,0],'timber');
  for(const dx of [-.47,.47])b.box([xx+dx,y+1.25,z],[.045,.23,1.3],wood,[0,0,0],'timber');
  for(let i=0;i<18;i++)b.sphere([xx+((i%3)-1)*.25,y+1.23+Math.floor(i/9)*.15,z+(Math.floor(i/3)%3-1)*.3],[.105,.11,.12],['#a9934d','#737e42','#986244'][bin],'produce');
 }
 barrel(b,[x-2.28,y,z-.5],.8);pottery(b,[x+2.1,y,z+.3],.82);
}

/** Feathered ground contact is geometry, so it works with logarithmic depth. */
export function contactFootprint(b:ModelBuilder,x:number,y:number,z:number,w:number,d:number){
 const p:number[]=[],uv:number[]=[],colors:number[]=[];
 const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
 for(let i=0;i<4;i++){
  const a=corners[i],c=corners[(i+1)%4],outer=(q:number[])=>[q[0]+Math.sign(q[0])*.9,q[1]+Math.sign(q[1])*.9],aa=outer(a),cc=outer(c);
  for(const [q,v] of [[a,0],[c,0],[aa,1],[aa,1],[c,0],[cc,1]] as [number[],number][]){p.push(x+q[0],y+.235,z+q[1]);uv.push(0,v);colors.push(.025,.03,.025);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const bucket=b.buckets.get('contact')??[];bucket.push(g);b.buckets.set('contact',bucket);
}
