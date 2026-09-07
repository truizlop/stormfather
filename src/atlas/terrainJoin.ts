import * as T from 'three';
export const TERRAIN_RADIUS=1.58;
export interface TerrainBoundary {x:number;z:number;y?:number;color?:[number,number,number]}
interface Placement {id:string;radius:number;scale:number;origin:readonly [number,number,number]}
type Vertex=number[]; // position, color, normal
const interpolate=(a:Vertex,b:Vertex,t:number)=>a.map((v,i)=>v+(b[i]-v)*t);
/** Carve polygonal city boundaries into the actual rendered triangles. Keep the
 * interpolated boundary heights, including every triangle-edge intersection, so
 * the regional collar can share the very same edges without an overlap. */
export function joinTerrain(geometry:T.BufferGeometry,placements:readonly Placement[]){
  const boundaries=new Map<string,TerrainBoundary[]>();
  const cuts=placements.map(p=>{
    const radius=p.radius*p.scale*TERRAIN_RADIUS;
    const ring=Array.from({length:144},(_,i)=>{const a=i/144*Math.PI*2;return {x:p.origin[0]+Math.sin(a)*radius,z:p.origin[2]+Math.cos(a)*radius} as TerrainBoundary;});
    const points=new Map<string,TerrainBoundary>();
    const key=(v:TerrainBoundary)=>`${Math.round(v.x*1e8)}:${Math.round(v.z*1e8)}`;
    ring.forEach(v=>points.set(key(v),v));
    return {p,radius,ring,points,key};
  });
  const pos=geometry.getAttribute('position'),color=geometry.getAttribute('color'),normal=geometry.getAttribute('normal');
  const output:Vertex[]=[];
  for(let i=0;i<pos.count;i+=3){
    let pieces:Vertex[][]=[Array.from({length:3},(_,j)=>[pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j),color.getX(i+j),color.getY(i+j),color.getZ(i+j),normal.getX(i+j),normal.getY(i+j),normal.getZ(i+j)])];
    const xs=pieces[0].map(v=>v[0]),zs=pieces[0].map(v=>v[2]);
    for(const cut of cuts){
      const {p,radius,ring}=cut;
      if(Math.max(...xs)<p.origin[0]-radius||Math.min(...xs)>p.origin[0]+radius||Math.max(...zs)<p.origin[2]-radius||Math.min(...zs)>p.origin[2]+radius)continue;
      const outside:Vertex[][]=[];
      for(const piece of pieces){
        let inside=piece;
        for(let edge=0;edge<ring.length&&inside.length;edge++){
          const a=ring[edge],b=ring[(edge+1)%ring.length];
          const distance=(v:Vertex)=>(b.x-a.x)*(v[2]-a.z)-(b.z-a.z)*(v[0]-a.x);
          const inner:Vertex[]=[],outer:Vertex[]=[];
          for(let j=0;j<inside.length;j++){
            const v=inside[j],w=inside[(j+1)%inside.length],d=distance(v),e=distance(w),vIn=d<=0,wIn=e<=0;
            (vIn?inner:outer).push(v);
            if(vIn!==wIn){const intersection=interpolate(v,w,d/(d-e));inner.push(intersection);outer.push(intersection);}
          }
          if(outer.length>=3)outside.push(outer);
          inside=inner;
        }
        // Vertices on the cut carry the original triangle's height and color.
        for(const v of inside)for(let edge=0;edge<ring.length;edge++){
          const a=ring[edge],b=ring[(edge+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z;
          const t=((v[0]-a.x)*dx+(v[2]-a.z)*dz)/(dx*dx+dz*dz);
          if(t>=-1e-7&&t<=1+1e-7&&Math.abs(dx*(v[2]-a.z)-dz*(v[0]-a.x))<1e-9){
            const point={x:v[0],z:v[2],y:v[1],color:v.slice(3,6) as [number,number,number]};cut.points.set(cut.key(point),point);break;
          }
        }
      }
      pieces=outside;
    }
    for(const piece of pieces)for(let j=1;j<piece.length-1;j++)output.push(piece[0],piece[j],piece[j+1]);
  }
  for(const {p,points} of cuts){
    const sorted=[...points.values()].sort((a,b)=>Math.atan2(a.x-p.origin[0],a.z-p.origin[2])-Math.atan2(b.x-p.origin[0],b.z-p.origin[2]));
    boundaries.set(p.id,sorted);
  }
  const result=new T.BufferGeometry();
  for(const [name,start] of [['position',0],['color',3],['normal',6]] as const)result.setAttribute(name,new T.Float32BufferAttribute(output.flatMap(v=>v.slice(start,start+3)),3));
  return {geometry:result,boundaries};
}
