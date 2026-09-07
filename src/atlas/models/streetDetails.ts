import * as T from 'three';
import {ModelBuilder,type PlaceModel,type V3} from './kit';
import {prepareRoute,sampleRoute} from '../simulation';
import {pointBlocked,type Obstacle} from '../navigation';
/** Street furniture is placed beside verified walking routes, outside building bounds. */
export function dressStreets(model:PlaceModel){
 if(['akinah','purelake','shattered-plains','shinovar'].includes(model.id))return;
 const b=new ModelBuilder(),sites:V3[]=[...(model.group.userData.lampSites??[])],obstacles=model.group.userData.obstacles as Obstacle[];
 // Continuous paved shoulders connect nearby doors and stalls to the street.
 // Sampling whole strips avoids the repeated overlapping boxes at each bend.
 for(const road of model.routes.filter(r=>r.species==='human'&&!r.id.includes('dock'))){
  const positions:number[]=[];
  const edge=(i:number,side:number):V3=>{const p=road.points[i],a=road.points[Math.max(0,i-1)],c=road.points[Math.min(road.points.length-1,i+1)],length=Math.hypot(c[0]-a[0],c[2]-a[2])||1;return [p[0]+(c[2]-a[2])/length*side*7,p[1]-.08,p[2]-(c[0]-a[0])/length*side*7];};
  for(let i=0;i<road.points.length-1;i++){
   const p=road.points[i];if(Math.hypot(p[0]-model.close.target[0],p[2]-model.close.target[2])>105)continue;
   const a=edge(i,-1),c=edge(i,1),d=edge(i+1,-1),e=edge(i+1,1);positions.push(...a,...d,...c,...c,...d,...e);
  }
  if(positions.length){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();b.add(geometry,'#a5aa9b',[0,0,0],[1,1,1],[0,0,0],'paving');geometry.dispose();}
 }
 for(const road of model.routes.filter(r=>r.species==='human'&&!r.id.includes('dock')).slice(0,9)){
  const route=prepareRoute(road);if(route.length<35)continue;
  for(const t of [.27,.68]){const {position:p,yaw}=sampleRoute(route,route.length*t);const x=p[0]+Math.cos(yaw)*3.8,z=p[2]-Math.sin(yaw)*3.8,y=p[1];if(pointBlocked([x,y,z],obstacles,1.6)||sites.some(q=>Math.hypot(q[0]-x,q[2]-z)<14))continue;sites.push([x,y,z]);
   b.cylinder([x,y+2,z],.09,4,'#665c48');b.beam([x,y+3.9,z],[x+.55,y+3.9,z],.08,'#88724e');b.cylinder([x+.55,y+3.5,z],.19,.5,'#ffe4ad','lamp');b.cone([x+.55,y+3.95,z],.34,.3,'#5c625b');for(const side of [-1,1])for(const front of [-1,1])b.beam([x+.55+side*.17,y+3.25,z+front*.17],[x+.55+side*.22,y+3.79,z+front*.22],.035,'#4f554e');b.cylinder([x+.55,y+3.8,z],.28,.09,'#a08958');
   for(const dx of [-.9,.9])b.box([x+dx,y+.3,z+1.5],[.2,.6,.65],'#a8997b');b.box([x,y+.65,z+1.5],[2.3,.18,.7],'#8c7457');
   b.sphere([x-1.3,y+.4,z-1.3],[.34,.4,.34],'#b18465');b.cylinder([x-1.3,y+.8,z-1.3],.23,.12,'#c29670');
  }
 }
 model.group.add(b.finish('Street_furniture'));model.group.userData.lampSites=sites;
}
