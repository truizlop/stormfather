import type {Route,PlaceModel,V3} from './models/kit';
export interface Obstacle {minX:number;maxX:number;minZ:number;maxZ:number;bottom:number;top:number}
export function pointBlocked(point:V3,obstacles:Obstacle[],clearance=.75){
  return obstacles.some(o=>point[0]>o.minX-clearance&&point[0]<o.maxX+clearance&&point[2]>o.minZ-clearance&&point[2]<o.maxZ+clearance&&point[1]<o.top-.04&&point[1]+1.85>o.bottom);
}
/** Split authored roads at solid geometry rather than allowing actors to cross it. */
export function safeRoutes(model:PlaceModel):Route[]{
  const obstacles=(model.group.userData.obstacles??[]) as Obstacle[];
  const grid=new Map<string,Obstacle[]>();const cell=24;
  for(const o of obstacles){for(let x=Math.floor((o.minX-8)/cell);x<=Math.floor((o.maxX+8)/cell);x++)for(let z=Math.floor((o.minZ-8)/cell);z<=Math.floor((o.maxZ+8)/cell);z++){const k=`${x}:${z}`;const a=grid.get(k)??[];a.push(o);grid.set(k,a);}}
  const out:Route[]=[];
  model.routes.forEach(route=>{
    let points:V3[]=[];let part=0;
    const flush=()=>{if(points.length>2){let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(...points[i].map((n,j)=>n-points[i-1][j]));if(length>6)out.push({...route,id:`${route.id}-${part++}`,points});}points=[];};
    const clearance=route.species==='chull'?2.2:route.species==='chasmfiend'?7:.8;
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i];const n=Math.ceil(Math.hypot(...b.map((v,j)=>v-a[j]))/1.5);
      for(let j=i===1?0:1;j<=n;j++){
        const t=j/n,p:V3=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
        const near=grid.get(`${Math.floor(p[0]/cell)}:${Math.floor(p[2]/cell)}`)??[];
        if(pointBlocked(p,near,clearance))flush();else points.push(p);
      }
    }flush();
  });return out;
}
