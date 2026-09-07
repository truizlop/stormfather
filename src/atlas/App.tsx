import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { LoadingStatus } from './loading/LoadingStatus';
import { useLoading } from './loading/state';
const Scene = lazy(() => import('./Scene').then(module => ({ default: module.Scene })));
import { HUD } from './HUD';
import {places} from './data';
import {useAtlas} from './store';
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{
  componentDidCatch(){useLoading.setState({atlas:null,place:null});}
  state={error:false};static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<div className="scene-error"><h1>The atlas could not render</h1><p>Reload the page to rebuild the scene. A browser with WebGL is required.</p><button onClick={()=>window.location.reload()}>Reload atlas</button></div>:this.props.children;}
}
export function AtlasApp(){
  useEffect(()=>{
    const query=new URLSearchParams(window.location.search),city=places.find(p=>p.id===query.get('city'));
    if(city){const state=useAtlas.getState();state.travel(city.id);if(query.get('view')==='street')state.setClose(true);if(query.get('light')==='dusk')state.set({daylight:.4});}
  },[]);
  return <main className="atlas-v2"><SceneBoundary><Suspense fallback={null}><Scene/></Suspense></SceneBoundary><HUD/><LoadingStatus/></main>;}
