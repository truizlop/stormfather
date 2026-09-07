export type Point2=readonly [number,number];
type Face=[number,number,number];
/** Split shared edges once, and propagate every split to both incident faces.
 * Independent longest-edge recursion leaves T junctions after height sampling. */
export function refineTerrain<P extends readonly number[]>(points:P[],initial:Face[],maxEdge=Math.sqrt(.5)){
  let faces=initial;
  for(let pass=0;pass<24;pass++){
    const midpoints=new Map<string,number>();
    const key=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
    for(const f of faces)for(let i=0;i<3;i++){
      const a=f[i],b=f[(i+1)%3],p=points[a],q=points[b],k=key(a,b);
      if(!midpoints.has(k)&&Math.sqrt(p.reduce((sum,v,i)=>sum+(v-q[i])**2,0))>maxEdge){midpoints.set(k,points.length);points.push(p.map((v,i)=>(v+q[i])/2) as unknown as P);}
    }
    if(!midpoints.size)return {points,faces};
    const next:Face[]=[];
    for(const [a,b,c] of faces){
      const ab=midpoints.get(key(a,b)),bc=midpoints.get(key(b,c)),ca=midpoints.get(key(c,a));
      if(ab!==undefined&&bc!==undefined&&ca!==undefined)next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);
      else if(ab!==undefined&&bc!==undefined)next.push([b,bc,ab],[a,ab,c],[ab,bc,c]);
      else if(bc!==undefined&&ca!==undefined)next.push([c,ca,bc],[b,bc,a],[bc,ca,a]);
      else if(ca!==undefined&&ab!==undefined)next.push([a,ab,ca],[c,ca,b],[ca,ab,b]);
      else if(ab!==undefined)next.push([a,ab,c],[ab,b,c]);
      else if(bc!==undefined)next.push([b,bc,a],[bc,c,a]);
      else if(ca!==undefined)next.push([c,ca,b],[ca,a,b]);
      else next.push([a,b,c]);
    }
    faces=next;
  }
  throw new Error('Terrain refinement did not converge');
}
