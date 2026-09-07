import {useEffect,useMemo} from 'react';
import * as T from 'three';
import {riverPaths} from '../world/cartography/geography';
import {atlasHeight} from './geographyModel';
import {cutCityFootprints} from './integration';

/** Fine drainage lines follow the same sampled heightfield as the continent. */
export function AtlasRivers(){
 const geometry=useMemo(()=>{
  const positions:number[]=[];
  for(const river of riverPaths){
   const curve=new T.CatmullRomCurve3(river.points.map(([x,z])=>new T.Vector3(x,0,z))),points=curve.getPoints(Math.ceil(curve.getLength()*12));
   for(let i=0;i<points.length-1;i++){
    const a=points[i],c=points[i+1],dx=c.x-a.x,dz=c.z-a.z,length=Math.hypot(dx,dz)||1,w=river.width*.23;
    const edge=(p:T.Vector3,side:number)=>{const x=p.x+dz/length*w*side,z=p.z-dx/length*w*side;return [x,atlasHeight(x,z)+.012,z];};
    positions.push(...edge(a,-1),...edge(c,-1),...edge(a,1),...edge(a,1),...edge(c,-1),...edge(c,1));
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
 },[]);
 const material=useMemo(()=>{const m=new T.MeshStandardMaterial({color:'#516f70',roughness:.36,metalness:.25,side:T.DoubleSide});cutCityFootprints(m);return m;},[]);
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 return <mesh geometry={geometry} material={material}/>;
}
