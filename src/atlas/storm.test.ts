import {describe,it,expect} from 'vitest';
import {stormPosition,lightningPulse} from './storm';
import {useAtlas,worldClock,advanceClock} from './store';
import {places} from './data';
import {cityPlacements} from './integration';
import {buildPlace,disposePlace} from './models';
import {discoveries} from './experiences';
import {rosharGazetteer} from '../world/gazetteer/catalog';
describe('continental highstorm',()=>{
 it('travels east to west and loses strength beyond the western mountains',()=>{let previous=65;for(let t=0;t<180;t++){const s=stormPosition(t);expect(s.x).toBeLessThan(previous);expect(s.strength).toBeGreaterThan(0);previous=s.x;}expect(stormPosition(170).strength).toBeLessThan(stormPosition(30).strength);});
 it('freezes its location and lightning on the shared paused clock',()=>{const saved={...worldClock};try{advanceClock(.1,true,1,true);const position=stormPosition(worldClock.stormTime),pulse=lightningPulse(worldClock.stormTime);advanceClock(1,false,4,true);expect(stormPosition(worldClock.stormTime)).toEqual(position);expect(lightningPulse(worldClock.stormTime)).toBe(pulse);expect(lightningPulse(1.6,true)).toBe(0);}finally{Object.assign(worldClock,saved);}});
 it('clears the wall when weather is explicitly switched off while paused',()=>{const saved={...worldClock};try{advanceClock(.1,false,1,true);expect(worldClock.storm).toBe(1);advanceClock(.1,false,1,false);expect(worldClock.storm).toBe(0);}finally{Object.assign(worldClock,saved);}});
 it('releases cinematic following when traveling, inspecting or clearing weather',()=>{const s=useAtlas.getState();s.followStorm();expect(useAtlas.getState()).toMatchObject({stormFollowing:true,weather:'highstorm',sceneId:null,view:'atlas'});s.seekDiscovery('clock');expect(useAtlas.getState().stormFollowing).toBe(false);s.followStorm();s.travel('hearthstone');expect(useAtlas.getState().stormFollowing).toBe(false);s.followStorm();s.set({weather:'clear'});expect(useAtlas.getState().stormFollowing).toBe(false);});
});
describe('expanded atlas',()=>{
 it.each(['hearthstone','revolar','kasitor','rall-elorim'] as const)('registers %s on its existing map anchor with walkable routes',id=>{expect(places.find(p=>p.id===id)!.anchor).toEqual(rosharGazetteer.find(p=>p.id===id)!.world);const model=buildPlace(id);expect(model.routes.filter(r=>r.species==='human').length).toBeGreaterThan(2);expect(model.close.eye.every(Number.isFinite)).toBe(true);expect(model.group.userData.lampSites.length).toBeGreaterThan(0);disposePlace(model);});
 it('keeps all enlarged city terrain footprints from overlapping',()=>{for(let i=0;i<cityPlacements.length;i++)for(let j=i+1;j<cityPlacements.length;j++){const a=cityPlacements[i],b=cityPlacements[j],distance=Math.hypot(a.origin[0]-b.origin[0],a.origin[2]-b.origin[2]);expect((a.radius*a.scale+b.radius*b.scale)*1.65,`${a.id}/${b.id}`).toBeLessThan(distance);}});
 it('offers ten distinct, inspectable curiosities in ten destinations',()=>{expect(discoveries).toHaveLength(10);expect(new Set(discoveries.map(d=>d.place)).size).toBe(10);expect(new Set(discoveries.map(d=>d.id)).size).toBe(10);});
});
