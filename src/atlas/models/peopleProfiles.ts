import type { PlaceId } from '../data';

export type PeopleCulture = 'alethi'|'azish'|'shin'|'veden'|'thaylen'|'purelaker'|'reshi'|'iriali'|'aimian'|'singer';
export type Garment = 'coat'|'robe'|'tunic'|'wrap';
export interface PeopleProfile {
  name:string; skin:readonly string[]; hair:readonly string[]; cloth:readonly string[];
  trim:string; garment:Garment; hairStyle:'waves'|'braids'|'short'|'long'; barefoot?:boolean;
}
export const peopleProfiles:Record<PeopleCulture,PeopleProfile> = {
  alethi:{name:'Alethi',skin:['#a16b47','#835236','#b88761','#704630'],hair:['#201a18','#30231d'],cloth:['#344c66','#566251','#5f4439'],trim:'#bc995f',garment:'coat',hairStyle:'waves'},
  azish:{name:'Azish',skin:['#68402c','#4f2d20','#81573d'],hair:['#221b18'],cloth:['#674364','#3d6263','#765235'],trim:'#d6af6c',garment:'robe',hairStyle:'braids'},
  shin:{name:'Shin',skin:['#d2a484','#c39172','#deb89c'],hair:['#654933','#867053','#352a22'],cloth:['#a79b76','#6d7763','#857462'],trim:'#bfb293',garment:'tunic',hairStyle:'short'},
  veden:{name:'Veden',skin:['#b57b54','#926044','#c48b62'],hair:['#72382a','#40251d','#201b19'],cloth:['#733e40','#554855','#765444'],trim:'#c19c69',garment:'coat',hairStyle:'long'},
  thaylen:{name:'Thaylen',skin:['#b1835c','#8f6343','#c69870'],hair:['#30271f','#4f4034'],cloth:['#345d61','#3f546a','#695b49'],trim:'#b99c6e',garment:'coat',hairStyle:'short'},
  purelaker:{name:'Purelaker',skin:['#9f714b','#795034','#b08459'],hair:['#2d241c','#554132'],cloth:['#677d76','#8a795f','#596e6b'],trim:'#baa477',garment:'wrap',hairStyle:'long',barefoot:true},
  reshi:{name:'Reshi',skin:['#875435','#68422c','#a47049'],hair:['#231c18'],cloth:['#496349','#797144','#4a7270'],trim:'#d1b98c',garment:'wrap',hairStyle:'braids',barefoot:true},
  iriali:{name:'Iriali',skin:['#b89456','#caac70','#aa8248'],hair:['#d8bc73','#e5cd8b'],cloth:['#49606f','#705860','#597367'],trim:'#d6b670',garment:'robe',hairStyle:'long'},
  aimian:{name:'Siah Aimian',skin:['#7cabc0','#7197ae','#96b6c4'],hair:['#182e37','#274454'],cloth:['#34525a','#536d70'],trim:'#b2c4bd',garment:'robe',hairStyle:'long'},
  singer:{name:'Singer',skin:['#a46754','#b17b65','#8b594b'],hair:['#4c221f','#72332b'],cloth:['#74614c','#83694d','#665841'],trim:'#b4a184',garment:'wrap',hairStyle:'braids',barefoot:true},
};
const cultureByPlace:Record<PlaceId,PeopleCulture> = {
 'kholinar':'alethi','hearthstone':'alethi','urithiru':'alethi','shattered-plains':'alethi',
 'kharbranth':'veden','vedenar':'veden','thaylen-city':'thaylen','azimir':'azish','yeddaw':'azish','sesemalex-dar':'azish',
 'shinovar':'shin','purelake':'purelaker','kasitor':'iriali','rall-elorim':'iriali','akinah':'aimian','revolar':'alethi',
};
export function peopleCultureForPlace(place:PlaceId):PeopleCulture {return cultureByPlace[place];}
export interface PersonAppearance {culture:PeopleCulture;sex:'male'|'female';variant:number;skin:string;hair:string;cloth:string;}
export function personAppearance(culture:PeopleCulture,index=0,cloth?:string):PersonAppearance {
 const p=peopleProfiles[culture],i=Math.abs(Math.floor(index));
 return {culture,sex:i%2?'female':'male',variant:i,skin:p.skin[i%p.skin.length],hair:p.hair[Math.floor(i/2)%p.hair.length],cloth:cloth??p.cloth[i%p.cloth.length]};
}
