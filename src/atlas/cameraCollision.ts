import type { Obstacle } from './navigation';
import type { Vector3 } from 'three';
/** Segment/slab test for a clear wildlife sightline through static architecture. */
export function cameraBlocked(start:Vector3,end:Vector3,boxes:Obstacle[]):boolean{
  return boxes.some(box=>{
    let enter=0,leave=1;
    for(const [a,b,min,max] of [[start.x,end.x,box.minX-.12,box.maxX+.12],[start.y,end.y,box.bottom-.12,box.top+.12],[start.z,end.z,box.minZ-.12,box.maxZ+.12]]){
      const delta=b-a;if(Math.abs(delta)<1e-8){if(a<min||a>max)return false;continue;}
      const first=(min-a)/delta,last=(max-a)/delta;enter=Math.max(enter,Math.min(first,last));leave=Math.min(leave,Math.max(first,last));if(enter>leave)return false;
    }
    return leave>.01&&enter<.99;
  });
}
