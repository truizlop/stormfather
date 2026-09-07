import {expect,it,vi} from 'vitest';
import * as T from 'three';
import {ModelBuilder,type PlaceModel} from './kit';
import {buildPlace,disposePlace} from './index';
import {cameraBlocked} from '../cameraCollision';

it('batches draped awnings with solid props into finite worker-compatible meshes',()=>{
 const errors=vi.spyOn(console,'error');
 try{const b=new ModelBuilder();b.stall(0,0,0);const group=b.finish('market');
  group.traverse(o=>{if(o instanceof T.Mesh){for(const attribute of Object.values(o.geometry.attributes))expect(Array.from((attribute as T.BufferAttribute).array).every(Number.isFinite)).toBe(true);}});
  expect(group.getObjectByName('market_canvas')).toBeDefined();expect(errors).not.toHaveBeenCalled();disposePlace({group} as PlaceModel);
 }finally{errors.mockRestore();}
});
it('keeps the Kholinar market camera unobstructed and city geometry within its budget',()=>{
 const city=buildPlace('kholinar');let triangles=0;
 city.group.traverse(o=>{if(o instanceof T.Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 expect(triangles).toBeLessThan(2600000);
 expect(city.routes.some(r=>r.id.startsWith('market-civic-axis'))).toBe(true);
 const obstacles=city.group.userData.cameraObstacles;
 expect(cameraBlocked(new T.Vector3(...city.close.target),new T.Vector3(...city.close.eye),obstacles)).toBe(false);
 disposePlace(city);
});
