/** Display-time choreography, not a meteorological scale or a book chronology. */
export const STORM_DURATION=180;
export function stormPosition(time:number){const progress=((time%STORM_DURATION)+STORM_DURATION)%STORM_DURATION/STORM_DURATION;return {progress,x:64-progress*138,strength:1-.72*Math.max(0,Math.min(1,(-25-(64-progress*138))/40))};}
export function lightningPulse(time:number,reduced=false){if(reduced)return 0;const t=((time%8)+8)%8;return Math.exp(-Math.pow((t-1.6)/.085,2))*.9+Math.exp(-Math.pow((t-1.84)/.065,2))*.55;}
export function stormRegion(x:number){return x>40?'Ocean of Origins':x>14?'Eastern Roshar':x> -8?'Central kingdoms':x> -35?'Western Roshar':x> -58?'The Misted Mountains':'Endless Ocean';}

/** Keep local navigation legible inside a continent-sized cloud volume. */
export function stormOpacityLimit(camera:{x:number;y:number;z:number},viewDistance:number){
 const smooth=(x:number,a:number,b:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 const inside=Math.min(camera.x+11,28-camera.x,camera.y,23-camera.y,camera.z+54,54-camera.z);
 const clearView=Math.max(1-smooth(viewDistance,20,70),smooth(inside,-4,2));
 return .98-.5*clearView;
}
