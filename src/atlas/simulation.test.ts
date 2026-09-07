import { describe,it,expect,beforeEach } from 'vitest';
import {prepareRoute,sampleRoute,createResidents,stepResident,speciesAnatomy} from './simulation';
import {advanceClock,worldClock,useAtlas} from './store';
import {buildPlace,disposePlace} from './models';
import {pointBlocked,type Obstacle} from './navigation';
import {places} from './data';
import {URITHIRU_TIERS,URITHIRU_FLOORS_PER_TIER,URITHIRU_HEIGHT} from './models/urithiru';

beforeEach(()=>{Object.assign(worldClock,{time:0,delta:0,storm:0,stormTime:0,stormActive:false});});
describe('one clock for all living layers',()=>{
 it('freezes both motion and storm transitions when paused',()=>{advanceClock(.1,true,2,true);const before={...worldClock};advanceClock(10,false,4,true);expect(worldClock.time).toBe(before.time);expect(worldClock.storm).toBe(before.storm);expect(worldClock.stormTime).toBe(before.stormTime);expect(worldClock.delta).toBe(0);});
 it('applies the chosen speed and bounds tab-resume jumps',()=>{advanceClock(.05,true,4,false);expect(worldClock.time).toBeCloseTo(.2);advanceClock(200,true,1,false);expect(worldClock.time).toBeCloseTo(.3);});
});
describe('movement follows the rendered route',()=>{
 it('interpolates slopes and clamps at endpoints',()=>{const route=prepareRoute({id:'ramp',points:[[0,0,0],[0,3,4],[4,3,4]],activity:'walking'});expect(sampleRoute(route,2.5).position).toEqual([0,1.5,2]);expect(sampleRoute(route,100).position).toEqual([4,3,4]);});
 it('walks back to an endpoint to shelter without teleporting',()=>{const model=buildPlace('kharbranth');const person=createResidents(model)[0];person.distance=person.route.length*.3;const start=person.distance;stepResident(person,.1,1);expect(person.mode).toBe('sheltering');expect(person.distance).toBeLessThan(start);expect(start-person.distance).toBeLessThan(.3);const frozen=person.distance;stepResident(person,0,1);expect(person.distance).toBe(frozen);disposePlace(model);});
});
describe('reference and navigation constraints',()=>{
 it('retains the published Urithiru tier and floor count',()=>{expect(URITHIRU_TIERS).toBe(10);expect(URITHIRU_FLOORS_PER_TIER).toBe(18);expect(URITHIRU_HEIGHT).toBe(823);});
 it('retains the attested creature body plans',()=>{expect(speciesAnatomy.chull.legs).toBe(6);expect(speciesAnatomy.axehound.legs).toBe(6);expect(speciesAnatomy.chasmfiend).toEqual({legs:18,foreclaws:4});});
 for(const place of places)it(`${place.name} produces a complete model with safe movement routes`,()=>{
   const model=buildPlace(place.id);expect(model.group.children.length).toBeGreaterThan(0);const obstacles=model.group.userData.obstacles as Obstacle[];expect(model.routes.length).toBeGreaterThan(0);
   for(const route of model.routes){const prepared=prepareRoute(route);expect(prepared.length).toBeGreaterThan(0);for(const point of route.points)expect(pointBlocked(point,obstacles??[],.7),`${route.id} intersects a building`).toBe(false);}
   model.group.traverse(o=>{if('geometry'in o){const positions=(o as import('three').Mesh).geometry.attributes.position;for(let i=0;i<positions.count;i+=Math.max(1,Math.floor(positions.count/100)))expect(Number.isFinite(positions.getY(i))).toBe(true);}});
   if(place.id==='shattered-plains'){expect(model.group.userData.plateauCoverage).toBeGreaterThan(.65);expect(model.routes.some(r=>r.id.startsWith('permanent-bridge'))).toBe(true);}
   if(place.id==='akinah')expect(createResidents(model)).toHaveLength(0);
   disposePlace(model);
 });
});
it('switches between atlas and metric place cameras predictably',()=>{useAtlas.getState().travel('kholinar');expect(useAtlas.getState().view).toBe('place');useAtlas.getState().setClose(true);expect(useAtlas.getState().closeView).toBe(true);useAtlas.getState().showAtlas();expect(useAtlas.getState().closeView).toBe(false);expect(useAtlas.getState().view).toBe('atlas');});

it('keeps pedestrians off an avenue reserved for cargo chulls',()=>{const route={id:'avenue',points:[[0,0,0],[0,0,100]],activity:'Walking',species:'human'} as const;const model={id:'azimir',routes:[route,{...route,id:'cargo',species:'chull'},{...route,id:'sidewalk',points:[[8,0,0],[8,0,100]]}]} as unknown as import('./models/kit').PlaceModel;const residents=createResidents(model);expect(residents.length).toBeGreaterThan(0);expect(residents.every(p=>p.route.id==='sidewalk')).toBe(true);});
