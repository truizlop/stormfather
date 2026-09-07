import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {cityPlacements,toAtlas,toLocal,nearestCity,activeCityForCamera,integratedGroundHeight,createCityTerrain} from './integration';
import {places} from './data';
import {createWindrunner,windrunnerPose,WINDRUNNER_COUNT} from './radiants';
import {worldClock,advanceClock} from './store';
import {disposePlace} from './models';
import {ModelBuilder,type PlaceModel} from './models/kit';

describe('one continuous atlas',()=>{
  it('preserves every registered anchor and metric camera/actor relationship',()=>{
    for(const p of cityPlacements){
      const source=places.find(s=>s.id===p.id)!;
      expect([p.origin[0],p.origin[2]]).toEqual([...source.anchor]);
      const actor=new T.Vector3(123,1.8,-45),world=toAtlas(p,actor);
      expect(toLocal(p,world).distanceTo(actor)).toBeLessThan(1e-10);
      expect(toAtlas(p,[123,3.8,-45]).distanceTo(world)).toBeCloseTo(p.scale*2,10);
      expect(nearestCity(new T.Vector3(...p.origin),.01)?.id).toBe(p.id);
    }
  });
  it('keeps the focused city alive from a wide mobile camera',()=>{const p=cityPlacements.find(p=>p.id==='urithiru')!;const eye=toAtlas(p,[-3400,2300,3300]);expect(activeCityForCamera(eye,'urithiru')).toBe('urithiru');expect(activeCityForCamera(new T.Vector3(0,400,0),'urithiru')).toBeNull();});
  it('joins finite regional terrain to the continent and provides ground clearance',()=>{
    for(const p of cityPlacements){
      const g=createCityTerrain(p),positions=g.getAttribute('position'),normals=g.getAttribute('normal');
      expect(Array.from({length:normals.count},(_,i)=>normals.getY(i)).reduce((a,b)=>a+b,0)/normals.count).toBeGreaterThan(.1);
      for(let i=0;i<positions.count;i+=17){
        expect(Number.isFinite(positions.getY(i))).toBe(true);
        const world=toAtlas(p,[positions.getX(i),positions.getY(i),positions.getZ(i)]);
        expect(Number.isFinite(integratedGroundHeight(world.x,world.z))).toBe(true);
      }
      g.dispose();
    }
    expect(nearestCity(new T.Vector3(900,0,900))).toBeUndefined();
  },30_000); // Builds and checks all sixteen terrain meshes, including their coastal joins.
});
it('mountain surfaces have outward normals for reliable shadows',()=>{const b=new ModelBuilder();b.rock(0,0,0,100,180,100);const group=b.finish('ridge');const n=(group.children[0] as T.Mesh).geometry.getAttribute('normal');expect(Array.from({length:n.count},(_,i)=>n.getY(i)).reduce((a,b)=>a+b,0)/n.count).toBeGreaterThan(.1);disposePlace({group} as PlaceModel);});

describe('Urithiru Radiants',()=>{
  it('patrols remain in the open western airspace at human scale',()=>{
    for(let i=0;i<WINDRUNNER_COUNT;i++)for(let time=0;time<210;time+=7){const pose=windrunnerPose(time,i);expect(pose.position.x).toBeLessThan(-700);expect(pose.position.y).toBeGreaterThan(70);expect(Math.abs(pose.position.z)).toBeLessThanOrEqual(700);}
    const rig=createWindrunner(0);const size=new T.Box3().setFromObject(rig.body).getSize(new T.Vector3());expect(size.y).toBeLessThan(2.5);expect(size.y).toBeGreaterThan(1.8);expect(rig.limbs).toHaveLength(6);disposePlace({group:rig.body} as PlaceModel);
  });
  it('freezes flight with the shared clock and resumes at the selected speed',()=>{
    const before={...worldClock};try{worldClock.time=10;const pose=windrunnerPose(worldClock.time,0);advanceClock(.1,false,4,false);expect(windrunnerPose(worldClock.time,0).position.toArray()).toEqual(pose.position.toArray());advanceClock(.1,true,4,false);expect(worldClock.time).toBeCloseTo(10.4);expect(windrunnerPose(worldClock.time,0).position.distanceTo(pose.position)).toBeGreaterThan(0);}finally{Object.assign(worldClock,before);}
  });
});
