import {expect,it} from 'vitest';
import * as T from 'three';
import {ModelBuilder,type PlaceModel} from './kit';
import {disposePlace} from './dispose';
import {sailingBoat,dockDetails} from './maritime';
import {packModel,unpackModel} from '../loading/transfer';

function verify(group:T.Group){
 let count=0;
 group.traverse(o=>{if(o instanceof T.Mesh){count++;for(const a of Object.values(o.geometry.attributes)){const attribute=a as T.BufferAttribute;expect(attribute.array.every(Number.isFinite)).toBe(true);}expect(o.geometry.attributes.normal.count).toBe(o.geometry.attributes.position.count);}});
 return count;
}
it('keeps detailed botanical geometry reusable after a destination is disposed',()=>{
 for(let repeat=0;repeat<2;repeat++){
  const b=new ModelBuilder();b.tree(10,0,20,8,true);b.tree(-10,0,20,6,false);const group=b.finish('trees');
  expect(verify(group)).toBe(2);const size=new T.Box3().setFromObject(group).getSize(new T.Vector3());expect(size.y).toBeGreaterThan(5);expect(size.y).toBeLessThan(10);
  let triangles=0;group.traverse(o=>{if(o instanceof T.Mesh)triangles+=o.geometry.attributes.position.count/3;});expect(triangles).toBeLessThan(20000);
  disposePlace({group} as PlaceModel);
 }
});
it('transfers detailed rigging, hulls and piers without losing material identity',()=>{
 const b=new ModelBuilder();sailingBoat(b,0,0,0,22,.2);dockDetails(b,[10,1,0],26,5);const group=b.finish('harbor');
 const model={group,id:'kasitor',routes:[],radius:50,features:[],overview:{eye:[0,10,20],target:[0,0,0]},close:{eye:[0,2,10],target:[0,0,0]}} as PlaceModel;
 const copy=unpackModel(packModel(model));expect(verify(copy.group)).toBeGreaterThan(3);
 const surfaces=new Set<string>();copy.group.traverse(o=>{if(o instanceof T.Mesh)surfaces.add((o.material as T.Material).userData.surface);});expect(surfaces.has('timber')).toBe(true);expect(surfaces.has('canvas')).toBe(true);
 const size=new T.Box3().setFromObject(copy.group).getSize(new T.Vector3());expect(size.y).toBeLessThan(24);expect(size.z).toBeGreaterThan(25);
 disposePlace(model);disposePlace(copy);
});
