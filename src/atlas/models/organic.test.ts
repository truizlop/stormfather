import {expect,it} from 'vitest';
import * as T from 'three';
import {loft,carapace,tube} from './organic';
import {buildCreature,animateCreature} from './creatures';
import {speciesAnatomy} from '../simulation';
import {disposePlace} from './dispose';
import type {PlaceModel} from './kit';
it('keeps organic geometry finite and shell upper surfaces facing light',()=>{
 for(const g of [loft([[0,.1,.1],[.3,.2,.1],[.6,.1,.08]]),tube([[0,0,0],[1,1,0],[1,2,1]],[.1,.2,.01]),carapace(1,1,2)]){
  for(const name of ['position','normal'])expect(Array.from(g.getAttribute(name).array).every(Number.isFinite)).toBe(true);
  expect(g.index!.count).toBeGreaterThan(100);g.dispose();
 }
 const shell=carapace(1,1,2),p=shell.getAttribute('position'),n=shell.getAttribute('normal');
 const highest=Array.from({length:p.count},(_,i)=>i).sort((a,b)=>p.getY(b)-p.getY(a))[0];
 expect(n.getY(highest)).toBeGreaterThan(.8);shell.dispose();
});
it.each(Object.keys(speciesAnatomy) as (keyof typeof speciesAnatomy)[])('keeps %s anatomy and animated transforms within a usable mesh budget',species=>{
 const rig=buildCreature(species);expect(rig.legs).toHaveLength(speciesAnatomy[species].legs);
 let triangles=0;rig.group.traverse(o=>{if(o instanceof T.Mesh)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});
 expect(triangles).toBeLessThan(180000);
 for(let time=0;time<10;time+=.7){animateCreature(rig,species,time,1,.5);rig.group.updateMatrixWorld(true);rig.group.traverse(o=>expect(o.matrixWorld.elements.every(Number.isFinite)).toBe(true));}
 disposePlace({group:rig.group} as PlaceModel);
});
