import {expect,it} from 'vitest';
import {Vector3} from 'three';
import {cameraBlocked} from './cameraCollision';
import {ModelBuilder} from './models/kit';
import {disposePlace} from './models';
import type {PlaceModel} from './models/kit';
it('detects thin shelter walls while leaving a clear entrance visible',()=>{
 const builder=new ModelBuilder();builder.box([0,2,-2.3],[5,4,.45]);const group=builder.finish('shelter');
 const boxes=group.userData.cameraObstacles;expect(boxes).toHaveLength(1);
 expect(cameraBlocked(new Vector3(0,1.5,0),new Vector3(0,3,-6),boxes)).toBe(true);
 expect(cameraBlocked(new Vector3(0,1.5,0),new Vector3(0,3,6),boxes)).toBe(false);
 expect(cameraBlocked(new Vector3(0,5,0),new Vector3(0,6,-6),boxes)).toBe(false);
 expect(JSON.stringify(group.userData)).not.toContain('cameraObstacles');disposePlace({group} as PlaceModel);
});
