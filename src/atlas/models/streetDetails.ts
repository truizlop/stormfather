import {ModelBuilder,type PlaceModel,type V3} from './kit';
import {prepareRoute,sampleRoute} from '../simulation';
import {pointBlocked,type Obstacle} from '../navigation';
/** Street furniture is placed beside verified walking routes, outside building bounds. */
export function dressStreets(model:PlaceModel){
 if(['akinah','purelake','shattered-plains','shinovar'].includes(model.id))return;
 const b=new ModelBuilder(),sites:V3[]=[],obstacles=model.group.userData.obstacles as Obstacle[];
 for(const road of model.routes.filter(r=>r.species==='human').slice(0,9)){
  const route=prepareRoute(road);if(route.length<35)continue;
  for(const t of [.27,.68]){const {position:p,yaw}=sampleRoute(route,route.length*t);const x=p[0]+Math.cos(yaw)*3.8,z=p[2]-Math.sin(yaw)*3.8,y=p[1];if(pointBlocked([x,y,z],obstacles,1.6)||sites.some(q=>Math.hypot(q[0]-x,q[2]-z)<14))continue;sites.push([x,y,z]);
   b.cylinder([x,y+2,z],.09,4,'#665c48');b.beam([x,y+3.9,z],[x+.55,y+3.9,z],.08,'#88724e');b.sphere([x+.55,y+3.5,z],[.24,.3,.24],'#b5d5cb','lamp');b.cylinder([x+.55,y+3.8,z],.28,.09,'#a08958');
   for(const dx of [-.9,.9])b.box([x+dx,y+.3,z+1.5],[.2,.6,.65],'#a8997b');b.box([x,y+.65,z+1.5],[2.3,.18,.7],'#8c7457');
   b.sphere([x-1.3,y+.4,z-1.3],[.34,.4,.34],'#b18465');b.cylinder([x-1.3,y+.8,z-1.3],.23,.12,'#c29670');
  }
 }
 model.group.add(b.finish('Street_furniture'));model.group.userData.lampSites=sites;
}
