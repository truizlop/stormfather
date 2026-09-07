import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PlaceId } from '../data';
import { enrichMaterial } from '../materials';
export type V3 = [number,number,number];
export type Route = { id:string; points:V3[]; activity:string; sheltered?:boolean; species?:'human'|'chull'|'axehound'|'goat'|'cremling'|'chasmfiend' };
export interface PlaceModel { group:T.Group; routes:Route[]; overview:{eye:V3;target:V3}; close:{eye:V3;target:V3}; radius:number; water?:{y:number;size:number;shallow:boolean}; id:PlaceId; features:string[] }
export const palette = {stone:'#b3aa96',cream:'#e0d5bb',dark:'#514e49',sand:'#9b8769',roof:'#88715f',bronze:'#aa7944',copper:'#54877e',wood:'#5a4030',window:'#263c46',leaf:'#526d44',soil:'#6f6749'};
const baseBox=new T.BoxGeometry(1,1,1);
const baseSphere=new T.SphereGeometry(1,12,8);
const baseCylinder=new T.CylinderGeometry(1,1,1,16);
const baseCone=new T.ConeGeometry(1,1,8);
const mat=new T.Matrix4(); const q=new T.Quaternion(); const euler=new T.Euler();
export class ModelBuilder {
  buckets=new Map<string,T.BufferGeometry[]>();
  routes:Route[]=[];
  cameraObstacles:import('../navigation').Obstacle[]=[];
  obstacles:{minX:number;maxX:number;minZ:number;maxZ:number;bottom:number;top:number}[]=[];
  add(geometry:T.BufferGeometry,color:string,position:V3=[0,0,0],scale:V3=[1,1,1],rotation:V3=[0,0,0],surface='stone'){
    const g=geometry.index ? geometry.toNonIndexed():geometry.clone();
    mat.compose(new T.Vector3(...position),q.setFromEuler(euler.set(...rotation)),new T.Vector3(...scale)); g.applyMatrix4(mat);
    g.deleteAttribute('uv');
    const c=new T.Color(color); const colors=new Float32Array(g.getAttribute('position').count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
    g.setAttribute('color',new T.BufferAttribute(colors,3));
    const bucket=this.buckets.get(surface)??[];bucket.push(g);this.buckets.set(surface,bucket);
  }
  box(p:V3,s:V3,c=palette.stone,rot:V3=[0,0,0],surface='stone'){
    this.add(baseBox,c,p,s,rot,surface);
    const w=(Math.abs(Math.cos(rot[1]))*s[0]+Math.abs(Math.sin(rot[1]))*s[2])/2,d=(Math.abs(Math.sin(rot[1]))*s[0]+Math.abs(Math.cos(rot[1]))*s[2])/2;
    const bounds={minX:p[0]-w,maxX:p[0]+w,minZ:p[2]-d,maxZ:p[2]+d,bottom:p[1]-s[1]/2,top:p[1]+s[1]/2};
    if(s[0]>=2&&s[2]>=2&&s[1]>=1&&bounds.top>.45)this.obstacles.push(bounds);
    if(s[0]>.3&&s[2]>.3&&s[1]>.3)this.cameraObstacles.push(bounds);
  }
  sphere(p:V3,s:V3,c=palette.stone,surface='stone'){this.add(baseSphere,c,p,s,[0,0,0],surface);}
  cylinder(p:V3,r:number,h:number,c=palette.stone,surface='stone'){this.add(baseCylinder,c,p,[r,h,r],[0,0,0],surface);}
  cone(p:V3,r:number,h:number,c=palette.roof){this.add(baseCone,c,p,[r,h,r]);}
  beam(a:V3,b:V3,width:number,color=palette.stone,depth=width){
    const mid=new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5);
    const direction=new T.Vector3(...b).sub(new T.Vector3(...a));
    const rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize()));
    this.box(mid.toArray() as V3,[width,direction.length(),depth],color,[rot.x,rot.y,rot.z]);
  }
  path(id:string,points:V3[],width=4,activity='Walking to market',color='#b9aa8c',species:Route['species']='human',sheltered=false){
    for(let i=1;i<points.length;i++){
      const a=points[i-1],c=points[i]; const length=Math.hypot(c[0]-a[0],c[2]-a[2]);
      this.box([(a[0]+c[0])/2,(a[1]+c[1])/2-.12,(a[2]+c[2])/2],[width,.24,Math.hypot(length,c[1]-a[1])],color,[-Math.atan2(c[1]-a[1],length),Math.atan2(c[0]-a[0],c[2]-a[2]),0]);
    }
    this.routes.push({id,points,activity,species,sheltered});
  }
  building(x:number,y:number,z:number,w:number,d:number,h:number,c=palette.stone,style:'flat'|'dome'|'pitched'='flat'){
    this.box([x,y+h/2,z],[w,h,d],c);
    this.box([x,y+.3,z],[w+.65,.6,d+.65],palette.dark);
    if(style==='dome'){
      this.cylinder([x,y+h+.3,z],w*.55,.7,palette.cream);
      this.sphere([x,y+h,z],[w*.51,w*.43,d*.51],c);
      this.cone([x,y+h+w*.56,z],.45,w*.45,palette.cream);
    }else if(style==='pitched'){
      const roof=new T.CylinderGeometry(0,1,1,4);this.add(roof,palette.roof,[x,y+h+1.6,z],[w*.78,3.2,d*.78],[0,Math.PI/4,0]);roof.dispose();
    }else{
      this.box([x,y+h+.2,z],[w+.8,.45,d+.8],palette.cream);
      for(const side of [-1,1])this.box([x+side*(w/2),y+h+.6,z],[.4,1,d],c);
      for(const side of [-1,1])this.box([x,y+h+.6,z+side*d/2],[w,1,.4],c);
    }
    const floors=Math.max(1,Math.floor(h/3.3));
    const cols=Math.max(1,Math.floor(w/3));
    for(let f=0;f<floors;f++)for(let col=0;col<cols;col++){
      const wx=x+(col-(cols-1)/2)*Math.min(3,w*.65);
      for(const s of [-1,1]){
        this.box([wx,y+2+f*3.1,z+s*(d/2+.025)],[.85,1.5,.06],palette.window,[0,0,0],'window');
        this.box([wx,y+1.15+f*3.1,z+s*(d/2+.13)],[1.2,.18,.3],palette.cream);
      }
    }
    this.box([x,y+1.3,z+d/2+.04],[1.25,2.6,.12],palette.wood);
    this.box([x-0.78,y+1.4,z+d/2+.12],[.2,2.8,.24],palette.cream);this.box([x+.78,y+1.4,z+d/2+.12],[.2,2.8,.24],palette.cream);this.box([x,y+2.86,z+d/2+.12],[1.75,.2,.24],palette.cream);
    for(let level=1;level<floors;level++)this.box([x,y+level*3.1+.45,z],[w+.15,.1,d+.15],c);
    if(h>9){this.box([x,y+4.05,z+d/2+.6],[w*.65,.22,1.25],palette.cream);for(let rail=0;rail<5;rail++)this.box([x+(rail-2)*w*.14,y+4.6,z+d/2+1.15],[.06,1.1,.06],palette.wood);this.box([x,y+5.1,z+d/2+1.15],[w*.67,.07,.08],palette.wood);}
    this.box([x,y+.15,z+d/2+.6],[2.1,.3,1.2],palette.cream);
  }
  stall(x:number,y:number,z:number,color='#a65947'){
    this.box([x,y+.85,z],[3.5,1.7,1.5],palette.wood);
    this.box([x,y+2.7,z],[4.3,.13,2.6],color,[.07,0,0]);
    for(const dx of [-1.85,1.85])for(const dz of [-.9,.9])this.box([x+dx,y+1.4,z+dz],[.13,2.8,.13],palette.wood);
    for(let j=0;j<5;j++)this.sphere([x-1.3+j*.62,y+1.8,z],[.25,.16,.35],j%2?'#ceb469':'#89954e');
  }
  tree(x:number,y:number,z:number,size=7,shin=false,bronze=false){
    const wood=bronze?palette.bronze:palette.wood;const leaf=bronze?palette.bronze:palette.leaf;
    this.cylinder([x,y+size*.32,z],size*.07,size*.64,wood,bronze?'metal':'stone');
    for(let j=0;j<4;j++){
      const a=j*2.4;const p:V3=[x+Math.sin(a)*size*.2,y+size*(.58+j*.07),z+Math.cos(a)*size*.2];
      this.beam([x,y+size*.3,z],p,size*.05,wood);
      this.sphere(p,[size*.28,size*(shin?.25:.12),size*.3],leaf,bronze?'metal':'stone');
    }
  }
  rock(x:number,y:number,z:number,w:number,h:number,d:number,color=palette.dark,seed=1){
    if(h>50){
      // Broad, joined foothills taper into craggy ridges. Stretched sphere rocks
      // produce vertical monoliths and do not read as the mapped mountain ranges.
      const positions:number[]=[],indices:number[]=[];const rings=16,segments=48;
      for(let ring=0;ring<=rings;ring++)for(let j=0;j<=segments;j++){
        const a=j/segments*Math.PI*2,r=Math.max(.001,ring/rings);
        const edge=1+.12*Math.sin(a*5+seed)+.08*Math.cos(a*9-seed);
        const ridge=1+.22*Math.sin(a*4+seed)*Math.sin(r*Math.PI)+.09*Math.sin(a*11+r*15+seed)*Math.sin(r*Math.PI);
        const height=Math.pow(1-r,1.2)*ridge;
        positions.push(Math.cos(a)*r*w*2.1*edge,height*h-h*.1,Math.sin(a)*r*d*2.1*edge);
        if(ring<rings&&j<segments){const k=ring*(segments+1)+j;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();this.add(g,color,[x,y,z],[1,1,1],[0,seed,0]);g.dispose();return;
    }
    const g=new T.IcosahedronGeometry(1,3); const p=g.getAttribute('position');
    for(let i=0;i<p.count;i++){const n=1+Math.sin(p.getX(i)*4+p.getZ(i)*3+seed)*.14+Math.sin(p.getX(i)*17+p.getZ(i)*13+seed)*.025;p.setXYZ(i,p.getX(i)*n,p.getY(i)*n,p.getZ(i)*n);}g.computeVertexNormals();
    this.add(g,color,[x,y+h*.3,z],[w,h,d],[.05,seed,.12]);g.dispose();
  }
  finish(name:string){
    const group=new T.Group();group.name=name;
    for(const [surface,list] of this.buckets){
      const geometry=mergeGeometries(list);list.forEach(g=>g.dispose());
      const material=new T.MeshStandardMaterial({vertexColors:true,roughness:surface==='metal'?.43:.88,metalness:surface==='metal'?.55:0,side:T.DoubleSide});
      enrichMaterial(material,surface);
      if(surface==='lamp'){material.emissive=new T.Color('#97c7d2');material.emissiveIntensity=.8;}
      if(surface==='window'){material.emissive=new T.Color('#e1a85c');material.emissiveIntensity=.03;}
      const mesh=new T.Mesh(geometry,material);mesh.name=`${name}_${surface}`;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    }
    group.userData.obstacles=this.obstacles;
    // Runtime camera collision data need not inflate downloadable GLB extras.
    Object.defineProperty(group.userData,'cameraObstacles',{value:this.cameraObstacles,enumerable:false});this.buckets.clear();return group;
  }
}
export function random(seed:number){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export function ground(b:ModelBuilder,size:number,color=palette.sand,y=-1){b.box([0,y-3,0],[size,6,size],color);}
export function mountains(b:ModelBuilder,count:number,radius:number,height:number,seed:number,angleStart=0,angleEnd=Math.PI*2){
  const r=random(seed);for(let i=0;i<count;i++){const a=angleStart+(angleEnd-angleStart)*i/(count-1);const h=height*(.6+r()*.8);b.rock(Math.sin(a)*radius,-25,Math.cos(a)*radius,80+r()*100,h,80+r()*90,'#7c7f77',r()*9);}
}
