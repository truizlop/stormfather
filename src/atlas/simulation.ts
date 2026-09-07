import type { Route, V3, PlaceModel } from './models/kit';
import { random } from './models/kit';
export interface PreparedRoute extends Route { distances:number[]; length:number }
export function prepareRoute(route:Route):PreparedRoute{
  const distances=[0];for(let i=1;i<route.points.length;i++)distances.push(distances[i-1]+Math.hypot(...route.points[i].map((v,j)=>v-route.points[i-1][j])));
  return {...route,distances,length:distances.at(-1)??0};
}
export function sampleRoute(route:PreparedRoute,distance:number):{position:V3;yaw:number}{
  const d=Math.max(0,Math.min(route.length,distance));let i=1;while(i<route.distances.length-1&&route.distances[i]<d)i++;
  const a=route.points[i-1],b=route.points[i];const t=(d-route.distances[i-1])/Math.max(.0001,route.distances[i]-route.distances[i-1]);
  return {position:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],yaw:Math.atan2(b[0]-a[0],b[2]-a[2])};
}
export interface Resident {id:string;route:PreparedRoute;distance:number;direction:1|-1;speed:number;height:number;phase:number;wait:number;mode:'walking'|'resting'|'sheltering';skin:string;cloth:string;occupation:'porter'|'resident'|'guard'|'fisher';lane:number;}
export function createResidents(model:PlaceModel):Resident[]{
  if(model.id==='akinah')return [];
  const cargoSegments=model.routes.filter(r=>r.species==='chull').flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b})));
  const onCargoRoad=(p:V3)=>cargoSegments.some(({a,b})=>{const dx=b[0]-a[0],dz=b[2]-a[2];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[2]-a[2])*dz)/(dx*dx+dz*dz||1)));return Math.abs(p[1]-a[1])<2&&Math.hypot(p[0]-a[0]-dx*t,p[2]-a[2]-dz*t)<2.6;});
  // A broad cargo avenue has its own parallel pedestrian routes. Do not spawn
  // a second population down the center of the chulls' occupied lane.
  const routes=model.routes.filter(r=>!r.species||r.species==='human').map(prepareRoute).filter(r=>r.length>4&&!([.15,.5,.85].every(t=>onCargoRoad(sampleRoute(r,r.length*t).position))));
  const rng=random(model.id.length*99+34);const residents:Resident[]=[];
  const clothes=model.id==='azimir'?['#d4a760','#8c656d','#6f96a4','#d0c3a3']:['#728b94','#8b624a','#aa8d67','#c2b69c','#516b7e'];
  const perRoute=model.id==='urithiru'?4:5;
  routes.forEach((route,i)=>{const count=Math.min(perRoute,Math.max(1,Math.floor(route.length/7)));for(let j=0;j<count;j++)residents.push({id:`${model.id}-${i}-${j}`,route,distance:(j+.5)/count*route.length,direction:j%2?1:-1,speed:.95+rng()*.4,height:1.6+rng()*.35,phase:rng()*6.28,wait:0,mode:'walking',skin:['#ad7a56','#8b573c','#c09873','#684431'][Math.floor(rng()*4)],cloth:clothes[Math.floor(rng()*clothes.length)],occupation:model.id==='purelake'?'fisher':j%4===0?'porter':j%7===0?'guard':'resident',lane:(j%2?1:-1)*.48});});
  return residents.slice(0,260);
}
/** Advance on a fixed route; no straight-line teleportation through architecture. */
export function stepResident(person:Resident,dt:number,storm:number){
  if(dt<=0)return;
  person.lane=person.direction*.48;
  if(storm>.5){
    person.mode='sheltering';person.direction=person.distance<person.route.length/2?-1:1;
    const shelterOffset=.25+person.phase*.24;
    person.distance=Math.max(shelterOffset,Math.min(person.route.length-shelterOffset,person.distance+person.direction*person.speed*1.7*dt));return;
  }
  if(person.mode==='sheltering'){person.mode='walking';person.direction=person.distance<person.route.length/2?1:-1;}
  if(person.wait>0){person.wait=Math.max(0,person.wait-dt);person.mode='resting';return;}
  person.mode='walking';person.distance+=person.speed*person.direction*dt;
  if(person.distance>=person.route.length){person.distance=person.route.length;person.direction=-1;person.wait=2+person.phase;}
  if(person.distance<=0){person.distance=0;person.direction=1;person.wait=2+person.phase;}
}
export const speciesAnatomy={chull:{legs:6,foreclaws:2},axehound:{legs:6,foreclaws:0},chasmfiend:{legs:18,foreclaws:4},goat:{legs:4,foreclaws:0},cremling:{legs:8,foreclaws:0},skyeel:{legs:0,foreclaws:0}} as const;
