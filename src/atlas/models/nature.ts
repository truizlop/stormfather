import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {ModelBuilder,V3} from './kit';

const cache=new Map<string,{wood:T.BufferGeometry;leaves:T.BufferGeometry}>();
function rng(seed:number){let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
/** Tapered curved branches have a continuous silhouette, including their roots. */
export function curvedBranch(points:V3[],radius:number,segments=10){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(curve,segments,radius,7,false),p=g.getAttribute('position');
 for(let ring=0;ring<=segments;ring++){
  const c=curve.getPointAt(ring/segments),taper=1-ring/segments*.9;
  for(let j=0;j<=7;j++){const i=ring*8+j;p.setXYZ(i,c.x+(p.getX(i)-c.x)*taper,c.y+(p.getY(i)-c.y)*taper,c.z+(p.getZ(i)-c.z)*taper);}
 }
 g.computeVertexNormals();return g;
}
function treeParts(shin:boolean,seed:number){
 const key=`${shin}:${seed%5}`,cached=cache.get(key);if(cached)return cached;
 const random=rng(seed%5+193),wood:T.BufferGeometry[]=[],leaf:number[]=[];
 wood.push(curvedBranch([[0,0,0],[.015,.27,-.015],[-.018,.55,.02],[.01,.81,0]],.032,14));
 for(let r=0;r<6;r++){const a=r*Math.PI/3;wood.push(curvedBranch([[Math.sin(a)*.105,.003,Math.cos(a)*.105],[Math.sin(a)*.04,.025,Math.cos(a)*.04],[0,.16,0]],.013,5));}
 for(let j=0;j<14;j++){
  const a=j*2.399+random()*.4,y=.29+j*.028,length=(shin?.26:.32)*(1-j*.027),tip:V3=[Math.sin(a)*length,y+.16+random()*.06,Math.cos(a)*length];
  wood.push(curvedBranch([[0,y,0],[tip[0]*.45,y+.07,tip[2]*.45],tip],.012*(1-j*.028),8));
  for(let twig=0;twig<5;twig++){
   const aa=a+(twig-2)*.56,end:V3=[tip[0]+Math.sin(aa)*.095,tip[1]+.07+random()*.05,tip[2]+Math.cos(aa)*.095];
   wood.push(curvedBranch([[tip[0]*.8,tip[1]-.04,tip[2]*.8],tip,end],.0035,4));
   for(let k=0;k<13;k++){
    const theta=random()*Math.PI*2,r=Math.sqrt(random())*.08,center=new T.Vector3(end[0]+Math.sin(theta)*r,end[1]+(random()-.5)*.12,end[2]+Math.cos(theta)*r);
    const angle=random()*Math.PI*2,length=(shin?.047:.075)*(.65+random()*.7),width=length*(shin?.42:.2);
    const forward=new T.Vector3(Math.sin(angle)*length,.009+random()*.023,Math.cos(angle)*length),across=new T.Vector3(Math.cos(angle)*width,0,-Math.sin(angle)*width);
    const base=center.clone().sub(forward.clone().multiplyScalar(.45)),tipLeaf=center.clone().add(forward),mid=center.clone().add(new T.Vector3(0,.008,0)),left=center.clone().add(across),right=center.clone().sub(across);
    for(const p of [base,left,mid,left,tipLeaf,mid,tipLeaf,right,mid,right,base,mid])leaf.push(...p.toArray());
   }
  }
 }
 const leafGeometry=new T.BufferGeometry();leafGeometry.setAttribute('position',new T.Float32BufferAttribute(leaf,3));leafGeometry.computeVertexNormals();
 const branches=mergeGeometries(wood);wood.forEach(g=>g.dispose());const parts={wood:branches,leaves:leafGeometry};cache.set(key,parts);return parts;
}
export function botanicalTree(b:ModelBuilder,x:number,y:number,z:number,size:number,shin=false,bronze=false){
 const seed=Math.abs(Math.round(x*7+z*13)),parts=treeParts(shin,seed),angle=(seed%628)*.01;
 b.add(parts.wood,bronze?'#9f8048':'#74634a',[x,y,z],[size,size,size],[0,angle,0],bronze?'metal':'bark');
 b.add(parts.leaves,bronze?'#ad9356':shin?'#66824b':'#6e7955',[x,y,z],[size,size,size],[0,angle,0],bronze?'metal':'foliage');
}
/** Batched tapered blades; no transparent cards or hundreds of draw calls. */
export function grassPatch(b:ModelBuilder,p:V3,radius:number,seed:number,dry=false,count=220){
 const random=rng(seed),pos:number[]=[];
 for(let i=0;i<count;i++){
  const a=random()*Math.PI*2,r=Math.sqrt(random())*radius,x=p[0]+Math.sin(a)*r,z=p[2]+Math.cos(a)*r,h=(dry?.55:.3)*(.4+random()),w=.025+random()*.018;
  for(let blade=0;blade<3;blade++){
   const yaw=a+blade*2.1,dx=Math.cos(yaw)*w,dz=Math.sin(yaw)*w,bendX=Math.sin(yaw)*h*.32,bendZ=Math.cos(yaw)*h*.32;
   pos.push(x-dx,p[1],z-dz,x+dx,p[1],z+dz,x+bendX,p[1]+h,z+bendZ);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();b.add(g,dry?'#b6a26a':'#6f8550',[0,0,0],[1,1,1],[0,0,0],'foliage');g.dispose();
}
export function cropPlot(b:ModelBuilder,p:V3,w:number,d:number,seed:number,dry=true){
 const random=rng(seed),pos:number[]=[];
 for(let x=-w/2+.3;x<w/2;x+=.48)for(let z=-d/2+.2;z<d/2;z+=.45){
  const xx=p[0]+x+(random()-.5)*.15,zz=p[2]+z+(random()-.5)*.15,h=.35+random()*.4;
  for(let k=0;k<3;k++){const a=k*2.1+random()*.4,dx=Math.cos(a)*.05,dz=Math.sin(a)*.05;pos.push(xx-dx,p[1],zz-dz,xx+dx,p[1],zz+dz,xx+dx*3,p[1]+h,zz+dz*3);}
  if(dry){const y=p[1]+h;pos.push(xx-.035,y-.1,zz,xx+.035,y-.1,zz,xx,y+.16,zz,xx,y-.1,zz-.035,xx,y-.1,zz+.035,xx,y+.16,zz);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();b.add(g,dry?'#b7a15e':'#6e8548',[0,0,0],[1,1,1],[0,0,0],'foliage');g.dispose();
}
export function fieldFence(b:ModelBuilder,a:V3,c:V3){
 const count=Math.ceil(Math.hypot(c[0]-a[0],c[2]-a[2])/2.4);
 for(let i=0;i<=count;i++){const t=i/count;b.box([a[0]+(c[0]-a[0])*t,a[1]+.55,a[2]+(c[2]-a[2])*t],[.13,1.1,.13],'#7f7254',[0,0,0],'timber');}
 for(const y of [.38,.85])b.beam([a[0],a[1]+y,a[2]],[c[0],c[1]+y,c[2]],.075,'#8e7a57');
}
