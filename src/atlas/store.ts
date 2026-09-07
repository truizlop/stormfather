import { create } from 'zustand';
import {experienceById,discoveries,type ExperienceId,type OrderId} from './experiences';
import type { PlaceId } from './data';
export type ViewMode = 'atlas' | 'place';
export type WeatherMode = 'clear' | 'highstorm';
type CameraAction='home'|'in'|'out'|'north'|'wildlife'|'radiants'|'scene'|'discovery'|'storm';
function readDiscoveries():string[]{try{const saved=JSON.parse(localStorage.getItem('stormfather-discoveries-v1')??'[]');return Array.isArray(saved)?saved.filter(id=>discoveries.some(d=>d.id===id)):[];}catch{return [];}}
interface AtlasV2State {
  stormFollowing:boolean;followStorm:()=>void;
  sceneClose:boolean;sceneDetail:()=>void;scenesOpen:boolean;sceneId:ExperienceId|null;sceneStartedAt:number;orderId:OrderId;discovered:string[];discoveryId:string|null;
  startScene:(id:ExperienceId)=>void;selectOrder:(id:OrderId)=>void;endScene:()=>void;seekDiscovery:(id:string)=>void;discover:(id:string)=>void;
  view: ViewMode; placeId: PlaceId; closeView: boolean; playing: boolean; speed: number;
  daylight: number; weather: WeatherMode; labels: boolean; borders: boolean; people: boolean; creatures: boolean; radiants:boolean;
  notesOpen: boolean; exploreOpen: boolean; settingsOpen: boolean; helpOpen: boolean;
  cameraCommand: { id:number; type:CameraAction }; focusPoint: readonly [number,number] | null;
  selectedActor: string | null;
  travel: (id:PlaceId)=>void; showAtlas: ()=>void; setClose: (close:boolean)=>void;
  command: (type:CameraAction)=>void;
  set: (patch:Partial<Omit<AtlasV2State,'set'>>) => void;
}
export const useAtlas = create<AtlasV2State>((set)=>({
  stormFollowing:false,followStorm:()=>set(s=>({stormFollowing:true,view:'atlas',sceneId:null,closeView:false,exploreOpen:false,scenesOpen:false,focusPoint:null,selectedActor:null,weather:'highstorm',playing:true,cameraCommand:{id:s.cameraCommand.id+1,type:'storm'}})),
  sceneClose:false,sceneDetail:()=>set(s=>({sceneClose:!s.sceneClose,cameraCommand:{id:s.cameraCommand.id+1,type:'scene'}})),scenesOpen:false,sceneId:null,sceneStartedAt:0,orderId:'windrunner',discovered:readDiscoveries(),discoveryId:null,
  startScene:(id)=>set(s=>({stormFollowing:false,sceneClose:false,sceneId:id,sceneStartedAt:worldClock.time,placeId:experienceById.get(id)!.place,view:'place',closeView:false,exploreOpen:false,scenesOpen:false,selectedActor:null,focusPoint:null,people:true,creatures:true,radiants:true,playing:true,weather:'clear',cameraCommand:{id:s.cameraCommand.id+1,type:'scene'}})),
  selectOrder:(orderId)=>set(s=>({sceneClose:true,orderId,sceneStartedAt:worldClock.time-8,cameraCommand:{id:s.cameraCommand.id+1,type:'scene'}})),
  endScene:()=>set(s=>({sceneId:null,selectedActor:null,cameraCommand:{id:s.cameraCommand.id+1,type:'home'}})),
  seekDiscovery:(id)=>set(s=>{const d=discoveries.find(d=>d.id===id);return d?{stormFollowing:false,discoveryId:id,sceneId:null,view:'place',placeId:d.place,exploreOpen:false,scenesOpen:false,closeView:false,selectedActor:null,focusPoint:null,cameraCommand:{id:s.cameraCommand.id+1,type:'discovery'}}:{};}),
  discover:(id)=>set(s=>{if(!discoveries.some(d=>d.id===id))return {};const found=Array.from(new Set([...s.discovered,id]));try{localStorage.setItem('stormfather-discoveries-v1',JSON.stringify(found));}catch{/* Private browsing may disable persistence. */}return {discovered:found,selectedActor:discoveries.find(d=>d.id===id)!.description};}),
  view:'atlas', placeId:'urithiru', closeView:false, playing:true, speed:1, daylight:0.8,
  weather:'clear', labels:true, borders:false, people:true, creatures:true,radiants:true,
  notesOpen:false, exploreOpen:typeof window==='undefined'||window.innerWidth>=760, settingsOpen:false, helpOpen:false,
  cameraCommand:{id:0,type:'home'},focusPoint:null,selectedActor:null,
  travel:(placeId)=>set(s=>({stormFollowing:false,placeId, sceneId:null,view:'place',exploreOpen:false,closeView:false,focusPoint:null,selectedActor:null,cameraCommand:{id:s.cameraCommand.id+1,type:'home'}})),
  showAtlas:()=>set(s=>({stormFollowing:false,sceneId:null,view:'atlas',closeView:false,focusPoint:null,selectedActor:null,cameraCommand:{id:s.cameraCommand.id+1,type:'home'}})),
  setClose:(closeView)=>set(s=>({sceneId:null,closeView,selectedActor:null,cameraCommand:{id:s.cameraCommand.id+1,type:'home'}})),
  command:(type)=>set(s=>({stormFollowing:type==='storm',...(type==='wildlife'?{closeView:false,creatures:true}:type==='radiants'?{closeView:false,radiants:true}:{}),cameraCommand:{id:s.cameraCommand.id+1,type}})),
  set:(patch)=>set(patch.weather==='clear'?{...patch,stormFollowing:false}:patch),
}));
/** One source of time for every moving layer. Pause freezes pose as well as travel. */
export const worldClock = {time:0, delta:0, storm:0, stormTime:0, stormActive:false};
export function advanceClock(delta:number, playing:boolean, speed:number, storm:boolean) {
  const step = playing ? Math.min(delta,0.1)*speed : 0;
  worldClock.delta=step; worldClock.time+=step;
  if(storm!==worldClock.stormActive){if(storm){worldClock.stormTime=0;if(!playing)worldClock.storm=1;}else worldClock.storm=0;}worldClock.stormActive=storm;
  if(storm)worldClock.stormTime+=step;
  if (playing) worldClock.storm += (Number(storm)-worldClock.storm)*(1-Math.exp(-step*0.7));
}
