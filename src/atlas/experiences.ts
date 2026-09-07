import type {PlaceId} from './data';
import type {V3} from './models/kit';
export const orders = [
  {id:'windrunner',name:'Windrunner',color:'#478fd4',cloth:'#28548c',surges:'Adhesion · Gravitation',action:'A Basic Lashing turns the direction of a fall. Watch the scout arc into the air.',effect:'flight'},
  {id:'skybreaker',name:'Skybreaker',color:'#aebcd0',cloth:'#454e60',surges:'Gravitation · Division',action:'A controlled vertical Lashing lifts the scout, who levels out and descends.',effect:'ascent'},
  {id:'dustbringer',name:'Dustbringer',color:'#dc6049',cloth:'#843c36',surges:'Division · Abrasion',action:'A touch breaks down a practice stone. The release stays inside the marked work area.',effect:'division'},
  {id:'edgedancer',name:'Edgedancer',color:'#d8e8dc',cloth:'#aebbb0',surges:'Abrasion · Progression',action:'Reduced friction lets the runner glide smoothly around the court.',effect:'glide'},
  {id:'truthwatcher',name:'Truthwatcher',color:'#78bb7d',cloth:'#366e53',surges:'Progression · Illumination',action:'Progression encourages a small plant to grow. New stems unfold under the Radiant’s hand.',effect:'growth'},
  {id:'lightweaver',name:'Lightweaver',color:'#db7190',cloth:'#853b51',surges:'Illumination · Transformation',action:'Light and sound form an illusion. Three translucent doubles appear around the artist.',effect:'illusion'},
  {id:'elsecaller',name:'Elsecaller',color:'#82a9dd',cloth:'#344d79',surges:'Transformation · Transportation',action:'Soulcasting changes a stone into smoke. This demonstration stays in the Physical Realm.',effect:'soulcast'},
  {id:'willshaper',name:'Willshaper',color:'#b790d6',cloth:'#764681',surges:'Transportation · Cohesion',action:'Cohesion makes stone workable. A low arch rises from the practice stone.',effect:'shape'},
  {id:'stoneward',name:'Stoneward',color:'#d6a567',cloth:'#8c6239',surges:'Cohesion · Tension',action:'Stone yields to the builder’s touch, rising into a stair for others to climb.',effect:'stairs'},
  {id:'bondsmith',name:'Bondsmith',color:'#e6cf83',cloth:'#8d8057',surges:'Tension · Adhesion',action:'A simple Adhesion exercise binds two loose stones. Only one representative is present.',effect:'adhesion'},
] as const;
export type OrderId=typeof orders[number]['id'];
export const orderById=new Map(orders.map(o=>[o.id,o]));
export type ExperienceId='bridge-run'|'greatshell-hunt'|'listener-village'|'radiant-arts';
export interface Experience {id:ExperienceId;name:string;place:PlaceId;eyebrow:string;description:string;duration:number;eye:V3;target:V3;}
export const experiences:Experience[]=[
  {id:'bridge-run',name:'The plateau run',place:'shattered-plains',eyebrow:'40 runners · one crossing',description:'Carry, brace, lower, cross. An unnamed crew demonstrates a bridge run on a western practice crossing.',duration:64,eye:[-508,21,323],target:[-477,3,298]},
  {id:'greatshell-hunt',name:'A greatshell hunt',place:'shattered-plains',eyebrow:'Hunters & an eighteen-limbed giant',description:'A hunting party sets a lure and braces as a chasmfiend approaches. The loop ends with withdrawal, without a kill or story outcome.',duration:56,eye:[-245,29,570],target:[-245,3,510]},
  {id:'listener-village',name:'Songs of the listeners',place:'shattered-plains',eyebrow:'Parshendi · work, watch & rhythm',description:'Workform neighbors tend a crem-and-shell settlement. Warform pairs keep watch while others gather in a communal rhythm.',duration:60,eye:[-500,19,-288],target:[-466,3,-330]},
  {id:'radiant-arts',name:'The ten orders',place:'urithiru',eyebrow:'A living guide to Surgebinding',description:'Explore ten anonymous representatives in an illustrative training court. Each order demonstrates one of its powers.',duration:18,eye:[-876,13,-292],target:[-843,2,-321]},
];
export const experienceById=new Map(experiences.map(e=>[e.id,e]));
export const RADIANT_COURT:V3=[-845,.08,-320];
export const phaseAt=(time:number,duration:number)=>((time%duration)+duration)%duration;
export const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function bridgeState(time:number){
  const t=phaseAt(time,64);
  const phase=t<18?'Carry':t<24?'Brace':t<30?'Lower':t<52?'Cross':'Regroup';
  const x=t<18?-500+t/18*20.5:t<24?-479.5:t<30?-479.5+smooth((t-24)/6)*8.5:-471;
  return {phase,t,x,height:t<24?1.9:t<30?1.9-smooth((t-24)/6)*1.85:.05,ready:t>=30};
}
export function bridgeRunnerPose(time:number,index:number){
  const state=bridgeState(time),row=Math.floor(index/5),col=index%5;
  const formationX=-3.5+row,formationZ=(col-2)*.84;
  let x=state.x+formationX,z=298+formationZ,y=.1,yaw=Math.PI/2,run=state.t<18;
  // The bridge is fully supported before anyone steps over the 4.4 m gap.
  const queueRow=Math.floor(index/2),queueZ=(index%2?1:-1)*.46,queueX=-478-queueRow*.95;
  if(state.t>=24&&state.t<30){const rearrange=smooth((state.t-24)/6);x=(-479.5+formationX)*(1-rearrange)+queueX*rearrange;z=298+formationZ*(1-rearrange)+queueZ*rearrange;}
  if(state.t>=30){const p=smooth((state.t-30-queueRow*.12)/18);x=queueX+37*p;z=298+queueZ;y=state.ready&&x>-475.6&&x< -466.4?.74:.1;run=p>0&&p<1;}
  if(state.t>=52){yaw=Math.PI;run=false;}
  return {position:[x,y,z] as V3,yaw,run,carry:state.t<24};
}
export function huntState(time:number){
  const t=phaseAt(time,56),phase=t<10?'Set the lure':t<25?'Approach':t<34?'Brace':t<43?'Deflect':'Withdraw';
  const x=t<10?-285:t<25?-285+smooth((t-10)/15)*46:t<43?-239:-239-smooth((t-43)/13)*46;
  return {t,phase,x,rear:t>=25&&t<43?Math.sin(Math.PI*(t-25)/18)*.14:0,retreat:t>=43};
}
export function experiencePhase(id:ExperienceId,time:number){if(id==='bridge-run')return bridgeState(time).phase;if(id==='greatshell-hunt')return huntState(time).phase;if(id==='listener-village'){const t=phaseAt(time,60);return t<24?'Work & watch':t<38?'Gathering':'Communal rhythm';}return 'Surgebinding practice';}
export interface Discovery {id:string;place:PlaceId;name:string;hint:string;description:string;position:V3;kind:'stew'|'pancakes'|'stick'|'flute'|'stones'|'boots'|'clock'|'shoe'|'chouta'|'spanreed';}
export const discoveries:Discovery[]=[
  {id:'stones',place:'hearthstone',name:'A pocket full of wonders',hint:'A little collection beside Hearthstone’s market lane.',description:'Smooth stones, carefully arranged by color. Someone saw a whole world in these small treasures.',position:[-141,.3,181],kind:'stones'},
  {id:'boots',place:'revolar',name:'Boots with a story',hint:'Look near the market in Revolar’s old center.',description:'A fine pair of very well-traveled boots. Their owner seems to have stepped away. Best leave them here.',position:[3,.3,47],kind:'boots'},
  {id:'clock',place:'kasitor',name:'Seven forty-six',hint:'An unusual clock overlooks Kasitor’s four golden pedestals.',description:'A waterfront clock marks 7:46. Around here, that particular minute deserves a good view of the bay.',position:[9,2.3,-106],kind:'clock'},
  {id:'shoe',place:'rall-elorim',name:'A trail of small kindnesses',hint:'Follow the reservoir walk to a shoemaker’s little stand.',description:'A carefully mended shoe, with a little star stamped into its sole. A comfortable step can make a long road easier.',position:[-135,3.2,282],kind:'shoe'},
  {id:'chouta',place:'kholinar',name:'The correct amount of sauce',hint:'A street-food tray waits by Kholinar’s south approach.',description:'A flatbread wrap holds fried filling and far too much sauce. Someone insists this is exactly the correct amount.',position:[0,.3,535],kind:'chouta'},
  {id:'spanreed',place:'azimir',name:'Someone is writing back',hint:'Look for a clerk’s desk on an Azimir boulevard.',description:'Two red-tipped pens rest on a ruled sheet. One begins to move, its partner tracing the same patient strokes.',position:[3,.3,125],kind:'spanreed'},
  {id:'stew',place:'shattered-plains',name:'Something worth coming back for',hint:'A warm pot near the bridge crew’s camp.',description:'A shared stew pot. Even a long plateau run should end with a meal among friends.',position:[-490,.3,282],kind:'stew'},
  {id:'pancakes',place:'yeddaw',name:'One more pancake',hint:'Follow the lanterns into Yeddaw’s outer trench.',description:'A stall stacked with Sun Day cakes, the local specialty of the Weeping. Save room for another.',position:[394,.8,0],kind:'pancakes'},
  {id:'stick',place:'purelake',name:'A very determined piece of wood',hint:'Something ordinary rests on the fishing walkway.',description:'It is a stick. It appears perfectly content with this arrangement.',position:[10,1.3,-65],kind:'stick'},
  {id:'flute',place:'urithiru',name:'A story waiting to happen',hint:'Look beside the Radiant practice court.',description:'An unclaimed flute and a place to sit. The storyteller may be along in a moment.',position:[-834,.12,-329],kind:'flute'},
];
