import {archway} from './architecture';
import {dressLandmark} from './landmarkDetails';
import {dressStreets} from './streetDetails';
import {buildHearthstone,buildRevolar,buildKasitor,buildRallElorim} from './expandedCities';
import {buildYeddaw,buildSesemalex} from './trenchCities';
import type { PlaceId } from '../data';
import { buildUrithiru } from './urithiru';
import {buildKharbranth} from './cities';
import {buildReferenceKholinar,buildReferenceAzimir,buildReferenceThaylen,buildReferenceVedenar} from './referencedCities';
import {buildPlains,buildShinovar,buildPurelake,buildAkinah} from './landscapes';
import {ModelBuilder,palette,type PlaceModel} from './kit';
import {prepareRoute,sampleRoute} from '../simulation';
import {safeRoutes} from '../navigation';
const builders={hearthstone:buildHearthstone,revolar:buildRevolar,kasitor:buildKasitor,'rall-elorim':buildRallElorim,yeddaw:buildYeddaw,'sesemalex-dar':buildSesemalex,urithiru:buildUrithiru,kholinar:buildReferenceKholinar,kharbranth:buildKharbranth,azimir:buildReferenceAzimir,'thaylen-city':buildReferenceThaylen,vedenar:buildReferenceVedenar,'shattered-plains':buildPlains,shinovar:buildShinovar,purelake:buildPurelake,akinah:buildAkinah};
export function buildPlace(id:PlaceId):PlaceModel{
  const model=builders[id]();model.routes=safeRoutes(model);
  // Choose a walkable camera station, so the street preset cannot begin inside
  // a procedurally placed house. Preserve the monument/ruin-specific viewpoints.
  if(!['urithiru','purelake','akinah','hearthstone','kasitor','rall-elorim','kholinar','shinovar','vedenar','revolar'].includes(id)){
    const desired=model.close.target;
    const candidates=model.routes.filter(r=>r.species==='human').map(prepareRoute).filter(r=>r.length>24);
    let best:{route:ReturnType<typeof prepareRoute>;distance:number;score:number}|undefined;
    for(const route of candidates)for(let d=9;d<route.length-9;d+=4){const p=sampleRoute(route,d).position;const score=(p[0]-desired[0])**2+(p[2]-desired[2])**2;if(!best||score<best.score)best={route,distance:d,score};}
    if(best){const eye=sampleRoute(best.route,best.distance-7).position,target=sampleRoute(best.route,best.distance+8).position;model.close={eye:[eye[0],eye[1]+3.2,eye[2]],target:[target[0],target[1]+1.7,target[2]]};}
  }
  // Covered stone wayside recesses face back along the walking route. Their
  // solid backs and sides give shelter without closing the approach path.
  if(!['urithiru','purelake','akinah','shinovar'].includes(id)){
    const b=new ModelBuilder();const done=new Set<string>();
    model.routes.filter(r=>r.species==='human'&&!r.id.includes('dock')).forEach(r=>{
      for(const index of [0,r.points.length-1]){
        const [x,y,z]=r.points[index];const next=r.points[index===0?1:index-1];
        // The market already has deep porticoes for shelter.
        const court=model.group.userData.marketCourt;if(court&&Math.abs(x-court[0])<17&&z-court[1]>-10&&z-court[1]<30)continue;
        // Keep the street preset's foreground and focal area open.
        if([model.close.eye,model.close.target].some(p=>Math.hypot(x-p[0],z-p[2])<18))continue;
        const key=`${Math.round(x/5)}:${Math.round(z/5)}`;if(done.has(key))continue;done.add(key);
        const length=Math.hypot(x-next[0],z-next[2])||1,dx=(x-next[0])/length,dz=(z-next[2])/length,yaw=Math.atan2(dx,dz);
        b.box([x,y+4.3,z],[5.2,.6,5.2],palette.stone,[0,yaw,0],'ashlar');
        b.box([x,y+4.65,z],[5.55,.14,5.55],palette.cream,[0,yaw,0],'cutstone');
        archway(b,[x-dx*2.35,y,z-dz*2.35],4.15,2.85,1,.38,yaw+Math.PI,palette.cream);
        b.box([x+dx*2.3,y+2,z+dz*2.3],[5,4,.45],palette.stone,[0,yaw,0],'ashlar');
        for(const side of [-1,1])b.box([x+dz*side*2.3,y+2,z-dx*side*2.3],[.45,4,5],palette.stone,[0,yaw,0],'ashlar');
      }
    });model.group.add(b.finish('Public_shelters'));
  }
  dressLandmark(model);
  dressStreets(model);
  Object.assign(model.group.userData,{units:'metres',reconstruction:'Original source-informed interpretation',routes:model.routes.map(r=>({id:r.id,species:r.species,activity:r.activity,points:r.points}))});
  return model;
}
export { disposePlace } from './dispose';
