import {describe,it,expect,beforeEach} from 'vitest';
import * as T from 'three';
import {orders,experiences,bridgeState,bridgeRunnerPose,huntState,discoveries} from './experiences';
import {useAtlas,worldClock,advanceClock} from './store';
import {buildPerson,animatePerson} from './models/person';
import {buildBridge,listenerHomes} from './models/activitySets';
import {buildPlace,disposePlace} from './models';
import type {PlaceModel} from './models/kit';
import {cityPlacements} from './integration';
import {places,placeById} from './data';
import {rosharGazetteer} from '../world/gazetteer/catalog';
const clean=(group:T.Group)=>disposePlace({group} as PlaceModel);
beforeEach(()=>useAtlas.setState({sceneId:null,discovered:[],scenesOpen:false}));
describe('spoiler-light activities',()=>{
 it('keeps runners on land until the bridge is fully down and supported',()=>{
  for(let t=0;t<64;t+=.1){const bridge=bridgeState(t);for(let i=0;i<40;i++){const p=bridgeRunnerPose(t,i);const inGap=p.position[0]>-473.2&&p.position[0]<-468.8;if(inGap){expect(bridge.ready).toBe(true);expect(bridge.height).toBeCloseTo(.05);expect(p.position[1]).toBeGreaterThan(.6);expect(Math.abs(p.position[2]-298)).toBeLessThan(1.22);}if(!bridge.ready)expect(inGap).toBe(false);}}
  const bridge=buildBridge();expect(bridge.userData.crew).toBe(40);expect(bridge.userData.length).toBeCloseTo(9.14);expect(bridge.userData.deckWidth).toBeCloseTo(2.44);clean(bridge);
 });
 it('has a complete bridge sequence and a non-lethal hunt with withdrawal',()=>{
  expect([0,20,27,37,55].map(t=>bridgeState(t).phase)).toEqual(['Carry','Brace','Lower','Cross','Regroup']);
  expect([0,15,29,38,50].map(t=>huntState(t).phase)).toEqual(['Set the lure','Approach','Brace','Deflect','Withdraw']);
  for(let t=0;t<56;t+=.2){const h=huntState(t);expect(h.x).toBeGreaterThanOrEqual(-285);expect(h.x).toBeLessThanOrEqual(-239);expect(h.x+16).toBeLessThan(-216);}
 });
 it('uses the shared paused clock and resets each requested scene',()=>{
  const saved={...worldClock};try{worldClock.time=120;useAtlas.getState().startScene('bridge-run');expect(useAtlas.getState().sceneStartedAt).toBe(120);const before=bridgeRunnerPose(0,0);advanceClock(.1,false,4,false);expect(bridgeRunnerPose(worldClock.time-120,0)).toEqual(before);advanceClock(.1,true,4,false);expect(worldClock.time).toBeCloseTo(120.4);useAtlas.getState().startScene('greatshell-hunt');expect(useAtlas.getState().sceneStartedAt).toBeCloseTo(120.4);expect(useAtlas.getState().placeId).toBe('shattered-plains');}finally{Object.assign(worldClock,saved);}
 });
 it('offers ten orders, two Surges each, and exactly one Bondsmith representative',()=>{
  expect(orders).toHaveLength(10);expect(new Set(orders.map(o=>o.id)).size).toBe(10);expect(orders.filter(o=>o.id==='bondsmith')).toHaveLength(1);for(const o of orders)expect(o.surges.split(' · ')).toHaveLength(2);
  expect(new Set(orders.flatMap(o=>o.surges.split(' · '))).size).toBe(10);
  useAtlas.getState().startScene('radiant-arts');for(const o of orders){useAtlas.getState().selectOrder(o.id);expect(useAtlas.getState().orderId).toBe(o.id);expect(useAtlas.getState().cameraCommand.type).toBe('scene');}
 });
 it('restores needed layers when starting a scene and leaves the scene on normal travel',()=>{
  useAtlas.setState({people:false,creatures:false,radiants:false});useAtlas.getState().startScene('listener-village');expect(useAtlas.getState()).toMatchObject({people:true,creatures:true,radiants:true});useAtlas.getState().travel('yeddaw');expect(useAtlas.getState().sceneId).toBeNull();
 });
});
describe('people and additional destinations',()=>{
 it.each(['resident','bridger','hunter','radiant','workform','warform'] as const)('has articulated anatomy and finite human-scale poses for %s',kind=>{
  const rig=buildPerson(0,kind);expect(rig.arms).toHaveLength(2);expect(rig.legs).toHaveLength(2);expect(rig.forearms).toHaveLength(2);expect(rig.knees).toHaveLength(2);for(let t=0;t<12;t+=.5){animatePerson(rig,t,1,kind==='bridger');rig.group.updateMatrixWorld(true);rig.group.traverse(o=>expect(o.matrixWorld.elements.every(Number.isFinite)).toBe(true));}const size=new T.Box3().setFromObject(rig.group).getSize(new T.Vector3());expect(size.y).toBeGreaterThan(1.5);expect(size.y).toBeLessThan(3.5);clean(rig.group);
 });
 it('has two new city anchors copied from the registered gazetteer',()=>{
  expect(places).toHaveLength(16);for(const id of ['yeddaw','sesemalex-dar'] as const){expect(placeById.get(id)!.anchor).toEqual(rosharGazetteer.find(p=>p.id===id)!.world);const model=buildPlace(id);expect(model.routes.length).toBeGreaterThan(2);const bounds=new T.Box3().setFromObject(model.group);expect(bounds.min.y).toBeLessThan(0);expect(bounds.max.y).toBeGreaterThan(30);disposePlace(model);}
 });
 it('keeps Yeddaw’s enlarged terrain clear of neighboring Azimir',()=>{const y=cityPlacements.find(p=>p.id==='yeddaw')!,a=cityPlacements.find(p=>p.id==='azimir')!;const distance=Math.hypot(y.origin[0]-a.origin[0],y.origin[2]-a.origin[2]);expect((y.radius*y.scale+a.radius*a.scale)*1.65).toBeLessThan(distance);});
 it('has a sheltered village, valid scene hosts and safe discovery anchors',()=>{expect(listenerHomes).toHaveLength(12);for(const e of experiences)expect(placeById.has(e.place)).toBe(true);for(const d of discoveries){expect(placeById.has(d.place)).toBe(true);expect(d.position.every(Number.isFinite)).toBe(true);}});
 it('persists unique finds and does not mark a hint visit as a discovery',()=>{
  useAtlas.getState().seekDiscovery('stew');expect(useAtlas.getState().discovered).toEqual([]);useAtlas.getState().discover('stew');useAtlas.getState().discover('stew');expect(useAtlas.getState().discovered).toEqual(['stew']);expect(JSON.parse(localStorage.getItem('stormfather-discoveries-v1')!)).toEqual(['stew']);useAtlas.getState().discover('invalid');expect(useAtlas.getState().discovered).toEqual(['stew']);
 });
});
