/** Nearest people get articulated models; everyone else stays in the batched crowd. */
export function nearestResidents(positions:readonly (readonly [number,number,number])[],camera:readonly [number,number,number],limit=8,radius=28):number[]{
  return positions.map((p,index)=>({index,distance:(p[0]-camera[0])**2+(p[1]-camera[1])**2+(p[2]-camera[2])**2})).filter(p=>p.distance<radius*radius).sort((a,b)=>a.distance-b.distance||a.index-b.index).slice(0,limit).map(p=>p.index);
}

/** Keep current residents in their slots when distance ordering changes. */
export function assignResidentSlots(current:ReadonlyMap<number,number>,nearest:readonly number[],limit=8):Map<number,number>{
 const result=new Map<number,number>(),wanted=nearest.slice(0,limit);
 for(const index of wanted){const slot=current.get(index);if(slot!==undefined&&slot<limit)result.set(index,slot);}
 const used=new Set(result.values());
 for(const index of wanted)if(!result.has(index)){let slot=0;while(used.has(slot))slot++;result.set(index,slot);used.add(slot);}
 return result;
}
