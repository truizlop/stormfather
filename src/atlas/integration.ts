import * as T from 'three';
import {TERRAIN_RADIUS,type TerrainBoundary} from './terrainJoin';
export const cityTerrainBoundaries=new Map<string,TerrainBoundary[]>();
import {places,type PlaceId} from './data';
import {atlasHeight,landColor,atlasPolygons} from './geographyModel';
import {inlandWaterPolygons,pointInPolygon} from '../world/cartography/geography';
import type {PlaceModel,V3} from './models/kit';

/** Maximum atlas scale. Close neighbors use smaller footprints to keep their terrain separate. */
export const CITY_SCALE=.002;
export interface CityPlacement {id:PlaceId;origin:V3;scale:number;radius:number;floor:number;color:string}
const settings:Record<PlaceId,{radius:number;floor:number;color:string;sea?:number;scale?:number}>={
  hearthstone:{scale:.0015,radius:370,floor:-.5,color:'#9d9275'},
  revolar:{scale:.0015,radius:600,floor:-1,color:'#9d8d73'},
  kasitor:{radius:550,floor:-.8,color:'#a19574',sea:-1},
  'rall-elorim':{radius:610,floor:-4,color:'#94987e',sea:0},
  yeddaw:{scale:.0011,radius:580,floor:-4,color:'#a49b7e'},
  'sesemalex-dar':{radius:550,floor:-1,color:'#9c987f'},
  urithiru:{radius:1600,floor:-54,color:'#858782'},
  kholinar:{radius:680,floor:-.4,color:'#9b8d73'},
  kharbranth:{radius:700,floor:-2,color:'#9b8d75',sea:-1},
  'thaylen-city':{radius:950,floor:-6,color:'#94947d',sea:-5},
  azimir:{scale:.0011,radius:780,floor:-.4,color:'#a69473'},
  'shattered-plains':{radius:850,floor:-54,color:'#998269'},
  shinovar:{radius:850,floor:-1,color:'#81945c'},
  purelake:{radius:700,floor:-2.6,color:'#a4a27c',sea:.45},
  vedenar:{radius:650,floor:-44,color:'#87917b',sea:-43},
  akinah:{radius:500,floor:-3,color:'#74776b',sea:-2},
};
export const cityPlacements:CityPlacement[]=places.map(p=>{
  const config=settings[p.id];return {id:p.id,origin:[p.anchor[0],config.sea===undefined?atlasHeight(...p.anchor): -config.sea*CITY_SCALE,p.anchor[1]],scale:CITY_SCALE,...config};
});
export const placementById=new Map(cityPlacements.map(p=>[p.id,p]));
export function toAtlas(p:CityPlacement,local:T.Vector3|V3,out=new T.Vector3()){
  return (Array.isArray(local)?out.set(...local):out.copy(local)).multiplyScalar(p.scale).add(new T.Vector3(...p.origin));
}
export function toLocal(p:CityPlacement,world:T.Vector3,out=new T.Vector3()) {return out.copy(world).sub(new T.Vector3(...p.origin)).divideScalar(p.scale);}
export function nearestCity(point:T.Vector3,maxDistance=18){
  let nearest:CityPlacement|undefined,score=maxDistance;
  for(const p of cityPlacements){const distance=Math.hypot(point.x-p.origin[0],point.z-p.origin[2]);if(distance<score){score=distance;nearest=p;}}
  return nearest;
}
function isLand(x:number,z:number){return atlasPolygons.some(p=>pointInPolygon([x,z],p))&&!inlandWaterPolygons.some(p=>pointInPolygon([x,z],p.points));}
function floorAt(p:CityPlacement,x:number,z:number){
  if(p.id==='rall-elorim')return .35;
  if(p.id==='kasitor')return z< -100?-12:-.8;
  if(p.id==='yeddaw'&&Math.hypot(x,z)>521)return 38;
  if(p.id==='kharbranth')return z<115?-.8:-8;
  if(p.id==='thaylen-city')return x>-471+(z+6)*.205?-.8:-15;
  if(p.id==='vedenar')return z<185?-.8:-60;
  if(p.id==='akinah')return -12;
  return p.floor;
}
/** Local ground rolls into registered terrain; it is never a square display plinth. */
export function createCityTerrain(p:CityPlacement){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],continentHeight:number[]=[],continentColor:number[]=[],continentNormal:number[]=[];const rings=36,boundary=cityTerrainBoundaries.get(p.id),segments=boundary?.length??144;
  const inner=p.radius,outer=p.radius*TERRAIN_RADIUS;
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<=segments;i++){
    const edge=boundary?.[i%segments];
    const bx=edge?(edge.x-p.origin[0])/p.scale:Math.sin(i/segments*Math.PI*2)*outer,bz=edge?(edge.z-p.origin[2])/p.scale:Math.cos(i/segments*Math.PI*2)*outer;
    const x=bx*ring/rings,z=bz*ring/rings,r=Math.hypot(x,z);
    const wx=p.origin[0]+x*p.scale,wz=p.origin[2]+z*p.scale;
    const land=isLand(wx,wz),height=ring===rings&&edge?.y!==undefined?edge.y:land?atlasHeight(wx,wz):-.04;
    const blend=T.MathUtils.smootherstep(r,inner*1.02,outer*.97);
    const y=T.MathUtils.lerp(floorAt(p,x,z),(height-p.origin[1])/p.scale,blend);
    positions.push(x,y,z);
    continentHeight.push((height-p.origin[1])/p.scale);
    const farColor=land?landColor(wx,wz,height):new T.Color('#66756b');if(ring===rings&&edge?.color)farColor.setRGB(...edge.color);continentColor.push(farColor.r,farColor.g,farColor.b);
    const farNormal=land?new T.Vector3(atlasHeight(wx-.06,wz)-atlasHeight(wx+.06,wz),.12,atlasHeight(wx,wz-.06)-atlasHeight(wx,wz+.06)).normalize():new T.Vector3(0,1,0);continentNormal.push(farNormal.x,farNormal.y,farNormal.z);
    const color=new T.Color(p.color).lerp(land?landColor(wx,wz,height):new T.Color('#66756b'),blend);
    if(ring===rings&&edge?.color)color.setRGB(...edge.color);
    colors.push(color.r,color.g,color.b);
    if(ring<rings&&i<segments){const k=ring*(segments+1)+i;indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('continentHeight',new T.Float32BufferAttribute(continentHeight,1));g.setAttribute('continentColor',new T.Float32BufferAttribute(continentColor,3));g.setAttribute('continentNormal',new T.Float32BufferAttribute(continentNormal,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
/** Clip only the oversized outskirts/ground sheets, leaving metric actors untouched. */
export function constrainCity(model:PlaceModel,p:CityPlacement){
  model.group.traverse(o=>{if(!(o instanceof T.Mesh))return;
    o.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});
    const materials:T.Material[]=[...(Array.isArray(o.material)?o.material:[o.material]),o.customDepthMaterial];
    for(const m of materials){
      const previous=m.onBeforeCompile,cache=m.customProgramCacheKey();
      m.onBeforeCompile=(shader,renderer)=>{
        previous.call(m,shader,renderer);
        shader.vertexShader='varying vec2 vCityXZ;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvCityXZ=((modelMatrix*vec4(position,1.)).xz-vec2(${p.origin[0].toFixed(6)},${p.origin[2].toFixed(6)}))/${p.scale.toFixed(6)};`);
        shader.fragmentShader='varying vec2 vCityXZ;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(length(vCityXZ)>${p.radius.toFixed(1)})discard;`);
      };m.customProgramCacheKey=()=>`${cache}-city-${p.id}`;m.needsUpdate=true;
    }
    // The pre-existing ocean-side ground sheets span kilometres. Tight bounds
    // retain useful frustum culling after the shader limits their footprint.
    if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
  });
}
export function cutCityFootprints(material:T.MeshStandardMaterial){
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vAtlasXZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAtlasXZ=position.xz;');
    shader.fragmentShader='varying vec2 vAtlasXZ;\n'+shader.fragmentShader;
    const holes=cityPlacements.map(p=>`if(distance(vAtlasXZ,vec2(${p.origin[0].toFixed(6)},${p.origin[2].toFixed(6)}))<${(p.radius*p.scale*1.58).toFixed(6)})discard;`).join('\n');
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\n${holes}`);
  };material.customProgramCacheKey=()=> 'continuous-city-terrain-1';
}

/** Ground clearance for continuous orbiting and flights across enlarged relief. */
export function integratedGroundHeight(x:number,z:number){
  const land=isLand(x,z),height=land?atlasHeight(x,z):0;
  for(const p of cityPlacements){
    const lx=(x-p.origin[0])/p.scale,lz=(z-p.origin[2])/p.scale,r=Math.hypot(lx,lz),outer=p.radius*TERRAIN_RADIUS;
    if(r<outer){const blend=T.MathUtils.smootherstep(r,p.radius*1.02,outer*.97);return Math.max(0,p.origin[1]+T.MathUtils.lerp(floorAt(p,lx,lz),(height-p.origin[1])/p.scale,blend)*p.scale);}
  }
  return height;
}

/** The camera can be nearer a neighboring city while looking at a wide overview. */
export function activeCityForCamera(camera:T.Vector3,focusedId?:PlaceId){
  const focus=focusedId&&placementById.get(focusedId);
  if(focus&&camera.distanceTo(new T.Vector3(...focus.origin))<35)return focus.id;
  let best:PlaceId|null=null,distance=18;
  for(const p of cityPlacements){const d=camera.distanceTo(new T.Vector3(...p.origin));if(d<distance){distance=d;best=p.id;}}
  return best;
}
