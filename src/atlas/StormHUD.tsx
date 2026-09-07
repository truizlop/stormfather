import {useEffect,useState} from 'react';
import {CloudLightning,ArrowRight,Navigation,X} from 'lucide-react';
import {useAtlas,worldClock} from './store';
import {stormPosition,stormRegion} from './storm';
export function StormHUD(){
 const s=useAtlas(),[front,setFront]=useState(()=>stormPosition(worldClock.stormTime));
 useEffect(()=>{const timer=window.setInterval(()=>setFront(stormPosition(worldClock.stormTime)),250);return ()=>window.clearInterval(timer);},[]);
 if(s.weather!=='highstorm'||s.view!=='atlas'||s.scenesOpen)return null;
 return <section className="storm-observer surface" aria-label="Highstorm crossing"><header><CloudLightning size={19}/><span>The highstorm</span><button aria-label="Clear highstorm" onClick={()=>{s.set({weather:'clear',stormFollowing:false});s.command('home');}}><X size={16}/></button></header><h2>{stormRegion(front.x)}</h2><div className="storm-direction"><span>Stormward · east</span><ArrowRight size={17}/><span>Leeward · west</span></div><div className="storm-track" role="progressbar" aria-label="Continental crossing" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(front.progress*100)}><i style={{width:`${front.progress*100}%`}}/></div><p>{front.strength<.6?'The mountains break the storm. The riddens follow.':'A wall of wind and water. Lightning inside the clouds.'}</p><button className="storm-follow" onClick={s.stormFollowing?()=>{s.set({stormFollowing:false});s.command('home');}:s.followStorm}><Navigation size={15}/>{s.stormFollowing?'See the continent':'Follow the stormwall'}</button><small>{s.playing?'Crossing Roshar':'Storm paused'} · illustrative time & height</small></section>;
}
