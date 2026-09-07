import * as T from 'three';
import {refineTerrain} from './terrainMesh';
import { mainlandOutline,aimiaOutline,islandPolygons,inlandWaterPolygons,type GeographyPoint } from '../world/cartography/geography';
import { naturalTerrainHeightAt, ridgeHeightAt } from '../world/terrain/terrainHeight';

export const atlasPolygons=[mainlandOutline,aimiaOutline,...islandPolygons.map(i=>i.points)];
// Spatially indexed reference edges make coast-to-sea relief continuous while
// keeping every horizontal coastline coordinate exactly where it was traced.
const shoreCells=new Map<string,Array<[GeographyPoint,GeographyPoint]>>();
for(const outline of [...atlasPolygons,...inlandWaterPolygons.map(p=>p.points)])for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length];
  for(let x=Math.floor(Math.min(a[0],b[0])-1);x<=Math.ceil(Math.max(a[0],b[0])+1);x++)for(let z=Math.floor(Math.min(a[1],b[1])-1);z<=Math.ceil(Math.max(a[1],b[1])+1);z++){
    const key=`${x}:${z}`,edges=shoreCells.get(key)??[];edges.push([a,b]);shoreCells.set(key,edges);
  }
}
function shoreFactor(x:number,z:number){
  let distance=.7;
  for(const [a,b] of shoreCells.get(`${Math.floor(x)}:${Math.floor(z)}`)??[]){const dx=b[0]-a[0],dz=b[1]-a[1],t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);distance=Math.min(distance,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}
  return T.MathUtils.smoothstep(distance,0,.65);
}
function hash(x:number,z:number){const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);}
function noise(x:number,z:number){const ix=Math.floor(x),iz=Math.floor(z);let a=x-ix,b=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),a),T.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),a),b);}
export function atlasHeight(x:number,z:number){
  const base=naturalTerrainHeightAt(x,z);const ridge=ridgeHeightAt(x,z);
  // Relief is interpretive; the horizontal coastline and map anchors are never distorted.
  const fracture=((noise(x*1.1,z*1.1)-.5)*.25+(noise(x*2.8,z*2.8)-.5)*.08);
  // Keep continental relief compatible with the enlarged metric cities. The old
  // half-unit coastal pedestal became a 250 m wall at street scale.
  return .008+(.027+(Math.max(.5,base+ridge*fracture)-.5)*.32)*shoreFactor(x,z);
}
export function landColor(x:number,z:number,h:number){
  const variation=(noise(x*.12,z*.12)-.5)*7;
  const color=new T.Color('#a09875');
  color.lerp(new T.Color('#78835f'),1-T.MathUtils.smoothstep(z+variation,-15,0));
  color.lerp(new T.Color('#647b55'),1-T.MathUtils.smoothstep(x+variation,-38,-24));
  const azish=(1-T.MathUtils.smoothstep(x,-5,15))*T.MathUtils.smoothstep(x,-30,-18)*T.MathUtils.smoothstep(z+variation,-4,7);
  color.lerp(new T.Color('#b59b70'),azish*.85);
  color.lerp(new T.Color('#a2a38e'),T.MathUtils.smoothstep(z+variation,10,22));
  const ridge=ridgeHeightAt(x,z);color.lerp(new T.Color('#777e75'),T.MathUtils.smoothstep(ridge,.4,4)*.78);
  color.lerp(new T.Color('#d0d2c6'),T.MathUtils.smoothstep(h,1.31,2.18)*.8);
  color.offsetHSL(0,0,(noise(x*2.6,z*2.6)-.5)*.05+(noise(x*.5,z*.5)-.5)*.065);
  return color;
}
/** Triangulates the actual reference outline, then refines only the interiors. */
export function createAtlasLand(){
  const pos:number[]=[],colors:number[]=[],normals:number[]=[];
  // Adjacent triangles share their coordinates. Sample the expensive terrain field
  // once per exact coordinate, preserving the original mesh and all map anchors.
  const samples=new Map<string,{h:number;color:T.Color;normal:T.Vector3}>();
  function vertex(p:GeographyPoint){
    const [x,z]=p,key=`${x}:${z}`;
    let sample=samples.get(key);
    if(!sample){
      const h=atlasHeight(x,z);
      sample={h,color:landColor(x,z,h),normal:new T.Vector3(atlasHeight(x-.06,z)-atlasHeight(x+.06,z),.12,atlasHeight(x,z-.06)-atlasHeight(x,z+.06)).normalize()};
      samples.set(key,sample);
    }
    pos.push(x,sample.h,z);colors.push(sample.color.r,sample.color.g,sample.color.b);
    normals.push(sample.normal.x,sample.normal.y,sample.normal.z);
  }
  atlasPolygons.forEach((outline,index)=>{
    const contour=outline.map(([x,z])=>new T.Vector2(x,z));
    const holes=index===0?inlandWaterPolygons.map(w=>w.points.map(([x,z])=>new T.Vector2(x,z))):[];
    const points=[...contour,...holes.flat()];const faces=T.ShapeUtils.triangulateShape(contour,holes);
    const refined=refineTerrain(points.map(p=>p.toArray() as GeographyPoint),faces as [number,number,number][]);
    refined.faces.forEach(([a,b,c])=>{vertex(refined.points[a]);vertex(refined.points[c]);vertex(refined.points[b]);});
  });
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  return g;
}
export function createCoastWalls(){
  const p:number[]=[];for(const outline of atlasPolygons)for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length];const h1=atlasHeight(...a),h2=atlasHeight(...b);
    p.push(a[0],-.15,a[1],b[0],h2,b[1],a[0],h1,a[1],a[0],-.15,a[1],b[0],-.15,b[1],b[0],h2,b[1]);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
