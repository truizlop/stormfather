import * as T from 'three';
import {buildPerson} from './models/person';
import {ModelBuilder} from './models/kit';
/** Blue Alethi uniforms and pale leaking Stormlight follow the published prose.
 * This is an illustrative patrol, not a reconstruction of a particular chapter. */
export const WINDRUNNER_COUNT=12;
export function windrunnerPose(time:number,index:number){
  const phase=time*.032+index*Math.PI*2/WINDRUNNER_COUNT;
  const x=-840+Math.sin(phase*2)*95,y=110+index%3*95+(1+Math.sin(phase))*(index<6?55:165),z=Math.cos(phase)*700;
  const dx=Math.cos(phase*2)*190,dz=-Math.sin(phase)*700;
  return {position:new T.Vector3(x,y,z),yaw:Math.atan2(dx,dz),bank:Math.sin(phase)*.16};
}
export function createWindrunner(index:number){
  const rig=buildPerson(index,'radiant',index%3?'#22549a':'#326ab0');
  const spear=new ModelBuilder();spear.cylinder([.4,.9,.12],.017,2.25,'#6c5840');spear.cone([.4,2.09,.12],.055,.22,'#cbd5d6');rig.group.add(spear.finish('ordinary_spear'));
  rig.group.name=`Windrunner_${index}`;
  return {body:rig.group,limbs:[rig.arms[0],rig.legs[0],rig.forearms[0],rig.arms[1],rig.legs[1],rig.forearms[1]]};
}
