import { expect,it } from 'vitest';
import { nearestResidents } from './residentDetail';
it('caps detailed crowd rigs, selects the nearest people and culls distant/other-level people',()=>{
 const positions=Array.from({length:40},(_,i)=>[i,0,0] as const);
 expect(nearestResidents(positions,[0,0,0])).toEqual([0,1,2,3,4,5,6,7]);
 expect(nearestResidents(positions,[39,0,0],3)).toEqual([39,38,37]);
 expect(nearestResidents(positions,[0,100,0])).toEqual([]);
 expect(nearestResidents([], [0,0,0])).toEqual([]);
});
