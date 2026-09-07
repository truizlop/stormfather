import {expect,it} from 'vitest';
import {peopleCultureForPlace,personAppearance,peopleProfiles,type PeopleCulture} from './peopleProfiles';
import {createResidents} from '../simulation';
import type {PlaceModel} from './kit';
import {assignResidentSlots} from '../residentDetail';

it.each([['kasitor','iriali'],['rall-elorim','iriali'],['thaylen-city','thaylen'],['azimir','azish'],['shinovar','shin'],['purelake','purelaker'],['vedenar','veden']] as const)('keeps %s identities consistent between the crowd and detailed models', (place,culture)=>{
 const model={id:place,routes:[{id:'street',points:[[0,0,0],[0,0,100]],activity:'Walking',species:'human'}]} as PlaceModel;
 const crowd=createResidents(model);
 expect(peopleCultureForPlace(place)).toBe(culture);
 expect(crowd.length).toBeGreaterThan(1);
 for(const p of crowd){expect(p.appearance.culture).toBe(culture);expect(p.skin).toBe(p.appearance.skin);expect(p.cloth).toBe(p.appearance.cloth);}
 expect(new Set(crowd.map(p=>p.appearance.sex)).size).toBe(2);
 expect(createResidents(model).map(p=>p.appearance)).toEqual(crowd.map(p=>p.appearance));
});
it('retains a resident’s model slot when distance ordering changes',()=>{
 const current=new Map([[10,0],[11,1],[12,2],[13,3]]);
 expect([...assignResidentSlots(current,[12,11,10,14],4)]).toEqual([[12,2],[11,1],[10,0],[14,3]]);
 expect(assignResidentSlots(current,[],4).size).toBe(0);
});
it('covers every people group with reproducible variants and distinct dress',()=>{
 for(const culture of Object.keys(peopleProfiles) as PeopleCulture[]){
  expect(personAppearance(culture,0).sex).toBe('male');expect(personAppearance(culture,1).sex).toBe('female');
  expect(personAppearance(culture,7)).toEqual(personAppearance(culture,7));
 }
 expect(peopleProfiles.azish.garment).toBe('robe');expect(peopleProfiles.purelaker.barefoot).toBe(true);
 expect(personAppearance('iriali').hair).not.toBe(personAppearance('alethi').hair);
});
